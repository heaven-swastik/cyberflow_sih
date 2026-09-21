import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import RiskMap from './RiskMap';
import InterventionSim from './InterventionSim';

// The backend's geolocation_methodology strings include trailing
// "— see location_candidates" / "— see atm_candidates[].reasoning"
// references aimed at API consumers reading raw JSON. Strip those for
// the human-facing UI, where the map + ATM list right below already
// show that data — the parenthetical would just read as a stray code
// reference to a judge.
const stripApiReference = (text) =>
  (text || '')
    .replace(/\s*—\s*see [\w.[\]]+(\s+for the breakdown per ATM)?\.$/i, '.')
    .replace(/\s*\(see [\w.[\]]+\)/gi, '');

const MapStep = ({ caseData, caseId, simZone, onZoneSelect }) => {
  const [simExpanded, setSimExpanded] = useState(false);

  const handleZoneClick = (zoneId) => {
    setSimExpanded(true);
    if (onZoneSelect) {
      onZoneSelect(zoneId);
    }
  };

  return (
    <motion.div
      className="map-step"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="map-step-header">
        <div>
          <div className="map-step-eyebrow">Step 04 / Geographic intelligence</div>
          <h1 className="map-step-title">Predicted cash-out location</h1>
          <p className="map-step-description">
            The zone-level prediction is resolved to specific ATMs using model confidence,
            withdrawal history, and the suspect device's last known position.
          </p>
        </div>
        <div className="map-step-signal">
          <span className="map-step-signal-dot" />
          ATM RESOLUTION ACTIVE
        </div>
      </div>

      {caseData?.geolocation_methodology && (
        <div className="geo-methodology-strip">
          <div className="geo-methodology-stage">
            <strong>Stage A —</strong>
            <span>{stripApiReference(caseData.geolocation_methodology.stage_a)}</span>
          </div>
          <div className="geo-methodology-stage">
            <strong>Stage B —</strong>
            <span>{stripApiReference(caseData.geolocation_methodology.stage_b)}</span>
          </div>
          <div className="geo-methodology-disclaimer">
            {caseData.geolocation_methodology.disclaimer}
          </div>
        </div>
      )}

      {caseData?.evidence_status === 'insufficient_evidence' && (
        <div className="geo-methodology-strip" style={{ borderColor: 'var(--severity-medium)' }}>
          <div className="geo-methodology-stage">
            <strong style={{ color: 'var(--severity-medium)' }}>⚠ Insufficient Evidence —</strong>
            <span>
              {stripApiReference((caseData.atm_ranking_status || '').replace(/^[a-z_]+\s*—\s*/i, '')) ||
                'Not enough transaction history to rank specific ATMs reliably — showing the probable zone only, with flattened confidence.'}
            </span>
          </div>
        </div>
      )}

      <RiskMap caseData={caseData} onZoneClick={handleZoneClick} inline={true} />

      <div className="map-sim-section">
        <button className="map-sim-toggle" onClick={() => setSimExpanded(!simExpanded)}>
          {simExpanded ? '▾' : '▸'} 🎯 Simulate Intervention
          <span className="map-sim-hint">See how much money could be saved by intervening at different zones</span>
        </button>
        <AnimatePresence>
          {simExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <InterventionSim
                caseId={caseId}
                selectedZone={simZone}
                onZoneSelect={onZoneSelect}
                inline={true}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default MapStep;
