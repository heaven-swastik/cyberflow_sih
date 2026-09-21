const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const app = express();
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
}));
app.use(express.json());
app.use(helmet({ contentSecurityPolicy: false })); // CSP disabled for SPA

const AI_ENGINE_DIR = path.join(__dirname, '..', 'ai-engine');
const DEMO_API_KEY = process.env.CYBERFLOW_API_KEY || 'cyberflow_demo_key_12345';

let data = { cases: [], graphs: {}, timelines: {}, simulations: {}, alerts: [], data_validation: {}, feature_analysis: null, evaluation_report: null };

try {
  const rawData = fs.readFileSync('./case_export.json');
  data = JSON.parse(rawData);
  console.log("case_export.json successfully loaded.");
} catch (err) {
  console.error("Error loading data file:", err.message);
}

// ── Database layer (schema.sql + a precomputed query preview) ──
// Populated by ai-engine/db/build_db.py, which materializes a real SQLite
// database (ai-engine/db/cyberflow.db) from case_export.json following
// ai-engine/db/schema.sql, then copies schema.sql + db_preview.json here.
// The backend serves these statically rather than opening a live SQLite
// connection itself — same "decoupled, can't break on stage" philosophy
// as the case_export.json contract above.
let dbSchemaText = '';
let dbPreview = { tables: [], sample_queries: [] };
try {
  dbSchemaText = fs.readFileSync('./db/schema.sql', 'utf-8');
  dbPreview = JSON.parse(fs.readFileSync('./db/db_preview.json', 'utf-8'));
  console.log("Database schema + preview loaded.");
} catch (err) {
  console.warn("No database preview found yet — run ai-engine/db/build_db.py to generate it.", err.message);
}

// ── Feed event templates for live intelligence simulation ──
const FEED_TEMPLATES = [
  { severity: 'critical', tpl: 'New complaint filed — ₹{amt} flagged for investigation ({cid})' },
  { severity: 'high', tpl: 'AI classification complete — {type} detected ({cid})' },
  { severity: 'medium', tpl: 'Risk threshold exceeded — {zone} cashout probability {prob}% ({cid})' },
  { severity: 'low', tpl: 'Alert dispatched to LEA — {city} field team notified' },
  { severity: 'critical', tpl: 'Rapid fund movement detected — {n} accounts in {t} min window' },
  { severity: 'high', tpl: 'Mule network convergence — {n} accounts consolidating to {zone}' },
  { severity: 'medium', tpl: 'Pattern match — {prob}% similarity to known {type} topology' },
  { severity: 'low', tpl: 'Bank API notification — {bank} freeze request processed' },
  { severity: 'critical', tpl: 'New high-priority case — ₹{amt} digital arrest complaint ({cid})' },
  { severity: 'high', tpl: 'Predictive model update — {zone} risk elevated to HIGH' },
];

const FRAUD_TYPES = ['investment scam', 'digital arrest', 'fake payment gateway'];
const ZONES = ['Delhi NCR', 'Kolkata', 'Mumbai'];
const BANKS = ['HDFC', 'SBI', 'ICICI', 'Axis', 'PNB', 'Kotak'];
const CASE_IDS = ['CF-1042', 'CF-2001', 'CF-3001', 'CF-4012', 'CF-5087', 'CF-6201'];

function randomPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomAmt() {
  const val = (1.5 + Math.random() * 23.5).toFixed(1);
  return `${val}L`;
}

function generateFeedEvent() {
  const template = randomPick(FEED_TEMPLATES);
  let msg = template.tpl
    .replace('{amt}', randomAmt())
    .replace('{cid}', randomPick(CASE_IDS))
    .replace('{type}', randomPick(FRAUD_TYPES))
    .replace('{zone}', randomPick(ZONES))
    .replace('{city}', randomPick(ZONES))
    .replace('{prob}', String(50 + Math.floor(Math.random() * 45)))
    .replace('{n}', String(2 + Math.floor(Math.random() * 6)))
    .replace('{t}', String(3 + Math.floor(Math.random() * 12)))
    .replace('{bank}', randomPick(BANKS));

  return {
    id: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    severity: template.severity,
    message: msg,
  };
}

