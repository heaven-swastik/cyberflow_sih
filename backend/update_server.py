import sys
import re

with open('e:/projects/CyberFlow_SIH_final - Copy/backend/server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Chunk 1
old_header = """const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json());

const AI_ENGINE_DIR = path.join(__dirname, '..', 'ai-engine');
const DEMO_API_KEY = process.env.CYBERFLOW_DEMO_API_KEY || 'cyberflow_demo_key_12345';"""

new_header = """const express = require('express');
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
const DEMO_API_KEY = process.env.CYBERFLOW_API_KEY || 'cyberflow_demo_key_12345';"""

content = content.replace(old_header, new_header)

# Chunk 2
old_api_marker = "// ── API Endpoints ──"

new_api_marker = """const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });
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
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\\\n/g, '\\n'),
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

// ── API Endpoints ──"""

content = content.replace(old_api_marker, new_api_marker)

# Replace simple auth routes
routes_to_auth = [
    "app.get('/api/overview', (req, res) => {",
    "app.get('/api/cases', (req, res) => {",
    "app.get('/api/cases/:case_id', (req, res) => {",
    "app.get('/api/cases/:case_id/graph', (req, res) => {",
    "app.get('/api/cases/:case_id/timeline', (req, res) => {",
    "app.get('/api/cases/:case_id/explanation', (req, res) => {",
    "app.post('/api/cases/:case_id/simulate', (req, res) => {",
    "app.post('/api/cases/:case_id/alert', (req, res) => {",
    "app.get('/api/alerts', (req, res) => {",
    "app.get('/api/db/schema', (req, res) => {",
    "app.get('/api/db/preview', (req, res) => {",
    "app.get('/api/feed', (req, res) => {",
    "app.get('/api/feature-analysis', (req, res) => {",
    "app.get('/api/evaluation', (req, res) => {",
    "app.get('/api/cases/:case_id/validation', (req, res) => {"
]

for route in routes_to_auth:
    auth_route = route.replace("(req, res) => {", "authenticateToken, (req, res) => {")
    content = content.replace(route, auth_route)


old_complaint_route = """app.post('/api/complaints', (req, res) => {
  const complaint = req.body || {};"""

new_complaint_route = """app.post('/api/complaints', 
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
    const complaint = req.body || {};"""

content = content.replace(old_complaint_route, new_complaint_route)

with open('e:/projects/CyberFlow_SIH_final - Copy/backend/server.js', 'w', encoding='utf-8') as f:
    f.write(content)
