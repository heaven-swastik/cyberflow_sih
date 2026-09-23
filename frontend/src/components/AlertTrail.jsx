import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateAlert, getAlerts } from '../api';
import { formatINR, stateLabel, zoneLabel, formatPercent } from '../utils/format';

function AlertTrailContent({ caseId, onGenerate }) {
  const [alerts, setAlerts] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState(null);
  const [expandedHash, setExpandedHash] = useState(null);

  // Verification state
  const [verifying, setVerifying] = useState(false);
  const [verificationResults, setVerificationResults] = useState([]);
  const [verificationComplete, setVerificationComplete] = useState(false);
  const [copiedHash, setCopiedHash] = useState(null);

  useEffect(() => {
    getAlerts().then(setAlerts);
  }, []);

  const handleGenerate = async () => {
    if (!caseId || generating) return;
    setGenerating(true);
    try {
      const alert = await generateAlert(caseId);
      setLastGenerated(alert);
      const updated = await getAlerts();
      setAlerts(updated);
      onGenerate?.(alert);
    } catch (e) {
      console.error('Alert generation error:', e);
    } finally {
      setGenerating(false);
    }
  };

  const handleVerify = async () => {
    if (verifying || alerts.length === 0) return;
    setVerifying(true);
    setVerificationResults([]);
    setVerificationComplete(false);

    let results = [];
    for (let i = 0; i < alerts.length; i++) {
      const currentAlert = alerts[i];
      const expectedPrevHash = i === 0 ? '0'.repeat(64) : alerts[i - 1].hash;
      const actualPrevHash = currentAlert.prev_hash.replace('sha256:', '');
      const valid = actualPrevHash === expectedPrevHash.replace('sha256:', '');

      results.push({
        alertId: currentAlert.alert_id,
        valid,
        hash: currentAlert.hash,
        prevHash: currentAlert.prev_hash,
        blockIndex: i
      });

      setVerificationResults([...results]);
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    setVerificationComplete(true);
    setVerifying(false);
  };

  const handleCopy = (hash, id) => {
    if (!hash) return;
    const clean = hash.replace('sha256:', '');
    navigator.clipboard.writeText(clean);
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 1500);
  };

  const renderHash = (hash, id) => {
    if (!hash) return '—';
    const clean = hash.replace('sha256:', '');
    const display = clean.slice(0, 8) + '…' + clean.slice(-8);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>{display}</span>
        <button 
          onClick={(e) => { e.stopPropagation(); handleCopy(hash, id); }}
          style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, fontSize: '14px' }}
          title="Copy hash"
        >
          {copiedHash === id ? '✓' : '⧉'}
        </button>
      </div>
    );
  };

  return (
    <>
      {/* Generate button */}
      <div style={{ marginBottom: 8 }}>
        <button
          className="btn btn-primary"
          onClick={handleGenerate}
          disabled={generating || !caseId}
          style={{ width: '100%' }}
        >
          {generating ? '⏳ Generating…' : '⊕ Generate Intervention Alert'}
        </button>
      </div>

      {/* Verify button */}
      <div style={{ marginBottom: 16 }}>
        <button
          className="btn btn-secondary"
          onClick={handleVerify}
          disabled={verifying || alerts.length === 0}
          style={{ width: '100%' }}
        >
          {verifying ? '⏳ Verifying Chain…' : '⊕ VERIFY CHAIN INTEGRITY'}
        </button>
      </div>

      {/* Verification Log */}
      <AnimatePresence>
        {(verifying || verificationResults.length > 0) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '4px',
              padding: '12px',
              marginBottom: '16px',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '12px'
            }}
          >
            <div style={{ marginBottom: '8px', fontWeight: 600, color: 'var(--text-muted)' }}>VERIFICATION LOG</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {verificationResults.map((result) => (
                <motion.div
                  key={result.alertId + '_verify'}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}
                >
                  <div>Block #{result.blockIndex} • {result.alertId}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Verifying hash chain...</span>
                    <span style={{ color: result.valid ? 'var(--severity-clear)' : 'var(--severity-critical)', fontWeight: 600 }}>
                      {result.valid ? '✓ VALID' : '✗ INVALID'}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                    hash: {result.hash.replace('sha256:', '').slice(0, 8)}...
                  </div>
                </motion.div>
              ))}
            </div>
            {verificationComplete && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid rgba(255,255,255,0.1)',
                  fontWeight: 600,
                  color: verificationResults.every(r => r.valid) ? 'var(--severity-clear)' : 'var(--severity-critical)'
                }}
              >
                {verificationResults.every(r => r.valid) 
                  ? `CHAIN VERIFIED — ${verificationResults.length}/${verificationResults.length} blocks valid` 
                  : 'TAMPER DETECTED'}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success confirmation */}
      <AnimatePresence>
        {lastGenerated && (
          <motion.div
            className="alert-success-card"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            style={{ marginBottom: 16 }}
          >
            <div className="alert-success-icon">✓</div>
            <div className="alert-success-text">Alert Generated</div>
            <div className="alert-success-id">{lastGenerated.alert_id}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alert list */}
      <div className="alerts-list">
        {alerts
          .slice()
          .reverse()
          .map((alert, i) => (
            <motion.div
              key={alert.alert_id}
              initial={i === 0 && lastGenerated?.alert_id === alert.alert_id ? { opacity: 0, y: -12 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              {i > 0 && (
                <div className="alert-chain-link">
                  <div className="alert-chain-line" />
                  <span>↑ chained</span>
                </div>
              )}
              <div className="alert-card">
                <div className="alert-header">
                  <span className="alert-id">{alert.alert_id}</span>
                  <span className="alert-time">
                    {new Date(alert.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <div className="alert-body">
                  <div className="alert-row">
                    <span className="alert-row-label">Case</span>
                    <span className="alert-row-value" style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}>
                      {alert.case_id}
                    </span>
                  </div>
                  <div className="alert-row">
                    <span className="alert-row-label">State</span>
                    <span className="alert-row-value">{stateLabel(alert.current_state)}</span>
                  </div>
                  <div className="alert-row">
                    <span className="alert-row-label">Next Action</span>
                    <span className="alert-row-value">
                      {alert.predicted_next_action}{' '}
                      <span style={{ color: 'var(--accent)', fontFamily: 'IBM Plex Mono, monospace' }}>
                        {formatPercent(alert.probability)}
                      </span>
                    </span>
                  </div>
                  <div className="alert-row">
                    <span className="alert-row-label">Window</span>
                    <span className="alert-row-value">{alert.expected_window}</span>
                  </div>
                  <div className="alert-row">
                    <span className="alert-row-label">Exposure</span>
                    <span className="alert-row-value" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                      {formatINR(alert.potential_exposure_inr)}
                    </span>
                  </div>
                  <div className="alert-row">
                    <span className="alert-row-label">Location</span>
                    <span className="alert-row-value">{zoneLabel(alert.top_location)}</span>
                  </div>
                </div>

                {/* Collapsible hash details */}
                <button
                  className="alert-hash-toggle"
                  onClick={() => setExpandedHash(expandedHash === alert.alert_id ? null : alert.alert_id)}
                >
                  {expandedHash === alert.alert_id ? '▾ Hide Audit Details' : '▸ View Audit Details'}
                </button>

                <AnimatePresence>
                  {expandedHash === alert.alert_id && (
                    <motion.div
                      className="alert-hash"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>hash:</span> {renderHash(alert.hash, `hash-${alert.alert_id}`)}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
                        <span>prev:</span> {renderHash(alert.prev_hash, `prev-${alert.alert_id}`)}
                      </div>
                      {alert.blockchain_tx && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent)', marginTop: '4px' }}>
                          <span>chain_tx:</span> {renderHash(alert.blockchain_tx, `chain-${alert.alert_id}`)}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}

        {alerts.length === 0 && (
          <div className="empty-state">No alerts generated yet</div>
        )}
      </div>
    </>
  );
}

export default function AlertTrail({ caseId, isOpen, onClose, onGenerate, inline = false }) {
  // Inline mode: render content directly without drawer wrapper
  if (inline) {
    return (
      <div className="alerttrail-inline">
        <div className="alerttrail-inline-subtitle">
          Each alert is chained by SHA-256 hash to the one before it — if anyone tampers
          with a past alert, every hash after it breaks. That's how we prove the alert
          trail wasn't edited after the fact.
        </div>
        <AlertTrailContent caseId={caseId} onGenerate={onGenerate} />
      </div>
    );
  }

  // Drawer mode (original behavior)
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="right-drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />

          {/* Right drawer */}
          <motion.div
            className="right-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="right-drawer-header">
              <div>
                <div className="right-drawer-title">Alert History ({/* count managed internally */})</div>
                <div className="right-drawer-subtitle">
                  Each alert is chained by SHA-256 hash to the one before it — if anyone tampers
                  with a past alert, every hash after it breaks. That's how we prove the alert
                  trail wasn't edited after the fact.
                </div>
              </div>
              <button className="right-drawer-close" onClick={onClose}>
                ✕
              </button>
            </div>

            <div className="right-drawer-body">
              <AlertTrailContent caseId={caseId} onGenerate={onGenerate} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
