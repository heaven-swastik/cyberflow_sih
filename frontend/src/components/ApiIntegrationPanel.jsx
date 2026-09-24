import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getIntegrationDocs, integrationPredict, getCases } from '../api';

export default function ApiIntegrationPanel({ onClose }) {
  const [docs, setDocs] = useState(null);
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getIntegrationDocs().then((d) => {
      setDocs(d);
      setApiKey(d?.auth?.demo_key || '');
    });
    getCases().then((cs) => {
      setCases(cs);
      if (cs[0]) setSelectedCase(cs[0].case_id);
    });
  }, []);

  async function handleTry() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await integrationPredict(apiKey, { case_id: selectedCase });
      setResult(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay">
      <motion.div
        className="modal-content-glass"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
      >
        <button className="modal-close-btn" onClick={onClose}>✕</button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>🔌 API Integration — CyberFlow as a Prediction Layer</h2>
        </div>

      {!docs ? (
        <div style={{ padding: 20, color: 'var(--text-muted)' }}>Loading…</div>
      ) : (
        <div style={{ padding: '4px 4px 16px' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5, marginBottom: 14 }}>
            {docs.description}
          </div>

          <div className="incident-card" style={{ marginBottom: 14 }}>
            <div className="incident-card-title">Endpoint</div>
            <div className="incident-detail-row">
              <span className="incident-detail-label">Method + Path</span>
              <span className="incident-detail-value mono">{docs.endpoint}</span>
            </div>
            <div className="incident-detail-row">
              <span className="incident-detail-label">Auth header</span>
              <span className="incident-detail-value mono">{docs.auth.header}: {docs.auth.demo_key}</span>
            </div>
            <div className="incident-detail-row" style={{ alignItems: 'flex-start' }}>
              <span className="incident-detail-label">Request body</span>
              <span className="incident-detail-value mono" style={{ fontSize: 11, whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(docs.request_format, null, 2)}
              </span>
            </div>
            <div className="incident-detail-row" style={{ alignItems: 'flex-start' }}>
              <span className="incident-detail-label">Response shape</span>
              <span className="incident-detail-value mono" style={{ fontSize: 11, whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(docs.response_format, null, 2)}
              </span>
            </div>
          </div>

          <div className="incident-card">
            <div className="incident-card-title">Try it — call the live endpoint</div>
            <div className="incident-detail-row">
              <span className="incident-detail-label" style={{ minWidth: 100 }}>Case</span>
              <select className="cf-input" value={selectedCase} onChange={(e) => setSelectedCase(e.target.value)}>
                {cases.map((c) => <option key={c.case_id} value={c.case_id}>{c.case_id}</option>)}
              </select>
            </div>
            <div className="incident-detail-row">
              <span className="incident-detail-label" style={{ minWidth: 100 }}>x-api-key</span>
              <input className="cf-input mono" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
            </div>
            <div style={{ marginTop: 10 }}>
              <button className="btn btn-primary btn-sm" onClick={handleTry} disabled={loading}>
                {loading ? 'Calling…' : 'POST /api/integration/predict'}
              </button>
            </div>

            {error && (
              <div style={{ color: 'var(--severity-critical)', fontSize: 13, marginTop: 10 }}>{error}</div>
            )}
            {result && (
              <pre style={{
                marginTop: 12, fontSize: 11, color: 'var(--text-secondary)',
                background: 'var(--bg-elevated)', padding: 12, borderRadius: 8,
                maxHeight: 260, overflow: 'auto',
              }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
      </motion.div>
    </div>
  );
}
