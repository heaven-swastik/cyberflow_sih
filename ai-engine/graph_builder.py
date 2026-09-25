"""
NetworkX Graph Construction Module for CyberFlow AI/Data Engine.

Builds directed crime graphs per case:
- Nodes: victims, accounts, zones (with types and labels)
- Edges: money transfers (with amount and timestamp)

Ensures node/edge IDs match transaction account IDs exactly.
"""

import networkx as nx


class CaseGraphBuilder:
    """
    Constructs and exports directed NetworkX graphs from transaction lists.
    """
    def __init__(self):
        pass

    @staticmethod
    def classify_node_type(account_id, tx_list):
        """
        Classifies node type into 'victim', 'account', 'gateway', etc.
        based STRICTLY on its actual role in the money-flow graph
        (in-degree / out-degree) — never on ID prefix. An account is a
        "victim" only if it truly only ever sends money and never
        receives any, in this case's transaction set.

        (Fix: the previous version fell back to an "ACC-1* => victim"
        prefix rule for any account that wasn't caught by the sources-
        only check. That meant a collection-hub account — which
        receives from several victims and then forwards funds onward,
        so it's technically also a "destination" — could still land in
        that prefix branch and get mislabeled as an extra victim,
        making the graph appear to have more victims than it really
        does.)
        """
        if "GATEWAY" in account_id.upper():
            return "merchant", f"Gateway Node ({account_id})"

        sources = {t["source_account"] for t in tx_list}
        destinations = {t["destination_account"] for t in tx_list}
        in_degree = sum(1 for t in tx_list if t["destination_account"] == account_id)
        out_degree = sum(1 for t in tx_list if t["source_account"] == account_id)

        is_source = account_id in sources
        is_destination = account_id in destinations

        # True victim: only ever sends money in this case, never receives
        # any — a real complainant paying into the fraud, once.
        if is_source and not is_destination:
            return "victim", f"Victim ({account_id})"

        # Terminal / sink account: only ever receives, never forwards
        # onward. Consolidation hubs receive from several inbound edges;
        # a simple terminal mule usually has just one.
        if is_destination and not is_source:
            if in_degree >= 3:
                return "account", f"Consolidation Hub ({account_id})"
            return "account", f"Terminal Account ({account_id})"

        # Pass-through account: both receives AND forwards onward. If it
        # collects from several sources before forwarding, it's a
        # collection hub, not a mule — and NEVER a victim, regardless of
        # what its account id starts with.
        if is_source and is_destination:
            if in_degree >= 3:
                return "account", f"Collection Hub ({account_id})"
            return "account", f"Mule Account ({account_id})"

        return "account", f"Account ({account_id})"

    def build_graph_for_case(self, case_id, transactions):
        """
        Builds NetworkX MultiDiGraph and serializes to contract-compliant JSON format.
        """
        case_txs = [t for t in transactions if t["case_id"] == case_id]
        
        G = nx.DiGraph()
        
        # Collect unique account IDs and locations
        all_accounts = set()
        location_ids = set()
        
        for t in case_txs:
            all_accounts.add(t["source_account"])
            all_accounts.add(t["destination_account"])
            if "location_id" in t and t["location_id"]:
                location_ids.add(t["location_id"])
                
        # Add account nodes
        nodes_list = []
        for acc in sorted(all_accounts):
            n_type, label = self.classify_node_type(acc, case_txs)
            G.add_node(acc, type=n_type, label=label)
            nodes_list.append({
                "id": acc,
                "type": n_type,
                "label": label
            })
            
        # Add zone nodes
        zone_names = {
            "zone_a": "Zone A (Delhi Hub)",
            "zone_b": "Zone B (Kolkata Hub)",
            "zone_c": "Zone C (Mumbai Hub)"
        }
        for loc in sorted(location_ids):
            label = zone_names.get(loc, loc.upper())
            G.add_node(loc, type="zone", label=label)
            nodes_list.append({
                "id": loc,
                "type": "zone",
                "label": label
            })

        # Add edges
        edges_list = []
        for t in case_txs:
            s = t["source_account"]
            d = t["destination_account"]
            amt = float(t["amount"])
            ts = t["timestamp"]
            
            G.add_edge(s, d, amount=amt, timestamp=ts)
            edges_list.append({
                "source": s,
                "target": d,
                "amount": amt,
                "timestamp": ts
            })

        return {
            "graph_obj": G,
            "json_data": {
                "case_id": case_id,
                "nodes": nodes_list,
                "edges": edges_list
            }
        }

    @staticmethod
    def add_entity_intelligence(graph_export, case_id, case_obj):
        """
        Extends the money-flow graph (accounts + zones) with the rest of
        the investigation entity chain so the graph visually IS the schema:

            Complaint -> Account -> Transaction -> Device/Location -> ATM

        Adds nodes for: the complaint itself, the suspect device, and the
        top-ranked predicted ATM(s) — plus edges linking them to the
        existing account/zone nodes. Reads case_obj["complaint"],
        ["device_location"], and ["atm_candidates"], which are populated
        by atm_engine.enrich_case_with_atm_intelligence() before this is
        called.

        New edges are appended at the END of the timeline (their `step`
        is set to the graph's final stage) so they appear once the money
        trail has fully played out — i.e. "here's what the resolved
        investigation adds on top of the raw transactions."
        """
        nodes = graph_export["nodes"]
        edges = graph_export["edges"]
        existing_ids = {n["id"] for n in nodes}
        final_step = max([e.get("step", 1) for e in edges], default=1)
        entity_step = final_step  # reveal alongside the last transaction stage

        # Find Entry and Exit nodes logically based on timeline steps
        in_degree = {}
        for e in edges:
            in_degree[e["target"]] = in_degree.get(e["target"], 0) + 1
            
        account_ids = set(n["id"] for n in nodes if n["type"] in ("victim", "account"))
        
        # Entry Account (Collection Hub): Where the complaint points. Usually target of step 1.
        first_step_targets = [e["target"] for e in edges if e.get("step", 1) == 1 and e["target"] in account_ids]
        entry_account = max(first_step_targets, key=lambda a: in_degree.get(a, 0)) if first_step_targets else None
        if not entry_account and account_ids:
            entry_account = max(account_ids, key=lambda a: in_degree.get(a, 0))
            
        # Exit Account (Consolidation Hub): Where ATMs cash out. Usually target of the final step.
        final_step_targets = [e["target"] for e in edges if e.get("step", 1) == final_step and e["target"] in account_ids]
        exit_account = max(final_step_targets, key=lambda a: in_degree.get(a, 0)) if final_step_targets else None
        if not exit_account and account_ids:
            exit_account = max(account_ids, key=lambda a: in_degree.get(a, 0))

        # 1. Complaint node — first thing chronologically.
        complaint = case_obj.get("complaint")
        if complaint and entry_account:
            complaint_id = f"COMPLAINT-{case_id}"
            if complaint_id not in existing_ids:
                nodes.append({
                    "id": complaint_id,
                    "type": "complaint",
                    "label": f"Complaint ({case_id})",
                })
                existing_ids.add(complaint_id)
            edges.append({
                "source": complaint_id,
                "target": entry_account,
                "amount": None,
                "timestamp": complaint.get("filed_at"),
                "step": 1,
                "relation": "reported_against",
            })

        # 2. Device node — linked to the anchor account, revealed late
        #    (device correlation happens during investigation, not at
        #    transaction time).
        device = case_obj.get("device_location")
        if device and exit_account:
            device_id = device["device_id"]
            if device_id not in existing_ids:
                nodes.append({
                    "id": device_id,
                    "type": "device",
                    "label": f"Device ({device_id})",
                })
                existing_ids.add(device_id)
            edges.append({
                "source": exit_account,
                "target": device_id,
                "amount": None,
                "timestamp": None,
                "step": entity_step,
                "relation": "linked_device",
            })

        # 3. Predicted ATM node(s) — the climax of the graph: device ->
        #    predicted ATM.
        for atm in (case_obj.get("atm_candidates") or [])[:2]:
            atm_id = atm["atm_id"]
            if atm_id not in existing_ids:
                nodes.append({
                    "id": atm_id,
                    "type": "atm",
                    "label": f"{atm['bank_name']} ATM ({atm_id})",
                })
                existing_ids.add(atm_id)
            if device:
                edges.append({
                    "source": device["device_id"],
                    "target": atm_id,
                    "amount": None,
                    "timestamp": None,
                    "step": entity_step,
                    "relation": "predicted_cashout",
                })

        return {"nodes": nodes, "edges": edges}

    @staticmethod
    def assign_timeline_steps(edges, num_stages):
        """
        Annotates each edge with a 1-indexed `step` matching the case's
        timeline stage count, so the frontend's TimelineScrubber can reveal
        the graph progressively in sync with the operational-state timeline
        (contract: `onStepChange(currentStep + 1, maxStep + 1)`).

        Edges are sorted chronologically and split into `num_stages` even
        buckets — this stays correct even when the timeline's own
        transaction_count bookkeeping (computed independently in
        classifier.py) doesn't line up 1:1 with the graph's deduplicated
        edge list.
        """
        num_stages = max(1, num_stages)
        ordered = sorted(range(len(edges)), key=lambda i: edges[i]["timestamp"])
        total = len(ordered)
        for rank, idx in enumerate(ordered):
            if total == 0:
                step = 1
            else:
                step = min(num_stages, (rank * num_stages) // total + 1)
            edges[idx]["step"] = step
        return edges


if __name__ == "__main__":
    from generate_data import generate_all_synthetic_data
    txs = generate_all_synthetic_data()
    builder = CaseGraphBuilder()
    g_res = builder.build_graph_for_case("CF-1042", txs)
    print(f"[+] Built graph for CF-1042 with {len(g_res['json_data']['nodes'])} nodes and {len(g_res['json_data']['edges'])} edges.")

