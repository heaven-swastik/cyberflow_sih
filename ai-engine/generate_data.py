"""
Synthetic Transaction Data Generator for CyberFlow AI/Data Engine.

Generates realistic synthetic transaction streams for 3 cyber-crime scenarios:
1. investment_scam (CF-1042): Multiple victims -> Collection account -> Mule accounts -> Layering -> Consolidation at zone_b
2. digital_arrest (CF-2001): Single victim -> Mule account -> Rapid transfers -> Layering -> Cash-out at zone_a
3. fake_payment_gateway (CF-3001): Multiple victims -> Gateway merchant node -> Distribution -> Layering at zone_c

All generated data is strictly synthetic. No access to real NCRP/I4C/bank data is claimed.
"""

import json
import os
import random
from datetime import datetime, timedelta, timezone
import pandas as pd

# Fixed Vocabulary per 00_SHARED_CONTRACT.md
OPERATION_STATES = ["emerging", "collection", "distribution", "layering", "consolidation", "cashout_prep"]
NEXT_ACTIONS = ["cashout", "further_layering", "external_transfer", "other"]
FRAUD_TYPES = ["investment_scam", "digital_arrest", "fake_payment_gateway"]
ZONES = ["zone_a", "zone_b", "zone_c"]

# Coordinates mapping for zones
ZONE_COORDS = {
    "zone_a": {"lat": 28.6139, "lng": 77.2090, "name": "Delhi Central Hub"},
    "zone_b": {"lat": 22.5726, "lng": 88.3639, "name": "Kolkata Metro East"},
    "zone_c": {"lat": 19.0760, "lng": 72.8777, "name": "Mumbai Financial Zone"}
}


def generate_investment_scam_transactions(case_id="CF-1042"):
    """
    Generate realistic transactions for CF-1042 (investment_scam).
    Ends in consolidation with total exposure ₹8,40,000.
    """
    base_time = datetime(2026, 8, 22, 19, 30, 0, tzinfo=timezone.utc)
    tx_list = []
    
    # 4 Victims transferring into collection account ACC-1000
    victims = [
        ("ACC-1001", "Victim A - Sunita P.", 250000.0, 0),
        ("ACC-1002", "Victim B - Rajesh K.", 300000.0, 5),
        ("ACC-1003", "Victim C - Amit M.", 150000.0, 12),
        ("ACC-1004", "Victim D - Priya S.", 140000.0, 18)
    ]
    
    collection_acc = "ACC-1000"
    
    # Step 1: Collection phase (emerging -> collection)
    for v_acc, v_name, amount, delay_mins in victims:
        tx_time = base_time + timedelta(minutes=delay_mins)
        tx_list.append({
            "transaction_id": f"TXN-{len(tx_list)+1000:06d}",
            "timestamp": tx_time.isoformat().replace("+00:00", "Z"),
            "source_account": v_acc,
            "destination_account": collection_acc,
            "amount": amount,
            "transaction_type": "transfer",
            "location_id": "zone_a",
            "latitude": ZONE_COORDS["zone_a"]["lat"],
            "longitude": ZONE_COORDS["zone_a"]["lng"],
            "case_id": case_id,
            "fraud_type": "investment_scam",
            "operation_state": "collection",
            "next_event": "distribution",
            "cashout_location": "zone_b"
        })
        
    # Step 2: Distribution phase (collection -> distribution)
    # Collection account disperses ₹8,40,000 to 3 primary mules in rapid burst
    primary_mules = [("ACC-2001", 300000.0), ("ACC-2002", 300000.0), ("ACC-2003", 240000.0)]
    dist_base_time = base_time + timedelta(minutes=20)
    
    for i, (m_acc, amount) in enumerate(primary_mules):
        tx_time = dist_base_time + timedelta(seconds=40 * (i + 1))
        tx_list.append({
            "transaction_id": f"TXN-{len(tx_list)+1000:06d}",
            "timestamp": tx_time.isoformat().replace("+00:00", "Z"),
            "source_account": collection_acc,
            "destination_account": m_acc,
            "amount": amount,
            "transaction_type": "transfer",
            "location_id": "zone_a",
            "latitude": ZONE_COORDS["zone_a"]["lat"],
            "longitude": ZONE_COORDS["zone_a"]["lng"],
            "case_id": case_id,
            "fraud_type": "investment_scam",
            "operation_state": "distribution",
            "next_event": "layering",
            "cashout_location": "zone_b"
        })
        
    # Step 3: Layering phase (distribution -> layering)
    # Secondary mule hops
    layering_mules = [
        ("ACC-2001", "ACC-3001", 150000.0),
        ("ACC-2001", "ACC-3002", 150000.0),
        ("ACC-2002", "ACC-3003", 180000.0),
        ("ACC-2002", "ACC-3004", 120000.0),
        ("ACC-2003", "ACC-3005", 140000.0),
        ("ACC-2003", "ACC-3006", 100000.0),
    ]
    
    layer_base_time = dist_base_time + timedelta(minutes=10)
    for i, (s_acc, d_acc, amount) in enumerate(layering_mules):
        tx_time = layer_base_time + timedelta(seconds=25 * (i + 1))
        tx_list.append({
            "transaction_id": f"TXN-{len(tx_list)+1000:06d}",
            "timestamp": tx_time.isoformat().replace("+00:00", "Z"),
            "source_account": s_acc,
            "destination_account": d_acc,
            "amount": amount,
            "transaction_type": "transfer",
            "location_id": "zone_b",
            "latitude": ZONE_COORDS["zone_b"]["lat"],
            "longitude": ZONE_COORDS["zone_b"]["lng"],
            "case_id": case_id,
            "fraud_type": "investment_scam",
            "operation_state": "layering",
            "next_event": "consolidation",
            "cashout_location": "zone_b"
        })

    # Step 4: Consolidation phase (layering -> consolidation)
    # Secondary mules transfer funds into final consolidation hubs ACC-9001 and ACC-9002 in Zone B
    consolidation_txs = [
        ("ACC-3001", "ACC-9001", 150000.0),
        ("ACC-3002", "ACC-9001", 150000.0),
        ("ACC-3003", "ACC-9001", 180000.0),
        ("ACC-3004", "ACC-9002", 120000.0),
        ("ACC-3005", "ACC-9002", 140000.0),
        ("ACC-3006", "ACC-9002", 100000.0),
    ]
    
    cons_base_time = layer_base_time + timedelta(minutes=15)
    for i, (s_acc, d_acc, amount) in enumerate(consolidation_txs):
        tx_time = cons_base_time + timedelta(seconds=30 * (i + 1))
        tx_list.append({
            "transaction_id": f"TXN-{len(tx_list)+1000:06d}",
            "timestamp": tx_time.isoformat().replace("+00:00", "Z"),
            "source_account": s_acc,
            "destination_account": d_acc,
            "amount": amount,
            "transaction_type": "transfer",
            "location_id": "zone_b",
            "latitude": ZONE_COORDS["zone_b"]["lat"],
            "longitude": ZONE_COORDS["zone_b"]["lng"],
            "case_id": case_id,
            "fraud_type": "investment_scam",
            "operation_state": "consolidation",
            "next_event": "cashout",
            "cashout_location": "zone_b"
        })

    return tx_list


