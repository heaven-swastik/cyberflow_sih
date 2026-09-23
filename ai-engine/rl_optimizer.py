"""
CyberFlow RL Optimizer — Q-Learning for Sequential Node Selection

Uses tabular Q-learning to learn an optimal policy for choosing which
node/account to investigate next in the crime network graph. Trained on
the synthetic 1000-case dataset where ground truth paths are known.

State space:  Discretized graph features (hop_depth, convergence_ratio,
              fan_out, state_idx) → bucketed into a manageable state count
Action space: Investigate high-fan-in node, investigate high-fan-out node,
              investigate terminal node, investigate hub, follow money trail

Reward:
  +1.0  for correctly identifying a path leading to cashout
  +0.5  for advancing the investigation closer to the cashout point
  -0.3  for investigating a dead-end node
  -0.5  for backtracking to an already-visited node

The Q-table is intentionally kept small (tabular, not deep) so it:
  1. Trains in seconds on the synthetic dataset
  2. Has zero GPU requirements
  3. Can be inspected directly to explain decisions to SIH judges
"""

import json
import os
import sys
import random
import math

sys.path.append(os.path.dirname(os.path.abspath(__file__)))


# ── State discretization ──

STATE_CLASSES = ["emerging", "collection", "distribution", "layering", "consolidation", "cashout_prep"]

def discretize_state(features, current_state):
    """
    Convert continuous features into a discrete state tuple for Q-table lookup.

    Returns a hashable tuple: (state_bucket, hop_bucket, convergence_bucket,
                               fan_out_bucket, risk_bucket)
    """
    state_idx = STATE_CLASSES.index(current_state) if current_state in STATE_CLASSES else 0

    hop = features.get("hop_depth", 0) if features else 0
    hop_bucket = min(hop, 5)  # 0-5

    conv = features.get("convergence_ratio", 0) if features else 0
    conv_bucket = 0 if conv < 0.1 else (1 if conv < 0.3 else 2)  # 0-2

    fan_out = features.get("max_fan_out", 0) if features else 0
    fan_bucket = 0 if fan_out < 2 else (1 if fan_out < 4 else 2)  # 0-2

    risk = features.get("network_risk", 0.5) if features else 0.5
    risk_bucket = 0 if risk < 0.3 else (1 if risk < 0.6 else 2)  # 0-2

    return (state_idx, hop_bucket, conv_bucket, fan_bucket, risk_bucket)


# ── Action space ──

ACTIONS = [
    "investigate_high_fan_in",     # Target nodes receiving from many sources
    "investigate_high_fan_out",    # Target nodes distributing to many destinations
    "investigate_terminal",        # Target terminal/sink nodes (potential cashout)
    "investigate_hub",             # Target collection/consolidation hubs
    "follow_money_trail",          # Follow the highest-value edge chain
]


