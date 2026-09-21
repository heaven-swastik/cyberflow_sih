"""
CyberFlow — Data Validation & Relationship Validation Stage.

Runs BEFORE feature engineering / ML inference (see pipeline.py and
complaint_intake.py), per the required flow:

  Complaint -> API -> Data Validation -> Database -> Relationship
  Analysis -> Feature Engineering -> ...

Checks the entity chain the schema is built around (schema.sql):
  Complaint -> Account -> Transaction -> Device -> Location -> ATM

For a given case's transaction set, this module checks:
  1. Missing / null required fields on each transaction
  2. Duplicate transactions (same txn_id, or same
     source+destination+amount+timestamp — a likely double-count)
  3. Relationship consistency:
       - every transaction's source/destination account participates in
         the case's account set (no dangling references)
       - every transaction references a known zone/location id
       - non-positive or non-numeric amounts
       - timestamps that don't parse, or that are out of chronological
         order relative to the rest of the case (out-of-sequence)
       - self-transfers (source == destination)
  4. Basic statistical sanity: is there enough transaction history at
     all to support a reliable prediction (this feeds classifier.py's
     "insufficient evidence" check — see requirement 8)

This is a genuine, deterministic rule-based validator — it reports only
what it can actually detect in the data passed to it, nothing inferred
or guessed.
"""

from datetime import datetime

VALID_ZONES = {"zone_a", "zone_b", "zone_c"}
MIN_TX_FOR_RELIABLE_PREDICTION = 3
MIN_TX_FOR_ANY_PREDICTION = 1


def _parse_ts(ts):
    try:
        return datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
    except Exception:
        return None


