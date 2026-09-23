# CyberFlow — SIH Pitch Deck (source notes)

One slide's worth of content per section below. Copy into your deck as-is;
trim further if time-boxed.

---

## 1. Problem Statement

- Cyber-financial fraud (investment scams, "digital arrest" impersonation
  calls, fake payment gateways) moves stolen money through mule-account
  chains **in minutes**, then cashes out at an ATM before police can act.
- Complaints today (NCRP) are filed **after** the harm — reactive, not
  predictive.
- Investigators lack a tool that turns a raw complaint into: *where is
  this heading, how urgent is it, and which ATM should we watch* — with
  evidence, not guesswork.

## 2. Our Solution — CyberFlow

A prediction layer that sits on top of the existing complaint/banking
data chain and answers three questions for every case:
1. **What stage is this fraud at right now?** (collection → layering →
   consolidation → cash-out)
2. **What will happen next, and when?** (predicted action + time window)
3. **Where should we watch?** (probable zone → ranked ATM shortlist)

Built as an **end-to-end working prototype** — not slides, not mockups.

## 3. End-to-End Flow (the actual pipeline)

```
NCRP-style Complaint → API → Data Validation → Database →
Relationship Analysis → Feature Engineering → Statistical Validation →
ML Prediction + Explanation → Probable Zone → ATM Ranking →
Risk/Priority → Alert (hash-chained) → Investigator Dashboard
```

Every stage above is a real, running module — demo this live if possible
(file a complaint on stage, watch the Case ID move through the wizard).

## 4. Data Validation & Relationship Analysis (new)

Before any prediction runs, every case is checked for:
- Missing fields, duplicate transactions
- Broken relationships (self-transfers, unknown zones, bad timestamps)
- **Enough transaction history to trust a prediction at all**

If validation fails or evidence is thin, the system says so — it does
not silently guess. (See "Insufficient Evidence", section 8.)

## 5. Feature Engineering — 42 engineered features

Beyond transaction volume/velocity, we added **contextual behavioural
features** so a single large transaction is never judged in isolation:

| Category | Features |
|---|---|
| Transaction history | recurrence pattern, account reuse ratio |
| Device consistency | distinct devices used, device churn |
| Timing | business-hours ratio, hour-of-day spread |
| Geography | zone spread, max distance between zones touched |
| Network topology | hop depth, fan-in/fan-out, convergence, betweenness |

## 6. Statistical Validation — real numbers, not claims

We ran Pearson correlation + Welch's t-tests on our 1,000-case synthetic
training set (`feature_analysis.py`, reproducible on demand):

- **`max_amount` alone is NOT statistically significant** between fraud
  and legitimate cases (p = 0.72) — a large transaction by itself proves
  nothing.
- **Device consistency** and **account reuse** ARE highly significant
  (p < 0.001) — *how* money moves matters far more than *how much*.

This is the evidence behind our #1 design principle: **don't flag
amount alone.**

## 7. False-Positive Testing — legitimate-business scenarios

We generated realistic legitimate-business cases (recurring small
vendor/payroll payments + one large supplier payment) and ran them
through the trained model on a held-out test split:

| Metric | Value |
|---|---|
| Precision | 1.00 |
| Recall | 0.935 |
| F1 | 0.967 |
| False positives (legit flagged as fraud) | **0 / 30** |

Confusion matrix and methodology are in `evaluation.py` — nothing here
is hand-picked; it's a genuine sklearn evaluation on synthetic held-out
data.

## 8. Explainability + Insufficient Evidence

- Every prediction ships with the **top contributing features**,
  pulled directly from the trained XGBoost model's own feature
  importances — not a canned explanation.
- If a case has too few transactions (<3) to establish a real
  behavioural pattern, the system marks it **"Insufficient Evidence"**
  and does **not** force a confident zone/ATM guess — it flattens
  confidence instead of pretending to know.

## 9. Geolocation — two honest stages, not "exact location"

**Stage A:** Identify a probable **risk zone** (metro-scale area) from
transaction activity + the model's zone confidence.
**Stage B:** *Within* that zone, rank specific ATMs using a transparent
weighted score — 45% zone confidence + 30% historical withdrawal
concentration + 25% proximity to the suspect device's last ping.

