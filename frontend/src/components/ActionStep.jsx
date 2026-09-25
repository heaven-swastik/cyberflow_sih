import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import AlertTrail from './AlertTrail';
import {
  nextActionLabel,
  zoneLabel,
  formatPercent,
  formatINR,
  stateLabel,
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
  
  if (!caseData) return null;

  const isLowPriority = caseData.intervention_priority === 'LOW';
  const predicted = caseData.next_action?.predicted;
  const probability = caseData.next_action?.probabilities?.[predicted];
  const riskScore = caseData.risk_score != null ? caseData.risk_score : (probability ? probability * 100 : 0);

  const topZone = caseData.location_candidates?.[0];
  const atms = caseData.atm_candidates || [];
  
  const history = caseData.correction_history || [];
  const status = caseData.prediction_status || 'Active';
  
  const primaryPath = caseData.predicted_paths?.primary_path?.stages || [];

  const handleDownloadReport = () => {
    window.print();
  };

  const handleSimulateEvidence = async (state) => {
    setVerifying(true);
    try {
      const token = localStorage.getItem('token');
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
            <div className="printable-header" style={{ display: 'none', marginBottom: '20px', borderBottom: '2px solid black', paddingBottom: '10px' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', textAlign: 'center' }}>CYBER CRIME INVESTIGATION REPORT</h1>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.9rem' }}>
          <span><strong>Case ID:</strong> {caseId}</span>
          <span><strong>Generated:</strong> {new Date().toLocaleString()}</span>
        </div>
        <div style={{ marginTop: '10px', fontSize: '0.85rem' }}>
          <strong>CONFIDENTIAL - FOR AUTHORIZED LAW ENFORCEMENT & BANKING OFFICERS ONLY</strong><br/>
          This report contains step-by-step prediction trails and actionable intelligence.
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
          📄 Download PDF Report
        </button>
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
            
            <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-medium)', borderRadius: '8px' }}>
               <div className="action-final-label" style={{marginBottom:'8px'}}>RECOMMENDED INTERVENTION</div>
               <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                 <li>Alert the responsible local LEA/zone officer for {topZone ? zoneLabel(topZone.zone_id) : 'unknown zone'}.</li>
                 <li>Notify the relevant authorized bank/financial institution.</li>
                 <li>Monitor the predicted transaction path continuously.</li>
                 <li>Keep alternate ATM predictions available.</li>
               </ul>
            </div>
          </div>
          
          <div className="action-final-res-gauge-container">
             <RiskGauge score={riskScore} />
          </div>
        </div>
      </div>

      <div className="action-final-section">
        <h3 className="action-final-section-title">Predicted Withdrawal Risk</h3>
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
        </div>
      </div>

      <div className="action-final-section">
        <h3 className="action-final-section-title" style={{display: 'flex', justifyContent: 'space-between'}}>
          <span>RL Correction & Q-Learning Feedback</span>
          <div style={{display:'flex', gap:'8px'}}>
             <button onClick={() => handleSimulateEvidence('consolidation')} disabled={verifying} className="btn btn-outline" style={{padding:'4px 8px', fontSize:'0.75rem'}}>Simulate: Validated 'Consolidation'</button>
             <button onClick={() => handleSimulateEvidence('distribution')} disabled={verifying} className="btn btn-outline" style={{padding:'4px 8px', fontSize:'0.75rem'}}>Simulate: Corrected 'Distribution'</button>
          </div>
        </h3>
        
        {history.length === 0 ? (
          <div style={{ padding: '16px', background: 'var(--bg-elevated)', border: '1px solid var(--border-medium)', borderRadius: '8px', color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.9rem' }}>
            No corrections yet. System is awaiting verified ground-truth transactions from the bank/LEA API to validate the prediction and update Q-values.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {history.map((h, i) => (
              <div key={i} style={{ padding: '16px', background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderLeft: `4px solid ${h.action_taken === 'Path corrected' ? 'var(--severity-high)' : 'var(--severity-clear)'}`, borderRadius: '4px', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'12px', alignItems: 'center'}}>
                  <strong style={{fontSize: '1.05rem', color: h.action_taken === 'Path corrected' ? 'var(--severity-high)' : 'var(--severity-clear)'}}>
                    {h.action_taken === 'Path corrected' ? '🚨 Prediction Contradicted by Ground Truth' : '✅ Prediction Validated'}
                  </strong>
                  <span style={{color:'var(--text-muted)'}}>{new Date(h.timestamp).toLocaleString()}</span>
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px', lineHeight: '1.5'}}>
                  <div><strong>1. Initial State:</strong> The XGBoost model originally predicted the funds would move to <strong style={{color: 'var(--accent)'}}>{stateLabel(h.previous_prediction)}</strong>.</div>
                  <div><strong>2. Ground Truth Arrives:</strong> A verified transaction from the bank API arrived, confirming the funds actually moved to <strong style={{color: 'var(--severity-medium)'}}>{stateLabel(h.verified_ground_truth)}</strong>.</div>
                  {h.action_taken === 'Path corrected' ? (
                     <>
                       <div><strong>3. RL Penalty Applied:</strong> The Q-learning agent detected the mismatch. A negative reward (-1.0) was applied to the Q-table for this heuristic.</div>
                       <div><strong>4. Backtracking & Recalculation:</strong> The system snapped the active state back to <strong style={{color: 'var(--severity-medium)'}}>{stateLabel(h.verified_ground_truth)}</strong>, recalculated the downstream path, and generated new Top-3 ATM targets.</div>
                     </>
                  ) : (
                     <>
                       <div><strong>3. RL Reward Applied:</strong> The Q-learning agent validated the match. A positive reward (+1.0) was applied to the Q-table to reinforce this heuristic.</div>
                       <div><strong>4. Confidence Boost:</strong> The active path remains unchanged, and downstream ATM probabilities are strengthened.</div>
                     </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="action-final-section action-final-dispatch-section">
        <h3 className="action-final-section-title">Officer Alert Dispatch</h3>
        {isLowPriority && (
          <div className="action-final-low-priority-note">
            ⚠ This case was assessed as LOW priority. In production, CyberFlow would not auto-dispatch a bank/LEA alert for a LOW-priority case to prevent false positives.
          </div>
        )}
        <div className="action-final-dispatch-container">
          <AlertTrail caseId={caseId} inline={true} onGenerate={onAlertGenerated} />
        </div>
      </div>
    </motion.div>
  );
};

export default ActionStep;
