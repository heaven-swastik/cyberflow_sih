import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  formatINR, 
  formatPercent, 
  stateLabel, 
  stateColor, 
  fraudTypeLabel, 
  nextActionLabel, 
  zoneLabel 
} from '../utils/format';

export default function IncidentStep({ caseData }) {
  const etaRange = caseData?.expected_time_window_minutes;
  const upperBoundMinutes = etaRange ? etaRange[1] : 0;
  
  const [timeLeft, setTimeLeft] = useState(upperBoundMinutes * 60);
  const maxTimeLeft = useRef(upperBoundMinutes * 60);

  useEffect(() => {
    if (!upperBoundMinutes) return;
    
    setTimeLeft(upperBoundMinutes * 60);
    maxTimeLeft.current = upperBoundMinutes * 60;
    
    const interval = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [upperBoundMinutes]);

  if (!caseData) {
    return <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>Loading case data…</div>;
  }

  const nextAction = caseData.next_action;
  const predicted = nextAction?.predicted;
  const probability = nextAction?.probabilities?.[predicted];
  const topLocation = caseData.location_candidates?.[0];
  const isImminent = timeLeft === 0;
  const isUrgent = timeLeft > 0 && timeLeft < 300;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  const progressPercent = maxTimeLeft.current > 0 ? ((maxTimeLeft.current - timeLeft) / maxTimeLeft.current) * 100 : 0;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <motion.div 
      className="incident-step-container"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div className="step-caption" variants={itemVariants}>
        <div className="step-caption-title">📋 Complaint Intake</div>
        <div className="step-caption-text">
          A cyber-fraud complaint has been received. Below is the raw intake — the complainant's report, 
          account identifiers, and the device from which suspicious activity was traced.
        </div>
      </motion.div>

      {/* Case header */}
      <motion.div className="incident-header" variants={itemVariants}>
        <div className="incident-case-id">{caseData.case_id}</div>
        <div className="incident-case-type">{fraudTypeLabel(caseData.fraud_type)} Investigation</div>
        <div className="incident-badges">
          <span
            className="badge badge-state"
            style={{
              color: stateColor(caseData.current_state),
              borderColor: `${stateColor(caseData.current_state)}33`,
            }}
          >
            {stateLabel(caseData.current_state)}
          </span>
          <span className={`badge badge-priority-${caseData.intervention_priority}`}>
            {caseData.intervention_priority}
          </span>
        </div>
      </motion.div>

      {/* Countdown timer */}
      {upperBoundMinutes > 0 && (
        <motion.div className="incident-countdown" variants={itemVariants}>
          <div className="incident-countdown-label">PREDICTED CASHOUT IN</div>
          {isImminent ? (
            <motion.div 
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 1.0 }}
              className="incident-countdown-value imminent"
            >
              IMMINENT — ACTION REQUIRED
            </motion.div>
          ) : (
            <motion.div 
              animate={isUrgent ? { opacity: [1, 0.5, 1], scale: [1, 1.02, 1] } : {}}
              transition={isUrgent ? { repeat: Infinity, duration: 1.5 } : {}}
              className={`incident-countdown-value ${isUrgent ? 'urgent' : ''}`}
            >
              {formattedTime}
            </motion.div>
          )}
          <div className="incident-countdown-bar">
            <div className="incident-countdown-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </motion.div>
      )}

      {/* Info cards grid */}
      <motion.div className="incident-grid" variants={itemVariants}>
        <div className="incident-card">
          <div className="incident-card-title">Complaint Details</div>
          <div className="incident-detail-row">
            <span className="incident-detail-label">Complainant</span>
            <span className="incident-detail-value">{caseData.complaint?.complainant_name || '—'}</span>
          </div>
          <div className="incident-detail-row">
            <span className="incident-detail-label">Phone</span>
            <span className="incident-detail-value mono">{caseData.complaint?.complainant_phone_masked || '—'}</span>
          </div>
          <div className="incident-detail-row">
            <span className="incident-detail-label">Location</span>
            <span className="incident-detail-value">
              {caseData.complaint?.district ? `${caseData.complaint.district}, ` : ''}{caseData.complaint?.state || '—'}
            </span>
          </div>
          <div className="incident-detail-row">
            <span className="incident-detail-label">Filed</span>
            <span className="incident-detail-value">{caseData.complaint?.filed_at || '—'}</span>
          </div>
          {caseData.complaint?.description && (
            <div className="incident-detail-row">
              <span className="incident-detail-label">Description</span>
              <span className="incident-detail-value">{caseData.complaint.description}</span>
            </div>
          )}
        </div>

        <div className="incident-card">
          <div className="incident-card-title">Device Trace</div>
          <div className="incident-detail-row">
            <span className="incident-detail-label">Device ID</span>
            <span className="incident-detail-value mono">{caseData.device_location?.device_id || '—'}</span>
          </div>
          <div className="incident-detail-row">
            <span className="incident-detail-label">Last Seen</span>
            <span className="incident-detail-value">
              {caseData.device_location?.last_seen_minutes_ago != null 
                ? `${caseData.device_location.last_seen_minutes_ago} minutes ago` 
                : '—'}
            </span>
          </div>
          {caseData.device_location?.latitude && (
            <div className="incident-detail-row">
              <span className="incident-detail-label">Coordinates</span>
              <span className="incident-detail-value mono">
                {caseData.device_location.latitude.toFixed(4)}, {caseData.device_location.longitude.toFixed(4)}
              </span>
            </div>
          )}
          <div className="incident-detail-row">
            <span className="incident-detail-label">Zone</span>
            <span className="incident-detail-value">
              {caseData.device_location?.zone_id ? zoneLabel(caseData.device_location.zone_id) : '—'}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Key metrics */}
      <motion.div className="incident-metrics" variants={itemVariants}>
        <div className="incident-metric-box">
          <div className="incident-metric-value accent">{formatINR(caseData.potential_exposure_inr)}</div>
          <div className="incident-metric-label">Potential Exposure</div>
        </div>
        <div className="incident-metric-box">
          <div className="incident-metric-value">{formatPercent(caseData.network_risk)}</div>
          <div className="incident-metric-label">Network Risk</div>
        </div>
        <div className="incident-metric-box">
          <div className="incident-metric-value">
            {nextActionLabel(predicted)}
          </div>
          <div className="incident-metric-label">
            Predicted Next · {probability != null ? `${Math.round(probability * 100)}%` : '—'}
          </div>
        </div>
        {topLocation && (
          <div className="incident-metric-box">
            <div className="incident-metric-value">{zoneLabel(topLocation.zone_id)}</div>
            <div className="incident-metric-label">
              Most Likely Zone · {formatPercent(topLocation.confidence)}
            </div>
          </div>
        )}
      </motion.div>

      {/* Data validation summary (requirement 3) */}
      {caseData.data_validation && (
        <motion.div className="incident-grid" variants={itemVariants} style={{ marginTop: 12 }}>
          <div className="incident-card">
            <div className="incident-card-title">
              Data Validation
              <span
                className={`badge`}
                style={{
                  marginLeft: 10,
                  color: caseData.data_validation.passed ? 'var(--severity-clear)' : 'var(--severity-critical)',
                  borderColor: caseData.data_validation.passed ? 'var(--severity-clear)' : 'var(--severity-critical)',
                }}
              >
                {caseData.data_validation.passed ? 'PASSED' : `${caseData.data_validation.stats.error_count} ERROR(S)`}
              </span>
            </div>
            <div className="incident-detail-row">
              <span className="incident-detail-label">Checks run</span>
              <span className="incident-detail-value mono">{caseData.data_validation.checks_run.join(', ')}</span>
            </div>
            <div className="incident-detail-row">
              <span className="incident-detail-label">Transactions found</span>
              <span className="incident-detail-value">{caseData.data_validation.stats.transaction_count}</span>
            </div>
            <div className="incident-detail-row">
              <span className="incident-detail-label">Missing / duplicate / inconsistent</span>
              <span className="incident-detail-value">
                {caseData.data_validation.stats.missing_field_count} / {caseData.data_validation.stats.duplicate_count} / {caseData.data_validation.stats.inconsistent_relationship_count}
              </span>
            </div>
            <div className="incident-detail-row">
              <span className="incident-detail-label">Reliable for prediction</span>
              <span className="incident-detail-value">
                {caseData.data_validation.stats.sufficient_for_reliable_prediction ? 'Yes' : 'No — see Insufficient Evidence note'}
              </span>
            </div>
            {caseData.data_validation.issues?.length > 0 && (
              <div className="incident-detail-row" style={{ alignItems: 'flex-start' }}>
                <span className="incident-detail-label">Issues</span>
                <span className="incident-detail-value">
                  {caseData.data_validation.issues.slice(0, 4).map((iss, i) => (
                    <div key={i} style={{ fontSize: 12, marginBottom: 4, color: iss.severity === 'ERROR' ? 'var(--severity-critical)' : 'var(--text-secondary)' }}>
                      [{iss.severity}] {iss.message}
                    </div>
                  ))}
                </span>
              </div>
            )}
          </div>

          {caseData.evidence_status === 'insufficient_evidence' && (
            <div className="incident-card" style={{ borderColor: 'var(--severity-medium)' }}>
              <div className="incident-card-title" style={{ color: 'var(--severity-medium)' }}>
                ⚠ Insufficient Evidence
              </div>
              <div className="incident-detail-row" style={{ alignItems: 'flex-start' }}>
                <span className="incident-detail-value" style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                  {caseData.evidence_note}
                </span>
              </div>
              <div className="incident-detail-row" style={{ alignItems: 'flex-start', marginTop: 8 }}>
                <span className="incident-detail-value" style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  The zone/ATM prediction later in this flow will be shown as a flattened, low-confidence
                  estimate rather than a specific ranked guess, per this prototype's policy.
                </span>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
