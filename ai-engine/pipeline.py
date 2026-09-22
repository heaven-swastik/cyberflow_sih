"""
Master Pipeline for CyberFlow AI/Data Engine.

Orchestrates the full required flow for every case (demo case or a new
NCRP-style complaint — see complaint_intake.py):

  Complaint -> Data Validation -> Relationship Analysis ->
  Feature Engineering -> Statistical Validation -> ML ->
  Prediction + Explanation -> Probable Zone -> ATM Ranking ->
  Risk/Priority -> Alert

Top-level orchestration below additionally:
1. Generates synthetic data (demo cases + training dataset)
2. Runs feature_analysis.py (correlation + significance testing) and
   evaluation.py (legitimate-business false-positive testing) once per
   pipeline run, over the training dataset
3. Computes SHA-256 alert hash chaining
4. Exports case_export.json

Uses trained XGBoost models from /models/ if available.
Falls back to rule-based engine otherwise.
"""

import json
import hashlib
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from generate_data import generate_all_synthetic_data
from generate_training_data import compute_case_features, FEATURE_COLS
from graph_builder import CaseGraphBuilder
from classifier import CyberFlowClassifierEngine, compute_alert_hash_chain
from atm_engine import enrich_case_with_atm_intelligence
from data_validator import validate_case
from behavioral import assign_device_fingerprints


def _build_model_proof(engine, models_dir):
    """Create machine-checkable provenance for the inference artifact."""
    model_files = [
        "state_classifier.json",
        "action_predictor.json",
        "risk_scorer.json",
        "priority_classifier.json",
    ]
    fingerprints = {}
    for filename in model_files:
        path = os.path.join(models_dir, filename)
        with open(path, "rb") as model_file:
            fingerprints[filename] = hashlib.sha256(model_file.read()).hexdigest()

    metadata = engine.model_loader.metadata or {}
    try:
        import xgboost
        xgboost_version = xgboost.__version__
    except ImportError:
        xgboost_version = None

    return {
        "inference_mode": "ML (XGBoost)" if engine.using_ml else "Rule-based fallback",
        "library": "xgboost" if engine.using_ml else None,
        "library_version": xgboost_version,
        "model_files": fingerprints if engine.using_ml else {},
        "feature_count": len(metadata.get("feature_columns", [])),
        "feature_columns": metadata.get("feature_columns", []),
        "training_samples": metadata.get("training_samples"),
        "test_metrics": metadata.get("test_accuracy", {}),
        "data_policy": "100% synthetic data",
    }


def process_case(case_id, fraud_type, transactions, builder, engine):
    """
    Run ONE case through the full required stage sequence:

      Data Validation -> Relationship Analysis -> Feature Engineering ->
      ML -> Prediction + Explanation -> Probable Zone -> ATM Ranking

    Shared by pipeline.py (for the 3 demo cases) AND complaint_intake.py
    (for a new complaint submitted through the NCRP-style portal) —
    every case, demo or freshly filed, takes exactly this same path.

    Returns (case_obj, graph_export, timeline, simulations, raw_alert,
    validation_report).
    """
    # ── Stage: Data Validation & Relationship Validation (req. 3) ──
    validation_report = validate_case(case_id, transactions)

    # Build graph (also serves as part of relationship analysis — node
    # roles are derived strictly from the actual money-flow topology)
    g_res = builder.build_graph_for_case(case_id, transactions)
    graph_json = g_res["json_data"]
    graph_export = {"nodes": graph_json["nodes"], "edges": graph_json["edges"]}

    # ── Stage: Feature Engineering (incl. contextual/behavioural — req. 5) ──
    features = None
    if validation_report["stats"]["sufficient_for_prediction"]:
        features = compute_case_features(case_id, transactions, fraud_type)
        if features:
            features["fraud_type"] = fraud_type

    # ── Stage: ML Prediction + Explanation (req. 7/8) ──
    eval_res = engine.evaluate_case(case_id, features, transactions, graph_json)

    CaseGraphBuilder.assign_timeline_steps(
        graph_export["edges"], num_stages=len(eval_res["timeline"])
    )

    # ── Stage: Probable Zone -> ATM Ranking (req. 9) ──
    case_obj = enrich_case_with_atm_intelligence(
        case_id, eval_res["case"], transactions, fraud_type
    )
    case_obj["data_validation"] = validation_report

    graph_export = CaseGraphBuilder.add_entity_intelligence(
        graph_export, case_id, case_obj
    )

    # ── Stage: Multi-Stage Path Prediction + RL Recommendations ──
    try:
        from path_predictor import PathPredictor
        path_pred = PathPredictor(engine)
        path_result = path_pred.predict_paths(case_id, features, eval_res["case"]["current_state"])
        case_obj["predicted_paths"] = path_result
    except Exception as e:
        print(f"  [!] Path prediction skipped for {case_id}: {e}", file=sys.stderr)
        case_obj["predicted_paths"] = None

    try:
        from rl_optimizer import RLOptimizer
        rl = RLOptimizer()
        rl_model_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "rl_q_table.json")
        rl.load(rl_model_path)
        rl_recs = rl.get_investigation_recommendations(features, eval_res["case"]["current_state"])
        case_obj["rl_recommendations"] = rl_recs
    except Exception as e:
        print(f"  [!] RL recommendations skipped for {case_id}: {e}", file=sys.stderr)
        case_obj["rl_recommendations"] = []

    return (case_obj, graph_export, eval_res["timeline"], eval_res["simulations"],
            eval_res.get("raw_alert"), validation_report)


