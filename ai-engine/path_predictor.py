"""
CyberFlow Multi-Stage Path Predictor

Given the current graph state and features, predicts the most likely next N
stages of the crime network evolution — not just the immediate next action.

Architecture:
  1. Uses the existing XGBoost state_classifier and action_predictor iteratively
  2. At each predicted stage, simulates what the graph features would look like
     if the predicted transaction had occurred
  3. Builds a prediction tree of possible paths (top-K at each stage, K=3)
  4. Validates each predicted stage against graph topology
  5. Backtracks when confidence drops below threshold

Output: Ordered list of predicted paths with per-stage confidence scores,
        cumulative path confidence, and backtrack log.
"""

import copy
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# ── Contract vocabulary (must match classifier.py) ──
STATE_CLASSES = ["emerging", "collection", "distribution", "layering", "consolidation", "cashout_prep"]
ACTION_CLASSES = ["cashout", "further_layering", "external_transfer", "other"]

# Confidence thresholds
BACKTRACK_THRESHOLD = 0.20    # Below this, reject and explore alternative
MIN_PATH_CONFIDENCE = 0.05   # Stop extending paths below this cumulative confidence
MAX_PATH_DEPTH = 6           # Maximum stages to predict ahead
TOP_K = 3                    # Number of alternative branches at each stage