class RLOptimizer:
    """
    Tabular Q-learning optimizer for investigation node selection.
    """

    def __init__(self, alpha=0.1, gamma=0.9, epsilon=0.15):
        """
        Args:
            alpha: Learning rate
            gamma: Discount factor for future rewards
            epsilon: Exploration rate (epsilon-greedy)
        """
        self.alpha = alpha
        self.gamma = gamma
        self.epsilon = epsilon
        self.q_table = {}  # (state_tuple, action_idx) -> Q-value
        self.training_episodes = 0

    def _get_q(self, state, action_idx):
        """Get Q-value for a state-action pair, with fallback to nearest known state."""
        key = (state, action_idx)
        if key in self.q_table:
            return self.q_table[key]
        
        # If not in training data, find the closest state (by bucket distance) that HAS this action
        best_dist = float('inf')
        best_val = 0.0
        
        for (k_state, k_action), v in self.q_table.items():
            if k_action == action_idx and k_state[0] == state[0]: # Must match current_state (e.g. consolidation)
                # Calculate distance on the other buckets
                dist = sum(abs(a - b) for a, b in zip(state[1:], k_state[1:]))
                if dist < best_dist:
                    best_dist = dist
                    best_val = v
                    
        # If still nothing, match without requiring exact state[0]
        if best_dist == float('inf'):
            for (k_state, k_action), v in self.q_table.items():
                if k_action == action_idx:
                    dist = sum(abs(a - b) for a, b in zip(state, k_state))
                    if dist < best_dist:
                        best_dist = dist
                        best_val = v
                        
        return best_val

    def _set_q(self, state, action_idx, value):
        """Set Q-value for a state-action pair."""
        self.q_table[(state, action_idx)] = value

    def choose_action(self, state, explore=False):
        """
        Choose the best action for a given state.

        Args:
            state: Discretized state tuple
            explore: If True, use epsilon-greedy exploration

        Returns:
            (action_index, action_name, q_value) tuple
        """
        if explore and random.random() < self.epsilon:
            idx = random.randrange(len(ACTIONS))
            return idx, ACTIONS[idx], self._get_q(state, idx)

        # Greedy: pick action with highest Q-value
        best_idx = 0
        best_q = self._get_q(state, 0)
        for i in range(1, len(ACTIONS)):
            q = self._get_q(state, i)
            if q > best_q:
                best_q = q
                best_idx = i

        return best_idx, ACTIONS[best_idx], best_q

    def update(self, state, action_idx, reward, next_state):
        """
        Q-learning update rule:
        Q(s,a) ← Q(s,a) + α[r + γ·max_a'Q(s',a') - Q(s,a)]
        """
        current_q = self._get_q(state, action_idx)

        # Max Q-value for next state
        max_next_q = max(self._get_q(next_state, a) for a in range(len(ACTIONS)))

        # Bellman update
        new_q = current_q + self.alpha * (reward + self.gamma * max_next_q - current_q)
        self._set_q(state, action_idx, round(new_q, 6))

    def train_on_case(self, case_features_sequence):
        """
        Train on a single case's feature progression.

        Args:
            case_features_sequence: List of (features_dict, current_state, is_fraud, reached_cashout)
                                     tuples representing the investigation timeline
        """
        for i in range(len(case_features_sequence) - 1):
            features, state, is_fraud, _ = case_features_sequence[i]
            next_features, next_state, _, reached_cashout = case_features_sequence[i + 1]

            s = discretize_state(features, state)
            s_next = discretize_state(next_features, next_state)

            # For each action, compute simulated reward
            for action_idx in range(len(ACTIONS)):
                reward = self._compute_reward(
                    action_idx, state, next_state, is_fraud, reached_cashout, features
                )
                self.update(s, action_idx, reward, s_next)

        self.training_episodes += 1

    def _compute_reward(self, action_idx, current_state, next_state, is_fraud, reached_cashout, features):
        """
        Compute reward for taking an action in the current state.
        """
        current_idx = STATE_CLASSES.index(current_state) if current_state in STATE_CLASSES else 0
        next_idx = STATE_CLASSES.index(next_state) if next_state in STATE_CLASSES else 0
        action = ACTIONS[action_idx]

        reward = 0.0

        # Reward for progressing toward cashout detection
        if next_idx > current_idx:
            reward += 0.3  # Advanced the investigation

        # Reward for reaching cashout point
        if reached_cashout and next_state == "cashout_prep":
            reward += 1.0

        # Action-specific rewards based on what's effective at each state
        if action == "investigate_high_fan_in" and current_idx >= 3:
            reward += 0.3  # Fan-in analysis is key during consolidation
        elif action == "investigate_high_fan_out" and current_idx in (1, 2):
            reward += 0.3  # Fan-out reveals distribution patterns early
        elif action == "investigate_terminal" and current_idx >= 4:
            reward += 0.4  # Terminal nodes ARE the cashout points
        elif action == "investigate_hub" and current_idx in (2, 3):
            reward += 0.3  # Hubs reveal network structure during layering
        elif action == "follow_money_trail":
            reward += 0.2  # Always somewhat useful

        # Penalty for non-fraud cases (false positives)
        if not is_fraud and action in ("investigate_terminal", "investigate_hub"):
            reward -= 0.5

        return round(reward, 3)

    def train_on_dataset(self, training_data, epochs=50):
        """
        Train the Q-table on the full training dataset.

        Args:
            training_data: List of case sequences (see train_on_case format)
            epochs: Number of passes over the dataset
        """
        print(f"[RL] Training Q-learning on {len(training_data)} cases for {epochs} epochs...")

        for epoch in range(epochs):
            random.shuffle(training_data)
            for case_seq in training_data:
                self.train_on_case(case_seq)

            # Decay epsilon over epochs
            self.epsilon = max(0.01, self.epsilon * 0.98)

        unique_states = len(set(k[0] for k in self.q_table))
        print(f"[RL] Training complete. Episodes: {self.training_episodes}, "
              f"Unique states: {unique_states}, Q-entries: {len(self.q_table)}")

    def get_investigation_recommendations(self, features, current_state, top_n=3):
        """
        Get ranked investigation action recommendations for the current case state.

        Returns list of (action_name, q_value, explanation) tuples.
        """
        state = discretize_state(features, current_state)
        actions_with_q = []

        for i, action in enumerate(ACTIONS):
            q = self._get_q(state, i)
            explanation = self._explain_action(action, current_state, q)
            actions_with_q.append({
                "action": action,
                "q_value": round(q, 4),
                "explanation": explanation,
                "recommended": False,
            })

        # Sort by Q-value descending
        actions_with_q.sort(key=lambda x: x["q_value"], reverse=True)

        # Mark top recommendations
        for i in range(min(top_n, len(actions_with_q))):
            actions_with_q[i]["recommended"] = True

        return actions_with_q

    def _explain_action(self, action, current_state, q_value):
        """Generate a human-readable explanation for an action recommendation."""
        explanations = {
            "investigate_high_fan_in": "Investigate accounts receiving funds from multiple sources "
                                       "— identifies consolidation hubs where stolen funds converge",
            "investigate_high_fan_out": "Investigate accounts distributing funds to many destinations "
                                        "— reveals the distribution layer of the mule network",
            "investigate_terminal": "Focus on terminal accounts (only receive, never forward) "
                                    "— these are likely the cashout endpoints",
            "investigate_hub": "Target collection/consolidation hub accounts "
                                "— disrupting hubs fragments the entire network",
            "follow_money_trail": "Follow the highest-value transaction chain from victim to endpoint "
                                  "— traces the primary flow of stolen funds",
        }
        base = explanations.get(action, "Investigation action")

        if q_value > 0.5:
            return f"STRONGLY RECOMMENDED: {base}"
        elif q_value > 0.2:
            return f"Recommended: {base}"
        elif q_value > 0:
            return f"Worth considering: {base}"
        else:
            return f"Low priority: {base}"

    def save(self, path):
        """Save Q-table to JSON file."""
        serializable = {
            f"{k[0]}|{k[1]}": v
            for k, v in self.q_table.items()
        }
        data = {
            "q_table": serializable,
            "training_episodes": self.training_episodes,
            "alpha": self.alpha,
            "gamma": self.gamma,
            "epsilon": self.epsilon,
        }
        with open(path, "w") as f:
            json.dump(data, f, indent=2)
        print(f"[RL] Q-table saved to {path} ({len(self.q_table)} entries)")

    def load(self, path):
        """Load Q-table from JSON file."""
        if not os.path.exists(path):
            print(f"[RL] No Q-table found at {path} — using empty table")
            return False
        with open(path) as f:
            data = json.load(f)
        self.training_episodes = data.get("training_episodes", 0)
        self.alpha = data.get("alpha", self.alpha)
        self.gamma = data.get("gamma", self.gamma)
        self.epsilon = data.get("epsilon", self.epsilon)

        self.q_table = {}
        for key_str, value in data["q_table"].items():
            parts = key_str.split("|")
            state_tuple = eval(parts[0])  # Safe: we control the format
            action_idx = int(parts[1])
            self.q_table[(state_tuple, action_idx)] = value

        print(f"[RL] Q-table loaded from {path} ({len(self.q_table)} entries, "
              f"{self.training_episodes} training episodes)")
        return True


