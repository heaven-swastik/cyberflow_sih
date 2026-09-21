import React, { useRef, useEffect } from 'react';
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

    // Background track
    ctx.beginPath();
    ctx.arc(cx, cy, radius, Math.PI, 2 * Math.PI);
    ctx.lineWidth = 10;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.stroke();

    // Active track
    const clamped = Math.min(Math.max(score, 0), 100);
    const fraction = clamped / 100;
    const endAngle = Math.PI + fraction * Math.PI;

    let color = '#41dc8f'; // Green
    if (fraction > 0.4) color = '#e2954a'; // Yellow
    if (fraction > 0.75) color = '#e4483f'; // Red

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
        <span className="action-final-gauge-score">{Math.round(score)}</span>
        <span className="action-final-gauge-max">/100</span>
      </div>
      <div className="action-final-gauge-label">RISK SCORE</div>
    </div>
  );
};

const ActionStep = ({ caseId, caseData, onAlertGenerated }) => {
  if (!caseData) return null;

  const isLowPriority = caseData.intervention_priority === 'LOW';
  const predicted = caseData.next_action?.predicted;
  const probability = caseData.next_action?.probabilities?.[predicted];
  
  // Try to use risk_score or fallback to probability
  const riskScore = caseData.risk_score != null ? caseData.risk_score : (probability ? probability * 100 : 0);

  const topZone = caseData.location_candidates?.[0];
  const topAtm = topZone?.atms?.[0];

  const insights = Array.isArray(caseData.explanation) 
    ? caseData.explanation.slice(0, 3) 
    : [];

  return (
    <motion.div
      className="action-final-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
    >
      {/* Section 1: Case Resolution Card */}
      <div className="action-final-card action-final-resolution">
        <div className="action-final-res-header">
          <div className="action-final-case-id">{caseData.case_id}</div>
          <div className="action-final-badges">
            <span className={`badge badge-priority-${caseData.intervention_priority || 'LOW'}`}>
              {caseData.intervention_priority} PRIORITY
            </span>
            <span className="badge badge-state">
              {caseData.current_state ? stateLabel(caseData.current_state) : 'UNKNOWN'}
            </span>
          </div>
        </div>

        <div className="action-final-res-body">
          <div className="action-final-res-prediction">
            <div className="action-final-label">PREDICTED NEXT ACTION</div>
            <div className="action-final-value action-final-highlight">
              {predicted ? nextActionLabel(predicted) : 'Insufficient Data'}
              {probability != null && (
                <span className="action-final-confidence">
                  {' '}— {formatPercent(probability)} Confidence
                </span>
              )}
            </div>
          </div>
          
          <div className="action-final-res-gauge-container">
             <RiskGauge score={riskScore} />
          </div>
        </div>
      </div>

      {/* Section 2: Key Insights */}
      {insights.length > 0 && (
        <div className="action-final-section">
          <h3 className="action-final-section-title">Key Insights</h3>
          <div className="action-final-insights">
            {insights.map((insight, idx) => (
              <motion.div 
                key={idx} 
                className="action-final-insight-card"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1, duration: 0.3 }}
              >
                {insight}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Section 3: Prediction Summary */}
      <div className="action-final-section">
        <h3 className="action-final-section-title">Prediction Summary</h3>
        <div className="action-final-summary-grid">
          <div className="action-final-summary-item">
            <div className="action-final-label">PREDICTED ZONE</div>
            <div className="action-final-value">
              {topZone ? `${zoneLabel(topZone.zone_id)} (${formatPercent(topZone.confidence)})` : 'N/A'}
            </div>
          </div>
          <div className="action-final-summary-item">
            <div className="action-final-label">TOP ATM CANDIDATE</div>
            <div className="action-final-value">
              {topAtm ? (
                <>
                  <div>{topAtm.bank}</div>
                  <div className="action-final-subvalue">{topAtm.address}</div>
                </>
              ) : 'N/A'}
            </div>
          </div>
          <div className="action-final-summary-item">
            <div className="action-final-label">TIME WINDOW</div>
            <div className="action-final-value">
              {caseData.expected_window || 'Immediate (0-4 hours)'}
            </div>
          </div>
          <div className="action-final-summary-item">
            <div className="action-final-label">POTENTIAL EXPOSURE</div>
            <div className="action-final-value action-final-exposure">
              {formatINR(caseData.potential_exposure_inr)}
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Alert Dispatch */}
      <div className="action-final-section action-final-dispatch-section">
        <h3 className="action-final-section-title">Alert Dispatch</h3>
        {isLowPriority && (
          <div className="action-final-low-priority-note">
            ⚠ This case was assessed as LOW priority. In production, CyberFlow would not auto-dispatch a bank/LEA alert for a LOW-priority case to prevent false positives. You can still generate it below for demo purposes.
          </div>
        )}
        <div className="action-final-dispatch-container">
          <AlertTrail caseId={caseId} inline={true} onGenerate={onAlertGenerated} />
        </div>
      </div>

      {/* Section 5: Confidence Statement */}
      <div className="action-final-footer">
        <div className="action-final-footer-item">
          <strong>Model Mode:</strong> ML XGBoost Ensemble
        </div>
        <div className="action-final-footer-item">
          <strong>Evidence Status:</strong> {caseData.evidence_status === 'insufficient_evidence' ? 'Insufficient' : 'Verified'}
        </div>
        <div className="action-final-footer-item">
          <strong>Features Used:</strong> 42 behavioral indicators
        </div>
        <div className="action-final-footer-disclaimer">
          This prediction is probabilistic and for decision-support only.
        </div>
      </div>
    </motion.div>
  );
};

export default ActionStep;