const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });
const complaintLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: 'Too many complaints submitted. Try again later.' } });
app.use('/api/', generalLimiter);

// Firebase Admin SDK — initialized lazily when credentials are available
let firebaseAdmin = null;
try {
  const admin = require('firebase-admin');
  if (process.env.FIREBASE_PROJECT_ID) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      }),
    });
    firebaseAdmin = admin;
    console.log('[+] Firebase Admin SDK initialized — JWT verification enabled.');
  } else {
    console.log('[!] FIREBASE_PROJECT_ID not set — running without JWT verification (demo mode).');
  }
} catch (err) {
  console.warn('[!] Firebase Admin not available:', err.message);
}

// JWT verification middleware — passes through if Firebase Admin is not configured (demo mode)
async function authenticateToken(req, res, next) {
  if (!firebaseAdmin) return next(); // Demo mode: no auth required
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  try {
    const token = authHeader.split('Bearer ')[1];
    req.user = await firebaseAdmin.auth().verifyIdToken(token);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!firebaseAdmin) return next(); // Demo mode
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    // For now, all authenticated users have access — role checking via Firestore custom claims
    // can be added later without changing this middleware signature
    next();
  };
}

// ── API Endpoints ──

app.get('/api/overview', authenticateToken, (req, res) => {
  const cases = data.cases || [];
  const active_cases = cases.length;
  const high_priority = cases.filter(c => c.intervention_priority === 'HIGH').length;
  const predicted_cashout = cases.filter(c => c.next_action?.predicted === 'cashout').length;
  const potential_exposure_inr = cases.reduce((sum, c) => sum + (c.potential_exposure_inr || 0), 0);

  res.json({ active_cases, high_priority, predicted_cashout, potential_exposure_inr });
});

app.get('/api/cases', authenticateToken, (req, res) => {
  res.json(data.cases || []);
});

app.get('/api/cases/:case_id', authenticateToken, (req, res) => {
  const c = (data.cases || []).find(x => x.case_id === req.params.case_id);
  if (!c) return res.status(404).json({ error: "case not found" });
  res.json(c);
});

app.get('/api/cases/:case_id/graph', authenticateToken, (req, res) => {
  const g = data.graphs ? data.graphs[req.params.case_id] : null;
  if (!g) return res.status(404).json({ error: "graph not found" });
  res.json(g);
});

app.get('/api/cases/:case_id/timeline', authenticateToken, (req, res) => {
  const t = data.timelines ? data.timelines[req.params.case_id] : null;
  if (!t) return res.status(404).json({ error: "timeline not found" });
  res.json(t);
});

app.get('/api/cases/:case_id/explanation', authenticateToken, (req, res) => {
  const c = (data.cases || []).find(x => x.case_id === req.params.case_id);
  if (!c) return res.status(404).json({ error: "case not found" });
  res.json({ case_id: c.case_id, explanation: c.explanation || [] });
});

app.post('/api/cases/:case_id/simulate', authenticateToken, (req, res) => {
  const { zone_id } = req.body;
  const caseId = req.params.case_id;

  if (!zone_id || !data.simulations?.[caseId]?.[zone_id]) {
    return res.status(400).json({ error: "Invalid or missing zone_id" });
  }

  res.json(data.simulations[caseId][zone_id]);
});

// Helper to call blockchain CLI
function runBlockchainCli(action, ...args) {
  const pythonCommand = resolvePythonCommand();
  const res = spawnSync(pythonCommand, ['blockchain_cli.py', action, ...args], {
    cwd: AI_ENGINE_DIR, encoding: 'utf-8'
  });
  if (res.error || res.status !== 0) {
    console.error(`Blockchain CLI error (${action}):`, res.stderr);
    return null;
  }
  try {
    return JSON.parse(res.stdout);
  } catch(e) {
    console.error(`Blockchain JSON parse error (${action}):`, e.message);
    return null;
  }
}

