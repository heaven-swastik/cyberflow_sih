"""
Local Model Training Script for CyberFlow AI/Data Engine.

Trains 4 XGBoost models on the synthetic training dataset and saves them
to /models/. This is the same training that the Colab notebook does,
but runnable locally.

Usage:
    python train_models.py

Requirements:
    pip install xgboost scikit-learn pandas numpy
"""

import json
import os
import sys
import numpy as np
import pandas as pd

# Ensure we can import from the same directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from generate_training_data import generate_training_dataset, FEATURE_COLS, ZONES

try:
    import xgboost as xgb
    from sklearn.model_selection import train_test_split, cross_val_score
    from sklearn.metrics import accuracy_score, mean_absolute_error, mean_squared_error, r2_score, classification_report
    from sklearn.preprocessing import LabelEncoder
except ImportError:
    print("[!] Missing dependencies. Install with:")
    print("    pip install xgboost scikit-learn")
    sys.exit(1)


# ── Contract vocabulary ────────────────────────────────────────────────
STATE_CLASSES = ["emerging", "collection", "distribution", "layering", "consolidation", "cashout_prep"]
ACTION_CLASSES = ["cashout", "further_layering", "external_transfer", "other"]
PRIORITY_CLASSES = ["LOW", "MEDIUM", "HIGH"]
ZONE_CLASSES = ZONES  # ["zone_a", "zone_b", "zone_c"]

# FIX (judge inspection §1.1 / §6): the zone classifier must NOT see
# zone_a_frac/zone_b_frac/zone_c_frac/num_zones_active as inputs — those
# are computed directly from the same per-transaction zone tags that
# `primary_zone` (the label) comes from, i.e. pure leakage. It's trained on
# everything else (topology, timing, behavioural features, fraud-type
# one-hots) so it has to find real signal instead of reading the answer
# back out of a derived copy of itself.
ZONE_LEAKAGE_COLS = {"zone_a_frac", "zone_b_frac", "zone_c_frac", "num_zones_active"}
ZONE_FEATURE_COLS = [c for c in FEATURE_COLS if c not in ZONE_LEAKAGE_COLS]


