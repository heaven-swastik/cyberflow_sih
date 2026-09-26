import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getMacroHeatmap } from '../api';
import { formatINR, zoneLabel } from '../utils/format';

const LIGHT_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap Contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 19 }],
};

function isValidCoord(lat, lng) {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

export default function MacroHeatmap({ onClose, onOpenCase }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  // Drill-down filter states
  const [crimeCategory, setCrimeCategory] = useState('all');
  const [timeWindow, setTimeWindow] = useState('all');
  const [selectedZone, setSelectedZone] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');

  const [status, setStatus] = useState('loading'); // loading | ready | empty | error
  const [errorMsg, setErrorMsg] = useState('');
  const [macroData, setMacroData] = useState(null);

  const loadData = useCallback(async () => {
    setStatus('loading');
    setErrorMsg('');
    try {
      const macroRes = await getMacroHeatmap({ crimeCategory, timeWindow });
      setMacroData(macroRes);

      const zones = Array.isArray(macroRes?.zones) ? macroRes.zones : [];
      const activeZones = zones.filter((z) => (z.case_count || 0) > 0);
      if (activeZones.length === 0) {
        setStatus('empty');
      } else {
        setStatus('ready');
      }
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to load macro risk heatmap.');
      setStatus('error');
    }
  }, [crimeCategory, timeWindow]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Re-plot static zone markers without camera movement or zoom listener loops
  const renderMapMarkers = useCallback(() => {
    if (!mapRef.current || !macroData?.zones) return;
    const map = mapRef.current;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    let zones = (macroData.zones || []).filter((z) => (z.case_count || 0) > 0 && isValidCoord(z.lat, z.lng));

    if (selectedZone !== 'all') {
      zones = zones.filter((z) => z.zone_id === selectedZone);
    }
    if (riskFilter === 'critical') {
      zones = zones.filter((z) => z.real_time_risk === 'critical' || z.high_priority_count > 0);
    }

    if (zones.length === 0) return;

    zones.forEach((z) => {
      const color = z.real_time_risk === 'critical' ? '#ef4444' : z.real_time_risk === 'elevated' ? '#f97316' : '#eab308';
      const size = 34 + Math.min(z.case_count, 10) * 8;

      const el = document.createElement('div');
      el.className = 'macro-map-marker';
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.borderRadius = '50%';
      el.style.background = `${color}33`;
      el.style.border = `2.5px solid ${color}`;
      el.style.display = 'flex';
      el.style.flexDirection = 'column';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.color = '#ffffff';
      el.style.fontWeight = '800';
      el.style.fontSize = '0.85rem';
      el.style.cursor = 'pointer';
      el.style.boxShadow = `0 0 18px ${color}77, inset 0 0 8px ${color}33`;
      el.style.transition = 'transform 0.2s ease';
      el.innerHTML = `<span style="text-shadow: 0 1px 3px rgba(0,0,0,0.9)">${z.case_count}</span><small style="font-size:0.55rem;opacity:0.9;text-shadow: 0 1px 3px rgba(0,0,0,0.9)">CASES</small>`;

      el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.15)'; });
      el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });

      const popupHtml = `
        <div style="font-family: inherit; min-width: 220px; color: var(--text-primary, #0f172a); padding: 4px;">
          <div style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted, #64748b); font-weight: 700;">GIS Risk Zone</div>
          <div style="font-weight: 800; font-size: 1.05rem; color: var(--text-primary, #0f172a); margin-bottom: 2px;">${z.label || z.zone_id}</div>
          <div style="font-size: 0.78rem; color: var(--text-secondary, #475569); margin-bottom: 8px;">${z.jurisdiction || 'Cyber Crime Jurisdiction'}</div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; background: var(--bg-surface, #f8fafc); padding: 8px; border-radius: 6px; font-size: 0.78rem; margin-bottom: 10px; border: 1px solid var(--border-medium, #cbd5e1);">
            <div><span style="color:var(--text-muted, #64748b); font-size:0.68rem; display:block;">ACTIVE CASES</span><strong>${z.case_count}</strong></div>
            <div><span style="color:var(--text-muted, #64748b); font-size:0.68rem; display:block;">HIGH PRIORITY</span><strong style="color:var(--severity-critical, #dc2626)">${z.high_priority_count || 0}</strong></div>
            <div><span style="color:var(--text-muted, #64748b); font-size:0.68rem; display:block;">CONFIDENCE</span><strong>${Math.round((z.avg_confidence || 0) * 100)}%</strong></div>
            <div><span style="color:var(--text-muted, #64748b); font-size:0.68rem; display:block;">EXPOSURE</span><strong style="color:var(--accent, #2563eb)">${formatINR(z.total_exposure_inr || 0)}</strong></div>
          </div>

          ${z.case_ids && z.case_ids.length > 0 ? `
            <button id="btn-open-case-${z.zone_id}" style="width: 100%; padding: 7px; background: var(--accent, #2563eb); color: #fff; border: none; border-radius: 6px; font-size: 0.78rem; font-weight: 700; cursor: pointer;">
              🚀 Open Lead Case (${z.case_ids[0]})
            </button>
          ` : ''}
        </div>
      `;

      const popup = new maplibregl.Popup({ offset: 20, closeButton: true }).setHTML(popupHtml);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([z.lng, z.lat])
        .setPopup(popup)
        .addTo(map);

      popup.on('open', () => {
        const btnOpen = document.getElementById(`btn-open-case-${z.zone_id}`);
        if (btnOpen && onOpenCase && z.case_ids?.[0]) {
          btnOpen.addEventListener('click', () => {
            onClose?.();
            onOpenCase(z.case_ids[0]);
          });
        }
      });

      markersRef.current.push(marker);
    });
  }, [macroData, selectedZone, riskFilter, onOpenCase, onClose]);

  // Initialize MapLibre Map instance once
  useEffect(() => {
    if (status !== 'ready' || !containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: LIGHT_STYLE,
      center: [78.9629, 20.5937], // India center
      zoom: 4.4,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;

    map.on('load', () => {
      map.resize();
      renderMapMarkers();
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [status, renderMapMarkers]);

  useEffect(() => {
    if (mapRef.current && status === 'ready') {
      renderMapMarkers();
    }
  }, [renderMapMarkers, status]);

  const allZones = macroData?.zones || [];
  let activeZones = allZones.filter((z) => (z.case_count || 0) > 0);

  if (selectedZone !== 'all') {
    activeZones = activeZones.filter((z) => z.zone_id === selectedZone);
  }
  if (riskFilter === 'critical') {
    activeZones = activeZones.filter((z) => z.real_time_risk === 'critical' || z.high_priority_count > 0);
  }

  const totalExposure = activeZones.reduce((sum, z) => sum + (z.total_exposure_inr || 0), 0);
  const totalCasesInView = activeZones.reduce((sum, z) => sum + (z.case_count || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.25 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
      }}
    >
      <div
        className="macro-heatmap-shell"
        style={{
          width: '100%',
          maxWidth: 1280,
          height: '92vh',
          background: 'var(--bg-app, #f8fafc)',
          color: 'var(--text-primary, #0f172a)',
          borderRadius: '12px',
          border: '1px solid var(--border-medium, #cbd5e1)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* CyberFlow Native Header Bar */}
        <div style={{ padding: '0.9rem 1.5rem', borderBottom: '1px solid var(--border-medium, #e2e8f0)', background: 'var(--bg-elevated, #ffffff)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={onClose}
              className="btn btn-ghost"
              style={{ padding: '5px 10px', fontSize: '0.85rem' }}
            >
              ← Back to Dashboard
            </button>
            <div style={{ height: '20px', width: '1px', background: 'var(--border-medium, #cbd5e1)' }} />
            <div>
              <h2 style={{ margin: 0, color: 'var(--text-primary, #0f172a)', fontSize: '1.15rem', fontWeight: 800 }}>
                GIS Risk Heatmap Dashboard
              </h2>
              <p style={{ margin: '1px 0 0 0', color: 'var(--text-muted, #64748b)', fontSize: '0.78rem' }}>
                City-wide threat cluster view &amp; geospatial risk modeling — aggregated across active cases
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={onClose}
              aria-label="Close macro heatmap"
              style={{ background: 'none', border: 'none', color: 'var(--text-muted, #64748b)', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Interactive Drill-Down Filter Control Bar */}
        <div style={{ padding: '10px 1.5rem', background: 'var(--bg-surface, #ffffff)', borderBottom: '1px solid var(--border-medium, #e2e8f0)', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', fontSize: '0.82rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>Crime Category:</span>
            <select
              value={crimeCategory}
              onChange={(e) => setCrimeCategory(e.target.value)}
              style={selectStyle}
            >
              <option value="all">All Categories</option>
              <option value="investment_scam">Investment Scam</option>
              <option value="digital_arrest">Digital Arrest</option>
              <option value="fake_payment_gateway">Fake Payment Gateway</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>Time Window:</span>
            <select
              value={timeWindow}
              onChange={(e) => setTimeWindow(e.target.value)}
              style={selectStyle}
            >
              <option value="all">All Time History</option>
              <option value="realtime">Real-time (Past 24 Hours)</option>
              <option value="7d">Past 7 Days</option>
              <option value="30d">Past 30 Days</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>Zone / Location:</span>
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              style={selectStyle}
            >
              <option value="all">All Geospatial Zones</option>
              <option value="zone_a">Zone A (Delhi NCR Hub)</option>
              <option value="zone_b">Zone B (Kolkata Hub)</option>
              <option value="zone_c">Zone C (Mumbai Hub)</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>Risk Level:</span>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              style={selectStyle}
            >
              <option value="all">All Priority Levels</option>
              <option value="critical">Critical / High Priority Only</option>
            </select>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.78rem', color: 'var(--text-secondary, #475569)' }}>
            <span>Active Cases: <strong style={{ color: 'var(--accent, #2563eb)' }}>{totalCasesInView}</strong></span>
            <span>Total Exposure: <strong style={{ color: 'var(--severity-clear, #16a34a)' }}>{formatINR(totalExposure)}</strong></span>
          </div>
        </div>

        {/* Main Map + Zone Drill-down Content */}
        <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
          {status === 'loading' && (
            <CenteredMessage icon="⏳" title="Loading GIS intelligence…" body="Fetching real-time geospatial threat clusters across zones." />
          )}

          {status === 'error' && (
            <CenteredMessage icon="⚠️" title="Map data unavailable" body={errorMsg || 'Could not load macro heatmap.'}>
              <button onClick={loadData} style={retryBtnStyle}>Retry Loading</button>
            </CenteredMessage>
          )}

          {status === 'empty' && (
            <CenteredMessage icon="🗺️" title="No matching threat clusters" body="No active cases match the selected drill-down filters." />
          )}

          {status === 'ready' && (
            <>
              {/* GIS Map Canvas */}
              <div style={{ flex: 1, position: 'relative' }}>
                <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

                {/* Map Legend */}
                <div style={{ position: 'absolute', bottom: 16, left: 16, background: 'var(--bg-elevated, #ffffff)', border: '1px solid var(--border-medium, #cbd5e1)', borderRadius: 8, padding: '10px 14px', color: 'var(--text-primary, #0f172a)', fontSize: '0.78rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text-primary, #0f172a)', fontSize: '0.82rem' }}>Hotspot Risk Legend</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} /><span>Critical Risk Zone (Immediate Threat)</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f97316' }} /><span>Elevated Risk Zone (High Exposure)</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#eab308' }} /><span>Moderate Risk Zone</span></div>
                  </div>
                </div>
              </div>

              {/* Side Drill-down Register */}
              <div style={{ width: 340, background: 'var(--bg-surface, #ffffff)', borderLeft: '1px solid var(--border-medium, #e2e8f0)', padding: '14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted, #64748b)', fontWeight: 800 }}>
                  ZONE CLUSTER REGISTER ({activeZones.length})
                </div>

                {activeZones.map((z) => {
                  const strokeColor = z.real_time_risk === 'critical' ? '#ef4444' : z.real_time_risk === 'elevated' ? '#f97316' : '#eab308';
                  return (
                    <div
                      key={z.zone_id}
                      style={{
                        background: 'var(--bg-elevated, #ffffff)',
                        border: `1px solid ${strokeColor}`,
                        borderRadius: 8,
                        padding: '12px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <strong style={{ color: 'var(--text-primary, #0f172a)', fontSize: '0.9rem' }}>{z.label || zoneLabel(z.zone_id)}</strong>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: `${strokeColor}15`, color: strokeColor, border: `1px solid ${strokeColor}` }}>
                          {(z.real_time_risk || 'elevated').toUpperCase()}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>
                        {z.jurisdiction || 'Cyber Crime Jurisdiction'}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.75rem', background: 'var(--bg-surface, #f8fafc)', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-medium, #e2e8f0)' }}>
                        <div><span style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.65rem', display: 'block' }}>CASES</span><strong>{z.case_count} active</strong></div>
                        <div><span style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.65rem', display: 'block' }}>EXPOSURE</span><strong style={{ color: 'var(--severity-clear, #16a34a)' }}>{formatINR(z.total_exposure_inr)}</strong></div>
                      </div>

                      {z.case_ids?.[0] && (
                        <button
                          onClick={() => {
                            onClose?.();
                            onOpenCase(z.case_ids[0]);
                          }}
                          style={{
                            marginTop: '4px',
                            padding: '7px 10px',
                            background: 'var(--accent, #2563eb)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 6,
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                          }}
                        >
                          🚀 Explore Lead Case ({z.case_ids[0]})
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function CenteredMessage({ icon, title, body, children }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: '2rem', textAlign: 'center' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{icon}</div>
      <h3 style={{ color: 'var(--text-primary, #0f172a)', marginBottom: '0.5rem' }}>{title}</h3>
      <p style={{ color: 'var(--text-muted, #64748b)', maxWidth: 420 }}>{body}</p>
      {children}
    </div>
  );
}

const selectStyle = {
  background: 'var(--bg-elevated, #ffffff)',
  color: 'var(--text-primary, #0f172a)',
  border: '1px solid var(--border-medium, #cbd5e1)',
  borderRadius: '6px',
  padding: '4px 8px',
  fontSize: '0.78rem',
  cursor: 'pointer',
  outline: 'none',
};

const retryBtnStyle = {
  marginTop: '1.25rem',
  padding: '0.6rem 1.25rem',
  background: 'var(--accent, #2563eb)',
  color: 'white',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontWeight: 600,
};
