import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  formatINR,
  formatPercent,
  stateLabel,
  stateColor,
  fraudTypeLabel,
  nextActionLabel,
  zoneLabel,
} from '../utils/format';

export default function CaseBriefing({ caseData, onBack, onExplore, onRunSimulation }) {
  const etaRange = caseData?.expected_time_window_minutes;
  const upperBoundMinutes = etaRange ? etaRange[1] : 0;
  
  const [timeLeft, setTimeLeft] = useState(upperBoundMinutes * 60);
  const maxTimeLeft = useRef(upperBoundMinutes * 60);
  
  useEffect(() => {
    if (upperBoundMinutes === 0) return;
    
    setTimeLeft(upperBoundMinutes * 60);
    maxTimeLeft.current = upperBoundMinutes * 60;
    
    const intervalId = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, [upperBoundMinutes]);

  if (!caseData) return null;

  const nextAction = caseData.next_action;
  const topLocation = caseData.location_candidates?.[0];
  const predicted = nextAction?.predicted;
  const probability = nextAction?.probabilities?.[predicted];

  const isUrgent = timeLeft > 0 && timeLeft < 300;
  const isImminent = timeLeft === 0;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  const progressPercent = maxTimeLeft.current > 0 ? ((maxTimeLeft.current - timeLeft) / maxTimeLeft.current) * 100 : 0;

  return (
    <motion.div
      className="briefing-page"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Back navigation */}
      <button className="briefing-back" onClick={onBack}>
        ← Back to Investigations
      </button>

      {/* Case header */}
      <div className="briefing-header">
        <div className="briefing-case-id">{caseData.case_id}</div>
        <div className="briefing-case-type">
          {fraudTypeLabel(caseData.fraud_type)} Investigation
        </div>
        <div className="briefing-badges">
          <span
            className="badge badge-state"
            style={{
              color: stateColor(caseData.current_state),
              borderColor: `${stateColor(caseData.current_state)}33`,
              fontSize: '0.82rem',
              padding: '5px 14px',
            }}
          >
            {stateLabel(caseData.current_state)}
          </span>
          <span className={`badge badge-priority-${caseData.intervention_priority}`}>
            {caseData.intervention_priority}
          </span>
        </div>
      </div>

      {/* AI Prediction Card */}
      <motion.div
        className="prediction-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="prediction-headline">
          {nextActionLabel(predicted)} is the most likely next action
        </div>

        {upperBoundMinutes > 0 && (
          <div style={{ textAlign: 'center', padding: '20px', marginBottom: '24px' }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
              PREDICTED CASHOUT IN
            </div>
            
            {isImminent ? (
              <motion.div 
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ repeat: Infinity, duration: 1.0 }}
                style={{ fontSize: '2.5rem', fontFamily: '"IBM Plex Mono", monospace', fontWeight: 800, color: 'var(--severity-critical)' }}
              >
                IMMINENT — ACTION REQUIRED
              </motion.div>
            ) : (
              <motion.div 
                animate={isUrgent ? { opacity: [1, 0.5, 1], scale: [1, 1.02, 1] } : {}}
                transition={isUrgent ? { repeat: Infinity, duration: 1.5 } : {}}
                style={{ 
                  fontSize: '3rem', 
                  fontFamily: '"IBM Plex Mono", monospace', 
                  fontWeight: 800, 
                  color: isUrgent ? 'var(--priority-high)' : 'var(--accent)'
                }}
              >
                {formattedTime}
              </motion.div>
            )}
            
            <div style={{ height: '4px', background: 'var(--bg-elevated)', marginTop: '8px', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                width: `${progressPercent}%`,
                background: 'linear-gradient(to right, var(--severity-clear), var(--severity-critical))',
                transition: 'width 1s linear'
              }} />
            </div>
          </div>
        )}

        <div className="prediction-main">
          <div className="prediction-probability">
            <div className="prediction-probability-value">
              {probability != null ? `${Math.round(probability * 100)}%` : '—'}
            </div>
            <div className="prediction-probability-label">probability</div>
          </div>

          {etaRange && (
            <div className="prediction-eta">
              <div className="prediction-eta-value">
                {etaRange[0]}–{etaRange[1]} min
              </div>
              <div className="prediction-eta-label">expected within</div>
            </div>
          )}

          {topLocation && (
            <div className="prediction-location">
              <div className="prediction-location-value">
                {zoneLabel(topLocation.zone_id)}
              </div>
              <div className="prediction-location-label">
                most likely location · {formatPercent(topLocation.confidence)} confidence
              </div>
            </div>
          )}
        </div>

        <div className="prediction-secondary">
          <div className="prediction-metric">
            <div className="prediction-metric-value">
              {formatPercent(caseData.network_risk)}
            </div>
            <div className="prediction-metric-label">Network Risk</div>
          </div>
          <div className="prediction-metric">
            <div className="prediction-metric-value">
              {formatINR(caseData.potential_exposure_inr)}
            </div>
            <div className="prediction-metric-label">Potential Exposure</div>
          </div>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        className="briefing-actions"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <button className="btn btn-primary btn-lg" onClick={onExplore}>
          Explore Investigation →
        </button>
        {onRunSimulation && (
          <button className="btn btn-secondary" onClick={onRunSimulation}>
            ▶ Run Incident Simulation
          </button>
        )}
        <button
          className="btn btn-secondary"
          onClick={() => {
            /* Will open why panel in workspace — for briefing, scroll to explanation */
            onExplore?.('why');
          }}
        >
          Why this prediction?
        </button>
      </motion.div>
    </motion.div>
  );
}