class PathPredictor:
    """
    Multi-stage sequential path prediction engine.

    Given a case's current state and features, predicts possible future
    state sequences with confidence scores and backtracking capability.
    """

    def __init__(self, engine):
        """
        Args:
            engine: CyberFlowClassifierEngine instance (with loaded ML models)
        """
        self.engine = engine
        self.using_ml = engine.using_ml

    def _predict_next_states(self, features, current_state_idx):
        """
        Predict the probability distribution over next states and actions.

        Uses the ML model if available, otherwise rule-based heuristics
        that follow the natural state progression.
        """
        if self.using_ml and features and self.engine.model_loader.loaded:
            prediction = self.engine.model_loader.predict(features)
            if prediction:
                return {
                    "state_probs": self._state_probs_from_prediction(prediction),
                    "action_probs": prediction["action_probs"],
                    "risk": prediction["network_risk"],
                }

        # Rule-based: states naturally progress forward
        state_probs = {}
        for i, state in enumerate(STATE_CLASSES):
            if i == current_state_idx:
                state_probs[state] = 0.15  # Stay in current
            elif i == current_state_idx + 1:
                state_probs[state] = 0.55  # Most likely: advance one step
            elif i == current_state_idx + 2 and current_state_idx + 2 < len(STATE_CLASSES):
                state_probs[state] = 0.20  # Skip one step (rapid progression)
            elif i > current_state_idx:
                state_probs[state] = 0.05
            else:
                state_probs[state] = 0.02  # Regression (very unlikely)

        # Normalize
        total = sum(state_probs.values())
        state_probs = {k: v / total for k, v in state_probs.items()}

        # Action probs based on state position
        if current_state_idx >= 4:
            action_probs = {"cashout": 0.70, "further_layering": 0.15, "external_transfer": 0.10, "other": 0.05}
        elif current_state_idx >= 2:
            action_probs = {"further_layering": 0.50, "cashout": 0.30, "external_transfer": 0.12, "other": 0.08}
        else:
            action_probs = {"other": 0.40, "further_layering": 0.35, "cashout": 0.15, "external_transfer": 0.10}

        risk_raw = min(1.0, (current_state_idx / 5.0) * 0.6 + 0.2)
        return {"state_probs": state_probs, "action_probs": action_probs, "risk": round(risk_raw, 2)}

    def _state_probs_from_prediction(self, prediction):
        """
        Convert the ML model's point prediction into a probability distribution
        over states. The model predicts a single state, but we want a distribution
        for the path tree.
        """
        predicted_state = prediction["current_state"]
        probs = {}
        for state in STATE_CLASSES:
            if state == predicted_state:
                probs[state] = 0.60
            else:
                probs[state] = 0.08
        total = sum(probs.values())
        return {k: round(v / total, 3) for k, v in probs.items()}

    def _simulate_feature_evolution(self, features, target_state_idx):
        """
        Simulate how features would change if the case progressed to
        the target state. This lets us iteratively predict multi-stage
        sequences by updating the feature vector at each step.
        """
        if not features:
            return features

        evolved = copy.deepcopy(features)

        # As the case progresses, certain features increase
        evolved["tx_count"] = evolved.get("tx_count", 5) + 2
        evolved["hop_depth"] = min(8, evolved.get("hop_depth", 1) + 1)
        evolved["total_volume"] = evolved.get("total_volume", 100000) * 1.15

        # Fan-in/fan-out change with state
        if target_state_idx >= 3:  # layering+
            evolved["max_fan_out"] = max(evolved.get("max_fan_out", 1), 3)
            evolved["convergence_ratio"] = min(1.0, evolved.get("convergence_ratio", 0) + 0.1)
        if target_state_idx >= 4:  # consolidation+
            evolved["max_fan_in"] = max(evolved.get("max_fan_in", 1), 3)

        # Velocity increases as criminals try to move fast
        evolved["velocity_tx_per_min"] = evolved.get("velocity_tx_per_min", 0.5) * 1.3

        return evolved

    def _validate_stage(self, current_state_idx, predicted_state_idx, features, confidence):
        """
        Validate whether a predicted state transition is plausible.

        Returns (is_valid, reason) tuple.
        """
        # Basic: confidence too low
        if confidence < BACKTRACK_THRESHOLD:
            return False, f"Confidence {confidence:.2f} below threshold {BACKTRACK_THRESHOLD}"

        # Can't regress more than one state
        if predicted_state_idx < current_state_idx - 1:
            return False, f"State regression by {current_state_idx - predicted_state_idx} steps is implausible"

        # Can't skip more than 2 states forward
        if predicted_state_idx > current_state_idx + 2:
            return False, f"Skipping {predicted_state_idx - current_state_idx} states forward is unlikely"

        # Feature consistency checks
        if features:
            hop_depth = features.get("hop_depth", 0)
            # Can't be in consolidation with no hops
            if predicted_state_idx >= 4 and hop_depth < 2:
                return False, f"Consolidation/cashout_prep requires hop_depth >= 2, got {hop_depth}"

        return True, "Validation passed"

    def predict_paths(self, case_id, features, current_state):
        """
        Predict multiple possible future paths from the current state.

        Args:
            case_id: Case identifier string
            features: Feature dictionary (from compute_case_features)
            current_state: Current operation state string

        Returns:
            dict with:
              - primary_path: The highest-confidence predicted path
              - alternative_paths: Other plausible paths
              - backtrack_log: Rejected paths with reasons
              - path_summary: Human-readable summary
        """
        if current_state not in STATE_CLASSES:
            current_state = "emerging"
        current_idx = STATE_CLASSES.index(current_state)

        # Explore paths using breadth-first with pruning
        paths = []
        backtrack_log = []

        # Initialize with top-K next states from current position
        initial_pred = self._predict_next_states(features, current_idx)

        # Sort states by probability, take top K
        sorted_states = sorted(
            initial_pred["state_probs"].items(),
            key=lambda x: x[1],
            reverse=True
        )[:TOP_K]

        for next_state, prob in sorted_states:
            next_idx = STATE_CLASSES.index(next_state)
            is_valid, reason = self._validate_stage(current_idx, next_idx, features, prob)

            if not is_valid:
                backtrack_log.append({
                    "from_state": current_state,
                    "rejected_state": next_state,
                    "confidence": round(prob, 3),
                    "reason": reason,
                    "depth": 1,
                })
                continue

            # Start a path from this branch
            path = self._extend_path(
                case_id=case_id,
                path_so_far=[{
                    "state": current_state,
                    "confidence": 1.0,
                    "risk": initial_pred["risk"],
                    "action": max(initial_pred["action_probs"], key=initial_pred["action_probs"].get),
                    "action_confidence": max(initial_pred["action_probs"].values()),
                    "is_current": True,
                }],
                next_state=next_state,
                next_confidence=prob,
                features=features,
                backtrack_log=backtrack_log,
                depth=1,
            )
            if path:
                paths.append(path)

        # Sort paths by cumulative confidence
        paths.sort(key=lambda p: p["cumulative_confidence"], reverse=True)

        primary = paths[0] if paths else self._fallback_path(current_state, features)
        alternatives = paths[1:] if len(paths) > 1 else []

        return {
            "case_id": case_id,
            "current_state": current_state,
            "primary_path": primary,
            "alternative_paths": alternatives[:2],
            "backtrack_log": backtrack_log,
            "total_paths_explored": len(paths) + len(backtrack_log),
            "path_summary": self._build_summary(primary, alternatives, backtrack_log),
        }

    def _extend_path(self, case_id, path_so_far, next_state, next_confidence,
                     features, backtrack_log, depth):
        """
        Recursively extend a path by predicting subsequent stages.
        """
        next_idx = STATE_CLASSES.index(next_state)

        # Simulate evolved features
        evolved_features = self._simulate_feature_evolution(features, next_idx)

        # Predict from the new state
        pred = self._predict_next_states(evolved_features, next_idx)

        step = {
            "state": next_state,
            "confidence": round(next_confidence, 3),
            "risk": pred["risk"],
            "action": max(pred["action_probs"], key=pred["action_probs"].get),
            "action_confidence": round(max(pred["action_probs"].values()), 3),
            "is_current": False,
        }
        extended_path = path_so_far + [step]

        # Calculate cumulative confidence
        cumulative = 1.0
        for s in extended_path:
            if not s["is_current"]:
                cumulative *= s["confidence"]

        # Terminal conditions
        if depth >= MAX_PATH_DEPTH:
            return {"stages": extended_path, "cumulative_confidence": round(cumulative, 4)}

        if next_state == "cashout_prep":
            # Reached the end of the crime lifecycle
            return {"stages": extended_path, "cumulative_confidence": round(cumulative, 4)}

        if cumulative < MIN_PATH_CONFIDENCE:
            return {"stages": extended_path, "cumulative_confidence": round(cumulative, 4)}

        # Try to extend further (only the single best next state to avoid exponential blowup)
        best_next = max(pred["state_probs"].items(), key=lambda x: x[1])
        best_next_state, best_next_prob = best_next
        best_next_idx = STATE_CLASSES.index(best_next_state)

        is_valid, reason = self._validate_stage(next_idx, best_next_idx, evolved_features, best_next_prob)

        if is_valid:
            return self._extend_path(
                case_id=case_id,
                path_so_far=extended_path,
                next_state=best_next_state,
                next_confidence=best_next_prob,
                features=evolved_features,
                backtrack_log=backtrack_log,
                depth=depth + 1,
            )
        else:
            backtrack_log.append({
                "from_state": next_state,
                "rejected_state": best_next_state,
                "confidence": round(best_next_prob, 3),
                "reason": reason,
                "depth": depth + 1,
            })
            # Try second best
            sorted_next = sorted(pred["state_probs"].items(), key=lambda x: x[1], reverse=True)
            for alt_state, alt_prob in sorted_next[1:]:
                alt_idx = STATE_CLASSES.index(alt_state)
                alt_valid, alt_reason = self._validate_stage(next_idx, alt_idx, evolved_features, alt_prob)
                if alt_valid:
                    return self._extend_path(
                        case_id=case_id,
                        path_so_far=extended_path,
                        next_state=alt_state,
                        next_confidence=alt_prob,
                        features=evolved_features,
                        backtrack_log=backtrack_log,
                        depth=depth + 1,
                    )
                else:
                    backtrack_log.append({
                        "from_state": next_state,
                        "rejected_state": alt_state,
                        "confidence": round(alt_prob, 3),
                        "reason": alt_reason,
                        "depth": depth + 1,
                    })

            # All next states rejected — terminate path here
            return {"stages": extended_path, "cumulative_confidence": round(cumulative, 4)}

    def _fallback_path(self, current_state, features):
        """Generate a simple linear path when no ML predictions are available."""
        current_idx = STATE_CLASSES.index(current_state)
        stages = [{"state": current_state, "confidence": 1.0, "risk": 0.5,
                    "action": "other", "action_confidence": 0.4, "is_current": True}]

        for i in range(current_idx + 1, len(STATE_CLASSES)):
            conf = max(0.3, 0.8 - (i - current_idx) * 0.15)
            stages.append({
                "state": STATE_CLASSES[i],
                "confidence": round(conf, 3),
                "risk": round(min(1.0, 0.3 + i * 0.12), 2),
                "action": "cashout" if i >= 4 else "further_layering",
                "action_confidence": round(conf * 0.8, 3),
                "is_current": False,
            })

        cumulative = 1.0
        for s in stages:
            if not s["is_current"]:
                cumulative *= s["confidence"]

        return {"stages": stages, "cumulative_confidence": round(cumulative, 4)}

    def _build_summary(self, primary, alternatives, backtrack_log):
        """Build a human-readable path summary."""
        if not primary:
            return "Unable to generate path prediction."

        stages = primary["stages"]
        path_str = " → ".join(s["state"] for s in stages)
        conf = primary["cumulative_confidence"]

        summary = f"Primary predicted path ({conf:.1%} cumulative confidence): {path_str}"

        if alternatives:
            alt_paths = [" → ".join(s["state"] for s in alt["stages"]) for alt in alternatives]
            summary += f". Alternative path(s): {'; '.join(alt_paths)}"

        if backtrack_log:
            summary += f". {len(backtrack_log)} path(s) were explored and rejected during analysis."

        return summary


