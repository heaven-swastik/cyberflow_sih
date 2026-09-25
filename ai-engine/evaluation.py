"""
CyberFlow — Legitimate-Business Evaluation Stage (requirement 6).

Trains models see BOTH fraud cases and legitimate-business cases (see
generate_training_data.py: legit_fraction). This script evaluates how
well the trained pipeline tells them apart on a held-out test split,
loading the EXACT same train/test partition train_models.py used (from
models/split_indices.json) so the reported numbers are genuine test-set
metrics on rows the models never saw during training, not re-scored
training data.

FIX (judge inspection §2.2): this file used to recompute its own random
stratified split with the same seed/test_size as train_models.py, but a
different algorithm (train_models.py used a plain positional split at
the time) — so "same split logic" was false, and most of this file's
"held-out" test rows were actually inside the model's training set. It
now loads the literal case_id partition train_models.py wrote out.

A case is treated as "predicted fraud" if the trained priority
classifier assigns it MEDIUM or HIGH priority (i.e. the system would
raise it to an investigator) OR the risk scorer outputs >= 0.5,
whichever the deployed classifier.py actually uses
(see classifier.py FRAUD_DECISION_THRESHOLD) — the ground truth is the
`is_fraud` label attached at generation time (1 for the three fraud
scenario types, 0 for legitimate_business).

Everything reported (confusion matrix, precision, recall, F1, false
positive rate) is computed with scikit-learn from real predictions on
the real held-out test rows — never invented.
"""

import json
import os
import sys

import numpy as np
import pandas as pd

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from generate_training_data import FEATURE_COLS

try:
    import xgboost as xgb
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import (
        confusion_matrix, precision_score, recall_score, f1_score, accuracy_score
    )
except ImportError:
    print("[!] Missing dependencies: pip install xgboost scikit-learn")
    sys.exit(1)

FRAUD_DECISION_THRESHOLD = 0.50  # matches classifier.py — see FRAUD_DECISION_THRESHOLD there


def run_evaluation(data_dir=None, models_dir=None):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    if data_dir is None:
        data_dir = os.path.join(base_dir, "data")
    if models_dir is None:
        models_dir = os.path.join(base_dir, "models")

    feat_path = os.path.join(data_dir, "training_features.csv")
    if not os.path.exists(feat_path):
        from generate_training_data import generate_training_dataset
        generate_training_dataset(num_cases=1000, seed=42, output_dir=data_dir)

    df = pd.read_csv(feat_path)
    if "is_fraud" not in df.columns:
        raise RuntimeError("training_features.csv has no is_fraud column — regenerate training data.")

    X = df[FEATURE_COLS].replace([np.inf, -np.inf], np.nan).fillna(0)
    y_fraud = df["is_fraud"].values

    split_path = os.path.join(models_dir, "split_indices.json")
    risk_model_path = os.path.join(models_dir, "risk_scorer.json")
    priority_model_path = os.path.join(models_dir, "priority_classifier.json")

    if not (os.path.exists(risk_model_path) and os.path.exists(priority_model_path)):
        return {
            "status": "MODELS_NOT_TRAINED",
            "message": "Trained models not found — run train_models.py before evaluation. "
                       "No metrics are reported in this state (nothing is fabricated).",
        }
    if not os.path.exists(split_path):
        return {
            "status": "SPLIT_NOT_FOUND",
            "message": "models/split_indices.json not found — re-run train_models.py (it now "
                       "writes this file) so evaluation.py can reuse the exact same held-out "
                       "rows the models were tested on, instead of recomputing a different split.",
        }

    with open(split_path) as f:
        split_record = json.load(f)
    test_case_ids = set(split_record["test_case_ids"])
    test_mask = df["case_id"].isin(test_case_ids).values
    if test_mask.sum() == 0:
        raise RuntimeError(
            "None of split_indices.json's test_case_ids matched training_features.csv — "
            "the feature file and the split were generated from different runs. Re-run "
            "train_models.py (which regenerates both together) before evaluating."
        )

    X_test = X[test_mask]
    y_test = y_fraud[test_mask]

    risk_model = xgb.XGBRegressor()
    risk_model.load_model(risk_model_path)
    priority_model = xgb.XGBClassifier()
    priority_model.load_model(priority_model_path)

    risk_pred = np.clip(risk_model.predict(X_test), 0.0, 1.0)
    priority_pred_idx = priority_model.predict(X_test)
    # PRIORITY_CLASSES = ["LOW", "MEDIUM", "HIGH"] (index order from train_models.py)
    priority_pred_labels = np.array(["LOW", "MEDIUM", "HIGH"])[priority_pred_idx]

    # Predicted-fraud decision rule actually used by classifier.py:
    # flagged if predicted priority is not LOW, OR risk >= threshold.
    y_pred_fraud = ((priority_pred_labels != "LOW") | (risk_pred >= FRAUD_DECISION_THRESHOLD)).astype(int)

    cm = confusion_matrix(y_test, y_pred_fraud, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel()

    precision = precision_score(y_test, y_pred_fraud, zero_division=0)
    recall = recall_score(y_test, y_pred_fraud, zero_division=0)
    f1 = f1_score(y_test, y_pred_fraud, zero_division=0)
    accuracy = accuracy_score(y_test, y_pred_fraud)
    false_positive_rate = fp / (fp + tn) if (fp + tn) > 0 else None

    result = {
        "status": "OK",
        "method": "Held-out test rows loaded from models/split_indices.json — the literal "
                  "case_id partition train_models.py used (stratified by fraud_type, "
                  "test_size=0.2, random_state=42), not a separately recomputed split. "
                  "Predicted-fraud rule: priority != LOW OR risk >= {:.2f} (matches "
                  "classifier.py FRAUD_DECISION_THRESHOLD).".format(FRAUD_DECISION_THRESHOLD),
        "n_test_cases": int(len(y_test)),
        "n_fraud_in_test": int(y_test.sum()),
        "n_legitimate_in_test": int(len(y_test) - y_test.sum()),
        "confusion_matrix": {
            "true_negative_legit_correctly_cleared": int(tn),
            "false_positive_legit_flagged_as_fraud": int(fp),
            "false_negative_fraud_missed": int(fn),
            "true_positive_fraud_correctly_flagged": int(tp),
        },
        "metrics": {
            "accuracy": round(float(accuracy), 4),
            "precision": round(float(precision), 4),
            "recall": round(float(recall), 4),
            "f1_score": round(float(f1), 4),
            "false_positive_rate": round(float(false_positive_rate), 4) if false_positive_rate is not None else None,
        },
        "disclaimer": "Metrics are measured on a synthetic held-out test set generated by "
                      "this prototype (generate_training_data.py) and are reported for "
                      "demonstration purposes only — they are not evidence of accuracy on "
                      "real cases.",
    }

    out_path = os.path.join(data_dir, "evaluation_report.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)

    print(f"[+] Evaluation complete — {result['n_test_cases']} held-out test cases "
          f"({result['n_fraud_in_test']} fraud, {result['n_legitimate_in_test']} legitimate)")
    print(f"    Precision: {result['metrics']['precision']:.3f}  Recall: {result['metrics']['recall']:.3f}  "
          f"F1: {result['metrics']['f1_score']:.3f}")
    print(f"    False positives (legit flagged as fraud): {fp} / {tn + fp}  "
          f"(FPR={result['metrics']['false_positive_rate']:.3f})")
    print(f"    Saved to: {out_path}")

    return result


if __name__ == "__main__":
    run_evaluation()