We explicitly do **not** claim exact-location prediction — only a
probable zone and a ranked, explainable shortlist.

## 10. NCRP-style Complaint Portal (live demo)

- A complainant fills a short form (name, phone, fraud type, amount,
  description) → gets a **Case ID** immediately.
- That complaint automatically runs through the **entire pipeline**
  above — same code path as our 3 pre-loaded demo cases, no
  special-casing.
- Honest caveat shown in-app: since this prototype has no live
  bank/NPCI transaction feed, the transaction network analyzed is
  synthesized to match the complaint's stated fraud type and amount —
  everything downstream (validation → ML → zone → ATM) runs exactly as
  it would on real data.

## 11. API Integration — CyberFlow as a Prediction Layer

Demonstrates how an existing government/bank system could call
CyberFlow as a service:
- `POST /api/integration/predict`, authenticated via `x-api-key`
- Accepts either an existing `case_id` or a fresh `complaint`
- Returns state, risk, priority, zone/ATM candidates, and explanation
- **Honestly scoped**: this is a demo key/endpoint for the prototype —
  a production integration would use OAuth2/mTLS via an API gateway,
  which we say explicitly in the docs endpoint, not just verbally.

## 12. Architecture (unchanged core, extended honestly)

- **DB:** SQLite — Complainant → Complaint → Account → Transaction →
  Device → Location → ATM → WithdrawalHistory → Prediction → Alert
- **ML:** XGBoost (4 models: state classifier, action predictor, risk
  scorer, priority classifier) — trained on 1,000 synthetic cases,
  test accuracy 93–100% depending on model, R² 0.997 on risk
- **API:** Node/Express backend, all new endpoints additive
- **Frontend:** React investigator wizard — Incident → Correlate →
  Prediction → Map → Action
- **Alert integrity:** SHA-256 **hash-chained** alert log (each alert
  references the previous alert's hash) — tamper-evident like a
  blockchain's block-linking, but a single-node log, **not** a
  distributed blockchain. We say this precisely; we don't overclaim.

## 13. Bug we found and fixed while extending the system

Graph visualization was mislabeling a **collection-hub account** (which
receives from several victims and forwards funds onward) as an extra
"victim," inflating the apparent victim count. Root cause: node roles
were partly inferred from ID-prefix conventions instead of actual
money-flow topology. Fixed to classify strictly by in-degree/out-degree
— now correctly shows victims vs. collection hubs vs. mules vs.
terminal accounts for any case, including freshly-filed complaints.

## 14. What's implemented vs. what's future work

**Implemented (working code, this prototype):**
Data validation, relationship checks, 42-feature engineering, real
statistical testing, false-positive evaluation, insufficient-evidence
handling, two-stage zone→ATM ranking, NCRP-style complaint intake, demo
API integration layer, hash-chained alerts, full XGBoost pipeline.

**Explicitly future / production work (say this out loud to judges):**
- Live bank/NPCI transaction feed integration (currently synthetic data
  only, clearly labeled)
- Production-grade auth (OAuth2/mTLS) for the API integration layer
- Real device-fingerprinting/telemetry (currently a synthetic,
  seeded stand-in used consistently for demonstration)
- A true distributed/append-only ledger if tamper-evidence needs to
  span multiple agencies (today: single-node SHA-256 hash chain)
- Model validation against real fraud casework, not synthetic data

---

## Suggested slide order (12–14 slides)

1. Title
2. Problem statement (§1)
3. Solution overview (§2)
4. End-to-end flow diagram (§3)
5. Data validation (§4)
6. Feature engineering (§5)
7. Statistical proof — "amount alone isn't significant" (§6) ← strong slide
8. False-positive testing results table (§7) ← strong slide
9. Explainability + insufficient evidence (§8)
10. Two-stage geolocation (§9)
11. Live demo: complaint portal (§10) — do this live if you can
12. API integration (§11)
13. Architecture recap + bug fix note (§12–13)
14. Implemented vs. future work (§14) — closes honestly, judges respect this