# ── Standalone test ──
if __name__ == "__main__":
    from classifier import CyberFlowClassifierEngine
    from generate_training_data import compute_case_features
    from generate_data import generate_all_synthetic_data

    print("=" * 60)
    print("PATH PREDICTOR — TEST RUN")
    print("=" * 60)

    models_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
    engine = CyberFlowClassifierEngine(models_dir=models_dir)
    predictor = PathPredictor(engine)

    # Generate demo data and compute features for CF-1042
    transactions = generate_all_synthetic_data()
    features = compute_case_features("CF-1042", transactions, "investment_scam")

    result = predictor.predict_paths("CF-1042", features, "layering")

    print(f"\nCase: {result['case_id']}")
    print(f"Current state: {result['current_state']}")
    print(f"\nPrimary path ({result['primary_path']['cumulative_confidence']:.1%} confidence):")
    for stage in result["primary_path"]["stages"]:
        marker = "●" if stage["is_current"] else "○"
        print(f"  {marker} {stage['state']} (conf: {stage['confidence']:.0%}, "
              f"risk: {stage['risk']:.0%}, action: {stage['action']})")

    if result["alternative_paths"]:
        print(f"\nAlternative paths: {len(result['alternative_paths'])}")
        for alt in result["alternative_paths"]:
            path_str = " → ".join(s["state"] for s in alt["stages"])
            print(f"  {path_str} ({alt['cumulative_confidence']:.1%})")

    if result["backtrack_log"]:
        print(f"\nBacktrack log ({len(result['backtrack_log'])} rejections):")
        for bt in result["backtrack_log"]:
            print(f"  ✗ {bt['from_state']} → {bt['rejected_state']}: {bt['reason']}")

    print(f"\nSummary: {result['path_summary']}")
    print(f"Total paths explored: {result['total_paths_explored']}")

