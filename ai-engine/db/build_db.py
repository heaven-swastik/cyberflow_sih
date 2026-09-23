"""
Builds a real SQLite database (cyberflow.db) from case_export.json,
following db/schema.sql exactly.

This is intentionally a separate, explicit step from pipeline.py (run it
after pipeline.py) rather than folding SQL writes into the pipeline itself
-- it keeps "generate the AI/contract JSON" and "materialize the relational
database from that JSON" as two clearly separable concerns, which mirrors
how a real system would have an ETL/ingest job write into a database
independently of the model-serving path.

Usage:
    python3 pipeline.py          # produces ../case_export.json
    python3 db/build_db.py       # produces db/cyberflow.db + db/db_preview.json
                                  # and copies both into ../../backend/db/

Also writes db/db_preview.json: a small, pre-computed snapshot (table list
with row counts + two illustrative joined queries with their results) that
the Node backend serves statically, so the "Database" panel in the UI can
show real query output without requiring a live DB connection from the
Node process on stage.
"""

import json
import os
import shutil
import sqlite3

HERE = os.path.dirname(os.path.abspath(__file__))
AI_ENGINE_DIR = os.path.dirname(HERE)
SCHEMA_PATH = os.path.join(HERE, "schema.sql")
DB_PATH = os.path.join(HERE, "cyberflow.db")
CASE_EXPORT_PATH = os.path.join(AI_ENGINE_DIR, "case_export.json")
PREVIEW_PATH = os.path.join(HERE, "db_preview.json")
BACKEND_DB_DIR = os.path.join(AI_ENGINE_DIR, "..", "backend", "db")


def _load_case_export():
    with open(CASE_EXPORT_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _account_type_from_node_type(node_type):
    return {"victim": "victim", "account": "account", "merchant": "merchant"}.get(node_type, "account")


def build_database(export):
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)

    conn = sqlite3.connect(DB_PATH)
    conn.executescript(open(SCHEMA_PATH, "r", encoding="utf-8").read())
    cur = conn.cursor()

    for case in export["cases"]:
        case_id = case["case_id"]
        complaint = case.get("complaint") or {}
        device = case.get("device_location") or {}
        graph = export["graphs"].get(case_id, {"nodes": [], "edges": []})

        complainant_id = f"COMPLAINANT-{case_id}"
        cur.execute(
            "INSERT OR IGNORE INTO Complainant VALUES (?,?,?,?,?)",
            (complainant_id, complaint.get("complainant_name", "Unknown"),
             complaint.get("complainant_phone_masked"), None, None),
        )
        cur.execute(
            "INSERT OR IGNORE INTO Complaint VALUES (?,?,?,?,?,?,?)",
            (case_id, complainant_id, complaint.get("filed_at"), case.get("fraud_type"),
             complaint.get("description"), "UNDER_INVESTIGATION", case.get("intervention_priority")),
        )

        # Accounts + ComplaintAccount, from graph nodes (excludes zone/complaint/device/atm nodes)
        for n in graph["nodes"]:
            if n["type"] in ("victim", "account", "merchant"):
                cur.execute(
                    "INSERT OR IGNORE INTO Account VALUES (?,?,?,?)",
                    (n["id"], _account_type_from_node_type(n["type"]), n["label"], None),
                )
                cur.execute(
                    "INSERT OR IGNORE INTO ComplaintAccount VALUES (?,?,?)",
                    (case_id, n["id"], n["type"]),
                )

        # Transactions, from graph edges that are real money movements
        # (i.e. have a numeric amount — complaint/device/atm edges don't).
        for i, e in enumerate(graph["edges"]):
            if e.get("amount") is None:
                continue
            txn_id = f"TXN-{case_id}-{i:04d}"
            cur.execute(
                "INSERT OR IGNORE INTO \"Transaction\" VALUES (?,?,?,?,?,?,?)",
                (txn_id, case_id, e["source"], e["target"], e["amount"], e["timestamp"], None),
            )

        # Device + DeviceLocation
        if device:
            cur.execute(
                "INSERT OR IGNORE INTO Device VALUES (?,?,?,?,?)",
                (device["device_id"], case_id, None, device.get("device_fingerprint"),
                 device.get("last_seen_minutes_ago")),
            )
            cur.execute(
                "INSERT INTO DeviceLocation VALUES (?,?,?,?,?)",
                (device["device_id"], device["latitude"], device["longitude"],
                 device.get("zone_id"), None),
            )

        # ATMs + WithdrawalHistory
        for w in case.get("withdrawal_history", []):
            cur.execute(
                "INSERT OR IGNORE INTO ATM (atm_id, latitude, longitude, zone_id) VALUES (?,?,?,?)",
                (w["atm_id"], w["latitude"], w["longitude"], w.get("zone_id")),
            )
            cur.execute(
                "INSERT OR IGNORE INTO WithdrawalHistory VALUES (?,?,?,?,?,?)",
                (w["withdrawal_id"], w["account_id"], w["atm_id"], w["amount_inr"],
                 w["days_ago"], int(bool(w.get("is_flagged")))),
            )

        # Prediction + PredictionFeature, from the ranked ATM candidates
        # and the classifier's explanation trace.
        atm_candidates = case.get("atm_candidates", [])
        if atm_candidates:
            top = atm_candidates[0]
            cur.execute(
                "INSERT OR IGNORE INTO ATM VALUES (?,?,?,?,?,?,?)",
                (top["atm_id"], top["bank_name"], top["latitude"], top["longitude"],
                 top["address"], top["city"], top["zone_id"]),
            )
            prediction_id = f"PRED-{case_id}"
            window = case.get("expected_time_window_minutes", [None, None])
            cur.execute(
                "INSERT OR IGNORE INTO Prediction VALUES (?,?,?,?,?,?,?,?,?)",
                (prediction_id, case_id, top["atm_id"], top["confidence"],
                  window[0], window[1], case.get("network_risk"),
                  case.get("model_mode"), case.get("updated_at")),
            )
            for rank, feat in enumerate(case.get("explanation", [])):
                cur.execute(
                    "INSERT OR IGNORE INTO PredictionFeature VALUES (?,?,?)",
                    (prediction_id, feat, rank),
                )

    # Alerts
    for alert in export.get("alerts", []):
        cur.execute(
            "INSERT OR IGNORE INTO Alert VALUES (?,?,?,?,?,?,?)",
            (alert.get("alert_id"), alert.get("case_id"), "LEA/Bank", alert.get("created_at"),
             "DISPATCHED", alert.get("hash"), alert.get("prev_hash")),
        )

    conn.commit()
    return conn