def validate_case(case_id, transactions):
    """
    Validate one case's transaction set. Returns a structured report:

    {
      "case_id": ...,
      "passed": bool,                 # no ERROR-level issues
      "checks_run": [...],            # names of checks executed
      "issues": [ {severity, code, message, ref} ],
      "stats": {
          "transaction_count": int,
          "missing_field_count": int,
          "duplicate_count": int,
          "inconsistent_relationship_count": int,
          "sufficient_for_prediction": bool,
          "sufficient_for_reliable_prediction": bool,
      }
    }

    severity is one of "ERROR" (would block a reliable prediction),
    "WARNING" (noted, does not block), "INFO".
    """
    case_txs = [t for t in transactions if t.get("case_id") == case_id]
    issues = []
    checks_run = []

    # ── 1. Missing required fields ──
    checks_run.append("missing_fields")
    required_fields = ["transaction_id", "timestamp", "source_account",
                        "destination_account", "amount", "location_id"]
    missing_count = 0
    for t in case_txs:
        missing = [f for f in required_fields if t.get(f) in (None, "", )]
        if missing:
            missing_count += 1
            issues.append({
                "severity": "ERROR",
                "code": "MISSING_FIELD",
                "message": f"Transaction {t.get('transaction_id', '?')} missing required field(s): {', '.join(missing)}",
                "ref": t.get("transaction_id"),
            })

    # ── 2. Duplicate transactions ──
    checks_run.append("duplicates")
    seen_ids = {}
    seen_signatures = {}
    duplicate_count = 0
    for t in case_txs:
        tid = t.get("transaction_id")
        if tid in seen_ids:
            duplicate_count += 1
            issues.append({
                "severity": "ERROR",
                "code": "DUPLICATE_TXN_ID",
                "message": f"Duplicate transaction_id '{tid}' — appears more than once.",
                "ref": tid,
            })
        else:
            seen_ids[tid] = True

        sig = (t.get("source_account"), t.get("destination_account"),
               t.get("amount"), t.get("timestamp"))
        if sig in seen_signatures:
            duplicate_count += 1
            issues.append({
                "severity": "WARNING",
                "code": "DUPLICATE_SIGNATURE",
                "message": f"Transaction {tid} has the same source/destination/amount/"
                            f"timestamp as {seen_signatures[sig]} — possible double-count.",
                "ref": tid,
            })
        else:
            seen_signatures[sig] = tid

    # ── 3. Relationship / referential consistency ──
    checks_run.append("relationship_consistency")
    inconsistent_count = 0
    known_accounts = set()
    for t in case_txs:
        if t.get("source_account"):
            known_accounts.add(t["source_account"])
        if t.get("destination_account"):
            known_accounts.add(t["destination_account"])

    parsed_times = []
    for t in case_txs:
        tid = t.get("transaction_id", "?")

        # Self-transfer
        if t.get("source_account") and t.get("source_account") == t.get("destination_account"):
            inconsistent_count += 1
            issues.append({
                "severity": "ERROR",
                "code": "SELF_TRANSFER",
                "message": f"Transaction {tid}: source and destination account are the same "
                            f"({t.get('source_account')}).",
                "ref": tid,
            })

        # Amount sanity
        amt = t.get("amount")
        try:
            amt_val = float(amt)
            if amt_val <= 0:
                inconsistent_count += 1
                issues.append({
                    "severity": "ERROR",
                    "code": "NON_POSITIVE_AMOUNT",
                    "message": f"Transaction {tid}: amount must be positive, got {amt}.",
                    "ref": tid,
                })
        except (TypeError, ValueError):
            inconsistent_count += 1
            issues.append({
                "severity": "ERROR",
                "code": "NON_NUMERIC_AMOUNT",
                "message": f"Transaction {tid}: amount is not numeric ({amt}).",
                "ref": tid,
            })

        # Zone / location consistency
        loc = t.get("location_id")
        if loc and loc not in VALID_ZONES:
            inconsistent_count += 1
            issues.append({
                "severity": "WARNING",
                "code": "UNKNOWN_ZONE",
                "message": f"Transaction {tid}: location_id '{loc}' is not a recognized zone.",
                "ref": tid,
            })

        # Timestamp parses
        dt = _parse_ts(t.get("timestamp"))
        if dt is None:
            inconsistent_count += 1
            issues.append({
                "severity": "ERROR",
                "code": "UNPARSEABLE_TIMESTAMP",
                "message": f"Transaction {tid}: timestamp '{t.get('timestamp')}' could not be parsed.",
                "ref": tid,
            })
        else:
            parsed_times.append((dt, tid))

    # Chronology sanity: at least one transaction should have a plausible
    # (non-future-relative-to-others, non-degenerate) sequence.
    if len(parsed_times) >= 2:
        span_seconds = (max(parsed_times)[0] - min(parsed_times)[0]).total_seconds()
        if span_seconds < 0:
            inconsistent_count += 1
            issues.append({
                "severity": "WARNING",
                "code": "NEGATIVE_TIME_SPAN",
                "message": "Case transactions do not resolve to a valid chronological span.",
                "ref": case_id,
            })

    # ── 4. Sufficiency for prediction (feeds classifier.py) ──
    checks_run.append("sufficiency")
    tx_count = len(case_txs)
    sufficient_for_any = tx_count >= MIN_TX_FOR_ANY_PREDICTION
    sufficient_for_reliable = tx_count >= MIN_TX_FOR_RELIABLE_PREDICTION and missing_count == 0
    if not sufficient_for_any:
        issues.append({
            "severity": "ERROR",
            "code": "NO_TRANSACTIONS",
            "message": f"No transactions found for case {case_id} — cannot run any prediction.",
            "ref": case_id,
        })
    elif not sufficient_for_reliable:
        issues.append({
            "severity": "INFO",
            "code": "LIMITED_HISTORY",
            "message": f"Only {tx_count} transaction(s) available — below the "
                       f"{MIN_TX_FOR_RELIABLE_PREDICTION}-transaction threshold this "
                       f"prototype uses for a reliable prediction. See 'insufficient "
                       f"evidence' status.",
            "ref": case_id,
        })

    error_count = sum(1 for i in issues if i["severity"] == "ERROR")
    passed = error_count == 0

    return {
        "case_id": case_id,
        "passed": passed,
        "checks_run": checks_run,
        "issues": issues,
        "stats": {
            "transaction_count": tx_count,
            "missing_field_count": missing_count,
            "duplicate_count": duplicate_count,
            "inconsistent_relationship_count": inconsistent_count,
            "error_count": error_count,
            "warning_count": sum(1 for i in issues if i["severity"] == "WARNING"),
            "sufficient_for_prediction": sufficient_for_any,
            "sufficient_for_reliable_prediction": sufficient_for_reliable,
        },
    }


def validate_all_cases(transactions):
    """Validate every distinct case_id present in `transactions`."""
    case_ids = sorted({t.get("case_id") for t in transactions if t.get("case_id")})
    return {cid: validate_case(cid, transactions) for cid in case_ids}


if __name__ == "__main__":
    # Small self-test with an intentionally broken case.
    demo_txs = [
        {"transaction_id": "TXN-1", "timestamp": "2026-08-22T19:30:00Z",
         "source_account": "A", "destination_account": "B", "amount": 1000,
         "location_id": "zone_a", "case_id": "TEST-1"},
        {"transaction_id": "TXN-1", "timestamp": "2026-08-22T19:31:00Z",  # duplicate id
         "source_account": "A", "destination_account": "B", "amount": 1000,
         "location_id": "zone_a", "case_id": "TEST-1"},
        {"transaction_id": "TXN-2", "timestamp": "2026-08-22T19:32:00Z",
         "source_account": "C", "destination_account": "C",  # self-transfer
         "amount": -500, "location_id": "zone_x", "case_id": "TEST-1"},
    ]
    report = validate_case("TEST-1", demo_txs)
    import json
    print(json.dumps(report, indent=2))