def train_all_models(data_path=None, output_dir=None, num_cases=3000):
    """
    Train all 4 XGBoost models and save to output_dir.
    """
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(base_dir, "data")

    if output_dir is None:
        output_dir = os.path.join(base_dir, "models")
    os.makedirs(output_dir, exist_ok=True)

    # Step 1: Generate or load training data
    feat_path = os.path.join(data_dir, "training_features.csv")
    if data_path:
        feat_path = data_path

    if not os.path.exists(feat_path):
        print("[*] Training features not found. Generating training dataset...")
        generate_training_dataset(num_cases=num_cases, seed=42, output_dir=data_dir)

    print(f"[+] Loading training data from: {feat_path}")
    df = pd.read_csv(feat_path)
    print(f"    {len(df)} cases, {len(df.columns)} columns")

    # Step 2: Prepare features and labels
    X = df[FEATURE_COLS].copy()
    X = X.replace([np.inf, -np.inf], np.nan).fillna(0)

    # Encode labels
    state_encoder = LabelEncoder()
    state_encoder.classes_ = np.array(STATE_CLASSES)
    y_state = state_encoder.transform(df["current_state"])

    action_encoder = LabelEncoder()
    action_encoder.classes_ = np.array(ACTION_CLASSES)
    y_action = action_encoder.transform(df["predicted_next_action"])

    priority_encoder = LabelEncoder()
    priority_encoder.classes_ = np.array(PRIORITY_CLASSES)
    y_priority = priority_encoder.transform(df["intervention_priority"])

    y_risk = df["network_risk"].values

    # Zone label (for the new zone classifier — see FIX 6 below)
    zone_encoder = LabelEncoder()
    zone_encoder.classes_ = np.array(ZONE_CLASSES)
    y_zone = zone_encoder.transform(df["primary_zone"])

    # ── Train/test split ──────────────────────────────────────────────
    # FIX (judge inspection §2.1): the old "temporal" split was actually a
    # split by fraud-type block (cases are generated and appended
    # investment_scam -> digital_arrest -> fake_payment_gateway ->
    # legitimate_business, never shuffled), so a fixed 80% cut silently
    # dropped 2 of 3 fraud types from the test set entirely. There is no
    # real timestamp anywhere driving this data, so rather than dress it up
    # as "temporal", we use an honest stratified random split by fraud_type
    # so every class is represented in both train and test.
    train_idx, test_idx = train_test_split(
        np.arange(len(X)), test_size=0.2, random_state=42,
        stratify=df["fraud_type"]
    )
    X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
    y_state_train, y_state_test = y_state[train_idx], y_state[test_idx]
    y_action_train, y_action_test = y_action[train_idx], y_action[test_idx]
    y_risk_train, y_risk_test = y_risk[train_idx], y_risk[test_idx]
    y_priority_train, y_priority_test = y_priority[train_idx], y_priority[test_idx]
    y_zone_train, y_zone_test = y_zone[train_idx], y_zone[test_idx]

    print(f"    Train: {len(X_train)} | Test: {len(X_test)} (stratified by fraud_type, not temporal)")
    print(f"    Test-set fraud_type distribution: {df.iloc[test_idx]['fraud_type'].value_counts().to_dict()}")

    # FIX (judge inspection §2.2): evaluation.py must reuse these EXACT
    # row indices — not recompute its own split — or its "held-out"
    # metrics are measured on rows that were mostly inside this training
    # set. Persist the split (by case_id, robust to row reordering) so
    # evaluation.py can slice the same partition.
    split_record = {
        "method": "stratified_random_by_fraud_type",
        "test_size": 0.2,
        "random_state": 42,
        "train_case_ids": df.iloc[train_idx]["case_id"].tolist(),
        "test_case_ids": df.iloc[test_idx]["case_id"].tolist(),
    }
    with open(os.path.join(output_dir, "split_indices.json"), "w") as f:
        json.dump(split_record, f, indent=2)

    # Step 3: Train models
    print("\n[*] Training State Classifier...")
    state_model = xgb.XGBClassifier(
        n_estimators=200, max_depth=6, learning_rate=0.1,
        objective="multi:softprob", num_class=len(STATE_CLASSES),
        eval_metric="mlogloss", random_state=42, use_label_encoder=False, verbosity=0
    )
    state_model.fit(X_train, y_state_train, eval_set=[(X_test, y_state_test)], verbose=False)
    y_state_pred = state_model.predict(X_test)
    state_acc = accuracy_score(y_state_test, y_state_pred)
    print(f"    Accuracy: {state_acc:.3f}")

    print("\n[*] Training Next-Action Predictor...")
    action_model = xgb.XGBClassifier(
        n_estimators=200, max_depth=6, learning_rate=0.1,
        objective="multi:softprob", num_class=len(ACTION_CLASSES),
        eval_metric="mlogloss", random_state=42, use_label_encoder=False, verbosity=0
    )
    action_model.fit(X_train, y_action_train, eval_set=[(X_test, y_action_test)], verbose=False)
    y_action_pred = action_model.predict(X_test)
    action_acc = accuracy_score(y_action_test, y_action_pred)
    print(f"    Accuracy: {action_acc:.3f}")

    print("\n[*] Training Risk Scorer...")
    risk_model = xgb.XGBRegressor(
        n_estimators=600, max_depth=3, learning_rate=0.05,
        subsample=0.9, colsample_bytree=0.9,
        objective="reg:squarederror", random_state=42, verbosity=0
    )
    risk_model.fit(X_train, y_risk_train, eval_set=[(X_test, y_risk_test)], verbose=False)
    y_risk_pred = np.clip(risk_model.predict(X_test), 0.0, 1.0)
    risk_r2 = r2_score(y_risk_test, y_risk_pred)
    risk_mae = mean_absolute_error(y_risk_test, y_risk_pred)
    print(f"    R2: {risk_r2:.3f} | MAE: {risk_mae:.4f}")

    print("\n[*] Training Priority Classifier...")
    priority_model = xgb.XGBClassifier(
        n_estimators=600, max_depth=3, learning_rate=0.05,
        subsample=0.9, colsample_bytree=0.9,
        objective="multi:softprob", num_class=len(PRIORITY_CLASSES),
        eval_metric="mlogloss", random_state=42, use_label_encoder=False, verbosity=0
    )
    priority_model.fit(X_train, y_priority_train, eval_set=[(X_test, y_priority_test)], verbose=False)
    y_priority_pred = priority_model.predict(X_test)
    priority_acc = accuracy_score(y_priority_test, y_priority_pred)
    print(f"    Accuracy: {priority_acc:.3f}")

    print("\n[*] Training Zone Classifier (genuinely learned, not a fraud-type lookup)...")
    X_zone_train = X_train[ZONE_FEATURE_COLS]
    X_zone_test = X_test[ZONE_FEATURE_COLS]
    from sklearn.model_selection import GridSearchCV
    zone_base_model = xgb.XGBClassifier(
        objective="multi:softprob", num_class=len(ZONE_CLASSES),
        eval_metric="mlogloss", random_state=42, use_label_encoder=False, verbosity=0
    )
    param_grid = {
        'max_depth': [3, 4, 6],
        'n_estimators': [200, 400],
        'learning_rate': [0.05, 0.1]
    }
    print("    Running GridSearchCV for zone_classifier...")
    grid_search = GridSearchCV(zone_base_model, param_grid, cv=3, scoring='accuracy', n_jobs=-1)
    grid_search.fit(X_zone_train, y_zone_train)
    print(f"    Best params: {grid_search.best_params_}")
    zone_model = grid_search.best_estimator_
    
    y_zone_pred = zone_model.predict(X_zone_test)
    zone_acc = accuracy_score(y_zone_test, y_zone_pred)
    print(f"    Accuracy: {zone_acc:.3f}")

    # Naive baseline: "always guess this fraud_type's most common zone in
    # training" — the trivial lookup the old code was secretly doing. If the
    # trained model doesn't clearly beat this, that's the honest number to
    # report on stage, not a hidden one.
    train_fraud_types = df.iloc[train_idx]["fraud_type"].values
    train_zones = df.iloc[train_idx]["primary_zone"].values
    most_common_zone_by_type = {}
    for ft in set(train_fraud_types):
        zones_for_type = train_zones[train_fraud_types == ft]
        vals, counts = np.unique(zones_for_type, return_counts=True)
        most_common_zone_by_type[ft] = vals[np.argmax(counts)]

    test_fraud_types = df.iloc[test_idx]["fraud_type"].values
    test_zones_true = df.iloc[test_idx]["primary_zone"].values
    naive_preds = np.array([most_common_zone_by_type.get(ft, ZONE_CLASSES[0]) for ft in test_fraud_types])
    naive_zone_acc = float(np.mean(naive_preds == test_zones_true))
    print(f"    Naive fraud-type-lookup baseline accuracy: {naive_zone_acc:.3f}")
    print(f"    Model lift over naive baseline: {zone_acc - naive_zone_acc:+.3f}")

    # Step 4: Save models
    print(f"\n[*] Saving models to {output_dir}...")
    state_model.save_model(os.path.join(output_dir, "state_classifier.json"))
    action_model.save_model(os.path.join(output_dir, "action_predictor.json"))
    risk_model.save_model(os.path.join(output_dir, "risk_scorer.json"))
    priority_model.save_model(os.path.join(output_dir, "priority_classifier.json"))
    zone_model.save_model(os.path.join(output_dir, "zone_classifier.json"))

    metadata = {
        "state_classes": STATE_CLASSES,
        "action_classes": ACTION_CLASSES,
        "priority_classes": PRIORITY_CLASSES,
        "zone_classes": ZONE_CLASSES,
        "feature_columns": FEATURE_COLS,
        "zone_feature_columns": ZONE_FEATURE_COLS,
        "training_samples": len(df),
        "split_method": "stratified_random_by_fraud_type",
        "test_accuracy": {
            "state": float(state_acc),
            "action": float(action_acc),
            "priority": float(priority_acc),
            "risk_r2": float(risk_r2),
            "risk_mae": float(risk_mae),
            "zone_classifier_accuracy": float(zone_acc),
            "naive_fraud_type_lookup_baseline_accuracy": float(naive_zone_acc)
        }
    }
    with open(os.path.join(output_dir, "model_metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)

    print("\n[+] All models saved successfully!")
    print(f"    State Classifier:    {state_acc:.1%} accuracy")
    print(f"    Action Predictor:    {action_acc:.1%} accuracy")
    print(f"    Risk Scorer:         R2={risk_r2:.3f}, MAE={risk_mae:.4f}")
    print(f"    Priority Classifier: {priority_acc:.1%} accuracy")
    print(f"    Zone Classifier:     {zone_acc:.1%} accuracy (naive fraud-type-lookup baseline: {naive_zone_acc:.1%})")

    # Step 5: Detailed classification reports
    print("\n" + "=" * 60)
    print("DETAILED CLASSIFICATION REPORTS")
    print("=" * 60)
    
    print("\n--- State Classifier ---")
    print(classification_report(y_state_test, y_state_pred, target_names=STATE_CLASSES, zero_division=0))
    
    print("--- Action Predictor ---")
    print(classification_report(y_action_test, y_action_pred, target_names=ACTION_CLASSES, zero_division=0))
    
    print("--- Priority Classifier ---")
    print(classification_report(y_priority_test, y_priority_pred, target_names=PRIORITY_CLASSES, zero_division=0))

    print("--- Zone Classifier (vs. naive fraud-type-lookup baseline) ---")
    print(classification_report(y_zone_test, y_zone_pred, target_names=ZONE_CLASSES, zero_division=0))
    print(f"Naive baseline accuracy: {naive_zone_acc:.3f}  |  Model accuracy: {zone_acc:.3f}  |  Lift: {zone_acc - naive_zone_acc:+.3f}")

    # Step 6: Train RL Q-Table
    print("\n" + "=" * 60)
    print("TRAINING RL OPTIMIZER (Q-LEARNING)")
    print("=" * 60)
    try:
        from rl_optimizer import RLOptimizer, build_training_data_from_cases
        print("[*] Loading transaction data for RL...")
        
        tx_path = os.path.join(data_dir, "training_transactions.csv")
        if not os.path.exists(tx_path):
            # Fallback if somehow missing
            # (removed local import)
            generate_training_dataset(num_cases=num_cases, seed=42, output_dir=data_dir)
            
        tx_df = pd.read_csv(tx_path)
        # Convert to list of dicts as expected by build_training_data_from_cases
        txs = tx_df.to_dict('records')
        
        # Load fraud_types from the features file
        feat_df = pd.read_csv(feat_path)
        case_ids = feat_df['case_id'].tolist()
        fraud_types = dict(zip(feat_df['case_id'], feat_df['fraud_type']))
        
        print(f"[*] Building sequential RL training sequences from {len(case_ids)} cases...")
        rl_training_data = build_training_data_from_cases(txs, case_ids, fraud_types)
        print(f"[*] Built {len(rl_training_data)} state transitions.")
        
        rl_opt = RLOptimizer()
        print("[*] Running Q-learning... (50 epochs)")
        rl_opt.train_on_dataset(rl_training_data, epochs=50)
        
        rl_model_path = os.path.join(output_dir, "rl_q_table.json")
        rl_opt.save(rl_model_path)
        print(f"[+] RL Q-Table saved to {rl_model_path}!")
        print(f"    Total states learned: {len(rl_opt.q_table)}")
        
    except Exception as e:
        print(f"[!] Error training RL module: {e}")

if __name__ == "__main__":
    train_all_models()

