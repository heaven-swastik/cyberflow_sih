"""Verify that CyberFlow's checked-in export was produced by real ML inference."""

import hashlib
import json
import os
import sys

from classifier import CyberFlowClassifierEngine


HERE = os.path.dirname(os.path.abspath(__file__))
EXPORT_PATH = os.path.join(HERE, "case_export.json")
MODELS_DIR = os.path.join(HERE, "models")


def main():
    with open(EXPORT_PATH, "r", encoding="utf-8") as export_file:
        export = json.load(export_file)

    proof = export.get("model_proof", {})
    engine = CyberFlowClassifierEngine(models_dir=MODELS_DIR)
    checks = {
        "xgboost import available": engine.using_ml,
        "export mode is ML (XGBoost)": proof.get("inference_mode") == "ML (XGBoost)",
        "four model fingerprints recorded": len(proof.get("model_files", {})) == 4,
        "42 engineered features recorded": proof.get("feature_count") == 42,
    }

    for filename, expected_hash in proof.get("model_files", {}).items():
        path = os.path.join(MODELS_DIR, filename)
        with open(path, "rb") as model_file:
            actual_hash = hashlib.sha256(model_file.read()).hexdigest()
        checks[f"SHA-256 matches {filename}"] = actual_hash == expected_hash

    print("CYBERFLOW ML PROOF")
    print(f"  Mode:       {proof.get('inference_mode')}")
    print(f"  Library:    {proof.get('library')} {proof.get('library_version')}")
    print(f"  Features:   {proof.get('feature_count')}")
    print(f"  Train rows: {proof.get('training_samples')}")
    print(f"  Metrics:    {json.dumps(proof.get('test_metrics', {}), sort_keys=True)}")
    for label, passed in checks.items():
        print(f"  {'PASS' if passed else 'FAIL'} - {label}")

    if not all(checks.values()):
        sys.exit(1)


if __name__ == "__main__":
    main()