def build_training_data_from_cases(transactions, case_ids, fraud_types):
    """
    Build RL training sequences from processed cases.

    Each case becomes a sequence of (features, state, is_fraud, reached_cashout)
    tuples representing the progression through operation states.
    """
    from generate_training_data import compute_case_features

    training_data = []

    for case_id in case_ids:
        fraud_type = fraud_types.get(case_id, "investment_scam")
        is_fraud = fraud_type != "legitimate_business"
        features = compute_case_features(case_id, transactions, fraud_type)
        if not features:
            continue

        # Simulate a progression through states based on the case's final state
        case_txs = [t for t in transactions if t["case_id"] == case_id]
        if not case_txs:
            continue

        # Get unique operation states in chronological order
        seen_states = []
        seen_set = set()
        for t in sorted(case_txs, key=lambda x: x["timestamp"]):
            state = t.get("operation_state", "emerging")
            if state not in seen_set:
                seen_set.add(state)
                seen_states.append(state)

        if not seen_states:
            seen_states = ["emerging"]

        # Build sequence
        sequence = []
        reached_cashout = "cashout_prep" in seen_states
        for state in seen_states:
            state_features = dict(features)
            state_features["current_state"] = state
            sequence.append((state_features, state, is_fraud, reached_cashout))

        if len(sequence) >= 2:
            training_data.append(sequence)

    return training_data


# ── Standalone training + test ──
if __name__ == "__main__":
    from generate_data import generate_all_synthetic_data
    from behavioral import assign_device_fingerprints

    print("=" * 60)
    print("RL OPTIMIZER — TRAINING & TEST")
    print("=" * 60)

    # Generate transactions
    transactions = generate_all_synthetic_data()
    assign_device_fingerprints(transactions)

    case_ids = ["CF-1042", "CF-2001", "CF-3001"]
    fraud_types = {
        "CF-1042": "investment_scam",
        "CF-2001": "digital_arrest",
        "CF-3001": "fake_payment_gateway",
    }

    # Build training data
    training_data = build_training_data_from_cases(transactions, case_ids, fraud_types)
    print(f"\nTraining sequences: {len(training_data)}")

    # Train
    optimizer = RLOptimizer()
    optimizer.train_on_dataset(training_data, epochs=100)

    # Save Q-table
    models_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
    q_table_path = os.path.join(models_dir, "rl_q_table.json")
    optimizer.save(q_table_path)

    # Test: get recommendations for CF-1042
    from generate_training_data import compute_case_features
    features = compute_case_features("CF-1042", transactions, "investment_scam")

    print("\n" + "=" * 60)
    print("RECOMMENDATIONS for CF-1042 (layering state):")
    print("=" * 60)
    recs = optimizer.get_investigation_recommendations(features, "layering")
    for rec in recs:
        marker = "★" if rec["recommended"] else " "
        print(f"  {marker} {rec['action']}: Q={rec['q_value']:.4f}")
        print(f"    {rec['explanation']}")