app.post('/api/cases/:case_id/alert', authenticateToken, (req, res) => {
  const c = (data.cases || []).find(x => x.case_id === req.params.case_id);
  if (!c) return res.status(404).json({ error: "case not found" });

  if (!data.alerts) data.alerts = [];
  const alerts = data.alerts;
  const alert_id = `ALT-${String(alerts.length + 1).padStart(4, '0')}`;
  
  const prev_hash = alerts.length > 0 ? alerts[alerts.length - 1].hash : "0".repeat(64);

  // Dynamic time window based on case data
  const now = new Date();
  const etaMin = c.expected_time_window_minutes?.[0] || 10;
  const etaMax = c.expected_time_window_minutes?.[1] || 25;
  const windowStart = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const endTime = new Date(now.getTime() + etaMax * 60000);
  const windowEnd = `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`;

  // Dynamic reason from case explanation
  const reason = c.explanation?.slice(0, 3).join(' + ') + '.' ||
    'Rapid redistribution + network convergence + historical behavioural similarity.';

  const topAtm = c.atm_candidates?.[0];

  const alertFields = {
    alert_id,
    case_id: c.case_id,
    created_at: now.toISOString(),
    current_state: c.current_state,
    predicted_next_action: c.next_action?.predicted,
    probability: c.next_action?.probabilities?.[c.next_action?.predicted] || 0,
    expected_window: `${windowStart}-${windowEnd}`,
    top_location: c.location_candidates?.[0]?.zone_id || "zone_a",
    predicted_atm_id: topAtm?.atm_id || null,
    predicted_atm_bank: topAtm?.bank_name || null,
    predicted_atm_address: topAtm?.address || null,
    potential_exposure_inr: c.potential_exposure_inr,
    intervention_priority: c.intervention_priority,
    sent_to: ["LEA Cyber Cell", topAtm?.bank_name ? `${topAtm.bank_name} Fraud Ops` : "Bank Fraud Ops"],
    reason,
  };

  const hashInput = JSON.stringify(alertFields) + prev_hash;
  const hash = "sha256:" + crypto.createHash('sha256').update(hashInput).digest('hex');

  const newAlert = { ...alertFields, prev_hash, hash };
  data.alerts.push(newAlert);

  // Add to blockchain
  const bcResult = runBlockchainCli('add', 'alert_dispatched', c.case_id, JSON.stringify(alertFields));
  if (bcResult && bcResult.hash) {
    newAlert.blockchain_tx = bcResult.hash;
  }

  res.json(newAlert);
});

app.get('/api/alerts', authenticateToken, (req, res) => {
  res.json(data.alerts || []);
});

// ── Blockchain endpoints ──
app.get('/api/blockchain', authenticateToken, (req, res) => {
  const result = runBlockchainCli('get_all');
  if (!result) return res.status(500).json({ error: "Failed to read blockchain" });
  res.json(result);
});

app.get('/api/blockchain/verify', authenticateToken, (req, res) => {
  const result = runBlockchainCli('verify');
  if (!result) return res.status(500).json({ error: "Failed to verify blockchain" });
  res.json(result);
});

app.get('/api/blockchain/stats', authenticateToken, (req, res) => {
  const result = runBlockchainCli('get_stats');
  if (!result) return res.status(500).json({ error: "Failed to read blockchain stats" });
  res.json(result);
});

// ── Database endpoints ──
app.get('/api/db/schema', authenticateToken, (req, res) => {
  res.type('text/plain').send(dbSchemaText);
});

app.get('/api/db/preview', authenticateToken, (req, res) => {
  res.json(dbPreview);
});

// ── Live Feed endpoint ──
app.get('/api/feed', authenticateToken, (req, res) => {
  const count = Math.min(parseInt(req.query.count) || 5, 20);
  const events = Array.from({ length: count }, () => generateFeedEvent());
  res.json(events);
});

// ── Feature Analysis + Evaluation endpoints (requirement 4 & 6) ──
// Served directly from case_export.json, which is produced by
// ai-engine/pipeline.py -> feature_analysis.py / evaluation.py.
// Nothing is computed or invented in this layer — it's a static read.
app.get('/api/feature-analysis', authenticateToken, (req, res) => {
  if (!data.feature_analysis) {
    return res.status(404).json({ error: "feature analysis not available — run ai-engine/pipeline.py" });
  }
  res.json(data.feature_analysis);
});

