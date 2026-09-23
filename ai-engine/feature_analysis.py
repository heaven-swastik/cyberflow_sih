"""
CyberFlow — Feature Analysis Stage (requirement 4).

Runs BEFORE model inference in the pipeline, on the actual synthetic
training dataset (data/training_features.csv, produced by
generate_training_data.py):

  1. Feature-feature correlation analysis (Pearson correlation matrix
     over all numeric engineered features)
  2. Feature-target relationship analysis:
       - continuous target (network_risk): Pearson correlation + the
         associated p-value (scipy.stats.pearsonr)
       - binary target (is_fraud): independent two-sample t-test
         comparing each feature's distribution between the fraud group
         and the legitimate group (scipy.stats.ttest_ind), reporting
         the t-statistic and p-value
  3. Significance flag at alpha = 0.05, displayed alongside the p-value
     — nothing here is estimated or guessed; every number is computed
     directly from data/training_features.csv by this script.

If training_features.csv does not exist yet, this script generates it
first (same generator used for model training) so the analysis is
always run on real, reproducible data rather than being skipped or
faked.

Output: data/feature_analysis.json — consumed by pipeline.py (for the
export) and by the backend /api/feature-analysis endpoint.
"""

import json
import os
import sys

import numpy as np
import pandas as pd
from scipy import stats

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

ALPHA = 0.05


def _ensure_training_data(data_dir):
    feat_path = os.path.join(data_dir, "training_features.csv")
    if not os.path.exists(feat_path):
        from generate_training_data import generate_training_dataset
        generate_training_dataset(num_cases=1000, seed=42, output_dir=data_dir)
    return feat_path


def run_feature_analysis(data_dir=None, top_n_pairs=15):
    if data_dir is None:
        data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

    feat_path = _ensure_training_data(data_dir)
    df = pd.read_csv(feat_path)

    from generate_training_data import FEATURE_COLS
    numeric_cols = [c for c in FEATURE_COLS if c in df.columns]
    X = df[numeric_cols].replace([np.inf, -np.inf], np.nan).fillna(0)

    # ── 1. Feature-feature correlation (Pearson) ──
    corr_matrix = X.corr(method="pearson")

    # Extract the top-N most correlated (non-self) feature pairs by |r|,
    # so the export stays a manageable summary rather than the full
    # N x N matrix (still available in full below).
    pairs = []
    cols = corr_matrix.columns.tolist()
    for i in range(len(cols)):
        for j in range(i + 1, len(cols)):
            r = corr_matrix.iloc[i, j]
            if pd.notna(r):
                pairs.append({"feature_a": cols[i], "feature_b": cols[j], "r": round(float(r), 3)})
    pairs.sort(key=lambda p: abs(p["r"]), reverse=True)
    top_pairs = pairs[:top_n_pairs]

    # ── 2a. Feature vs. continuous target (network_risk): Pearson r + p ──
    risk_relationships = []
    y_risk = df["network_risk"].astype(float)
    for col in numeric_cols:
        x = X[col].astype(float)
        if x.std() == 0:
            continue  # constant feature — correlation undefined
        r, p = stats.pearsonr(x, y_risk)
        risk_relationships.append({
            "feature": col,
            "correlation_r": round(float(r), 3),
            "p_value": float(p),
            "significant_at_0.05": bool(p < ALPHA),
        })
    risk_relationships.sort(key=lambda d: abs(d["correlation_r"]), reverse=True)

    # ── 2b. Feature vs. binary target (is_fraud): independent t-test ──
    fraud_vs_legit = []
    if "is_fraud" in df.columns and df["is_fraud"].nunique() == 2:
        fraud_group_mask = df["is_fraud"] == 1
        legit_group_mask = df["is_fraud"] == 0
        n_fraud = int(fraud_group_mask.sum())
        n_legit = int(legit_group_mask.sum())
        for col in numeric_cols:
            fraud_vals = X.loc[fraud_group_mask, col].astype(float)
            legit_vals = X.loc[legit_group_mask, col].astype(float)
            if fraud_vals.std() == 0 and legit_vals.std() == 0:
                continue
            t_stat, p = stats.ttest_ind(fraud_vals, legit_vals, equal_var=False, nan_policy="omit")
            fraud_vs_legit.append({
                "feature": col,
                "mean_fraud": round(float(fraud_vals.mean()), 4),
                "mean_legitimate": round(float(legit_vals.mean()), 4),
                "t_statistic": round(float(t_stat), 3) if pd.notna(t_stat) else None,
                "p_value": float(p) if pd.notna(p) else None,
                "significant_at_0.05": bool(pd.notna(p) and p < ALPHA),
                "n_fraud": n_fraud,
                "n_legitimate": n_legit,
            })
        fraud_vs_legit.sort(key=lambda d: (d["p_value"] if d["p_value"] is not None else 1.0))

    n_significant_risk = sum(1 for r in risk_relationships if r["significant_at_0.05"])
    n_significant_fraud = sum(1 for r in fraud_vs_legit if r["significant_at_0.05"])

    result = {
        "method": {
            "correlation": "Pearson product-moment correlation (pandas.DataFrame.corr)",
            "significance_test_continuous_target": "Pearson correlation test (scipy.stats.pearsonr) "
                                                     "against network_risk",
            "significance_test_binary_target": "Welch's independent two-sample t-test "
                                                "(scipy.stats.ttest_ind, equal_var=False) "
                                                "comparing fraud vs. legitimate-business groups",
            "alpha": ALPHA,
            "dataset": os.path.relpath(feat_path, os.path.dirname(os.path.abspath(__file__))),
            "n_cases": int(len(df)),
            "n_features_tested": len(numeric_cols),
        },
        "feature_feature_correlation": {
            "top_pairs_by_abs_r": top_pairs,
            "full_matrix": corr_matrix.round(3).to_dict(),
        },
        "feature_target_relationship": {
            "target": "network_risk (continuous)",
            "results": risk_relationships,
            "n_significant": n_significant_risk,
        },
        "feature_fraud_vs_legitimate": {
            "target": "is_fraud (binary: 1=fraud case, 0=legitimate-business test case)",
            "results": fraud_vs_legit,
            "n_significant": n_significant_fraud,
        },
    }

    out_path = os.path.join(data_dir, "feature_analysis.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)

    print(f"[+] Feature analysis complete — {len(numeric_cols)} features tested on {len(df)} cases")
    print(f"    {n_significant_risk}/{len(risk_relationships)} features significantly correlated with network_risk (p<0.05)")
    if fraud_vs_legit:
        print(f"    {n_significant_fraud}/{len(fraud_vs_legit)} features significantly differ fraud vs. legitimate (p<0.05)")
    print(f"    Saved to: {out_path}")

    return result


if __name__ == "__main__":
    run_feature_analysis()
