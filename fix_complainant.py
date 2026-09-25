import re

with open('frontend/src/components/ComplainantDashboard.jsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Remove priority pill
c = re.sub(r'<span\s+className="complainant-priority-pill".*?</span>', '', c, flags=re.DOTALL)

# Remove network risk metric block
metric_block = r'<div className="complainant-case-metric">\s*<div className="complainant-case-metric-label">Network Risk</div>.*?</div>\s*</div>'
c = re.sub(metric_block, '', c, flags=re.DOTALL)

with open('frontend/src/components/ComplainantDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(c)

print('Done')
