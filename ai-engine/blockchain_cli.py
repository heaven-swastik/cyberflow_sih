import sys
import json
import os
from blockchain import CyberFlowBlockchain

CHAIN_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "db", "blockchain.json")

def get_chain():
    bc = CyberFlowBlockchain()
    bc.load(CHAIN_PATH)
    return bc

def add_record(record_type, case_id, data):
    bc = get_chain()
    # Ensure genesis block exists if empty, which get_chain() handles
    bc.add_record(record_type, case_id, data)
    bc.save(CHAIN_PATH)
    print(json.dumps({"status": "success", "hash": bc.chain[-1].hash}))

def verify():
    bc = get_chain()
    result = bc.verify_chain()
    print(json.dumps(result))

def heal_chain():
    bc = get_chain()
    # Simple heal: recalculate hashes for all blocks based on current data
    if len(bc.chain) > 1:
        for i in range(1, len(bc.chain)):
            bc.chain[i].previous_hash = bc.chain[i-1].hash
            bc.chain[i].hash = bc.chain[i].calculate_hash()
        bc.save(CHAIN_PATH)
    print(json.dumps({"status": "healed", "length": len(bc.chain)}))

def get_all():
    bc = get_chain()
    print(json.dumps(bc.export_chain()))

def get_case(case_id):
    bc = get_chain()
    print(json.dumps(bc.get_records_for_case(case_id)))

def get_stats():
    bc = get_chain()
    print(json.dumps(bc.get_stats()))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python blockchain_cli.py [action] [args]")
        sys.exit(1)
        
    action = sys.argv[1]
    
    # Ensure db directory exists
    os.makedirs(os.path.dirname(CHAIN_PATH), exist_ok=True)
    
    if action == "add":
        record_type = sys.argv[2]
        case_id = sys.argv[3]
        data = json.loads(sys.argv[4])
        add_record(record_type, case_id, data)
    elif action == "verify":
        verify()
    elif action == "heal-chain":
        heal_chain()
    elif action == "get_all":
        get_all()
    elif action == "get_case":
        case_id = sys.argv[2]
        get_case(case_id)
    elif action == "get_stats":
        get_stats()
    else:
        print(json.dumps({"error": "unknown action"}))
        sys.exit(1)