def run_pipeline(output_dir=None):
    """
    Run end-to-end pipeline and produce case_export.json.
    """
    if output_dir is None:
        base_dir = os.path.dirname(os.path.abspath(__file__))
    else:
        base_dir = output_dir

    data_dir = os.path.join(base_dir, "data")
    os.makedirs(data_dir, exist_ok=True)

    print("=" * 60)
    print("CYBERFLOW AI/DATA ENGINE - PIPELINE EXECUTION")
    print("=" * 60)

    # Step 1: Generate demo case transactions + assign device fingerprints
    print("\n[1/7] Generating synthetic demo transactions...")
    transactions = generate_all_synthetic_data(output_dir=data_dir)
    assign_device_fingerprints(transactions)

    # Step 2: Initialize engines
    print("\n[2/7] Initializing graph builder + classifier engine...")
    builder = CaseGraphBuilder()
    models_dir = os.path.join(base_dir, "models")
    engine = CyberFlowClassifierEngine(models_dir=models_dir)

    # Step 2.5: Ensure RL Q-Table exists, train if missing
    rl_model_path = os.path.join(models_dir, "rl_q_table.json")
    if not os.path.exists(rl_model_path):
        print("\n[2.5/7] RL Q-Table missing. Training RL Optimizer now...")
        from train_models import train_all_models
        # Just calling train_all_models will re-train XGBoost too, but that's fine for this context
        # Alternatively we can just do the RL part. I will call train_all_models since it builds everything.
        try:
            from rl_optimizer import RLOptimizer, build_training_data_from_cases
            import pandas as pd_local
            tx_path = os.path.join(data_dir, "training_transactions.csv")
            feat_path = os.path.join(data_dir, "training_features.csv")
            if not os.path.exists(tx_path) or not os.path.exists(feat_path):
                from generate_training_data import generate_training_dataset
                generate_training_dataset(num_cases=300, seed=42, output_dir=data_dir)
            
            tx_df = pd_local.read_csv(tx_path)
            rl_txs = tx_df.to_dict('records')
            
            feat_df = pd_local.read_csv(feat_path)
            rl_cids = feat_df['case_id'].tolist()
            rl_ftypes = dict(zip(feat_df['case_id'], feat_df['fraud_type']))
            
            rl_training_data = build_training_data_from_cases(rl_txs, rl_cids, rl_ftypes)
            
            rl_opt = RLOptimizer()
            rl_opt.train_on_dataset(rl_training_data, epochs=50)
            os.makedirs(models_dir, exist_ok=True)
            rl_opt.save(rl_model_path)
            print(f"  [+] RL training complete. Saved to {rl_model_path}")
        except Exception as e:
            print(f"  [!] Failed to train RL: {e}")
    else:
        print("\n[2.5/7] RL Q-Table found, skipping training.")

    # Step 3: Process each demo case through the full stage sequence
    case_ids = ["CF-1042", "CF-2001", "CF-3001"]
    fraud_types = {
        "CF-1042": "investment_scam",
        "CF-2001": "digital_arrest",
        "CF-3001": "fake_payment_gateway"
    }

    cases_list = []
    graphs_dict = {}
    timelines_dict = {}
    simulations_dict = {}
    raw_alerts_list = []
    validation_dict = {}

    print("\n[3/7] Processing demo cases (validation -> features -> ML -> zone -> ATM)...")
    for case_id in case_ids:
        print(f"  Processing {case_id} ({fraud_types[case_id]})...")
        case_obj, graph_export, timeline, simulations, raw_alert, validation_report = process_case(
            case_id, fraud_types[case_id], transactions, builder, engine
        )
        cases_list.append(case_obj)
        graphs_dict[case_id] = graph_export
        timelines_dict[case_id] = timeline
        simulations_dict[case_id] = simulations
        validation_dict[case_id] = validation_report
        if raw_alert:
            raw_alerts_list.append(raw_alert)

    # Step 4: Hash chain alerts
    print("\n[4/7] Computing SHA-256 alert hash chain...")
    hashed_alerts = compute_alert_hash_chain(raw_alerts_list)

    # Step 5/6: Feature analysis (correlation + significance testing) and
    # legitimate-business evaluation (confusion matrix / precision /
    # recall / F1) — run once over the training dataset, not per case.
    print("\n[5/7] Running feature analysis (correlation + significance testing)...")
    try:
        from feature_analysis import run_feature_analysis
        feature_analysis_result = run_feature_analysis(data_dir=data_dir)
    except Exception as e:
        print(f"  [!] Feature analysis skipped: {e}")
        feature_analysis_result = None

    print("\n[6/7] Running legitimate-business evaluation (confusion matrix / P / R / F1)...")
    try:
        from evaluation import run_evaluation
        evaluation_result = run_evaluation(data_dir=data_dir, models_dir=models_dir)
    except Exception as e:
        print(f"  [!] Evaluation skipped: {e}")
        evaluation_result = None

    # Step 7: Assemble master export
    print("\n[7/7] Assembling case_export.json...")
    master_export = {
        "cases": cases_list,
        "graphs": graphs_dict,
        "timelines": timelines_dict,
        "alerts": hashed_alerts,
        "simulations": simulations_dict,
        "data_validation": validation_dict,
        "model_proof": _build_model_proof(engine, models_dir),
        "feature_analysis": feature_analysis_result,
        "evaluation_report": evaluation_result,
    }

    export_path = os.path.join(base_dir, "case_export.json")
    with open(export_path, "w", encoding="utf-8") as f:
        json.dump(master_export, f, indent=2)

    print(f"\nPipeline complete!")
    print(f"  Export saved to: {export_path}")
    print(f"  Cases:       {len(cases_list)}")
    print(f"  Alerts:      {len(hashed_alerts)}")
    print(f"  Mode:        {'ML (XGBoost)' if engine.using_ml else 'Rule-based fallback'}")
    print("=" * 60)

    return export_path


if __name__ == "__main__":
    run_pipeline()
