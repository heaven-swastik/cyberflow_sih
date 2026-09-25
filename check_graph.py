import json
d = json.load(open('backend/case_export.json'))
g = d.get('graphs', {}).get('CF-1042', {})
edges = g.get('edges', [])
for e in edges:
    rel = e.get('relation', '')
    if 'device' in rel or 'complaint' in rel or 'predicted_cashout' in rel:
        print(f"{e['source']} -> {e['target']} ({rel})")
