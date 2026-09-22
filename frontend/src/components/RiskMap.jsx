import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MapLibre3D from './MapLibre3D';
import { formatPercent, zoneLabel } from '../utils/format';

const ZONE_COORDS = {
  zone_a: [28.6139, 77.2090],
  zone_b: [22.5726, 88.3639],
  zone_c: [19.0760, 72.8777],
};

const ZONE_COLORS = {
  zone_a: '#e2954a',
  zone_b: '#3fae7b',
  zone_c: '#5b8fd6',
};

const PAST_COLOR = '#8a9390';      // grey — historical withdrawal
const CURRENT_COLOR = '#5b8fd6';   // blue — current transaction / device origin
const PREDICTED_COLOR = '#e4483f'; // red — predicted next cash-out

function RiskMapContent({ caseData, onZoneClick, highlightAtmId }) {
  const atmCandidates = caseData?.atm_candidates || [];
  const withdrawalHistory = caseData?.withdrawal_history || [];
  const deviceLocation = caseData?.device_location;
  const locationCandidates = caseData?.location_candidates || [];

  const hasAtmData = atmCandidates.length > 0;

  return (
    <>
      <div className="riskmap-content-layout">
      <div className="riskmap-map-column">
      {hasAtmData ? (
        <>
          <div className="map-plain-explainer">
            Grey = where this account withdrew money <em>before</em>. Blue = where the
            suspect's device is <em>right now</em>. Red = where the AI predicts they'll
            withdraw <em>next</em>.
          </div>
          <div className="map-signal-strip">
            <strong>Actionable view</strong>
            <span>{atmCandidates.length} ranked ATM candidates</span>
            <span>{withdrawalHistory.length} historical withdrawals</span>
            {deviceLocation && <span>Device ping {deviceLocation.last_seen_minutes_ago} min ago</span>}
          </div>
          <div className="map-legend-row">
            <span className="map-legend-chip"><i style={{ background: PAST_COLOR }} /> Past withdrawal</span>
            <span className="map-legend-chip"><i style={{ background: CURRENT_COLOR }} /> Current device / activity</span>
            <span className="map-legend-chip"><i style={{ background: PREDICTED_COLOR }} /> Predicted ATM</span>
          </div>
        </>
      ) : (
        <div className="map-plain-explainer">
          Each shaded circle is a candidate cash-out <em>zone</em> — sized and colored by how
          confident the model is that money will surface there next.
        </div>
      )}

      <div className="riskmap-canvas-frame">
        <div className="riskmap-scan-line" aria-hidden="true" />
        <div className="riskmap-canvas-inner">
          <MapLibre3D
            atmCandidates={atmCandidates}
            locationCandidates={locationCandidates}
            deviceLocation={caseData?.device_location}
            selectedAtmId={highlightAtmId}
            onAtmClick={onZoneClick}
          />
        </div>
      </div>
      </div>

      <aside className="risk-zone-panel">
        <div className="risk-zone-panel-header">
          <div>
            <span className="risk-zone-panel-kicker">Signal register</span>
            <strong>{hasAtmData ? 'ATM candidates' : 'Risk zones'}</strong>
          </div>
          <span className="risk-zone-panel-count">{hasAtmData ? atmCandidates.length : locationCandidates.length} signals</span>
        </div>
        {hasAtmData ? (
          <div className="risk-zone-list">
            {atmCandidates.map((atm, i) => (
              <div
                key={atm.atm_id}
                className={`risk-zone-item ${i === 0 ? 'highlight' : ''}`}
                onClick={() => onZoneClick?.(atm.zone_id)}
              >
                <span className="risk-zone-name"><b>#{i + 1}</b> {atm.bank_name} ATM — {atm.address}<small>{atm.distance_km_from_device} km from device · {atm.historical_withdrawal_count} prior withdrawal</small></span>
                <span className="risk-zone-confidence">{formatPercent(atm.confidence)}<small>score</small></span>
              </div>
            ))}
          </div>
        ) : (
          <div className="risk-zone-list">
            {locationCandidates.map((zone) => (
              <div key={zone.zone_id} className="risk-zone-item" onClick={() => onZoneClick?.(zone.zone_id)}>
                <span className="risk-zone-name">{zoneLabel(zone.zone_id)}</span>
                <span className="risk-zone-confidence">{formatPercent(zone.confidence)}</span>
              </div>
            ))}
          </div>
        )}
      </aside>
      </div>
    </>
  );
}

/**
 * Real GIS risk map. Preferred data source is ATM-level intelligence
 * (caseData.atm_candidates / withdrawal_history / device_location) —
 * produced by ai-engine/atm_engine.py. Supports both overlay modal and
 * inline rendering modes.
 */
export default function RiskMap({ caseData, onZoneClick, isOpen, onClose, highlightAtmId, inline = false }) {
  // Inline mode: render content directly without overlay
  if (inline) {
    return (
      <div className="riskmap-inline">
        <RiskMapContent caseData={caseData} onZoneClick={onZoneClick} highlightAtmId={highlightAtmId} />
      </div>
    );
  }

  // Modal overlay mode (original behavior)
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="overlay-backdrop" onClick={onClose}>
          <motion.div
            className="overlay-panel"
            style={{ maxWidth: '720px', width: '100%', margin: '0 auto' }}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="overlay-panel-header">
              <div>
                <h3 className="overlay-panel-title">
                  {(caseData?.atm_candidates || []).length > 0 ? 'Predicted Cash-Out Location' : 'Geographic Risk Distribution'}
                </h3>
                <p className="overlay-panel-subtitle">
                  {(caseData?.atm_candidates || []).length > 0
                    ? "This is the moment the AI's zone-level guess becomes a specific, actionable ATM."
                    : 'Ranked zones where the network is statistically likely to cash out.'}
                </p>
              </div>
              <button className="overlay-close-btn" onClick={onClose}>×</button>
            </div>

            <div className="overlay-panel-content" style={{ padding: '20px' }}>
              <RiskMapContent caseData={caseData} onZoneClick={onZoneClick} highlightAtmId={highlightAtmId} />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
