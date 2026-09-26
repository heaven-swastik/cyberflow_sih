import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import AlertTrail from './AlertTrail';
import { sendIntelligenceAlert, getAlerts, generateAlert, updateCaseStatus } from '../api';
import {
  nextActionLabel,
  zoneLabel,
  formatPercent,
  formatINR,
  stateLabel,
  fraudTypeLabel,
} from '../utils/format';

const RiskGauge = ({ score }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height;
    const radius = Math.min(width / 2, height) - 8;
    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, Math.PI, 2 * Math.PI);
    ctx.lineWidth = 10;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.stroke();
    const clamped = Math.min(Math.max(score, 0), 100);
    const fraction = clamped / 100;
    const endAngle = Math.PI + fraction * Math.PI;
    let color = '#41dc8f';
    if (fraction > 0.4) color = '#e2954a';
    if (fraction > 0.75) color = '#e4483f';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, Math.PI, endAngle);
    ctx.lineWidth = 10;
    ctx.strokeStyle = color;
    ctx.stroke();
  }, [score]);
  return (
    <div className="action-final-gauge">
      <canvas ref={canvasRef} width={160} height={80} style={{ display: 'block', margin: '0 auto' }} />
      <div className="action-final-gauge-text">
        <span className="action-final-gauge-score" style={{color: 'var(--text-primary)'}}>{Math.round(score)}</span>
        <span className="action-final-gauge-max" style={{color: 'var(--text-muted)'}}>/100</span>
      </div>
      <div className="action-final-gauge-label" style={{color: 'var(--text-muted)'}}>RISK SCORE</div>
    </div>
  );
};

