"""Deep inspection script for case_export.json"""
import json

with open("case_export.json") as f:
    data = json.load(f)

print("=== TOP-LEVEL STRUCTURE ===")
for k, v in data.items():
    if isinstance(v, list):
        print(f"  {k}: list of {len(v)} items")
    elif isinstance(v, dict):
        print(f"  {k}: dict with keys {list(v.keys())}")

print()
print("=== ALL 3 CASES ===")
for c in data["cases"]:
    print(f"  {c['case_id']} | {c['fraud_type']} | state={c['current_state']} | risk={c['network_risk']} | exposure={c['potential_exposure_inr']} | priority={c['intervention_priority']}")
    na = c["next_action"]
    print(f"    predicted={na['predicted']} probs={na['probabilities']}")
    print(f"    locations={c['location_candidates']}")
    print(f"    explanation count={len(c['explanation'])}")
    print()

print("=== SIMULATIONS MATH CHECK (preventable + remaining == total_exposure) ===")
for cid, zones in data["simulations"].items():
    case_exp = next(c["potential_exposure_inr"] for c in data["cases"] if c["case_id"] == cid)
    for zid, sim in zones.items():
        total = sim["expected_preventable_impact_inr"] + sim["remaining_exposure_inr"]
        ok = "PASS" if total == case_exp else "FAIL"
        print(f"  {cid}/{zid}: {sim['expected_preventable_impact_inr']} + {sim['remaining_exposure_inr']} = {total} vs {case_exp} [{ok}]")

print()
print("=== ALERT HASH CHAIN ===")
prev = "0" * 64
for a in data["alerts"]:
    chain_ok = "PASS" if a["prev_hash"] == prev else "FAIL"
    print(f"  {a['alert_id']} | case={a['case_id']} | chain={chain_ok}")
    prev = a["hash"]

print()
print("=== GRAPH NODE COUNTS ===")
for cid, g in data["graphs"].items():
    print(f"  {cid}: {len(g['nodes'])} nodes, {len(g['edges'])} edges")

print()
print("=== TIMELINES ===")
for cid, tl in data["timelines"].items():
    parts = []
    for s in tl:
        parts.append(f"t={s['t_offset_minutes']}m->{s['state']}({s['transaction_count']}tx)")
    print(f"  {cid}: {' | '.join(parts)}")

print()
print("=== CF-1042 EXACT TARGET CHECKS ===")
cf = next(c for c in data["cases"] if c["case_id"] == "CF-1042")
checks = [
    ("current_state == consolidation", cf["current_state"] == "consolidation"),
    ("network_risk == 0.84", cf["network_risk"] == 0.84),
    ("predicted == cashout", cf["next_action"]["predicted"] == "cashout"),
    ("cashout prob == 0.78", cf["next_action"]["probabilities"]["cashout"] == 0.78),
    ("zone_b confidence == 0.72", cf["location_candidates"][0]["confidence"] == 0.72),
    ("potential_exposure_inr == 840000", cf["potential_exposure_inr"] == 840000),
    ("intervention_priority == HIGH", cf["intervention_priority"] == "HIGH"),
]
for label, result in checks:
    print(f"  {label}: {'PASS' if result else 'FAIL'}")

