"""
CyberFlow — Contextual / Behavioural Feature Engineering.

Purpose (see task requirement 5): a single large transaction should NOT,
by itself, be treated as suspicious. This module computes the contextual
signals that let the model judge a transaction against the account's own
behaviour instead of its raw amount alone:

  - transaction history / recurrence  (recurring small payments vs. a
    one-off burst)
  - velocity & fan-in/fan-out          (already computed in
    generate_training_data.compute_case_features — not duplicated here)
  - timing                             (business-hours ratio, hour-of-day
    spread)
  - device consistency                 (same device reused vs. new
    "burner" device per hop)
  - geographic behaviour                (how far apart the zones touched
    by this case actually are)

`compute_case_features()` in generate_training_data.py calls
`compute_behavioral_features()` below so the SAME function runs at
training time and at inference time (including for complaints filed
through the NCRP-style intake — see complaint_intake.py).

Device fingerprints are 100% synthetic and deterministic (seeded by
case_id), same "reproducible demo, not random-every-refresh" policy as
atm_engine.py. They are a modelling assumption for this synthetic
prototype, not a claim about any real device-fingerprinting capability.
"""

import hashlib
import math
import random

# Same 3 metro hubs used everywhere else in the engine (atm_engine.py,
# generate_data.py, generate_training_data.py).
ZONE_COORDS = {
    "zone_a": {"lat": 28.6139, "lng": 77.2090},
    "zone_b": {"lat": 22.5726, "lng": 88.3639},
    "zone_c": {"lat": 19.0760, "lng": 72.8777},
}

# Probability that an account's NEXT outgoing transaction is sent from a
# newly-seen device rather than one it has used before in this case. This
# is a documented synthetic modelling choice (not measured from any real
# device telemetry): mule/burner-style operations churn devices, a
# recurring legitimate payer does not.
DEVICE_CHURN_PROB = {
    "investment_scam": 0.35,
    "digital_arrest": 0.55,
    "fake_payment_gateway": 0.30,
    "legitimate_business": 0.02,
}
DEFAULT_CHURN_PROB = 0.30

BUSINESS_HOUR_START = 9
BUSINESS_HOUR_END = 18


def _seeded_rng(*parts):
    key = "|".join(str(p) for p in parts)
    seed = int(hashlib.sha256(key.encode()).hexdigest()[:12], 16)
    return random.Random(seed)


def assign_device_fingerprints(transactions):
    """
    Mutates & returns `transactions` (list of dicts, already containing
    case_id / source_account / timestamp) with a `device_fingerprint`
    field attached to each. Deterministic per case_id.

    Transactions for a case are processed in timestamp order; each
    source account gets a device fingerprint, which is either reused or
    replaced with a fresh one on each subsequent transaction from that
    account, per DEVICE_CHURN_PROB[fraud_type].
    """
    by_case = {}
    for t in transactions:
        by_case.setdefault(t["case_id"], []).append(t)

    for case_id, case_txs in by_case.items():
        case_txs.sort(key=lambda t: t["timestamp"])
        fraud_type = case_txs[0].get("fraud_type") if case_txs else None
        churn_prob = DEVICE_CHURN_PROB.get(fraud_type, DEFAULT_CHURN_PROB)
        rng = _seeded_rng("device-fingerprint", case_id)
        last_device = {}
        device_counter = {}

        for t in case_txs:
            acc = t["source_account"]
            if acc not in last_device or rng.random() < churn_prob:
                device_counter[acc] = device_counter.get(acc, 0) + 1
                fp_seed = f"{case_id}:{acc}:{device_counter[acc]}"
                fp = "fp_" + hashlib.sha256(fp_seed.encode()).hexdigest()[:10]
                last_device[acc] = fp
            t["device_fingerprint"] = last_device[acc]

    return transactions