def generate_digital_arrest_transactions(case_id="CF-2001"):
    """
    Generate realistic transactions for CF-2001 (digital_arrest).
    Single victim coerced under threat -> rapid transfers -> cashout prep at zone_a.
    Total exposure: ₹5,000,000.
    """
    base_time = datetime(2026, 8, 22, 19, 45, 0, tzinfo=timezone.utc)
    tx_list = []
    
    # Single high-value victim coerced into transferring ₹500,000
    victim = "ACC-1050"
    mule_primary = "ACC-2050"
    
    # Tx 1: Coerced victim transfer
    tx_list.append({
        "transaction_id": f"TXN-{len(tx_list)+2000:06d}",
        "timestamp": base_time.isoformat().replace("+00:00", "Z"),
        "source_account": victim,
        "destination_account": mule_primary,
        "amount": 500000.0,
        "transaction_type": "transfer",
        "location_id": "zone_a",
        "latitude": ZONE_COORDS["zone_a"]["lat"],
        "longitude": ZONE_COORDS["zone_a"]["lng"],
        "case_id": case_id,
        "fraud_type": "digital_arrest",
        "operation_state": "collection",
        "next_event": "layering",
        "cashout_location": "zone_a"
    })
    
    # Rapid layering burst: primary mule splits into 4 ATM mule accounts within 5 minutes
    atm_mules = [("ACC-3051", 125000.0), ("ACC-3052", 125000.0), ("ACC-3053", 125000.0), ("ACC-3054", 125000.0)]
    layer_time = base_time + timedelta(minutes=3)
    
    for i, (d_acc, amount) in enumerate(atm_mules):
        tx_time = layer_time + timedelta(seconds=30 * (i + 1))
        tx_list.append({
            "transaction_id": f"TXN-{len(tx_list)+2000:06d}",
            "timestamp": tx_time.isoformat().replace("+00:00", "Z"),
            "source_account": mule_primary,
            "destination_account": d_acc,
            "amount": amount,
            "transaction_type": "transfer",
            "location_id": "zone_a",
            "latitude": ZONE_COORDS["zone_a"]["lat"],
            "longitude": ZONE_COORDS["zone_a"]["lng"],
            "case_id": case_id,
            "fraud_type": "digital_arrest",
            "operation_state": "layering",
            "next_event": "cashout",
            "cashout_location": "zone_a"
        })
        
    return tx_list


