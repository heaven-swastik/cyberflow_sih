require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
}));
app.use(express.json());
app.use(helmet({ contentSecurityPolicy: false })); // CSP disabled for SPA

const AI_ENGINE_DIR = path.join(__dirname, '..', 'ai-engine');
const DEMO_API_KEY = process.env.CYBERFLOW_API_KEY;

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

// Local authentication store. Passwords are only persisted as bcrypt hashes.
const AUTH_SECRET = process.env.JWT_SECRET;
const USERS_FILE = process.env.AUTH_USERS_FILE || path.join(__dirname, 'users.json');
let users = [];

function loadUsers() {
  try {
    users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
  } catch (_) {
    users = [];
  }

  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const adminEmail = process.env.ADMIN_EMAIL.toLowerCase();
    const existingAdmin = users.find((user) => user.email === adminEmail);

    if (existingAdmin) {
      const isStalePassword = !bcrypt.compareSync(process.env.ADMIN_PASSWORD, existingAdmin.passwordHash);
      if (existingAdmin.role !== 'admin' || isStalePassword) {
        existingAdmin.role = 'admin';
        existingAdmin.displayName = process.env.ADMIN_NAME || existingAdmin.displayName || 'CyberFlow Administrator';
        existingAdmin.passwordHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 12);
        saveUsers();
      }
    } else {
      users.push({
        id: crypto.randomUUID(),
        email: adminEmail,
        displayName: process.env.ADMIN_NAME || 'CyberFlow Administrator',
        role: 'admin',
        passwordHash: bcrypt.hashSync(process.env.ADMIN_PASSWORD, 12),
        createdAt: new Date().toISOString(),
      });
      saveUsers();
    }
  }
}

function saveUsers() {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function publicUser(user) {
  return { id: user.id, email: user.email, displayName: user.displayName, role: user.role };
}

function createToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, displayName: user.displayName }, AUTH_SECRET, { expiresIn: '8h' });
}

loadUsers();

