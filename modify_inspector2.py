import re

with open('frontend/src/components/NodeInspector.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Make sure node.bank is checked
content = content.replace("let bankName = banks[bankHash % banks.length];", "let bankName = node.bank || banks[bankHash % banks.length];")

# Make sure amount formatting handles 0
content = content.replace("{formatINR(totalInflow)}", "{formatINR(totalInflow || 0)}")
content = content.replace("{formatINR(totalOutflow)}", "{formatINR(totalOutflow || 0)}")

# Improve drawer styling
content = content.replace("className=\"node-drawer\"", "className=\"node-drawer\" style={{ background: '#ffffff', borderLeft: '1px solid #e2e8f0', boxShadow: '-10px 0 40px rgba(0,0,0,0.05)' }}")

with open('frontend/src/components/NodeInspector.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('NodeInspector data fixes applied.')

