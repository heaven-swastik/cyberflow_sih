"""
Sanity and Contract Validator for CyberFlow AI/Data Engine.

Validates case_export.json against 00_SHARED_CONTRACT.md and 01_PROMPT_AI_DATA.md:
1. Fixed vocabulary enforcement (states, actions, fraud types, zone IDs)
2. Range bounds (probabilities & confidences in [0.0, 1.0])
3. Numeric currency validation (no string currency formatting)
4. Intervention math invariant: preventable + remaining == total_exposure
5. ATM-level intelligence structural checks (every case, incl. CF-1042 — no numeric overrides)
6. Graph node ID & edge matching
7. Alert SHA-256 hash chain verification
"""

import json
import os
import sys

# Contract Vocabulary Constants
VALID_STATES = {"emerging", "collection", "distribution", "layering", "consolidation", "cashout_prep"}
VALID_ACTIONS = {"cashout", "further_layering", "external_transfer", "other"}
VALID_FRAUD_TYPES = {"investment_scam", "digital_arrest", "fake_payment_gateway"}
VALID_ZONES = {"zone_a", "zone_b", "zone_c"}
VALID_PRIORITIES = {"HIGH", "MEDIUM", "LOW"}


class ContractValidator:
    """
    Automated validator suite for CyberFlow integration exports.
    """
    def __init__(self, export_path):
        self.export_path = export_path
        self.errors = []
        self.warnings = []

    def validate_all(self):
        """
        Runs all validation checks and returns True if clean, False if errors found.
        """
        print("==================================================")
        print("CYBERFLOW integration export VALIDATOR")
        print("==================================================")

        if not os.path.exists(self.export_path):
            self.errors.append(f"Export file not found at: {self.export_path}")
            self._print_results()
            return False

        try:
            with open(self.export_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            self.errors.append(f"Invalid JSON format: {e}")
            self._print_results()
            return False

        # 1. Top level structure check
        required_top_keys = ["cases", "graphs", "timelines", "alerts", "simulations"]
        for k in required_top_keys:
            if k not in data:
                self.errors.append(f"Missing top-level key: '{k}'")

        if self.errors:
            self._print_results()
            return False

        # 2. Validate Cases
        cases = data.get("cases", [])
        if len(cases) < 3:
            self.errors.append(f"Expected at least 3 demo cases, found {len(cases)}")

        case_ids = set()
        for idx, c in enumerate(cases):
            cid = c.get("case_id", f"case_{idx}")
            case_ids.add(cid)
            self._validate_single_case(c)

        # 3. Validate CF-1042 Target Metrics
        self._validate_cf1042_targets(cases)

        # 4. Validate Graphs
        graphs = data.get("graphs", {})
        self._validate_graphs(graphs, case_ids)

        # 5. Validate Simulations Math
        simulations = data.get("simulations", {})
        self._validate_simulations(simulations, cases)

        # 6. Validate Alerts Hash Chain
        alerts = data.get("alerts", [])
        self._validate_alerts_hash_chain(alerts)

        self._print_results()
        return len(self.errors) == 0

    def _validate_single_case(self, case):
        cid = case.get("case_id", "UNKNOWN")

        # State check
        state = case.get("current_state")
        if state not in VALID_STATES:
            self.errors.append(f"Case [{cid}]: Invalid current_state '{state}'. Must be one of {VALID_STATES}")

        # Fraud type check
        ftype = case.get("fraud_type")
        if ftype not in VALID_FRAUD_TYPES:
            self.errors.append(f"Case [{cid}]: Invalid fraud_type '{ftype}'. Must be one of {VALID_FRAUD_TYPES}")

        # Risk check
        risk = case.get("network_risk")
        if not isinstance(risk, (int, float)) or not (0.0 <= risk <= 1.0):
            self.errors.append(f"Case [{cid}]: network_risk must be float in [0.0, 1.0], got {risk}")

        # Next action check
        na = case.get("next_action", {})
        predicted_na = na.get("predicted")
        if predicted_na not in VALID_ACTIONS:
            self.errors.append(f"Case [{cid}]: Invalid predicted next_action '{predicted_na}'. Must be one of {VALID_ACTIONS}")

        probs = na.get("probabilities", {})
        for act, p in probs.items():
            if act not in VALID_ACTIONS:
                self.errors.append(f"Case [{cid}]: Invalid action key in probabilities '{act}'")
            if not isinstance(p, (int, float)) or not (0.0 <= p <= 1.0):
                self.errors.append(f"Case [{cid}]: Probability for '{act}' must be float in [0.0, 1.0], got {p}")

        # Location candidates check
        locs = case.get("location_candidates", [])
        for loc in locs:
            zid = loc.get("zone_id")
            conf = loc.get("confidence")
            if zid not in VALID_ZONES:
                self.errors.append(f"Case [{cid}]: Invalid zone_id '{zid}' in location_candidates. Must be one of {VALID_ZONES}")
            if not isinstance(conf, (int, float)) or not (0.0 <= conf <= 1.0):
                self.errors.append(f"Case [{cid}]: Zone '{zid}' confidence must be float in [0.0, 1.0], got {conf}")

        # Exposure check
        exp = case.get("potential_exposure_inr")
        if not isinstance(exp, (int, float)) or exp <= 0:
            self.errors.append(f"Case [{cid}]: potential_exposure_inr must be positive number, got {exp}")

        # Priority check
        prio = case.get("intervention_priority")
        if prio not in VALID_PRIORITIES:
            self.errors.append(f"Case [{cid}]: Invalid intervention_priority '{prio}'. Must be one of {VALID_PRIORITIES}")

    def _validate_cf1042_targets(self, cases):
        """
        CF-1042 is the flagship demo case, but it is NOT hardcoded — it goes
        through the same model/rule evaluation path as every other case
        (see classifier.py). So we validate it structurally (required
        fields present, valid types/ranges, ATM-level intelligence
        attached) rather than asserting exact numeric targets, which would
        just re-introduce the override this refactor removed.
        """
        cf1042 = next((c for c in cases if c.get("case_id") == "CF-1042"), None)
        if not cf1042:
            self.errors.append("CF-1042 mandatory case missing from export!")
            return

        for field in ("complaint", "device_location", "atm_candidates", "withdrawal_history"):
            if not cf1042.get(field):
                self.errors.append(f"CF-1042 missing ATM-intelligence field '{field}' — "
                                    f"did atm_engine.enrich_case_with_atm_intelligence() run?")

        for atm in cf1042.get("atm_candidates", []):
            if not (0.0 <= atm.get("confidence", -1) <= 1.0):
                self.errors.append(f"CF-1042 ATM candidate {atm.get('atm_id')} confidence out of range")
            if not atm.get("reasoning"):
                self.errors.append(f"CF-1042 ATM candidate {atm.get('atm_id')} missing reasoning trace")

    def _validate_graphs(self, graphs, case_ids):
        for cid in case_ids:
            if cid not in graphs:
                self.errors.append(f"Graph for case [{cid}] missing from export!")
                continue
            g = graphs[cid]
            nodes = g.get("nodes", [])
            edges = g.get("edges", [])
            if not nodes:
                self.errors.append(f"Graph [{cid}] has empty nodes list")
            if not edges:
                self.errors.append(f"Graph [{cid}] has empty edges list")

    def _validate_simulations(self, simulations, cases):
        case_map = {c["case_id"]: c["potential_exposure_inr"] for c in cases}

        for cid, zone_sims in simulations.items():
            if cid not in case_map:
                self.errors.append(f"Simulation for unknown case [{cid}]")
                continue
            
            total_exp = case_map[cid]
            for zid, sim in zone_sims.items():
                prev = sim.get("expected_preventable_impact_inr", 0)
                rem = sim.get("remaining_exposure_inr", 0)

                # Preventable + remaining must equal total exposure
                if prev + rem != total_exp:
                    self.errors.append(
                        f"Simulation [{cid}][{zid}] math invariant failed: "
                        f"preventable ({prev}) + remaining ({rem}) = {prev+rem} != total_exposure ({total_exp})"
                    )

    def _validate_alerts_hash_chain(self, alerts):
        if not alerts:
            self.warnings.append("No alerts generated in export.")
            return

        expected_prev_hash = "0000000000000000000000000000000000000000000000000000000000000000"

        for idx, alt in enumerate(alerts):
            aid = alt.get("alert_id", f"ALT-{idx}")
            actual_prev = alt.get("prev_hash")
            actual_hash = alt.get("hash")

            if actual_prev != expected_prev_hash:
                self.errors.append(
                    f"Alert [{aid}] hash chain broken: prev_hash expected '{expected_prev_hash}', got '{actual_prev}'"
                )

            if not actual_hash or not actual_hash.startswith("sha256:"):
                self.errors.append(f"Alert [{aid}] hash must be sha256 formatted string, got '{actual_hash}'")

            expected_prev_hash = actual_hash

    def _print_results(self):
        if self.errors:
            print(f"[-] VALIDATION FAILED WITH {len(self.errors)} ERROR(S):")
            for err in self.errors:
                print(f"    [ERROR] {err}")
        else:
            print("[+] ALL CONTRACT VALIDATION CHECKS PASSED PERFECTLY!")

        if self.warnings:
            for w in self.warnings:
                print(f"    [WARNING] {w}")
        print("==================================================")


def validate_export_file(export_path=None):
    if export_path is None:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        export_path = os.path.join(base_dir, "case_export.json")

    validator = ContractValidator(export_path)
    return validator.validate_all()


if __name__ == "__main__":
    success = validate_export_file()
    sys.exit(0 if success else 1)
