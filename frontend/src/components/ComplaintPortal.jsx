import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { submitComplaint } from '../api';

const FRAUD_TYPES = [
  { value: 'investment_scam', label: 'Investment / Trading Fraud' },
  { value: 'digital_arrest', label: 'Digital Arrest / Impersonation Fraud' },
  { value: 'fake_payment_gateway', label: 'Fake Payment Gateway / Merchant Fraud' },
  { value: 'legitimate_business', label: '— Legitimate Transaction (test false-positive check) —' },
];

const EMPTY_FORM = {
  complainant_name: '',
  complainant_phone: '',
  fraud_type: 'investment_scam',
  description: '',
  amount_inr: '',
  thin_evidence: false,
};

export default function ComplaintPortal({ onCaseCreated, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [errors, setErrors] = useState([]);
  const [result, setResult] = useState(null);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('submitting');
    setErrors([]);
    try {
      const res = await submitComplaint({
        ...form,
        amount_inr: Number(form.amount_inr),
      });
      if (res.status === 'VALIDATION_FAILED') {
        setErrors(res.errors || ['Submission failed validation.']);
        setStatus('error');
        return;
      }
      setResult(res);
      setStatus('success');
    } catch (err) {
      setErrors([err.message || 'Submission failed.']);
      setStatus('error');
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
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>📝 File a Cyber-Fraud Complaint</h2>
        </div>

      <div style={{ padding: '4px 4px 16px', color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>
        Modeled on India's National Cyber Crime Reporting Portal (NCRP) intake fields — for demonstration
        only, not connected to the real NCRP. Submitting generates a Case ID and runs the complaint through
        CyberFlow's full analysis pipeline: data validation → feature engineering → statistical checks → ML
        prediction → probable zone → ATM ranking.
      </div>
      {status === 'idle' && (
        <div style={{ padding: '0 4px 16px', color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.5 }}>
          Try picking <strong>"Legitimate Transaction"</strong> below to watch
          our false-positive safeguard clear a non-fraud case instead of flagging it.
        </div>
      )}

      <AnimatePresence mode="wait">
        {status === 'success' && result ? (
          <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="alert-success-card">
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
              ✅ Complaint filed — Case ID <span className="mono" style={{ color: 'var(--accent)' }}>{result.case_id}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Priority: <strong style={{ color: 'var(--text-primary)' }}>{result.case.intervention_priority}</strong>
              {'  ·  '}
              Risk: <strong style={{ color: 'var(--text-primary)' }}>{Math.round(result.case.network_risk * 100)}%</strong>
              {'  ·  '}
              State: <strong style={{ color: 'var(--text-primary)' }}>{result.case.current_state}</strong>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="btn btn-primary" onClick={() => onCaseCreated?.(result.case_id)}>
                Open Case in Investigator View →
              </button>
              <button className="btn btn-ghost" onClick={() => { setForm(EMPTY_FORM); setResult(null); setStatus('idle'); }}>
                File Another
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.form key="form" onSubmit={handleSubmit} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="incident-detail-row">
              <label className="incident-detail-label" style={{ minWidth: 160 }}>Complainant Name</label>
              <input
                required
                className="cf-input"
                value={form.complainant_name}
                onChange={(e) => update('complainant_name', e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div className="incident-detail-row">
              <label className="incident-detail-label" style={{ minWidth: 160 }}>Phone Number</label>
              <input
                required
                className="cf-input"
                value={form.complainant_phone}
                onChange={(e) => update('complainant_phone', e.target.value)}
                placeholder="10-digit mobile number"
              />
            </div>
            <div className="incident-detail-row">
              <label className="incident-detail-label" style={{ minWidth: 160 }}>Fraud Category</label>
              <select
                className="cf-input"
                value={form.fraud_type}
                onChange={(e) => update('fraud_type', e.target.value)}
              >
                {FRAUD_TYPES.map((ft) => (
                  <option key={ft.value} value={ft.value}>{ft.label}</option>
                ))}
              </select>
            </div>
            <div className="incident-detail-row">
              <label className="incident-detail-label" style={{ minWidth: 160 }}>Amount Lost (₹)</label>
              <input
                required
                type="number"
                min="1"
                className="cf-input"
                value={form.amount_inr}
                onChange={(e) => update('amount_inr', e.target.value)}
                placeholder="e.g. 450000"
              />
            </div>
            <div className="incident-detail-row" style={{ alignItems: 'flex-start' }}>
              <label className="incident-detail-label" style={{ minWidth: 160 }}>What happened</label>
              <textarea
                required
                className="cf-input"
                rows={3}
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="Brief description of the incident"
              />
            </div>



            {errors.length > 0 && (
              <div style={{ color: 'var(--severity-critical)', fontSize: 13, marginTop: 8 }}>
                {errors.map((err, i) => <div key={i}>• {err}</div>)}
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <button type="submit" className="btn btn-primary" disabled={status === 'submitting'}>
                {status === 'submitting' ? 'Running analysis pipeline…' : 'Submit Complaint'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
      </motion.div>
    </div>
  );
}