TABLE_ORDER = [
    "Complainant", "Complaint", "Account", "ComplaintAccount", '"Transaction"',
    "Device", "DeviceLocation", "ATM", "WithdrawalHistory", "Prediction",
    "PredictionFeature", "Alert",
]

SAMPLE_QUERIES = [
    {
        "title": "Resolve one complaint's full entity chain",
        "sql": (
            "SELECT c.complaint_id, a.account_id, a.account_type, t.to_account_id, "
            "t.amount_inr\n"
            "FROM Complaint c\n"
            "JOIN ComplaintAccount ca ON ca.complaint_id = c.complaint_id\n"
            "JOIN Account a ON a.account_id = ca.account_id\n"
            "JOIN \"Transaction\" t ON t.from_account_id = a.account_id\n"
            "WHERE c.complaint_id = 'CF-1042'\n"
            "LIMIT 8;"
        ),
    },
    {
        "title": "Rank predicted ATMs with supporting evidence",
        "sql": (
            "SELECT p.complaint_id, p.predicted_atm_id, p.confidence, pf.feature_name\n"
            "FROM Prediction p\n"
            "JOIN PredictionFeature pf ON pf.prediction_id = p.prediction_id\n"
            "ORDER BY p.complaint_id, pf.rank_order\n"
            "LIMIT 8;"
        ),
    },
    {
        "title": "Find accounts with withdrawal history near the predicted ATM's zone",
        "sql": (
            "SELECT wh.account_id, wh.atm_id, atm.zone_id, wh.amount_inr, wh.days_ago\n"
            "FROM WithdrawalHistory wh\n"
            "JOIN ATM atm ON atm.atm_id = wh.atm_id\n"
            "ORDER BY wh.days_ago ASC\n"
            "LIMIT 8;"
        ),
    },
]


def build_preview(conn):
    cur = conn.cursor()
    tables = []
    for t in TABLE_ORDER:
        raw_name = t.strip('"')
        cur.execute(f"PRAGMA table_info({t})")
        cols = [r[1] for r in cur.fetchall()]
        cur.execute(f"SELECT COUNT(*) FROM {t}")
        count = cur.fetchone()[0]
        tables.append({"name": raw_name, "columns": cols, "row_count": count})

    queries = []
    for q in SAMPLE_QUERIES:
        cur.execute(q["sql"])
        col_names = [d[0] for d in cur.description]
        rows = [dict(zip(col_names, row)) for row in cur.fetchall()]
        queries.append({"title": q["title"], "sql": q["sql"], "columns": col_names, "rows": rows})

    return {"tables": tables, "sample_queries": queries}


def main():
    export = _load_case_export()
    conn = build_database(export)
    preview = build_preview(conn)

    with open(PREVIEW_PATH, "w", encoding="utf-8") as f:
        json.dump(preview, f, indent=2)

    os.makedirs(BACKEND_DB_DIR, exist_ok=True)
    shutil.copy(SCHEMA_PATH, os.path.join(BACKEND_DB_DIR, "schema.sql"))
    shutil.copy(PREVIEW_PATH, os.path.join(BACKEND_DB_DIR, "db_preview.json"))
    shutil.copy(DB_PATH, os.path.join(BACKEND_DB_DIR, "cyberflow.db"))

    conn.close()

    print("=" * 60)
    print("CYBERFLOW DATABASE BUILD")
    print("=" * 60)
    for t in preview["tables"]:
        print(f"  {t['name']:<20} {t['row_count']:>4} rows   ({', '.join(t['columns'])})")
    print(f"\n  SQLite DB:   {DB_PATH}")
    print(f"  Preview:     {PREVIEW_PATH}")
    print(f"  Copied to:   {BACKEND_DB_DIR}")
    print("=" * 60)


if __name__ == "__main__":
    main()