app.get('/api/evaluation', authenticateToken, (req, res) => {
  if (!data.evaluation_report) {
    return res.status(404).json({ error: "evaluation report not available — run ai-engine/pipeline.py" });
  }
  res.json(data.evaluation_report);
});

// ── Data Validation endpoint (requirement 3) ──
app.get('/api/cases/:case_id/validation', authenticateToken, (req, res) => {
  const v = data.data_validation ? data.data_validation[req.params.case_id] : null;
  if (!v) return res.status(404).json({ error: "validation report not found for this case" });
  res.json(v);
});

// Detect a working Python interpreter across environments. This prototype
// runs from both Linux/macOS and Windows dev machines, where the command
// is commonly `python3` on Unix and `python`/`py` on Windows.
function resolvePythonCommand() {
  const candidates = process.platform === 'win32'
    ? ['py', 'python', 'python3']
    : ['python3', 'python', 'py'];

  for (const command of candidates) {
    const probe = spawnSync(command, ['--version'], { encoding: 'utf-8', stdio: 'ignore' });
    if (!probe.error && probe.status === 0) return command;
  }

  return process.platform === 'win32' ? 'python' : 'python3';
}

// Runs the Python complaint_intake module for a given complaint payload,
// always passing the full set of case IDs currently in memory so the
// Python side can generate a Case ID with no collision risk (previously
// this set was never passed, so _next_case_id() couldn't actually avoid
// colliding with a case created earlier in the same demo session).
function runComplaintIntake(complaint) {
  const pythonCommand = resolvePythonCommand();
  const existingIds = (data.cases || []).map((c) => c.case_id);
  const payload = { ...complaint, _existing_case_ids: existingIds };
  return spawnSync(
    pythonCommand,
    ['complaint_intake.py', JSON.stringify(payload)],
    { cwd: AI_ENGINE_DIR, encoding: 'utf-8', maxBuffer: 1024 * 1024 * 32 }
  );
}

// ── NCRP-style Complaint Portal (requirement 1) ──
// Spawns the Python ai-engine's complaint_intake module, which runs the
// full Data Validation -> Relationship Analysis -> Feature Engineering ->
// ML -> Prediction -> Zone -> ATM Ranking chain for the new complaint
// (see ai-engine/complaint_intake.py + pipeline.process_case).
app.post('/api/complaints', 
  authenticateToken, 
  complaintLimiter,
  body('complainant_name').isString().trim().notEmpty().withMessage('Name is required'),
  body('fraud_type').isIn(['investment_scam', 'digital_arrest', 'fake_payment_gateway', 'legitimate_business']).withMessage('Invalid fraud type'),
  body('amount_inr').isNumeric().withMessage('Amount must be a number'),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }
    const complaint = req.body || {};

  const result = runComplaintIntake(complaint);

  if (result.error) {
    return res.status(500).json({ error: "Failed to run complaint intake pipeline", detail: String(result.error) });
  }
  if (result.status !== 0) {
    return res.status(500).json({ error: "Complaint intake pipeline failed", detail: result.stderr });
  }

  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch (e) {
    return res.status(500).json({ error: "Could not parse complaint intake output", detail: result.stdout.slice(0, 2000) });
  }

  if (parsed.status === 'VALIDATION_FAILED') {
    return res.status(400).json(parsed);
  }

  // Fold the newly-generated case into the in-memory dataset so it
  // immediately shows up alongside the 3 demo cases in the dashboard
  // and case selector — same shape, same endpoints, no special-casing.
  data.cases = data.cases || [];
  data.cases.push(parsed.case);
  data.graphs = data.graphs || {};
  data.graphs[parsed.case_id] = parsed.graph;
  data.timelines = data.timelines || {};
  data.timelines[parsed.case_id] = parsed.timeline;
  data.simulations = data.simulations || {};
  data.simulations[parsed.case_id] = parsed.simulations;
  data.data_validation = data.data_validation || {};
  data.data_validation[parsed.case_id] = parsed.data_validation;
  if (parsed.alert) {
    data.alerts = data.alerts || [];
    data.alerts.push(parsed.alert);
  }

  res.json(parsed);
});