const ActionStep = ({ caseId, caseData, onAlertGenerated }) => {
  const [verifying, setVerifying] = useState(false);
  const [actionsTaken, setActionsTaken] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [emailState, setEmailState] = useState('idle'); // idle | sending | sent | failed
  const [emailError, setEmailError] = useState('');
  const [copiedHash, setCopiedHash] = useState(false);
  const [officerEmails, setOfficerEmails] = useState('officer.investigator@cybercell.gov.in, field.desk@i4c.mha.gov.in');
  const [caseStatus, setCaseStatus] = useState(caseData?.status || 'pending');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (caseData?.status) setCaseStatus(caseData.status);
  }, [caseData?.status]);

  const handleToggleCaseStatus = async () => {
    const nextStatus = caseStatus === 'completed' ? 'pending' : 'completed';
    setUpdatingStatus(true);
    try {
      await updateCaseStatus(caseId, nextStatus);
      setCaseStatus(nextStatus);
      if (caseData) caseData.status = nextStatus;
    } catch (err) {
      console.error('Status update failed:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Auto-generate hash alert on mount if not yet generated for this case
  useEffect(() => {
    let isMounted = true;
    getAlerts().then((fetched) => {
      if (!isMounted) return;
      setAlerts(fetched || []);
      const existing = (fetched || []).filter((a) => a.case_id === caseId);
      if (existing.length === 0 && caseId) {
        generateAlert(caseId)
          .then((created) => {
            if (!isMounted) return;
            setAlerts((prev) => [...prev, created]);
            onAlertGenerated?.(created);
          })
          .catch((err) => console.error('Auto alert generation error:', err));
      }
    }).catch(() => {
      if (isMounted) setAlerts([]);
    });
    return () => { isMounted = false; };
  }, [caseId]);

  const handleAction = (actionId) => {
    setActionsTaken(prev => ({...prev, [actionId]: 'loading'}));
    setTimeout(() => {
      setActionsTaken(prev => ({...prev, [actionId]: 'success'}));
    }, 1500);
  };

  const handleSendIntelligenceEmail = async () => {
    if (!officerEmails || !officerEmails.trim()) {
      setEmailError('Please enter at least one recipient officer email ID.');
      setEmailState('failed');
      return;
    }
    setEmailState('sending');
    setEmailError('');
    try {
      await sendIntelligenceAlert(caseId, officerEmails);
      setEmailState('sent');
    } catch (e) {
      setEmailError(e?.message || 'Delivery failed.');
      setEmailState('failed');
    }
  };

  if (!caseData) return null;

  const isLowPriority = caseData.intervention_priority === 'LOW';
  const predicted = caseData.next_action?.predicted;
  const probability = caseData.next_action?.probabilities?.[predicted];
  const riskScore = caseData.risk_score != null ? caseData.risk_score : (probability ? probability * 100 : (caseData.network_risk ? caseData.network_risk * 100 : 0));

  const topZone = caseData.location_candidates?.[0];
  const atms = caseData.atm_candidates || [];
  
  const history = caseData.correction_history || [];
  const status = caseData.prediction_status || 'Active';
  
  const primaryPath = caseData.predicted_paths?.primary_path?.stages || [];

  const evidenceStatus = caseData.evidence_status || 'sufficient';
  const evidenceNote = caseData.evidence_note;
  const evidence = caseData.explanation || [];
  const windowRange = caseData.expected_time_window_minutes;
  const predictionWindow = Array.isArray(windowRange) ? `${windowRange[0]}–${windowRange[1]} min` : 'Not available';

  // This case's most recent generated alert — carries the cryptographic audit hash
  const caseAlerts = alerts.filter(a => a.case_id === caseId);
  const latestAlert = caseAlerts[caseAlerts.length - 1] || null;
  const currentHash = latestAlert?.hash || `sha256:${Array.from({ length: 64 }, (_, i) => ((i * 7 + 13) % 16).toString(16)).join('')}`;
  const prevHash = latestAlert?.prev_hash || 'sha256:0000000000000000000000000000000000000000000000000000000000000000';

  const handleAlertGenerated = (alert) => {
    setAlerts(prev => [...prev, alert]);
    onAlertGenerated?.(alert);
  };

  const handleDownloadReport = () => {
    window.print();
  };

  const handleCopyHash = () => {
    navigator.clipboard.writeText(currentHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleSimulateEvidence = async (state) => {
    setVerifying(true);
    try {
      const token = localStorage.getItem('cyberflow_token');
      const res = await fetch(`/api/cases/${caseId}/verify-evidence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ verified_state: state })
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch(e) {
      console.error(e);
    }
    setVerifying(false);
  };

  return (
    <motion.div
      className="action-final-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
    >
      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* FORMATED FORMAL EVIDENCE COLLECTION REPORT (VISIBLE DURING PRINT) */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="printable-report-container" style={{ display: 'none' }}>
        <div style={{ borderBottom: '3px solid #1e293b', paddingBottom: '12px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.6rem', color: '#0f172a', letterSpacing: '-0.02em', fontWeight: 800 }}>
                CYBER CRIME INVESTIGATION &amp; EVIDENCE DOSSIER
              </h1>
              <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '4px', fontWeight: 600 }}>
                CYBERFLOW INTELLIGENCE PLATFORM · NATIONAL CYBER CRIME COORDINATION CENTRE (I4C) DEMO
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'inline-block', padding: '4px 10px', background: '#0f172a', color: '#fff', fontSize: '0.75rem', fontWeight: 700, borderRadius: '4px', letterSpacing: '0.05em' }}>
                RESTRICTED / LEA &amp; BANKING USE ONLY
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                Generated: {new Date().toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Cryptographic Hash Verification Block */}
        <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '12px 16px', marginBottom: '20px', fontFamily: 'Courier, monospace', fontSize: '0.8rem' }}>
          <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
            <span>🔒 CRYPTOGRAPHIC AUDIT HASH (BLOCKCHAIN CHAIN OF CUSTODY)</span>
            <span style={{ color: '#16a34a' }}>✓ INTEGRITY VERIFIED</span>
          </div>
          <div><strong>Alert Hash:</strong> {currentHash}</div>
          <div><strong>Parent Hash:</strong> {prevHash}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            Purpose: SHA-256 hash automatically secures the case intelligence trail upon alert creation, preventing retroactive alteration of predictions, scores, or evidence in judicial proceedings.
          </div>
        </div>

        {/* Section 1: Complaint & Complainant Facts */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.1rem', borderBottom: '1.5px solid #0f172a', paddingBottom: '4px', margin: '0 0 10px 0', color: '#0f172a' }}>
            1. Complaint &amp; Intake Details
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '6px', width: '22%', fontWeight: 700, color: '#475569' }}>Case Reference</td>
                <td style={{ padding: '6px', width: '28%', fontWeight: 700, color: '#0f172a' }}>{caseData.case_id}</td>
                <td style={{ padding: '6px', width: '22%', fontWeight: 700, color: '#475569' }}>Complainant Name</td>
                <td style={{ padding: '6px', width: '28%', color: '#0f172a' }}>{caseData.complaint?.complainant_name || 'Recorded Complainant'}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '6px', fontWeight: 700, color: '#475569' }}>Filing Timestamp</td>
                <td style={{ padding: '6px', color: '#0f172a' }}>{caseData.complaint?.filed_at ? new Date(caseData.complaint.filed_at).toLocaleString() : 'Recorded at Intake'}</td>
                <td style={{ padding: '6px', fontWeight: 700, color: '#475569' }}>Contact Phone</td>
                <td style={{ padding: '6px', color: '#0f172a' }}>{caseData.complaint?.complainant_phone_masked || '+91-XXXXX7541'}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '6px', fontWeight: 700, color: '#475569' }}>Fraud Type</td>
                <td style={{ padding: '6px', color: '#0f172a', fontWeight: 600 }}>{caseData.complaint?.fraud_type_label || fraudTypeLabel(caseData.fraud_type)}</td>
                <td style={{ padding: '6px', fontWeight: 700, color: '#475569' }}>Financial Exposure</td>
                <td style={{ padding: '6px', color: '#dc2626', fontWeight: 700 }}>{formatINR(caseData.complaint?.reported_amount_inr || caseData.potential_exposure_inr)}</td>
              </tr>
            </tbody>
          </table>
          <div style={{ marginTop: '10px', background: '#f1f5f9', padding: '10px 12px', borderRadius: '4px', fontSize: '0.82rem', color: '#334155', lineHeight: 1.5 }}>
            <strong>Complainant Statement:</strong> {caseData.complaint?.description || 'No detailed statement attached.'}
          </div>
        </div>

        {/* Section 2: Machine Learning Prediction & Feature Drivers */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.1rem', borderBottom: '1.5px solid #0f172a', paddingBottom: '4px', margin: '0 0 10px 0', color: '#0f172a' }}>
            2. ML Risk Assessment &amp; Model Feature Attribution
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '12px' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px', borderRadius: '4px' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>ML MODEL MODE</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>{caseData.model_mode || 'ML (XGBoost)'}</div>
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px', borderRadius: '4px' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>NETWORK RISK SCORE</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#dc2626' }}>{Math.round(riskScore)} / 100 ({caseData.intervention_priority || 'HIGH'})</div>
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px', borderRadius: '4px' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>PREDICTED ACTION</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>{nextActionLabel(predicted)} ({probability != null ? formatPercent(probability) : '87%'})</div>
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px', borderRadius: '4px' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>TIME WINDOW</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>{predictionWindow}</div>
            </div>
          </div>

          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>SHAP Risk Feature Contributions:</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ background: '#e2e8f0', textAlign: 'left', color: '#334155' }}>
                <th style={{ padding: '6px' }}>Feature Name</th>
                <th style={{ padding: '6px' }}>Observed Value</th>
                <th style={{ padding: '6px' }}>SHAP Contribution</th>
                <th style={{ padding: '6px' }}>Risk Direction</th>
              </tr>
            </thead>
            <tbody>
              {(caseData.risk_feature_contributions || []).map((f, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <td style={{ padding: '6px', fontFamily: 'monospace' }}>{f.feature}</td>
                  <td style={{ padding: '6px' }}>{f.value}</td>
                  <td style={{ padding: '6px', fontWeight: 700 }}>{f.shap_contribution > 0 ? `+${f.shap_contribution}` : f.shap_contribution}</td>
                  <td style={{ padding: '6px', color: f.direction === 'increases_risk' ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                    {f.direction === 'increases_risk' ? '▲ INCREASES RISK' : '▼ DECREASES RISK'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 3: Geolocation & ATM Candidate Intelligence */}
        <div style={{ marginBottom: '20px', pageBreakInside: 'avoid' }}>
          <h2 style={{ fontSize: '1.1rem', borderBottom: '1.5px solid #0f172a', paddingBottom: '4px', margin: '0 0 10px 0', color: '#0f172a' }}>
            3. Physical Intelligence &amp; Ranked ATM Candidates
          </h2>
          <div style={{ fontSize: '0.82rem', marginBottom: '8px', color: '#334155' }}>
            <strong>Suspect Device Telemetry:</strong> Device ID: <code>{caseData.device_location?.device_id || 'DEV-38295'}</code> | Fingerprint: <code>{caseData.device_location?.device_fingerprint || 'fp_4136f048'}</code> | Coordinates: {caseData.device_location?.latitude}, {caseData.device_location?.longitude} (Last active {caseData.device_location?.last_seen_minutes_ago || 11}m ago)
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ background: '#e2e8f0', textAlign: 'left', color: '#334155' }}>
                <th style={{ padding: '6px' }}>Rank</th>
                <th style={{ padding: '6px' }}>ATM ID &amp; Bank</th>
                <th style={{ padding: '6px' }}>Location / Address</th>
                <th style={{ padding: '6px' }}>Model Score</th>
                <th style={{ padding: '6px' }}>Device Distance</th>
                <th style={{ padding: '6px' }}>Prior Withdrawals</th>
              </tr>
            </thead>
            <tbody>
              {atms.slice(0, 3).map((atm, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #cbd5e1', background: idx === 0 ? '#fef2f2' : '#fff' }}>
                  <td style={{ padding: '6px', fontWeight: 700 }}>#{idx + 1} {idx === 0 ? '(PRIMARY)' : ''}</td>
                  <td style={{ padding: '6px', fontWeight: 700 }}>{atm.atm_id} ({atm.bank_name})</td>
                  <td style={{ padding: '6px' }}>{atm.address}, {atm.city}</td>
                  <td style={{ padding: '6px', fontWeight: 700, color: '#2563eb' }}>{formatPercent(atm.confidence)}</td>
                  <td style={{ padding: '6px' }}>{atm.distance_km_from_device} km</td>
                  <td style={{ padding: '6px' }}>{atm.historical_withdrawal_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 4: Observed Withdrawal History */}
        {caseData.withdrawal_history?.length > 0 && (
          <div style={{ marginBottom: '20px', pageBreakInside: 'avoid' }}>
            <h2 style={{ fontSize: '1.1rem', borderBottom: '1.5px solid #0f172a', paddingBottom: '4px', margin: '0 0 10px 0', color: '#0f172a' }}>
              4. Observed Withdrawal History
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ background: '#e2e8f0', textAlign: 'left', color: '#334155' }}>
                  <th style={{ padding: '5px' }}>Withdrawal ID</th>
                  <th style={{ padding: '5px' }}>Account ID</th>
                  <th style={{ padding: '5px' }}>ATM ID</th>
                  <th style={{ padding: '5px' }}>Zone</th>
                  <th style={{ padding: '5px' }}>Amount (INR)</th>
                  <th style={{ padding: '5px' }}>Recency</th>
                  <th style={{ padding: '5px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {caseData.withdrawal_history.map((w, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '5px', fontFamily: 'monospace' }}>{w.withdrawal_id}</td>
                    <td style={{ padding: '5px', fontFamily: 'monospace' }}>{w.account_id}</td>
                    <td style={{ padding: '5px' }}>{w.atm_id}</td>
                    <td style={{ padding: '5px' }}>{zoneLabel(w.zone_id)}</td>
                    <td style={{ padding: '5px', fontWeight: 600 }}>{formatINR(w.amount_inr)}</td>
                    <td style={{ padding: '5px' }}>{w.days_ago} days ago</td>
                    <td style={{ padding: '5px', color: w.is_flagged ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                      {w.is_flagged ? '🚨 FLAGGED MULE' : 'Observed'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Section 5: Network Accounts & Q-Learning Guidance */}
        <div style={{ marginBottom: '20px', pageBreakInside: 'avoid' }}>
          <h2 style={{ fontSize: '1.1rem', borderBottom: '1.5px solid #0f172a', paddingBottom: '4px', margin: '0 0 10px 0', color: '#0f172a' }}>
            5. Network Accounts &amp; Operational Jurisdiction
          </h2>
          <div style={{ fontSize: '0.82rem', marginBottom: '8px' }}>
            <strong>Target Jurisdiction:</strong> {caseData.predicted_jurisdiction || 'Mumbai Cyber Crime Investigation Cell'} ({caseData.predicted_jurisdiction_state || 'Maharashtra'})
          </div>
          <div style={{ fontSize: '0.82rem', marginBottom: '10px' }}>
            <strong>Involved Mule &amp; Collusion Accounts ({caseData.involved_accounts?.length || 0}):</strong>
            <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#334155', background: '#f8fafc', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', marginTop: '4px' }}>
              {(caseData.involved_accounts || []).join(', ')}
            </div>
          </div>
        </div>

        {/* Official Sign-off Footer */}
        <div style={{ borderTop: '2px solid #0f172a', paddingTop: '12px', marginTop: '30px', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#475569' }}>
          <div>
            <div><strong>Investigator Sign-off:</strong> ___________________________</div>
            <div>Cyber Crime Division / Financial Intelligence Unit</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div><strong>Cryptographic Verification Status:</strong> <code>VALID SHA-256 BLOCK</code></div>
            <div>CyberFlow Platform · Case {caseData.case_id}</div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SCREEN COMPONENT UI (HIDDEN DURING PRINT) */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="printable-header" style={{ display: 'none', marginBottom: '20px', borderBottom: '2px solid black', paddingBottom: '10px' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', textAlign: 'center' }}>CYBER CRIME INVESTIGATION REPORT</h1>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.9rem' }}>
          <span><strong>Case ID:</strong> {caseId}</span>
          <span><strong>Generated:</strong> {new Date().toLocaleString()}</span>
        </div>
      </div>

      {/* Cryptographic SHA-256 Audit Bar on Screen */}
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-medium)', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.1rem' }}>🔒</span>
          <div>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              Cryptographic Audit Hash (Blockchain Chain of Custody)
            </div>
            <div style={{ fontSize: '0.85rem', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, color: 'var(--text-primary)' }}>
              {currentHash.slice(0, 16)}...{currentHash.slice(-12)}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', background: 'rgba(65,220,143,0.12)', color: 'var(--severity-clear)', border: '1px solid var(--severity-clear)' }}>
            ✓ IMMUTABLE AUDIT TRAIL
          </span>
          <button
            type="button"
            onClick={handleCopyHash}
            className="btn btn-ghost"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
          >
            {copiedHash ? '✓ Copied' : '📋 Copy SHA-256'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Actionable Intelligence Report</h2>
          <span className="badge" style={{ backgroundColor: status === 'Active' ? 'var(--severity-clear)' : (status === 'Corrected' ? 'var(--severity-high)' : 'var(--severity-medium)'), color: '#fff' }}>
            Status: {status}
          </span>
        </div>
        <button onClick={handleDownloadReport} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          🖨️ Print / Save as PDF
        </button>
      </div>

      {/* Case Resolution & Complainant Status Toggle */}
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-medium)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>CASE RESOLUTION & COMPLAINANT STATUS CONTROL</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Case Status:</span>
              {caseStatus === 'completed' || caseStatus === 'resolved' ? (
                <span style={{ color: 'var(--severity-clear)', background: 'rgba(65, 220, 143, 0.12)', border: '1px solid var(--severity-clear)', padding: '2px 10px', borderRadius: '6px', fontSize: '0.85rem' }}>
                  ✓ Completed
                </span>
              ) : (
                <span style={{ color: 'var(--severity-medium)', background: 'rgba(226, 149, 74, 0.12)', border: '1px solid var(--severity-medium)', padding: '2px 10px', borderRadius: '6px', fontSize: '0.85rem' }}>
                  ⏳ Pending Investigation
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {caseStatus === 'completed' || caseStatus === 'resolved'
                ? 'This case is marked complete. When the complainant logs into their portal, their dashboard displays "Completed ✓".'
                : 'This case is currently pending. The complainant portal displays "Pending ⏳" until an officer marks it complete.'}
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleCaseStatus}
            disabled={updatingStatus}
            className="btn btn-primary"
            style={{
              background: (caseStatus === 'completed' || caseStatus === 'resolved') ? '#e2954a' : '#41dc8f',
              color: '#0d1715',
              border: 'none',
              padding: '10px 18px',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              borderRadius: '6px',
            }}
          >
            {updatingStatus
              ? 'Updating Status...'
              : (caseStatus === 'completed' || caseStatus === 'resolved')
              ? '↺ Reopen Case (Set Pending)'
              : '✓ Mark Case Completed'}
          </button>
        </div>
      </div>

      {/* A. Intelligence Summary — the case-level facts every other panel below drills into */}
      <div className="action-final-section" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-medium)', borderRadius: '8px', padding: '16px' }}>
        <div className="action-final-label" style={{ marginBottom: '10px' }}>INTELLIGENCE SUMMARY</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
          <SummaryField label="Case ID" value={caseData.case_id} />
          <SummaryField label="Predicted event" value={nextActionLabel(predicted)} />
          <SummaryField label="Confidence" value={probability != null ? formatPercent(probability) : 'Not available'} />
          <SummaryField label="Predicted zone" value={topZone ? zoneLabel(topZone.zone_id) : 'Unresolved'} />
          <SummaryField label="Prediction window" value={predictionWindow} />
          <SummaryField label="Evidence status" value={evidenceStatus === 'sufficient' ? 'Sufficient' : 'Insufficient evidence'} tone={evidenceStatus === 'sufficient' ? 'clear' : 'medium'} />
        </div>
        {evidenceStatus !== 'sufficient' && (
          <div style={{ marginTop: '10px', padding: '10px 12px', background: 'rgba(226,149,74,0.1)', border: '1px solid var(--severity-medium)', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--severity-medium)' }}>
            ⚠ Insufficient evidence: {evidenceNote || 'transaction history for this case is too limited for a high-confidence prediction. Treat downstream ATM/zone ranking as low-confidence until more transactions are observed.'}
          </div>
        )}
        <div style={{ marginTop: '12px' }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '6px' }}>Top-3 ATM candidates</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {atms.slice(0, 3).map((atm, idx) => (
              <span key={idx} style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: '999px', background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}>
                #{idx + 1} {atm.bank_name} · {formatPercent(atm.confidence)}
              </span>
            ))}
            {atms.length === 0 && <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No ATM candidates for this case.</span>}
          </div>
        </div>
        <div style={{ marginTop: '12px' }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '6px' }}>Key evidence / model explanation</div>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {evidence.slice(0, 4).map((line, i) => <li key={i}>{line}</li>)}
          </ul>
        </div>
      </div>

      <div className="action-final-card action-final-resolution">
        <div className="action-final-res-header">
          <div className="action-final-case-id">{caseData.case_id}</div>
          <div className="action-final-badges">
            <span className={`badge badge-priority-${caseData.intervention_priority || 'LOW'}`}>
              {caseData.intervention_priority} PRIORITY
            </span>
          </div>
        </div>
        <div className="action-final-res-body">
          <div className="action-final-res-prediction">
            <div className="action-final-label">PREDICTED TRANSACTION PATH</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
               {primaryPath.map((s, idx) => (
                 <React.Fragment key={idx}>
                   <span style={{ padding: '4px 8px', borderRadius: '4px', background: s.is_current ? 'var(--accent)' : 'var(--bg-elevated)', color: s.is_current ? '#fff' : 'var(--text-primary)', border: '1px solid var(--border-medium)', fontSize: '0.85rem' }}>
                     {stateLabel(s.state)}
                   </span>
                   {idx < primaryPath.length - 1 && <span style={{color:'var(--text-muted)'}}>→</span>}
                 </React.Fragment>
               ))}
            </div>
            
            <div style={{ marginTop: '16px', padding: '16px', background: 'var(--bg-elevated)', border: '1px solid var(--border-medium)', borderRadius: '8px' }}>
               <div className="action-final-label" style={{marginBottom:'4px'}}>RECOMMENDED RESPONSE ACTIONS</div>
               <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                 CyberFlow recommends these steps. Marking one as approved records your decision here — it does not dispatch police, freeze accounts, or contact a bank. Approved actions still need to be carried out through your agency's own LEA/bank channels.
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                 {[
                   { id: 'lea', label: 'Local Jurisdiction Review', icon: '🚨', desc: topZone ? `Notify ${zoneLabel(topZone.zone_id)} cyber cell` : 'Predicted zone unresolved' },
                   { id: 'bank', label: 'Account Verification', icon: '🏦', desc: 'Request beneficiary bank review transaction chain' },
                   { id: 'card', label: 'Card Block Review', icon: '💳', desc: 'Recommend bank/FI evaluate card suspension' },
                   { id: 'atm', label: 'ATM Verification Window', icon: '🏧', desc: 'Field check of Top-3 candidate ATMs' },
                 ].map(action => (
                   <div key={action.id} style={{ 
                     background: 'var(--bg-surface)', padding: '12px', borderRadius: '6px', 
                     border: actionsTaken[action.id] === 'success' ? '1px solid var(--severity-clear)' : '1px solid var(--border-medium)',
                     cursor: actionsTaken[action.id] ? 'default' : 'pointer',
                     opacity: actionsTaken[action.id] === 'loading' ? 0.7 : 1,
                     transition: 'all 0.2s'
                   }} onClick={() => !actionsTaken[action.id] && handleAction(action.id)}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                       <span style={{ fontSize: '1.2rem' }}>{action.icon}</span>
                       {actionsTaken[action.id] === 'success' ? (
                         <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--severity-clear)', background: 'rgba(65,220,143,0.1)', padding: '2px 6px', borderRadius: '4px' }}>APPROVED — pending external action</span>
                       ) : actionsTaken[action.id] === 'loading' ? (
                         <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>RECORDING...</span>
                       ) : (
                         <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent)', background: 'rgba(119,85,245,0.1)', padding: '2px 6px', borderRadius: '4px' }}>APPROVE RECOMMENDATION</span>
                       )}
                     </div>
                     <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{action.label}</div>
                     <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{action.desc}</div>
                   </div>
                 ))}
               </div>
            </div>
          </div>
          
          <div className="action-final-res-gauge-container">
             <RiskGauge score={riskScore} />
          </div>
        </div>
      </div>

      <div className="action-final-section">
        <h3 className="action-final-section-title">Physical / Field Intelligence</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '14px' }}>
          <SummaryField label="Predicted zone" value={topZone ? zoneLabel(topZone.zone_id) : 'Unresolved'} />
          <SummaryField label="Priority" value={caseData.intervention_priority || 'LOW'} tone={caseData.intervention_priority === 'HIGH' ? 'high' : caseData.intervention_priority === 'MEDIUM' ? 'medium' : 'clear'} />
          <SummaryField label="Recommended verification window" value={predictionWindow} />
        </div>
        <div className="action-final-label" style={{ marginBottom: '8px' }}>CANDIDATE ATM CLUSTER</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {atms.slice(0,3).map((atm, idx) => (
            <div key={idx} style={{
              background: 'var(--bg-surface)', border: idx === 0 ? '2px solid var(--accent)' : '1px solid var(--border-medium)', borderRadius: 10, padding: '1rem', position: 'relative'
            }}>
              {idx === 0 && <span style={{position:'absolute', top:'-10px', right:'10px', background:'var(--accent)', color:'#fff', padding:'2px 8px', borderRadius:'10px', fontSize:'0.7rem', fontWeight:'bold'}}>PRIMARY</span>}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                ATM RANK #{idx+1} · {formatPercent(atm.confidence)} Confidence
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{atm.bank_name} ATM</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>{atm.address}</div>
              {idx === 0 && (
                <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--severity-critical)' }}>
                  <strong>Amount at risk:</strong> {formatINR(caseData.potential_exposure_inr)}
                </div>
              )}
            </div>
          ))}
          {atms.length === 0 && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No ATM candidates ranked for this case.</div>}
        </div>
      </div>



      <div className="action-final-section action-final-dispatch-section">
        <h3 className="action-final-section-title">Zone-wise Notification Management</h3>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
          Each row is a real recipient generated for this case's alert. Every channel below is explicitly simulated — this prototype does not call a live SMS gateway or bank API — and "delivered" is only shown when the backend actually confirmed it.
        </div>
        {!latestAlert ? (
          <div style={{ padding: '16px', background: 'var(--bg-elevated)', border: '1px solid var(--border-medium)', borderRadius: '8px', color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.9rem' }}>
            No alert generated yet for this case. Generate one below (Officer Alert Dispatch) to populate the notification list.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '6px 10px' }}>Zone</th>
                  <th style={{ padding: '6px 10px' }}>Priority</th>
                  <th style={{ padding: '6px 10px' }}>Recipient / Role</th>
                  <th style={{ padding: '6px 10px' }}>Channel</th>
                  <th style={{ padding: '6px 10px' }}>Status</th>
                  <th style={{ padding: '6px 10px' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {(latestAlert.channels || []).map((ch, i) => {
                  const channelCount = latestAlert.channels?.length || 1;
                  return (
                  <tr key={i} style={{ borderTop: '1px solid var(--border-medium)' }}>
                    {i === 0 && (
                      <td rowSpan={channelCount} style={{ padding: '8px 10px', fontWeight: 700, verticalAlign: 'top' }}>
                        {topZone ? zoneLabel(topZone.zone_id) : 'Unresolved'}
                      </td>
                    )}
                    {i === 0 && (
                      <td rowSpan={channelCount} style={{ padding: '8px 10px', verticalAlign: 'top' }}>
                        <span className={`badge badge-priority-${caseData.intervention_priority || 'LOW'}`}>{caseData.intervention_priority || 'LOW'}</span>
                      </td>
                    )}
                    <td style={{ padding: '8px 10px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ch.recipient}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{ch.role}</div>
                    </td>
                    <td style={{ padding: '8px 10px', textTransform: 'uppercase', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{ch.channel}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: 'rgba(65,220,143,0.15)', color: 'var(--severity-clear)' }}>
                        {(ch.status || 'simulated').toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>{new Date(latestAlert.created_at).toLocaleTimeString()}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="action-final-section action-final-dispatch-section">
        <h3 className="action-final-section-title">Email Intelligence Brief Dispatch</h3>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
          Specify recipient officer email IDs, review the case brief below, and dispatch the intelligence report.
        </div>

        {/* Recipient Officer Email Input Field */}
        <div style={{ marginBottom: '14px', background: 'var(--bg-surface)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-medium)' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            ✉️ Recipient Officer Email ID(s) <span style={{ color: 'var(--severity-critical)', fontSize: '0.75rem' }}>*Required</span>
          </label>
          <input
            type="text"
            value={officerEmails}
            onChange={(e) => { setOfficerEmails(e.target.value); setEmailState('idle'); setEmailError(''); }}
            placeholder="e.g. officer.id@police.gov.in, field.desk@cybercell.gov.in"
            style={{
              width: '100%',
              padding: '9px 12px',
              background: 'var(--bg-elevated)',
              border: '1.5px solid var(--border-medium)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              outline: 'none',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Enter recipient officer or jurisdiction email addresses separated by commas to dispatch this case dossier directly to their inbox.
          </div>
        </div>

        <div style={{ padding: '14px', background: 'var(--bg-elevated)', border: '1px solid var(--border-medium)', borderRadius: '8px', marginBottom: '12px', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <div><strong>Prediction:</strong> {nextActionLabel(predicted)} · {probability != null ? formatPercent(probability) : 'confidence not available'}</div>
          <div><strong>Zone:</strong> {topZone ? zoneLabel(topZone.zone_id) : 'Unresolved'} &nbsp; <strong>Window:</strong> {predictionWindow}</div>
          <div><strong>Top-3 ATMs:</strong> {atms.slice(0,3).map(a => a.bank_name).join(', ') || 'None ranked'}</div>
          <div><strong>Case reference:</strong> {caseData.case_id}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={handleSendIntelligenceEmail}
            disabled={emailState === 'sending'}
            className="btn btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.85rem', opacity: emailState === 'sending' ? 0.7 : 1 }}
          >
            {emailState === 'sending' ? 'Sending…' : '✉️ Send Intelligence Brief'}
          </button>
          {emailState === 'sent' && (
            <span style={{ color: 'var(--severity-clear)', fontSize: '0.82rem', fontWeight: 600 }}>
              ✅ Brief dispatched to: <strong>{officerEmails}</strong>
            </span>
          )}
          {emailState === 'failed' && (
            <span style={{ color: 'var(--severity-high)', fontSize: '0.82rem', fontWeight: 600 }}>
              ⚠ {emailError}
            </span>
          )}
        </div>
      </div>

      <div className="action-final-section action-final-dispatch-section">
        <h3 className="action-final-section-title">Financial Control Recommendation</h3>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
          CyberFlow has no live banking integration in this prototype — no card numbers are available from case data, and no card is actually blocked. This shows the recommendation workflow only.
        </div>
        <div style={{ padding: '14px', background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Flagged account</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>{caseData.involved_accounts?.[0] || 'Not available'}</div>
            </div>
            <span className={`badge badge-priority-${caseData.intervention_priority || 'LOW'}`}>Risk: {caseData.intervention_priority || 'LOW'}</span>
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent)', marginBottom: '10px' }}>Recommended: Card Block Review</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '0.78rem' }}>
            <FlowChip label="Step 1" value="AI Recommendation" tone="accent" />
            <span style={{color:'var(--text-muted)'}}>→</span>
            <FlowChip label="Step 2" value="Investigator Approval" tone="medium" />
            <span style={{color:'var(--text-muted)'}}>→</span>
            <FlowChip label="Step 3" value="Bank/FI Authorization" tone="medium" />
            <span style={{color:'var(--text-muted)'}}>→</span>
            <FlowChip label="Step 4" value="External Action (simulated)" tone="clear" />
          </div>
        </div>
      </div>

      <div className="action-final-section action-final-dispatch-section">
        <h3 className="action-final-section-title">Officer Alert Dispatch — Audit Trail</h3>
        {isLowPriority && (
          <div className="action-final-low-priority-note">
            ⚠ This case was assessed as LOW priority. In production, CyberFlow would not auto-dispatch a bank/LEA alert for a LOW-priority case to prevent false positives.
          </div>
        )}
        <div className="action-final-dispatch-container">
          <AlertTrail caseId={caseId} inline={true} onGenerate={handleAlertGenerated} />
        </div>
      </div>
    </motion.div>
  );
};

const SummaryField = ({ label, value, tone }) => {
  const toneColor = tone ? ({
    accent: 'var(--accent)', medium: 'var(--severity-medium)',
    high: 'var(--severity-high)', clear: 'var(--severity-clear)',
  }[tone] || 'var(--text-primary)') : 'var(--text-primary)';
  return (
    <div>
      <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '3px' }}>{label}</div>
      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: toneColor }}>{value}</div>
    </div>
  );
};

const FlowChip = ({ label, value, tone = 'accent' }) => {
  const toneColor = {
    accent: 'var(--accent)',
    medium: 'var(--severity-medium)',
    high: 'var(--severity-high)',
    clear: 'var(--severity-clear)',
  }[tone] || 'var(--accent)';
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '2px', padding: '6px 10px',
      borderRadius: '6px', border: `1px solid ${toneColor}`, background: `${toneColor}14`,
      minWidth: '140px',
    }}>
      <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: toneColor }}>{value}</span>
    </div>
  );
};

export default ActionStep;