def _haversine_km(lat1, lng1, lat2, lng2):
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def compute_behavioral_features(df):
    """
    Given a pandas DataFrame of ONE case's transactions (must contain
    columns: source_account, amount, dt (parsed timestamp),
    location_id, and device_fingerprint if available), return the
    contextual/behavioural feature dict described in the module
    docstring.

    All ratios are bounded [0, 1] except *_km and *_std, which are raw
    magnitudes. When a case has too few transactions to establish a
    behavioural pattern (tx_count < 3), recurrence/device features fall
    back to a neutral midpoint rather than a confident 0 or 1 — this
    feeds the "insufficient evidence" check in classifier.py rather than
    silently guessing.
    """
    tx_count = len(df)
    if tx_count == 0:
        return _empty_behavioral_features()

    amounts = df["amount"].astype(float)
    mean_amount = float(amounts.mean())
    std_amount = float(amounts.std()) if tx_count > 1 else 0.0

    # ── Transaction-history / recurrence ──
    num_unique_source = df["source_account"].nunique()
    account_reuse_ratio = round(tx_count / max(num_unique_source, 1), 3)

    if tx_count >= 3:
        # Bucket amounts to the nearest 10% of the median amount and find
        # the largest recurring cluster — captures "many similar small
        # payments" regardless of exact paise-level differences.
        median_amount = float(amounts.median()) or 1.0
        bucket_width = max(median_amount * 0.10, 1.0)
        buckets = (amounts / bucket_width).round().astype(int)
        largest_cluster = int(buckets.value_counts().iloc[0])
        recurring_amount_ratio = round(largest_cluster / tx_count, 3)
    else:
        recurring_amount_ratio = 0.5  # neutral — not enough history to judge

    amount_cv = round(std_amount / mean_amount, 3) if mean_amount > 0 else 0.0
    max_to_mean_amount_ratio = round(float(amounts.max()) / mean_amount, 3) if mean_amount > 0 else 0.0

    # ── Timing ──
    hours = df["dt"].dt.hour
    business_hours_ratio = round(
        float(((hours >= BUSINESS_HOUR_START) & (hours < BUSINESS_HOUR_END)).mean()), 3
    )
    hour_of_day_std = round(float(hours.std()), 3) if tx_count > 1 else 0.0

    # ── Device consistency ──
    if "device_fingerprint" in df.columns and df["device_fingerprint"].notna().any():
        distinct_device_count = int(df["device_fingerprint"].nunique())
        if tx_count > 1:
            device_consistency_ratio = round(
                max(0.0, 1.0 - (distinct_device_count - 1) / (tx_count - 1)), 3
            )
        else:
            device_consistency_ratio = 1.0
    else:
        distinct_device_count = 0
        device_consistency_ratio = 0.5  # unknown — neutral, not a claim either way

    # ── Geographic behaviour ──
    zones_touched = sorted(set(df["location_id"].dropna().unique().tolist()))
    max_zone_distance_km = 0.0
    for i in range(len(zones_touched)):
        for j in range(i + 1, len(zones_touched)):
            za, zb = zones_touched[i], zones_touched[j]
            if za in ZONE_COORDS and zb in ZONE_COORDS:
                d = _haversine_km(
                    ZONE_COORDS[za]["lat"], ZONE_COORDS[za]["lng"],
                    ZONE_COORDS[zb]["lat"], ZONE_COORDS[zb]["lng"],
                )
                max_zone_distance_km = max(max_zone_distance_km, d)
    max_zone_distance_km = round(max_zone_distance_km, 1)

    return {
        "account_reuse_ratio": account_reuse_ratio,
        "amount_cv": amount_cv,
        "max_to_mean_amount_ratio": max_to_mean_amount_ratio,
        "recurring_amount_ratio": recurring_amount_ratio,
        "distinct_device_count": distinct_device_count,
        "device_consistency_ratio": device_consistency_ratio,
        "business_hours_ratio": business_hours_ratio,
        "hour_of_day_std": hour_of_day_std,
        "max_zone_distance_km": max_zone_distance_km,
    }


def _empty_behavioral_features():
    return {
        "account_reuse_ratio": 0.0,
        "amount_cv": 0.0,
        "max_to_mean_amount_ratio": 0.0,
        "recurring_amount_ratio": 0.0,
        "distinct_device_count": 0,
        "device_consistency_ratio": 0.0,
        "business_hours_ratio": 0.0,
        "hour_of_day_std": 0.0,
        "max_zone_distance_km": 0.0,
    }


# Feature names this module contributes to the shared FEATURE_COLS list
# in generate_training_data.py — kept here so both files stay in sync.
BEHAVIORAL_FEATURE_COLS = [
    "account_reuse_ratio",
    "amount_cv",
    "max_to_mean_amount_ratio",
    "recurring_amount_ratio",
    "distinct_device_count",
    "device_consistency_ratio",
    "business_hours_ratio",
    "hour_of_day_std",
    "max_zone_distance_km",
]