// Every protected API requires a locally signed JWT.
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  try {
    const token = authHeader.split('Bearer ')[1];
    req.user = jwt.verify(token, AUTH_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

app.post('/api/auth/register',
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('displayName').optional().isString().trim().isLength({ max: 100 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    const email = req.body.email.toLowerCase();
    if (users.some((user) => user.email === email)) return res.status(409).json({ error: 'An account with this email already exists' });

    const user = {
      id: crypto.randomUUID(),
      email,
      displayName: req.body.displayName || email.split('@')[0],
      role: 'complainant',
      passwordHash: bcrypt.hashSync(req.body.password, 12),
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    saveUsers();
    res.status(201).json({ token: createToken(user), user: publicUser(user) });
  }
);

app.post('/api/auth/login',
  body('email').isEmail().normalizeEmail(),
  body('password').isString().notEmpty(),
  body('role').optional().isIn(['admin', 'user']).withMessage('Role must be admin or user'),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Email and password are required' });
    const user = users.find((candidate) => candidate.email === req.body.email.toLowerCase());
    if (!user || !bcrypt.compareSync(req.body.password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const requestedRole = req.body.role || 'user';
    const roleMatches = requestedRole === 'admin'
      ? user.role === 'admin'
      : user.role !== 'admin';
    if (!roleMatches) return res.status(403).json({ error: `This account is not registered as ${requestedRole === 'admin' ? 'an admin' : 'a user'}` });
    res.json({ token: createToken(user), user: publicUser(user) });
  }
);

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = users.find((candidate) => candidate.id === req.user.sub);
  if (!user) return res.status(401).json({ error: 'Account no longer exists' });
  res.json({ user: publicUser(user) });
});

// ── API Endpoints ──

app.get('/api/overview', authenticateToken, requireRole('admin', 'officer'), (req, res) => {
  const cases = data.cases || [];
  const active_cases = cases.length;
  const high_priority = cases.filter(c => c.intervention_priority === 'HIGH').length;
  const predicted_cashout = cases.filter(c => c.next_action?.predicted === 'cashout').length;
  const potential_exposure_inr = cases.reduce((sum, c) => sum + (c.potential_exposure_inr || 0), 0);

  res.json({ active_cases, high_priority, predicted_cashout, potential_exposure_inr });
});

// ── Zone reference metadata (mirrors ai-engine/atm_engine.py ZONE_HUBS) ──
// Small static lookup — zones are fixed constants in this prototype, so
// this is not duplicated ML logic, just display/aggregation metadata.
const ZONE_HUBS = {
  zone_a: { lat: 28.6139, lng: 77.2090, city: 'Delhi NCR', label: 'Zone A (Delhi Hub)', jurisdiction: 'Delhi Police Cyber Cell (IFSO)', state: 'Delhi' },
  zone_b: { lat: 22.5726, lng: 88.3639, city: 'Kolkata', label: 'Zone B (Kolkata Hub)', jurisdiction: 'Kolkata Police Cyber Crime PS', state: 'West Bengal' },
  zone_c: { lat: 19.0760, lng: 72.8777, city: 'Mumbai', label: 'Zone C (Mumbai Hub)', jurisdiction: 'Mumbai Cyber Crime Investigation Cell', state: 'Maharashtra' },
};

// ── Macro Risk Heatmap (Command Center) ──
// Real aggregation over every case currently loaded (data.cases) — no
// hardcoded hotspots. Groups by top predicted zone, with optional
// server-side filtering by crime category (fraud_type) and time window,
// so the frontend's filter controls do something real instead of being
// decorative. This is the "Level 1 — Command Center" macro layer that
// sits alongside (not instead of) the existing per-case investigation
// view. Every zone in the response also carries the case_ids that make
// it up, so the frontend can drill down into a specific case from a
// cluster — same case objects served by /api/cases/:case_id.
app.get('/api/macro/heatmap', authenticateToken, requireRole('admin', 'officer'), (req, res) => {
  const cases = data.cases || [];
  const { crime_category, time_window } = req.query; // time_window: '24h' | '7d' | '30d' | 'all'

  const now = Date.now();
  const windowMs = { '24h': 24 * 3600e3, '7d': 7 * 24 * 3600e3, '30d': 30 * 24 * 3600e3 };

  const filtered = cases.filter(c => {
    if (crime_category && crime_category !== 'all' && c.fraud_type !== crime_category) return false;
    if (time_window && time_window !== 'all' && windowMs[time_window]) {
      const t = Date.parse(c.updated_at || c.complaint?.filed_at || '');
      if (!Number.isNaN(t) && (now - t) > windowMs[time_window]) return false;
      // If the case has no parseable timestamp, don't silently drop it —
      // an undated case is still real intelligence, just undated.
    }
    return true;
  });

  // Aggregate by each case's TOP predicted zone (location_candidates[0]).
  const byZone = {};
  for (const zoneId of Object.keys(ZONE_HUBS)) {
    byZone[zoneId] = {
      zone_id: zoneId,
      ...ZONE_HUBS[zoneId],
      case_count: 0,
      high_priority_count: 0,
      total_exposure_inr: 0,
      avg_confidence: 0,
      case_ids: [],
      fraud_type_breakdown: {},
    };
  }

  for (const c of filtered) {
    const topLoc = (c.location_candidates || [])[0];
    if (!topLoc || !byZone[topLoc.zone_id]) continue;
    const z = byZone[topLoc.zone_id];
    z.case_count += 1;
    if (c.intervention_priority === 'HIGH') z.high_priority_count += 1;
    z.total_exposure_inr += (c.potential_exposure_inr || 0);
    z._confidenceSum = (z._confidenceSum || 0) + topLoc.confidence;
    z.case_ids.push(c.case_id);
    const ft = c.fraud_type || 'unknown';
    z.fraud_type_breakdown[ft] = (z.fraud_type_breakdown[ft] || 0) + 1;
  }

  const zones = Object.values(byZone).map(z => {
    const avg_confidence = z.case_count > 0 ? Math.round((z._confidenceSum / z.case_count) * 100) / 100 : 0;
    delete z._confidenceSum;
    // Real-time risk (active HIGH-priority cases right now) vs potential
    // risk (this zone's overall predicted-cashout confidence) are kept
    // as two distinct numbers rather than one blended score, per the PS's
    // "real-time risk zones" vs "potential risk zones" distinction.
    const real_time_risk = z.case_count === 0 ? 'none' : (z.high_priority_count > 0 ? 'critical' : 'elevated');
    const potential_risk = avg_confidence >= 0.7 ? 'high' : avg_confidence >= 0.4 ? 'medium' : 'low';
    return { ...z, avg_confidence, real_time_risk, potential_risk };
  });

  res.json({
    generated_at: new Date().toISOString(),
    filters_applied: { crime_category: crime_category || 'all', time_window: time_window || 'all' },
    total_cases_considered: filtered.length,
    zones,
  });
});


app.get('/api/model-proof', (req, res) => {
  res.json({
    model_proof: data.model_proof || {},
    feature_analysis: data.feature_analysis || {},
    evaluation_report: data.evaluation_report || {}
  });
});

app.get('/api/cases', authenticateToken, requireRole('admin', 'officer'), (req, res) => {
  res.json(data.cases || []);
});

app.get('/api/cases/:case_id', authenticateToken, (req, res) => {
  const c = (data.cases || []).find(x => x.case_id === req.params.case_id);
  if (!c) return res.status(404).json({ error: "case not found" });
  // Complainants may only view their own cases
  if (req.user.role === 'complainant' && c.complainant_id !== req.user.sub) {
    return res.status(403).json({ error: 'You do not have access to this case' });
  }
  res.json(c);
});

app.get('/api/my-cases', authenticateToken, (req, res) => {
  if (req.user.role !== 'complainant') {
    return res.status(403).json({ error: 'Endpoint only for complainants' });
  }
  const myCases = (data.cases || []).filter(c => c.complainant_id === req.user.sub);
  res.json(myCases);
});

app.get('/api/cases/:case_id/graph', authenticateToken, requireRole('admin', 'officer'), (req, res) => {
  const g = data.graphs ? data.graphs[req.params.case_id] : null;
  if (!g) return res.status(404).json({ error: "graph not found" });
  res.json(g);
});

app.get('/api/cases/:case_id/timeline', authenticateToken, requireRole('admin', 'officer'), (req, res) => {
  const t = data.timelines ? data.timelines[req.params.case_id] : null;
  if (!t) return res.status(404).json({ error: "timeline not found" });
  res.json(t);
});

app.get('/api/cases/:case_id/explanation', authenticateToken, requireRole('admin', 'officer'), (req, res) => {
  const c = (data.cases || []).find(x => x.case_id === req.params.case_id);
  if (!c) return res.status(404).json({ error: "case not found" });
  res.json({ case_id: c.case_id, explanation: c.explanation || [] });
});

app.post('/api/cases/:case_id/simulate', authenticateToken, requireRole('admin', 'officer'), (req, res) => {
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
    execSync('cp ../ai-engine/db/cyberflow.db ./db/cyberflow.db || copy ..\\ai-engine\\db\\cyberflow.db .\\db\\cyberflow.db');

    res.json(updatedCase);
  } catch (error) {
    console.error('RL Correction Error:', error);
    res.status(500).json({ error: 'Failed to process RL correction' });
  }
});

app.post('/api/cases/:case_id/alert', authenticateToken, requireRole('admin', 'officer'), (req, res) => {
  const c = (data.cases || []).find(x => x.case_id === req.params.case_id);
  if (!c) return res.status(404).json({ error: "case not found" });

  if (!data.alerts) data.alerts = [];
  const alerts = data.alerts;

  // Re-alert guard
  const existingAlert = alerts.find(a => a.case_id === req.params.case_id && a.status !== 'failed');
  if (existingAlert && req.body.force_retry !== true) {
    return res.status(400).json({ error: "Active alert already exists for this case" });
  }

  // Simulated failure/retry
  if (req.body.simulate_failure === true) {
     return res.status(503).json({ error: "Simulated gateway timeout / SMS failure", status: 'failed' });
  }

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
  const topZoneId = c.location_candidates?.[0]?.zone_id || "zone_a";
  const predictedJurisdiction = ZONE_HUBS[topZoneId]?.jurisdiction || c.predicted_jurisdiction || "Cyber Cell (zone unresolved)";
  const originatingJurisdiction = c.originating_jurisdiction || "Not specified at intake";

  // Cross-jurisdictional, role-aware dispatch. Every recipient is paired
  // with the channel(s) the PS asks for (SMS / email / API / dashboard).
  // This prototype does not call a real SMS gateway or bank API — every
  // channel entry is explicitly marked "simulated" rather than silently
  // implying delivery, per the honest-labeling pattern used throughout
  // this codebase (see SIH_PITCH.md "Implemented vs future work").
  const channels = [
    { recipient: predictedJurisdiction, role: 'LEA (responding jurisdiction)', channel: 'dashboard', status: 'simulated' },
    { recipient: predictedJurisdiction, role: 'LEA (responding jurisdiction)', channel: 'sms', status: 'simulated' },
    { recipient: `Originating IO — ${originatingJurisdiction}`, role: 'LEA (originating officer)', channel: 'email', status: 'simulated' },
    { recipient: topAtm?.bank_name ? `${topAtm.bank_name} Fraud Ops` : 'Bank Fraud Ops', role: 'Bank/FI', channel: 'api', status: 'simulated' },
    { recipient: 'I4C National Coordination Desk', role: 'I4C', channel: 'dashboard', status: 'simulated' },
  ];

  const alertFields = {
    alert_id,
    case_id: c.case_id,
    created_at: now.toISOString(),
    current_state: c.current_state,
    predicted_next_action: c.next_action?.predicted,
    probability: c.next_action?.probabilities?.[c.next_action?.predicted] || 0,
    expected_window: `${windowStart}-${windowEnd}`,
    top_location: topZoneId,
    predicted_atm_id: topAtm?.atm_id || null,
    predicted_atm_bank: topAtm?.bank_name || null,
    predicted_atm_address: topAtm?.address || null,
    potential_exposure_inr: c.potential_exposure_inr,
    intervention_priority: c.intervention_priority,
    predicted_jurisdiction: predictedJurisdiction,
    originating_jurisdiction: originatingJurisdiction,
    sent_to: ["LEA Cyber Cell", topAtm?.bank_name ? `${topAtm.bank_name} Fraud Ops` : "Bank Fraud Ops"], // kept for backward compatibility with existing UI reads
    channels,
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

  // Persistence
  try {
    fs.writeFileSync('./case_export.json', JSON.stringify(data, null, 2));
    const { execSync } = require('child_process');
    execSync('python ../ai-engine/db/build_db.py');
    execSync('cp ../ai-engine/db/cyberflow.db ./db/cyberflow.db || copy ..\\ai-engine\\db\\cyberflow.db .\\db\\cyberflow.db');
  } catch(e) {
    console.error('Failed to persist alert', e);
  }

  res.json(newAlert);
});

app.get('/api/alerts', authenticateToken, requireRole('admin', 'officer'), (req, res) => {
  res.json(data.alerts || []);
});

// ── Investigator verification / feedback loop ──
// Lets an investigator record whether a predicted zone/ATM actually
// matched what happened. This is captured for future evaluation only —
// the prototype does NOT retrain models automatically from this data.
// Distinct from /api/blockchain/verify, which checks hash-chain
// tamper-evidence, not prediction correctness.
app.patch('/api/cases/:case_id/outcome', authenticateToken, requireRole('admin', 'officer'),
  body('status').isIn(['pending', 'confirmed_correct', 'incorrect']).withMessage('Invalid status'),
  body('notes').optional().isString().trim().isLength({ max: 500 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }
    const c = (data.cases || []).find(x => x.case_id === req.params.case_id);
    if (!c) return res.status(404).json({ error: "case not found" });

    c.prediction_outcome = {
      status: req.body.status,
      verified_by: req.user.displayName || req.user.email,
      verified_at: new Date().toISOString(),
      notes: req.body.notes || null,
    };

    res.json({ case_id: c.case_id, prediction_outcome: c.prediction_outcome });
  }
);

// ── Blockchain endpoints ──
app.get('/api/blockchain', authenticateToken, requireRole('admin'), (req, res) => {
  const result = runBlockchainCli('get_all');
  if (!result) return res.status(500).json({ error: "Failed to read blockchain" });
  res.json(result);
});

app.get('/api/blockchain/verify', authenticateToken, requireRole('admin'), (req, res) => {
  const result = runBlockchainCli('verify');
  if (!result) return res.status(500).json({ error: "Failed to verify blockchain" });
  res.json(result);
});

app.post('/api/blockchain/heal', authenticateToken, requireRole('admin'), (req, res) => {
  const result = runBlockchainCli('heal-chain');
  if (!result) return res.status(500).json({ error: "Failed to heal blockchain" });
  res.json(result);
});

app.get('/api/blockchain/stats', authenticateToken, requireRole('admin'), (req, res) => {
  const result = runBlockchainCli('get_stats');
  if (!result) return res.status(500).json({ error: "Failed to read blockchain stats" });
  res.json(result);
});

// ── Database endpoints ──
app.get('/api/db/schema', authenticateToken, requireRole('admin'), (req, res) => {
  res.type('text/plain').send(dbSchemaText);
});

app.get('/api/db/preview', authenticateToken, requireRole('admin'), (req, res) => {
  res.json(dbPreview);
});

// ── Live Feed endpoint ──
app.get('/api/feed', authenticateToken, requireRole('admin', 'officer'), (req, res) => {
  // Derive events from real data
  let events = [];
  
  if (data.cases) {
    data.cases.forEach(c => {
      events.push({
        id: 'CASE-' + c.case_id,
        timestamp: c.filed_at || new Date().toISOString(),
        severity: c.intervention_priority === 'HIGH' ? 'critical' : (c.intervention_priority === 'MEDIUM' ? 'warning' : 'info'),
        message: `Case ${c.case_id} (${c.complainant_name || 'unknown complainant'}) created with ${c.intervention_priority || 'unknown'} priority.`
      });
    });
  }
  
  if (data.alerts) {
    data.alerts.forEach(a => {
      events.push({
        id: 'ALERT-' + a.alert_id,
        timestamp: a.sent_at || new Date().toISOString(),
        severity: 'critical',
        message: `Alert ${a.alert_id} dispatched to ${a.channel || 'unknown channel'} for Case ${a.case_id || 'unknown case'}.`
      });
    });
  }
  
  events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const count = Math.min(parseInt(req.query.count) || 10, 50);
  res.json(events.slice(0, count));
});

// ── Feature Analysis + Evaluation endpoints (requirement 4 & 6) ──
// Served directly from case_export.json, which is produced by
// ai-engine/pipeline.py -> feature_analysis.py / evaluation.py.
// Nothing is computed or invented in this layer — it's a static read.
app.get('/api/feature-analysis', authenticateToken, requireRole('admin', 'officer'), (req, res) => {
  if (!data.feature_analysis) {
    return res.status(404).json({ error: "feature analysis not available — run ai-engine/pipeline.py" });
  }
  res.json(data.feature_analysis);
});

app.get('/api/evaluation', authenticateToken, requireRole('admin', 'officer'), (req, res) => {
  if (!data.evaluation_report) {
    return res.status(404).json({ error: "evaluation report not available — run ai-engine/pipeline.py" });
  }
  res.json(data.evaluation_report);
});

// ── Data Validation endpoint (requirement 3) ──
app.get('/api/cases/:case_id/validation', authenticateToken, requireRole('admin', 'officer'), (req, res) => {
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
  return new Promise((resolve) => {
    const { spawn } = require('child_process');
    const pythonCommand = resolvePythonCommand();
    const existingIds = (data.cases || []).map((c) => c.case_id);
    const payload = { ...complaint, _existing_case_ids: existingIds };
    
    const child = spawn(
      pythonCommand,
      ['complaint_intake.py', JSON.stringify(payload)],
      { cwd: AI_ENGINE_DIR }
    );
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (d) => { stdout += d.toString('utf-8'); });
    child.stderr.on('data', (d) => { stderr += d.toString('utf-8'); });
    
    child.on('error', (error) => {
      resolve({ error, status: -1, stdout, stderr });
    });
    
    child.on('close', (status) => {
      resolve({ status, stdout, stderr });
    });
  });
}

// ── NCRP-style Complaint Portal (requirement 1) ──
// Spawns the Python ai-engine's complaint_intake module, which runs the
// full Data Validation -> Relationship Analysis -> Feature Engineering ->
// ML -> Prediction -> Zone -> ATM Ranking chain for the new complaint
// (see ai-engine/complaint_intake.py + pipeline.process_case).
app.post('/api/complaints', 
  authenticateToken, 
  complaintLimiter,
  body('complainant_name').isString().trim().escape().notEmpty().withMessage('Name is required'),
  body('fraud_type').isIn(['investment_scam', 'digital_arrest', 'fake_payment_gateway', 'legitimate_business']).escape().withMessage('Invalid fraud type'),
  body('amount_inr').isNumeric().withMessage('Amount must be a number'),
  body('time_since_incident').optional({ nullable: true, checkFalsy: true })
    .isIn(['under_1_hour', 'few_hours', '1_2_days', 'longer']).withMessage('Invalid time_since_incident'),
  body('num_transfers_recalled').optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 0 }).withMessage('num_transfers_recalled must be a non-negative integer'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }
    const complaint = req.body || {};

  // Inject the authenticated user's ID so we can enforce ownership later
  complaint._complainant_id = req.user.sub;

  const result = await runComplaintIntake(complaint);

  if (result.error) {
    return res.status(500).json({ error: "Failed to run complaint intake pipeline", detail: String(result.error) });
  }
  if (result.status !== 0) {
    return res.status(500).json({ error: "Complaint intake pipeline failed", detail: result.stderr });
  }

  let parsed;
  try {
    const jsonStr = result.stdout.substring(result.stdout.indexOf('{'));
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    return res.status(500).json({ error: "Could not parse complaint intake output", detail: result.stdout.slice(0, 2000) });
  }

  if (parsed.status === 'VALIDATION_FAILED') {
    return res.status(400).json(parsed);
  }

  // Stamp ownership on the case object before storing
  if (parsed.case) {
    parsed.case.complainant_id = req.user.sub;
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
  
  // Persist to JSON
  try {
    fs.writeFileSync('./case_export.json', JSON.stringify(data, null, 2));
  } catch(e) {
    console.error('Failed to save to case_export.json', e);
  }
  
  // Also rebuild SQLite DB so live complaints are queryable there
  try {
    const { execSync } = require('child_process');
    execSync('python ../ai-engine/db/build_db.py');
    // Copy the updated DB to backend
    execSync('cp ../ai-engine/db/cyberflow.db ./db/cyberflow.db || copy ..\\ai-engine\\db\\cyberflow.db .\\db\\cyberflow.db');
  } catch(e) {
    console.error('Failed to rebuild SQLite db', e);
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

app.post('/api/integration/predict', async (req, res) => {
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
    const result = await runComplaintIntake(complaint);
    if (result.status !== 0) {
      return res.status(500).json({ error: "prediction pipeline failed", detail: result.stderr });
    }
      let parsed;
      try {
        // Find the first '{' to ignore any python print warnings before the JSON
        const jsonStr = result.stdout.substring(result.stdout.indexOf('{'));
        parsed = JSON.parse(jsonStr);
      } catch (e) {
        return res.status(500).json({ error: "could not parse pipeline output", detail: result.stdout });
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