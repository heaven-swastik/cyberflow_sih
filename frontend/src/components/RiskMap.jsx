import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Circle, CircleMarker, Popup, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatPercent, zoneLabel } from '../utils/format';

function MapFix() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }, [map]);
  return null;
}

function MapViewport({ points, maxZoom }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    map.fitBounds(points, {
      padding: [36, 36],
      maxZoom,
      animate: false,
    });
  }, [map, points, maxZoom]);

  return null;
}

function HeatmapOverlay({ atmCandidates, withdrawalHistory, deviceLocation }) {
  return (
    <>
      {withdrawalHistory.map((withdrawal) => (
        <Circle
          key={`heat-${withdrawal.withdrawal_id}`}
          center={[withdrawal.latitude, withdrawal.longitude]}
          radius={2800}
          pathOptions={{ color: PAST_COLOR, fillColor: PAST_COLOR, fillOpacity: 0.08, weight: 0 }}
        />
      ))}
      {deviceLocation && (
        <Circle
          center={[deviceLocation.latitude, deviceLocation.longitude]}
          radius={4200}
          pathOptions={{ color: CURRENT_COLOR, fillColor: CURRENT_COLOR, fillOpacity: 0.1, weight: 0 }}
        />
      )}
      {atmCandidates.map((atm, index) => (
        <Circle
          key={`heat-${atm.atm_id}`}
          center={[atm.latitude, atm.longitude]}
          radius={index === 0 ? 5200 : 3500}
          pathOptions={{ color: PREDICTED_COLOR, fillColor: PREDICTED_COLOR, fillOpacity: index === 0 ? 0.13 : 0.07, weight: 0 }}
        />
      ))}
    </>
  );
}

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

function makeLabelIcon(text, color) {
  return L.divIcon({
    className: 'custom-leaflet-label',
    html: `<div style="color: ${color}; font-weight: 600; font-size: 11px; font-family: 'IBM Plex Mono', monospace; background: rgba(10, 12, 13, 0.9); padding: 4px 8px; border-radius: 4px; border: 1px solid ${color}; white-space: nowrap; box-shadow: 0 0 10px rgba(0,0,0,0.5);">${text}</div>`,
    iconAnchor: [-6, 8],
  });
}