// ── API Integration demonstration (requirement 2) ──
// Demonstrates CyberFlow as a prediction layer an existing government
// system could call over an authenticated API key. This is a DEMO
// key/endpoint for this prototype — not a production auth scheme.
app.get('/api/integration/docs', (req, res) => {
  res.json({
    description: "Demonstration of CyberFlow as a prediction layer that an existing "
      + "government/bank system could call, authenticated with an API key. This is a "
      + "prototype demo endpoint, not a production integration — a real deployment "
      + "would use OAuth2/mTLS + an API gateway rather than a single static key.",
    endpoint: "POST /api/integration/predict",
    auth: {
      header: "x-api-key",
      demo_key: DEMO_API_KEY,
      note: "This demo key is intentionally shown here so judges/evaluators can try the "
        + "endpoint directly. A production system would issue per-consumer keys/tokens."
    },
    request_format: {
      case_id: "string — one of CyberFlow's existing case IDs (e.g. 'CF-1042'), OR",
      complaint: {
        complainant_name: "string",
        complainant_phone: "string",
        fraud_type: "'investment_scam' | 'digital_arrest' | 'fake_payment_gateway'",
        description: "string",
        amount_inr: "number"
      },
      note: "Provide EITHER case_id (to fetch an existing case's prediction) OR complaint "
        + "(to run a brand-new complaint through the full pipeline, same as POST /api/complaints)."
    },
    response_format: {
      case_id: "string",
      current_state: "one of: emerging | collection | distribution | layering | consolidation | cashout_prep",
      network_risk: "number 0.0-1.0",
      intervention_priority: "LOW | MEDIUM | HIGH",
      next_action: "{ predicted, probabilities }",
      location_candidates: "[{ zone_id, confidence }] — probable ZONE, not exact location",
      atm_candidates: "[{ atm_id, bank_name, confidence, reasoning }] — ranked shortlist within the zone",
      evidence_status: "'sufficient' | 'insufficient_evidence'",
      explanation: "[string] — top contributing reasons for this prediction"
    }
  });
});

app.post('/api/integration/predict', (req, res) => {
  const apiKey = req.header('x-api-key');
  if (!apiKey || apiKey !== DEMO_API_KEY) {
    return res.status(401).json({ error: "Missing or invalid x-api-key. See GET /api/integration/docs for the demo key." });
  }

  const { case_id, complaint } = req.body || {};

  if (case_id) {
    const c = (data.cases || []).find(x => x.case_id === case_id);
    if (!c) return res.status(404).json({ error: `case ${case_id} not found` });
    return res.json({
      case_id: c.case_id,
      current_state: c.current_state,
      network_risk: c.network_risk,
      intervention_priority: c.intervention_priority,
      next_action: c.next_action,
      location_candidates: c.location_candidates,
      atm_candidates: c.atm_candidates,
      evidence_status: c.evidence_status || 'sufficient',
      explanation: c.explanation,
      served_via: "GET-by-case_id (existing CyberFlow case)"
    });
  }

  if (complaint) {
    const result = runComplaintIntake(complaint);
    if (result.status !== 0) {
      return res.status(500).json({ error: "prediction pipeline failed", detail: result.stderr });
    }
    let parsed;
    try {
      parsed = JSON.parse(result.stdout);
    } catch (e) {
      return res.status(500).json({ error: "could not parse pipeline output" });
    }
    if (parsed.status === 'VALIDATION_FAILED') return res.status(400).json(parsed);

    data.cases = data.cases || [];
    data.cases.push(parsed.case);

    const c = parsed.case;
    return res.json({
      case_id: c.case_id,
      current_state: c.current_state,
      network_risk: c.network_risk,
      intervention_priority: c.intervention_priority,
      next_action: c.next_action,
      location_candidates: c.location_candidates,
      atm_candidates: c.atm_candidates,
      evidence_status: c.evidence_status || 'sufficient',
      explanation: c.explanation,
      served_via: "freshly-run pipeline (new complaint)"
    });
  }

  return res.status(400).json({ error: "Provide either 'case_id' or 'complaint' in the request body." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`CyberFlow Backend Server running on http://localhost:${PORT}`);
});