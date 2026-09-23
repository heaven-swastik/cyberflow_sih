-- ============================================================================
-- CyberFlow relational schema
--
-- Implements the entity chain the product is built around:
--
--   Complainant -> Complaint -> (ComplaintAccount) -> Account -> Transaction
--        -> Device -> DeviceLocation -> ATM -> WithdrawalHistory
--        -> Prediction -> PredictionFeature -> Alert
--
-- This file is the single source of truth for the schema. It is executed
-- by db/build_db.py, which populates it from the same synthetic case data
-- that drives case_export.json (see ai-engine/pipeline.py). SQLite is used
-- for a zero-setup demo; every table/relationship here maps 1:1 onto a
-- Postgres/MySQL schema with no structural changes required.
-- ============================================================================

PRAGMA foreign_keys = ON;

CREATE TABLE Complainant (
    complainant_id      TEXT PRIMARY KEY,
    name                TEXT NOT NULL,
    phone_masked        TEXT,
    state               TEXT,
    district            TEXT
);

CREATE TABLE Complaint (
    complaint_id        TEXT PRIMARY KEY,
    complainant_id      TEXT NOT NULL REFERENCES Complainant(complainant_id),
    filed_at            TEXT NOT NULL,
    fraud_type          TEXT NOT NULL,
    description         TEXT,
    status              TEXT NOT NULL DEFAULT 'UNDER_INVESTIGATION',
    priority             TEXT
);

CREATE TABLE Account (
    account_id          TEXT PRIMARY KEY,
    account_type        TEXT NOT NULL,   -- victim | account (mule/consolidation) | merchant
    label               TEXT,
    bank_name           TEXT
);

-- Many-to-many: one complaint can touch many accounts; one account
-- (e.g. a reused mule account) can appear across multiple complaints.
CREATE TABLE ComplaintAccount (
    complaint_id        TEXT NOT NULL REFERENCES Complaint(complaint_id),
    account_id          TEXT NOT NULL REFERENCES Account(account_id),
    role                TEXT,            -- e.g. 'victim_source', 'mule', 'consolidation_hub'
    PRIMARY KEY (complaint_id, account_id)
);

CREATE TABLE "Transaction" (
    txn_id              TEXT PRIMARY KEY,
    complaint_id        TEXT NOT NULL REFERENCES Complaint(complaint_id),
    from_account_id     TEXT NOT NULL REFERENCES Account(account_id),
    to_account_id       TEXT NOT NULL REFERENCES Account(account_id),
    amount_inr          REAL NOT NULL,
    txn_timestamp       TEXT NOT NULL,
    zone_id             TEXT
);

CREATE TABLE Device (
    device_id           TEXT PRIMARY KEY,
    complaint_id        TEXT REFERENCES Complaint(complaint_id),
    account_id          TEXT REFERENCES Account(account_id),
    device_fingerprint  TEXT,
    last_seen_minutes_ago INTEGER
);

CREATE TABLE DeviceLocation (
    device_id           TEXT NOT NULL REFERENCES Device(device_id),
    latitude             REAL NOT NULL,
    longitude            REAL NOT NULL,
    zone_id             TEXT,
    recorded_at         TEXT
);

CREATE TABLE ATM (
    atm_id              TEXT PRIMARY KEY,
    bank_name           TEXT,
    latitude            REAL NOT NULL,
    longitude           REAL NOT NULL,
    address             TEXT,
    city                TEXT,
    zone_id             TEXT
);

CREATE TABLE WithdrawalHistory (
    withdrawal_id       TEXT PRIMARY KEY,
    account_id          TEXT NOT NULL REFERENCES Account(account_id),
    atm_id              TEXT NOT NULL REFERENCES ATM(atm_id),
    amount_inr          REAL,
    days_ago            INTEGER,
    is_flagged          INTEGER DEFAULT 0
);

CREATE TABLE Prediction (
    prediction_id       TEXT PRIMARY KEY,
    complaint_id        TEXT NOT NULL REFERENCES Complaint(complaint_id),
    predicted_atm_id     TEXT REFERENCES ATM(atm_id),
    confidence           REAL,
    time_window_start_min INTEGER,
    time_window_end_min   INTEGER,
    risk_score           REAL,
    model_mode           TEXT,          -- 'ML (XGBoost)' | 'Rule-based fallback'
    created_at            TEXT
);

CREATE TABLE PredictionFeature (
    prediction_id        TEXT NOT NULL REFERENCES Prediction(prediction_id),
    feature_name          TEXT NOT NULL,
    rank_order            INTEGER,
    PRIMARY KEY (prediction_id, feature_name)
);

CREATE TABLE Alert (
    alert_id              TEXT PRIMARY KEY,
    complaint_id          TEXT NOT NULL REFERENCES Complaint(complaint_id),
    sent_to               TEXT,          -- 'LEA' | 'Bank'
    sent_at               TEXT,
    status                TEXT,
    alert_hash             TEXT,
    prev_alert_hash        TEXT
);

-- Helpful indexes for the joins the app actually runs.
CREATE INDEX idx_txn_complaint ON "Transaction"(complaint_id);
CREATE INDEX idx_txn_from ON "Transaction"(from_account_id);
CREATE INDEX idx_txn_to ON "Transaction"(to_account_id);
CREATE INDEX idx_withdrawal_account ON WithdrawalHistory(account_id);
CREATE INDEX idx_withdrawal_atm ON WithdrawalHistory(atm_id);
CREATE INDEX idx_complaintaccount_account ON ComplaintAccount(account_id);
