import re

with open('frontend/src/components/NodeInspector.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace dark colors with light theme css variables
replacements = {
    "'#13231f'": "'#f8fafc'",
    "'#8a9390'": "'var(--text-secondary)'",
    "'#f4f7f5'": "'var(--text-primary)'",
    "'rgba(255,255,255,0.03)'": "'#ffffff'",
    "'rgba(255,255,255,0.05)'": "'#ffffff'",
    "'rgba(65, 220, 143, 0.15)'": "'rgba(72, 187, 120, 0.15)'",
    "'rgba(65,220,143,0.15)'": "'rgba(72, 187, 120, 0.15)'",
    "'#41dc8f'": "'#48bb78'",
    "'rgba(226, 149, 74, 0.2)'": "'rgba(237, 137, 54, 0.2)'",
    "'#e2954a'": "'#ed8936'",
    "'rgba(91, 143, 214, 0.2)'": "'rgba(66, 153, 225, 0.2)'",
    "'#5b8fd6'": "'#4299e1'",
    "border: '1px solid rgba(255,255,255,0.05)'": "border: '1px solid #e2e8f0'",
    "border: '1px solid rgba(65, 220, 143, 0.15)'": "border: '1px solid rgba(72, 187, 120, 0.2)'",
    "border: '1px solid rgba(91, 143, 214, 0.2)'": "border: '1px solid rgba(66, 153, 225, 0.2)'",
    "border: '1px solid rgba(226, 149, 74, 0.2)'": "border: '1px solid rgba(237, 137, 54, 0.2)'",
    "background: 'rgba(255,255,255,0.1)'": "background: '#e2e8f0'",
    "background: 'rgba(65, 220, 143, 0.05)'": "background: '#f0fff4'",
    "'rgba(228,72,63,0.15)'": "'#fff5f5'",
    "'#e4483f'": "'#f56565'"
}

for k, v in replacements.items():
    content = content.replace(k, v)

# Fix drawer UI CSS
content = content.replace('<div className="node-drawer-header">', '<div className="node-drawer-header" style={{ background: "#fff", padding: "20px 24px", borderBottom: "1px solid #e2e8f0" }}>')
content = content.replace('<div className="node-drawer-body">', '<div className="node-drawer-body" style={{ padding: "24px", overflowY: "auto", flex: 1, background: "#f8fafc" }}>')

with open('frontend/src/components/NodeInspector.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('NodeInspector colors updated.')

