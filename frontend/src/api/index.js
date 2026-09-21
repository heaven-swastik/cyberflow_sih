/**
 * CyberFlow — API abstraction layer
 * Toggle between mock JSON data and live backend API with a single env var.
 *
 * Usage:
 *   VITE_USE_MOCK=true  → reads from embedded case_export.json (default)
 *   VITE_USE_MOCK=false → fetches from VITE_API_BASE (default http://localhost:3001/api)
 */

import mockData from '../data/caseExport.json';
import { auth } from '../firebase';

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

// --------------- helpers ---------------

function delay(ms = 80) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJSON(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };

  // Attach Firebase ID token if user is authenticated (for JWT-protected backend routes)
  try {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const token = await currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (_) {
    // Auth not available — proceed without token (demo/mock mode)
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// Mutable alert store for mock mode (new alerts get appended here)
let mockAlerts = mockData.cases.flatMap((c) => c.alerts || []);
let alertCounter = mockAlerts.length;

// --------------- API functions ---------------

export async function getOverview() {
  if (USE_MOCK) {
    await delay();
    return mockData.overview;
  }
  return fetchJSON('/overview');
}

export async function getCases() {
  if (USE_MOCK) {
    await delay();
    return mockData.cases.map(({ graph, timeline, alerts, ...rest }) => rest);
  }
  return fetchJSON('/cases');
}

export async function getCase(caseId) {
  if (USE_MOCK) {
    await delay();
    const c = mockData.cases.find((c) => c.case_id === caseId);
    if (!c) throw new Error(`Case ${caseId} not found`);
    const { graph, timeline, alerts, ...rest } = c;
    return rest;
  }
  return fetchJSON(`/cases/${caseId}`);
}

export async function getGraph(caseId) {
  if (USE_MOCK) {
    await delay();
    const c = mockData.cases.find((c) => c.case_id === caseId);
    if (!c) throw new Error(`Case ${caseId} not found`);
    return c.graph;
  }
  return fetchJSON(`/cases/${caseId}/graph`);
}

export async function getTimeline(caseId) {
  if (USE_MOCK) {
    await delay();
    const c = mockData.cases.find((c) => c.case_id === caseId);
    if (!c) throw new Error(`Case ${caseId} not found`);
    return c.timeline;
  }
  return fetchJSON(`/cases/${caseId}/timeline`);
}

export async function getExplanation(caseId) {
  if (USE_MOCK) {
    await delay();
    const c = mockData.cases.find((c) => c.case_id === caseId);
    if (!c) throw new Error(`Case ${caseId} not found`);
    return { case_id: caseId, explanation: c.explanation };
  }
  return fetchJSON(`/cases/${caseId}/explanation`);
}

export async function simulate(caseId, zoneId) {
  if (USE_MOCK) {
    await delay(200);
    const caseResults = mockData.simulation_results?.[caseId];
    if (caseResults && caseResults[zoneId]) {
      return caseResults[zoneId];
    }
    // Fallback: generate a plausible result
    const c = mockData.cases.find((c) => c.case_id === caseId);
    const exposure = c?.potential_exposure_inr || 500000;
    const loc = c?.location_candidates?.find((l) => l.zone_id === zoneId);
    const confidence = loc?.confidence || 0.3;
    const prevented = Math.round(exposure * confidence);
    return {
      case_id: caseId,
      zone_id: zoneId,
      expected_preventable_impact_inr: prevented,
      remaining_exposure_inr: exposure - prevented,
      network_impact: confidence > 0.6 ? 'Very High' : confidence > 0.4 ? 'High' : 'Moderate',
      recommended: confidence > 0.6,
    };
  }
  return fetchJSON(`/cases/${caseId}/simulate`, {
    method: 'POST',
    body: JSON.stringify({ zone_id: zoneId }),
  });
}

export async function generateAlert(caseId) {
  if (USE_MOCK) {
    await delay(300);
    const c = mockData.cases.find((c) => c.case_id === caseId);
    if (!c) throw new Error(`Case ${caseId} not found`);
    alertCounter++;
    const now = new Date().toISOString();
    const prevHash =
      mockAlerts.length > 0
        ? mockAlerts[mockAlerts.length - 1].hash
        : 'sha256:0000000000000000000000000000000000000000000000000000000000000000';
    const newAlert = {
      alert_id: `ALT-${String(alertCounter).padStart(4, '0')}`,
      case_id: caseId,
      created_at: now,
      current_state: c.current_state,
      predicted_next_action: c.next_action.predicted,
      probability: c.next_action.probabilities[c.next_action.predicted],
      expected_window: `${new Date().getHours()}:${String(new Date().getMinutes()).padStart(2, '0')}-${new Date().getHours()}:${String(new Date().getMinutes() + 20).padStart(2, '0')}`,
      top_location: c.location_candidates[0]?.zone_id || 'zone_a',
      potential_exposure_inr: c.potential_exposure_inr,
      intervention_priority: c.intervention_priority,
      reason: c.explanation.slice(0, 3).join(' + ') + '.',
      hash: `sha256:${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      prev_hash: prevHash,
    };
    mockAlerts.push(newAlert);
    return newAlert;
  }
  return fetchJSON(`/cases/${caseId}/alert`, { method: 'POST' });
}

export async function getAlerts() {
  if (USE_MOCK) {
    await delay();
    return [...mockAlerts];
  }
  return fetchJSON('/alerts');
}

export async function getFeed(count = 5) {
  if (USE_MOCK) {
    await delay();
    return []; // LiveFeed generates its own events client-side
  }
  return fetchJSON(`/feed?count=${count}`);
}

// --------------- Database (schema + live query preview) ---------------

const MOCK_DB_SCHEMA = `-- Live backend not connected — showing schema shape only.
-- Run ai-engine/db/build_db.py and start the backend to see real rows.
Complainant -> Complaint -> ComplaintAccount -> Account -> Transaction
Account -> Device -> DeviceLocation -> ATM -> WithdrawalHistory
Complaint -> Prediction -> PredictionFeature
Complaint -> Alert`;

export async function getDbSchema() {
  if (USE_MOCK) {
    await delay();
    return MOCK_DB_SCHEMA;
  }
  const res = await fetch(`${API_BASE}/db/schema`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.text();
}

export async function getDbPreview() {
  if (USE_MOCK) {
    await delay();
    return { tables: [], sample_queries: [] };
  }
  return fetchJSON('/db/preview');
}

// --------------- Feature Analysis + Evaluation (requirement 4 & 6) ---------------

export async function getFeatureAnalysis() {
  if (USE_MOCK) {
    await delay();
    return mockData.feature_analysis || null;
  }
  return fetchJSON('/feature-analysis');
}

export async function getEvaluationReport() {
  if (USE_MOCK) {
    await delay();
    return mockData.evaluation_report || null;
  }
  return fetchJSON('/evaluation');
}

// --------------- Data Validation (requirement 3) ---------------
// Validation reports are embedded directly on each case object
// (case.data_validation) by the ai-engine pipeline, so no separate
// fetch is usually needed — this exists for completeness / the live
// backend's standalone endpoint.

export async function getValidation(caseId) {
  if (USE_MOCK) {
    await delay();
    const c = mockData.cases.find((c) => c.case_id === caseId);
    return c?.data_validation || null;
  }
  return fetchJSON(`/cases/${caseId}/validation`);
}

// --------------- NCRP-style Complaint Portal (requirement 1) ---------------

export async function submitComplaint(complaint) {
  if (USE_MOCK) {
    await delay(600);
    throw new Error(
      'Filing a new complaint runs the full Python analysis pipeline and needs the live backend. ' +
      'Start the backend (npm run dev in /backend) and set VITE_USE_MOCK=false to try this.'
    );
  }
  return fetchJSON('/complaints', { method: 'POST', body: JSON.stringify(complaint) });
}

// --------------- API Integration demo (requirement 2) ---------------

export async function getIntegrationDocs() {
  if (USE_MOCK) {
    await delay();
    return {
      description: 'Demonstration of CyberFlow as a prediction layer an existing government/bank '
        + 'system could call, authenticated with an API key. Start the live backend to try it.',
      endpoint: 'POST /api/integration/predict',
      auth: { header: 'x-api-key', demo_key: 'cyberflow_demo_key_12345' },
      request_format: {
        case_id: "string — one of CyberFlow's existing case IDs (e.g. 'CF-1042'), OR",
        complaint: { complainant_name: 'string', complainant_phone: 'string', fraud_type: 'string', description: 'string', amount_inr: 'number' },
      },
      response_format: {
        case_id: 'string', current_state: 'string', network_risk: 'number 0.0-1.0',
        intervention_priority: 'LOW | MEDIUM | HIGH', location_candidates: '[{ zone_id, confidence }]',
        atm_candidates: '[{ atm_id, bank_name, confidence, reasoning }]', evidence_status: 'string',
      },
    };
  }
  return fetchJSON('/integration/docs');
}

export async function integrationPredict(apiKey, body) {
  if (USE_MOCK) {
    await delay(400);
    throw new Error('The API integration demo calls the live backend directly — start it and set VITE_USE_MOCK=false.');
  }
  const res = await fetch(`${API_BASE}/integration/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    const err = new Error(json.error || `API error: ${res.status}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}