def generate_fake_payment_gateway_transactions(case_id="CF-3001"):
    """
    Generate realistic transactions for CF-3001 (fake_payment_gateway).
    Multiple victims -> merchant gateway node -> distribution -> layering at zone_c.
    Total exposure: ₹1,250,000.
    """
    base_time = datetime(2026, 8, 22, 18, 0, 0, tzinfo=timezone.utc)
    tx_list = []
    
    gateway_node = "ACC-GATEWAY-99"
    
    # 5 victims paying into fake merchant portal
    victims = [
        ("ACC-1081", 250000.0, 0),
        ("ACC-1082", 300000.0, 10),
        ("ACC-1083", 200000.0, 20),
        ("ACC-1084", 350000.0, 35),
        ("ACC-1085", 150000.0, 45),
    ]
    
    for v_acc, amount, delay in victims:
        tx_time = base_time + timedelta(minutes=delay)
        tx_list.append({
            "transaction_id": f"TXN-{len(tx_list)+3000:06d}",
            "timestamp": tx_time.isoformat().replace("+00:00", "Z"),
            "source_account": v_acc,
            "destination_account": gateway_node,
            "amount": amount,
            "transaction_type": "transfer",
            "location_id": "zone_c",
            "latitude": ZONE_COORDS["zone_c"]["lat"],
            "longitude": ZONE_COORDS["zone_c"]["lng"],
            "case_id": case_id,
            "fraud_type": "fake_payment_gateway",
            "operation_state": "collection",
            "next_event": "distribution",
            "cashout_location": "zone_c"
        })
        
    # Gateway node distributes to 5 shell company accounts
    shell_accs = [
        ("ACC-4001", 250000.0),
        ("ACC-4002", 250000.0),
        ("ACC-4003", 250000.0),
        ("ACC-4004", 250000.0),
        ("ACC-4005", 250000.0),
    ]
    dist_time = base_time + timedelta(minutes=60)
    for i, (d_acc, amount) in enumerate(shell_accs):
        tx_time = dist_time + timedelta(minutes=2 * (i + 1))
        tx_list.append({
            "transaction_id": f"TXN-{len(tx_list)+3000:06d}",
            "timestamp": tx_time.isoformat().replace("+00:00", "Z"),
            "source_account": gateway_node,
            "destination_account": d_acc,
            "amount": amount,
            "transaction_type": "transfer",
            "location_id": "zone_c",
            "latitude": ZONE_COORDS["zone_c"]["lat"],
            "longitude": ZONE_COORDS["zone_c"]["lng"],
            "case_id": case_id,
            "fraud_type": "fake_payment_gateway",
            "operation_state": "distribution",
            "next_event": "further_layering",
            "cashout_location": "zone_c"
        })

    return tx_list


def generate_all_synthetic_data(output_dir="data"):
    """
    Generate synthetic transactions for all 3 demo cases and save CSV/JSON files.
    """
    os.makedirs(output_dir, exist_ok=True)
    
    all_txs = []
    all_txs.extend(generate_investment_scam_transactions("CF-1042"))
    all_txs.extend(generate_digital_arrest_transactions("CF-2001"))
    all_txs.extend(generate_fake_payment_gateway_transactions("CF-3001"))
    
    # Write JSON
    json_path = os.path.join(output_dir, "synthetic_transactions.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(all_txs, f, indent=2)
        
    # Write CSV
    df = pd.DataFrame(all_txs)
    csv_path = os.path.join(output_dir, "synthetic_transactions.csv")
    df.to_csv(csv_path, index=False)
    
    print(f"[+] Successfully generated {len(all_txs)} synthetic transactions.")
    print(f"    JSON saved to: {json_path}")
    print(f"    CSV saved to:  {csv_path}")
    
    return all_txs


if __name__ == "__main__":
    generate_all_synthetic_data()

