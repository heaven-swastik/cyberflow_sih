import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { simulate } from '../api';
import { formatINR, zoneLabel } from '../utils/format';

const ZONES = ['zone_a', 'zone_b', 'zone_c'];

function InterventionContent({ caseId, selectedZone, onZoneSelect }) {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);

  // Fetch all zones on mount or case change
  useEffect(() => {
    if (!caseId) return;
    
    let isMounted = true;
    const fetchAll = async () => {
      setLoading(true);
      try {
        const promises = ZONES.map(z => simulate(caseId, z).catch(e => null));
        const resArray = await Promise.all(promises);
        
        if (!isMounted) return;
        
        const newResults = {};
        ZONES.forEach((z, i) => {
          if (resArray[i]) newResults[z] = resArray[i];
        });
        setResults(newResults);
      } catch (e) {
        console.error('Simulation error:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchAll();
    return () => { isMounted = false; };
  }, [caseId]);

  return (
    <div className="sim-zones-grid">
      <AnimatePresence mode="wait">
        {loading && Object.keys(results).length === 0 && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', padding: 16, gridColumn: '1 / -1' }}
          >
            Simulating outcomes across all zones…
          </motion.div>
        )}

        {!loading && ZONES.map((z) => {
          const currentResult = results[z];
          if (!currentResult) return null;
          
          const maxExposure = currentResult.expected_preventable_impact_inr + currentResult.remaining_exposure_inr || 1;
          const isSelected = selectedZone === z;

          return (
            <motion.div
              key={z}
              className={`sim-result-card ${currentResult.recommended ? 'recommended' : ''} ${isSelected ? 'selected' : ''}`}
              onClick={() => onZoneSelect?.(z)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{ cursor: 'pointer' }}
            >
              <div className="sim-card-header">
                <h4 style={{ margin: 0, fontSize: '1rem', color: isSelected ? '#fff' : 'inherit' }}>{zoneLabel(z)}</h4>
                {currentResult.recommended && (
                  <span className="sim-best-badge">✓ Best</span>
                )}
              </div>

              {/* Flow visualization */}
              <div className="sim-flow-item" style={{ marginTop: 12 }}>
                <div className="sim-flow-label">Potential Exposure</div>
                <div className="sim-flow-value">{formatINR(maxExposure)}</div>
              </div>
              <div className="sim-flow-arrow">↓</div>
              <div className="sim-flow-item">
                <div className="sim-flow-label">Preventable Impact</div>
                <div className="sim-flow-value" style={{ color: 'var(--severity-clear)' }}>
                  {formatINR(currentResult.expected_preventable_impact_inr)}
                </div>
              </div>
              <div className="sim-flow-arrow">↓</div>
              <div className="sim-flow-item">
                <div className="sim-flow-label">Remaining Exposure</div>
                <div className="sim-flow-value" style={{ color: 'var(--severity-critical)' }}>
                  {formatINR(currentResult.remaining_exposure_inr)}
                </div>
              </div>

              {/* Bars */}
              <div style={{ marginTop: 12 }}>
                <div className="sim-bar-row">
                  <span className="sim-bar-label">Prevented</span>
                  <div className="sim-bar-track">
                    <motion.div
                      className="sim-bar-fill prevented"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${(currentResult.expected_preventable_impact_inr / maxExposure) * 100}%`,
                      }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </div>

                <div className="sim-bar-row" style={{ marginTop: 6 }}>
                  <span className="sim-bar-label">Remaining</span>
                  <div className="sim-bar-track">
                    <motion.div
                      className="sim-bar-fill remaining"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${(currentResult.remaining_exposure_inr / maxExposure) * 100}%`,
                      }}
                      transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export default function InterventionSim({ caseId, selectedZone, onZoneSelect, isOpen, onClose, inline = false }) {
  // Inline mode: render content directly
  if (inline) {
    return (
      <div className="intervention-inline">
        <InterventionContent caseId={caseId} selectedZone={selectedZone} onZoneSelect={onZoneSelect} />
      </div>
    );
  }

  // Modal mode (original behavior)
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="overlay-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          >
            {/* Panel */}
            <motion.div
              className="overlay-panel"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="overlay-panel-header">
                <div className="overlay-panel-title">Intervention Simulator</div>
                <button className="overlay-close-btn" onClick={onClose}>
                  ✕
                </button>
              </div>

              <InterventionContent caseId={caseId} selectedZone={selectedZone} onZoneSelect={onZoneSelect} />
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