function RiskMapContent({ caseData, onZoneClick, highlightAtmId }) {
  const atmCandidates = caseData?.atm_candidates || [];
  const withdrawalHistory = caseData?.withdrawal_history || [];
  const deviceLocation = caseData?.device_location;
  const locationCandidates = caseData?.location_candidates || [];

  const hasAtmData = atmCandidates.length > 0;

  const mapPoints = [
    ...atmCandidates.map((a) => [a.latitude, a.longitude]),
    ...withdrawalHistory.map((w) => [w.latitude, w.longitude]),
    ...(deviceLocation ? [[deviceLocation.latitude, deviceLocation.longitude]] : []),
  ].filter(([latitude, longitude]) => Number.isFinite(latitude) && Number.isFinite(longitude));
  const focusPoints = [
    ...atmCandidates.map((a) => [a.latitude, a.longitude]),
    ...(deviceLocation ? [[deviceLocation.latitude, deviceLocation.longitude]] : []),
  ].filter(([latitude, longitude]) => Number.isFinite(latitude) && Number.isFinite(longitude));
  const viewportPoints = hasAtmData && focusPoints.length > 0 ? focusPoints : mapPoints;
  const allLats = viewportPoints.map(([latitude]) => latitude);
  const allLngs = viewportPoints.map(([, longitude]) => longitude);
  const center = allLats.length
    ? [allLats.reduce((a, b) => a + b, 0) / allLats.length, allLngs.reduce((a, b) => a + b, 0) / allLngs.length]
    : [22.5, 82];

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
          <MapContainer center={center} zoom={hasAtmData ? 11 : 5} style={{ height: '100%', width: '100%' }}>
            <MapFix />
            <MapViewport points={viewportPoints} maxZoom={hasAtmData ? 14 : 7} />
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
            />

            <HeatmapOverlay
              atmCandidates={atmCandidates}
              withdrawalHistory={withdrawalHistory}
              deviceLocation={deviceLocation}
            />

            {hasAtmData ? (
              <>
                {/* Past withdrawal history — grey, small */}
                {withdrawalHistory.map((w) => (
                  <CircleMarker
                    key={w.withdrawal_id}
                    center={[w.latitude, w.longitude]}
                    pathOptions={{ color: PAST_COLOR, fillColor: PAST_COLOR, fillOpacity: 0.5, weight: 1 }}
                    radius={5}
                  >
                    <Popup>
                      <div style={{ fontSize: 12 }}>
                        <strong>Past withdrawal</strong><br />
                        {w.atm_id} · ₹{w.amount_inr.toLocaleString('en-IN')}<br />
                        {w.days_ago} day{w.days_ago !== 1 ? 's' : ''} ago
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}

                {/* Current device / activity origin — blue */}
                {deviceLocation && (
                  <React.Fragment>
                    <CircleMarker
                      center={[deviceLocation.latitude, deviceLocation.longitude]}
                      pathOptions={{ color: CURRENT_COLOR, fillColor: CURRENT_COLOR, fillOpacity: 0.35, weight: 2 }}
                      radius={12}
                    >
                      <Popup>
                        <div style={{ fontSize: 12 }}>
                          <strong>Suspect device — last known ping</strong><br />
                          {deviceLocation.last_seen_minutes_ago} min ago
                        </div>
                      </Popup>
                    </CircleMarker>
                    <Marker
                      position={[deviceLocation.latitude, deviceLocation.longitude]}
                      icon={makeLabelIcon('Current activity', CURRENT_COLOR)}
                    />
                  </React.Fragment>
                )}

                {/* Predicted ATM(s) — red, pulsing, dominant */}
                {atmCandidates.map((atm, i) => {
                  const isTop = i === 0;
                  const isHighlighted = highlightAtmId ? atm.atm_id === highlightAtmId : isTop;
                  const radius = isTop ? 16 + atm.confidence * 20 : 9 + atm.confidence * 10;
                  return (
                    <React.Fragment key={atm.atm_id}>
                      {isHighlighted && (
                        <CircleMarker
                          center={[atm.latitude, atm.longitude]}
                          pathOptions={{ color: PREDICTED_COLOR, weight: 1, fillOpacity: 0, dashArray: '4,4', opacity: 0.7 }}
                          radius={radius + 14}
                        />
                      )}
                      <CircleMarker
                        center={[atm.latitude, atm.longitude]}
                        pathOptions={{
                          color: PREDICTED_COLOR,
                          fillColor: PREDICTED_COLOR,
                          fillOpacity: isHighlighted ? 0.55 : 0.25,
                          weight: isHighlighted ? 2 : 1,
                        }}
                        radius={radius}
                      >
                        <Popup>
                          <div style={{ textAlign: 'center', padding: '4px', minWidth: 180 }}>
                            <h4 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700 }}>{atm.bank_name} ATM</h4>
                            <p style={{ margin: '0 0 8px', fontSize: 12 }}>{atm.address}</p>
                            <div style={{ fontSize: 17, fontWeight: 800, color: PREDICTED_COLOR, marginBottom: 8 }}>
                              {formatPercent(atm.confidence)} confidence
                            </div>
                            <ul style={{ textAlign: 'left', fontSize: 11, paddingLeft: 16, margin: '0 0 10px' }}>
                              {atm.reasoning.slice(0, 2).map((r, j) => <li key={j}>{r}</li>)}
                            </ul>
                            <button
                              onClick={() => onZoneClick?.(atm.zone_id)}
                              style={{ background: PREDICTED_COLOR, color: '#fff', border: 'none', padding: '7px 12px', borderRadius: 4, cursor: 'pointer', fontWeight: 700, width: '100%' }}
                            >
                              Simulate Intervention →
                            </button>
                          </div>
                        </Popup>
                      </CircleMarker>
                      {isTop && (
                        <Marker
                          position={[atm.latitude, atm.longitude]}
                          icon={makeLabelIcon(`#${i + 1} predicted ATM — ${atm.bank_name} · ${formatPercent(atm.confidence)}`, PREDICTED_COLOR)}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </>
            ) : (
              locationCandidates.map((zone, i) => {
                const coords = ZONE_COORDS[zone.zone_id];
                const color = ZONE_COLORS[zone.zone_id] || '#e2954a';
                if (!coords) return null;
                const isTop = i === 0;
                return (
                  <React.Fragment key={zone.zone_id}>
                    <CircleMarker
                      center={coords}
                      pathOptions={{ color, fillColor: color, fillOpacity: isTop ? 0.32 : 0.18, weight: isTop ? 2 : 1.5 }}
                      radius={15 + zone.confidence * 25}
                    >
                      <Popup>
                        <div style={{ textAlign: 'center', padding: '5px' }}>
                          <h4 style={{ margin: '0 0 5px', fontSize: '16px', fontWeight: 'bold' }}>{zoneLabel(zone.zone_id)}</h4>
                          <div style={{ marginBottom: '10px', fontSize: '18px', fontWeight: 'bold', color }}>
                            {formatPercent(zone.confidence)} Risk
                          </div>
                          <button
                            onClick={() => onZoneClick?.(zone.zone_id)}
                            style={{ background: color, color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}
                          >
                            Simulate Intervention →
                          </button>
                        </div>
                      </Popup>
                    </CircleMarker>
                    {/* Always-visible label — matches the ATM branch so a
                        zone is never just an unlabeled translucent circle */}
                    <Marker
                      position={coords}
                      icon={makeLabelIcon(
                        `${zoneLabel(zone.zone_id)} — ${formatPercent(zone.confidence)}${isTop ? ' (top)' : ''}`,
                        color
                      )}
                    />
                  </React.Fragment>
                );
              })
            )}
          </MapContainer>
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
