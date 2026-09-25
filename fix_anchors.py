with open('ai-engine/graph_builder.py', 'r', encoding='utf-8') as f:
    c = f.read()

target = '''        # Anchor account = the node with the most distinct destination
        # accounts pointing at it that ISN'T a zone (best proxy for
        # "primary collection/consolidation account" without needing a
        # second lookup pass).
        in_degree = {}
        for e in edges:
            in_degree[e["target"]] = in_degree.get(e["target"], 0) + 1
        account_ids = [n["id"] for n in nodes if n["type"] in ("victim", "account")]
        anchor_account = max(account_ids, key=lambda a: in_degree.get(a, 0)) if account_ids else None'''

replacement = '''        # Find Entry and Exit nodes logically based on timeline steps
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
            exit_account = max(account_ids, key=lambda a: in_degree.get(a, 0))'''

c = c.replace(target, replacement)

# Complaint uses entry_account
c = c.replace('if complaint and anchor_account:', 'if complaint and entry_account:')
c = c.replace('"target": anchor_account,', '"target": entry_account,', 1)

# Device uses exit_account
c = c.replace('if device and anchor_account:', 'if device and exit_account:')
c = c.replace('"source": anchor_account,', '"source": exit_account,', 1)

with open('ai-engine/graph_builder.py', 'w', encoding='utf-8') as f:
    f.write(c)

print('Updated graph_builder.py')
