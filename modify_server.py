with open('backend/server.js', 'r', encoding='utf-8') as f:
    content = f.read()

new_endpoint = '''
// RL Correction Layer: Simulate verified evidence
app.post('/api/cases/:case_id/verify-evidence', authenticateToken, requireRole('admin', 'officer'), (req, res) => {
  const c = (data.cases || []).find(x => x.case_id === req.params.case_id);
  if (!c) return res.status(404).json({ error: 'case not found' });

  const verifiedNextState = req.body.verified_state;
  if (!verifiedNextState) return res.status(400).json({ error: 'verified_state is required' });

  try {
    const { execSync } = require('child_process');
    const scriptPath = '../ai-engine/rl_correction_engine.py';
    const result = execSync(`python ${scriptPath} ${req.params.case_id} ${verifiedNextState} ./case_export.json`).toString();
    
    // Reload data after correction
    const rawData = fs.readFileSync('./case_export.json');
    data = JSON.parse(rawData);
    const updatedCase = data.cases.find(x => x.case_id === req.params.case_id);

    // Rebuild SQLite DB
    execSync('python ../ai-engine/db/build_db.py');
    execSync('cp ../ai-engine/db/cyberflow.db ./db/cyberflow.db || copy ..\\\\ai-engine\\\\db\\\\cyberflow.db .\\\\db\\\\cyberflow.db');

    res.json(updatedCase);
  } catch (error) {
    console.error('RL Correction Error:', error);
    res.status(500).json({ error: 'Failed to process RL correction' });
  }
});
'''
if '/api/cases/:case_id/verify-evidence' not in content:
    content = content.replace("app.post('/api/cases/:case_id/alert'", new_endpoint + "\napp.post('/api/cases/:case_id/alert'")

with open('backend/server.js', 'w', encoding='utf-8') as f:
    f.write(content)
