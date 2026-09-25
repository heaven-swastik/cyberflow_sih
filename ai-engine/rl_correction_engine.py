import json
import os
import sys
from datetime import datetime

# Allow import from ai-engine components
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from rl_optimizer import RLOptimizer, discretize_state, STATE_CLASSES, ACTIONS
from classifier import CyberFlowClassifierEngine
from path_predictor import PathPredictor
from pipeline import compute_case_features, enrich_case_with_atm_intelligence
from graph_builder import CaseGraphBuilder


def apply_verified_evidence(case_id, verified_next_state, export_path):
    """
    Applies RL Q-learning feedback based on ground truth, corrects the path,
    and recalculates downstream predictions.
    """
    base_dir = os.path.dirname(os.path.abspath(__file__))
    models_dir = os.path.join(base_dir, "models")
    
    with open(export_path, "r", encoding="utf-8") as f:
        master_export = json.load(f)
        
    case_obj = next((c for c in master_export["cases"] if c["case_id"] == case_id), None)
    if not case_obj:
        return {"error": "Case not found"}
        
    current_state = case_obj.get("current_state", "emerging")
    
    prev_prediction_stages = case_obj.get("predicted_paths", {}).get("primary_path", {}).get("stages", [])
    predicted_next = prev_prediction_stages[1]["state"] if len(prev_prediction_stages) > 1 else current_state
    
    # Is prediction correct?
    is_correct = (predicted_next == verified_next_state)
    
    # 1. Update RL Q-Table
    rl_opt = RLOptimizer()
    q_path = os.path.join(models_dir, "rl_q_table.json")
    rl_opt.load(q_path)
    
    # Mocking features since this is demo correction
    # Real pipeline would fetch live transactions and compute features
    # For now, we use a basic feature dict for the Q-table update
    features = {"hop_depth": 3, "max_fan_out": 2, "convergence_ratio": 0.5, "network_risk": 0.7}
    
    s = discretize_state(features, current_state)
    s_next = discretize_state(features, verified_next_state)
    
    # Map what the model chose to an action (simplified)
    action_idx = 4 # follow money trail default
    
    reward = +1.0 if is_correct else -1.0
    rl_opt.update(s, action_idx, reward, s_next)
    rl_opt.save(q_path)
    
    # 2. Correct state and Rerun Path Prediction
    case_obj["current_state"] = verified_next_state
    case_obj["prediction_status"] = "Corrected" if not is_correct else "Verified"
    
    engine = CyberFlowClassifierEngine(models_dir=models_dir)
    path_pred = PathPredictor(engine)
    new_paths = path_pred.predict_paths(case_id, features, verified_next_state)
    case_obj["predicted_paths"] = new_paths
    
    # 3. Recalculate ATMs for the new path
    case_obj = enrich_case_with_atm_intelligence(case_id, case_obj, [], "investment_scam", seed_override=case_id + "_corrected")
    
    # 4. History log
    history = case_obj.get("correction_history", [])
    history.append({
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "previous_prediction": predicted_next,
        "verified_ground_truth": verified_next_state,
        "reason": "New verified transaction evidence changed the transaction path.",
        "action_taken": "Path corrected" if not is_correct else "Path validated"
    })
    case_obj["correction_history"] = history
    
    # Update Graph ATMs
    graph_export = master_export.get('graphs', {}).get(case_id)
    if graph_export:
        # Remove old ATMs and edges
        new_nodes = [n for n in graph_export['nodes'] if n.get('type') not in ('atm', 'device')]
        old_atm_ids = [n['id'] for n in graph_export['nodes'] if n.get('type') in ('atm', 'device')]
        new_edges = [e for e in graph_export['edges'] if e.get('target') not in old_atm_ids and e.get('source') not in old_atm_ids]
        graph_export['nodes'] = new_nodes
        graph_export['edges'] = new_edges
        
        # Add new ATMs
        graph_export = CaseGraphBuilder.add_entity_intelligence(graph_export, case_id, case_obj)
        master_export['graphs'][case_id] = graph_export
        
    # Save back to JSON
    with open(export_path, "w", encoding="utf-8") as f:
        json.dump(master_export, f, indent=2)
        
    return {"status": "success", "case": case_obj}

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 3:
        res = apply_verified_evidence(sys.argv[1], sys.argv[2], sys.argv[3])
        print(json.dumps(res))
