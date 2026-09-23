"""
Pandas/NumPy/NetworkX Feature Engineering Engine for CyberFlow.

Computes:
- Transaction features: volume, count, velocity, holding time, in/out ratio
- Network features: fan-in, fan-out, degree, hop depth, convergence, centrality
- Temporal features: burst detection, velocity spikes, rapid transfers
- Spatial features: location frequency, spatial dispersion across zones
"""

from datetime import datetime
import numpy as np
import pandas as pd
import networkx as nx


class FeatureEngineer:
    """
    Extracts high-level features for each case from transaction history & graph.
    """
    def __init__(self):
        pass

    def extract_features(self, case_id, transactions, nx_graph):
        """
        Extracts feature dictionary for a given case.
        """
        case_txs = [t for t in transactions if t["case_id"] == case_id]
        if not case_txs:
            return {}
        
        df = pd.DataFrame(case_txs)
        df["dt"] = pd.to_datetime(df["timestamp"])
        df = df.sort_values("dt")

        # 1. Transaction volume & velocity features
        total_volume = float(df["amount"].sum())
        total_count = len(df)
        max_amount = float(df["amount"].max())
        mean_amount = float(df["amount"].mean())

        time_span_seconds = (df["dt"].max() - df["dt"].min()).total_seconds()
        velocity_tx_per_min = total_count / (max(time_span_seconds, 1.0) / 60.0)

        # Inter-arrival times
        if len(df) > 1:
            diffs = df["dt"].diff().dt.total_seconds().dropna()
            min_inter_arrival = float(diffs.min())
            mean_inter_arrival = float(diffs.mean())
            rapid_tx_count = int((diffs <= 60).sum())
        else:
            min_inter_arrival = 0.0
            mean_inter_arrival = 0.0
            rapid_tx_count = 0

        # 2. Network topological features
        num_nodes = nx_graph.number_of_nodes()
        num_edges = nx_graph.number_of_edges()

        # In-degree / Out-degree stats
        in_degrees = [d for n, d in nx_graph.in_degree()]
        out_degrees = [d for n, d in nx_graph.out_degree()]

        max_fan_in = max(in_degrees) if in_degrees else 0
        max_fan_out = max(out_degrees) if out_degrees else 0
        
        # Centrality
        try:
            betweenness = nx.betweenness_centrality(nx_graph)
            max_betweenness = float(max(betweenness.values())) if betweenness else 0.0
        except Exception:
            max_betweenness = 0.0

        # Fan-in to Fan-out ratio & Convergence
        consolidation_nodes = [n for n, d in nx_graph.in_degree() if d >= 3]
        convergence_score = len(consolidation_nodes) / max(num_nodes, 1)

        # 3. Spatial features
        zone_counts = df["location_id"].value_counts().to_dict()
        top_zone = df["location_id"].mode()[0] if not df["location_id"].empty else "zone_a"

        # 4. State & Next Event ground truth (if available)
        latest_state = df["operation_state"].iloc[-1]
        latest_next_event = df["next_event"].iloc[-1]

        features = {
            "case_id": case_id,
            "total_volume_inr": total_volume,
            "transaction_count": total_count,
            "max_amount": max_amount,
            "mean_amount": mean_amount,
            "velocity_tx_per_min": velocity_tx_per_min,
            "min_inter_arrival_sec": min_inter_arrival,
            "mean_inter_arrival_sec": mean_inter_arrival,
            "rapid_tx_count": rapid_tx_count,
            "num_nodes": num_nodes,
            "num_edges": num_edges,
            "max_fan_in": max_fan_in,
            "max_fan_out": max_fan_out,
            "max_betweenness": max_betweenness,
            "convergence_score": convergence_score,
            "top_zone": top_zone,
            "zone_counts": zone_counts,
            "latest_state": latest_state,
            "latest_next_event": latest_next_event
        }

        return features


if __name__ == "__main__":
    from generate_data import generate_all_synthetic_data
    from graph_builder import CaseGraphBuilder
    txs = generate_all_synthetic_data()
    builder = CaseGraphBuilder()
    g_res = builder.build_graph_for_case("CF-1042", txs)
    fe = FeatureEngineer()
    feats = fe.extract_features("CF-1042", txs, g_res["graph_obj"])
    print("[+] Extracted features for CF-1042:")
    for k, v in feats.items():
        print(f"    {k}: {v}")

