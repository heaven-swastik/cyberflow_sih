# CyberFlow — AI/Data Engine

The AI/Data engine for **CyberFlow**, a proactive cyber-financial crime intelligence prototype built for SIH 2026 (Ministry of Home Affairs / I4C theme).

---

## Deliverables & Architecture

- **`case_export.json`**: Static precomputed integration export matching `00_SHARED_CONTRACT.md` and `01_PROMPT_AI_DATA.md` exactly.
- **`generate_data.py`**: Synthetic transaction data generator for `investment_scam`, `digital_arrest`, and `fake_payment_gateway`.
- **`graph_builder.py`**: Directed crime topology graph builder using NetworkX.
- **`feature_engineer.py`**: Pandas/NumPy feature extractor for velocity, holding time, hop depth, fan-in/fan-out, and spatial footprint.
- **`classifier.py`**: Trained XGBoost inference with a documented rule-based fallback, location scorer, intervention simulation, and SHA-256 alert hash chainer.
- **`pipeline.py`**: End-to-end master orchestration pipeline script.
- **`validator.py`**: Sanity and contract validation test suite.
- **`verify_ml.py`**: Machine-checkable proof that the export used the four trained XGBoost artifacts.
- **`run_demo.py`**: Cross-platform regeneration, validation, ML verification, database build, and backend sync.
- **`notebooks/cyberflow_ai_engine.ipynb`**: Colab-ready notebook for interactive data exploration and model training/evaluation setup.

---

## How to Run & Regenerate Exports

### 1. Install Dependencies
```bash
python -m pip install -r requirements.txt
```

### 2. Run the End-to-End Pipeline
```bash
python pipeline.py
```
This generates:
- Synthetic dataset: `data/synthetic_transactions.csv` and `data/synthetic_transactions.json`
- Handoff export: `case_export.json`

### 3. Run Contract Validation Suite
```bash
python validator.py
```
This executes automated sanity checks verifying fixed vocabulary strings, probability range bounds `[0.0, 1.0]`, simulation math invariants (`preventable + remaining == total_exposure`), graph topology, and SHA-256 alert hash-chain integrity.

### 4. Show ML proof to judges
```bash
python verify_ml.py
```
The command fails if XGBoost is unavailable, the export was generated in fallback mode, a model fingerprint is missing, the feature contract changed, or any checked-in model file was changed after export. A successful run prints the active XGBoost version, 42 engineered features, 1,000 synthetic training rows, test metrics, and SHA-256 matches for all four model files.

### 5. One-command demo regeneration
From the repository root:
```bash
python ai-engine/run_demo.py
```
This regenerates `ai-engine/case_export.json`, validates it, verifies ML provenance, rebuilds the SQLite preview, and copies the verified export to `backend/case_export.json` on Windows, macOS, or Linux.

---

## Methodology: Explainable XGBoost

For this 2–3 day hackathon MVP, four **XGBoost gradient-boosted tree models** consume engineered NetworkX/Pandas features: operation state, next action, risk, and intervention priority. The checked-in demo export is generated in ML mode when the dependencies and artifacts are present; the fallback is explicit and never presented as trained inference.
- **Why XGBoost**: Tree models are fast, reproducible, and inspectable. The export records the feature contract, training metrics, library version, and model SHA-256 fingerprints.
- **Explainability**: Human-readable explanations are generated from the same transaction and graph features supplied to the model, while ATM ranking separately exposes its transparent weighted calculation.

---

## Disclaimers & What We Are NOT Claiming

1. **Synthetic Data Only**: All transaction streams, account IDs, names, and spatial coordinates are 100% synthetically generated for demonstration purposes. We do NOT claim access to real NCRP, I4C, RBI, bank, or LEA operational databases.
2. **Decision-Support Tool**: CyberFlow is designed strictly as a probabilistic intelligence and decision-support system to assist law enforcement officers, not as an autonomous decision maker.
3. **Probabilistic Outputs**: All next-action predictions and location candidates represent statistical likelihoods, not guaranteed outcomes.
4. **Synthetic ML Evaluation**: Reported metrics are test-set measurements on synthetic data and are not evidence of production accuracy on real cases.

