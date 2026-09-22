import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// Zone center coordinates for CyberFlow's 3 zones
const ZONE_COORDS = {
  zone_a: { lng: 77.2090, lat: 28.6139, city: 'New Delhi' },   // Delhi
  zone_b: { lng: 88.3639, lat: 22.5726, city: 'Kolkata' },      // Kolkata
  zone_c: { lng: 72.8777, lat: 19.0760, city: 'Mumbai' },       // Mumbai
};

const ZONE_COLORS = {
  zone_a: '#e4483f',
  zone_b: '#e2954a',
  zone_c: '#5b8fd6',
};

// Free dark style from OpenFreeMap — no API key needed
const DARK_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

export default function MapLibre3D({ atmCandidates = [], locationCandidates = [], deviceLocation = null, selectedAtmId = null, onAtmClick }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Default center: India
    const defaultCenter = { lng: 80.9629, lat: 22.5937 };
    const topZone = locationCandidates[0]?.zone_id;
    const firstAtm = atmCandidates[0];
    
    let center = defaultCenter;
    let zoom = 4.5;

    if (firstAtm?.longitude && firstAtm?.latitude) {
      center = { lng: firstAtm.longitude, lat: firstAtm.latitude };
      zoom = 13;
    } else if (topZone && ZONE_COORDS[topZone]) {
      center = ZONE_COORDS[topZone];
      zoom = 11;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DARK_STYLE,
      center: [center.lng, center.lat],
      zoom,
      pitch: 50,       // 3D tilt — cinematic angle
      bearing: -12,    // slight rotation for depth
      antialias: true,
    });

    mapRef.current = map;

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

    // Apply dark overlay once style loads
    map.on('load', () => {
      // Try to add 3D building extrusion if the style has the buildings layer
      try {
        const layers = map.getStyle().layers;
        // Find fill-extrusion layer or add one if base buildings layer exists
        const buildingLayer = layers?.find(l => l.id.includes('building') || l.id.includes('extrusion'));
        if (buildingLayer) {
          map.setPaintProperty(buildingLayer.id, 'fill-extrusion-color', '#0d1715');
          map.setPaintProperty(buildingLayer.id, 'fill-extrusion-opacity', 0.8);
        }
      } catch(e) { /* style may not have building layers */ }

      // Add ATM markers as a GeoJSON source
      addMarkers(map, atmCandidates, locationCandidates, deviceLocation, onAtmClick);
    });

    return () => {
      markersRef.current.forEach(m => m.remove());
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Fly to selected ATM
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedAtmId) return;
    const atm = atmCandidates.find(a => a.atm_id === selectedAtmId);
    if (atm?.longitude && atm?.latitude) {
      map.flyTo({
        center: [atm.longitude, atm.latitude],
        zoom: 15,
        pitch: 60,
        bearing: -20,
        duration: 1800,
        essential: true,
      });
    }
  }, [selectedAtmId, atmCandidates]);

  // Update markers when data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!map.isStyleLoaded()) {
      map.once('load', () => addMarkers(map, atmCandidates, locationCandidates, deviceLocation, onAtmClick));
    } else {
      // Clear old markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      addMarkers(map, atmCandidates, locationCandidates, deviceLocation, onAtmClick, markersRef);
    }
  }, [atmCandidates, locationCandidates, deviceLocation]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: 380,
        borderRadius: 12,
        overflow: 'hidden',
      }}
    />
  );
}

function addMarkers(map, atmCandidates, locationCandidates, deviceLocation, onAtmClick, markersRef) {
  const markers = [];

  // Device location marker
  if (deviceLocation?.longitude && deviceLocation?.latitude) {
    const el = createMarkerEl('📱', '#5b8fd6', 'Device Last Seen', 36);
    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([deviceLocation.longitude, deviceLocation.latitude])
      .setPopup(new maplibregl.Popup({ offset: 20 }).setHTML(
        `<div style="font-family:IBM Plex Sans,sans-serif;padding:8px">
          <div style="font-weight:700;color:#5b8fd6">Device Ping</div>
          <div style="font-size:0.8rem;color:#666">Last seen ${deviceLocation.last_seen_minutes_ago} min ago</div>
          <div style="font-size:0.8rem">Zone: ${deviceLocation.zone_id || 'Unknown'}</div>
        </div>`
      ))
      .addTo(map);
    markers.push(marker);
  }

  // ATM markers (if ATM-level data available)
  if (atmCandidates.length > 0) {
    atmCandidates.forEach((atm, i) => {
      if (!atm.longitude || !atm.latitude) return;
      const isTop = i === 0;
      const color = isTop ? '#41dc8f' : '#e2954a';
      const el = createMarkerEl('🏧', color, `#${i+1}`, isTop ? 44 : 36);
      const popup = new maplibregl.Popup({ offset: 25 }).setHTML(
        `<div style="font-family:IBM Plex Sans,sans-serif;padding:10px;min-width:180px">
          <div style="font-weight:700;font-size:1rem;margin-bottom:4px">${atm.bank_name} ATM</div>
          <div style="color:#666;font-size:0.8rem;margin-bottom:8px">${atm.address}</div>
          <div style="font-size:1.1rem;font-weight:800;color:${color}">${Math.round(atm.confidence * 100)}% confidence</div>
          <div style="font-size:0.75rem;color:#999;margin-top:4px">${atm.distance_km_from_device?.toFixed(1)} km from device</div>
        </div>`
      );
      el.addEventListener('click', () => onAtmClick?.(atm.atm_id));
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([atm.longitude, atm.latitude])
        .setPopup(popup)
        .addTo(map);
      markers.push(marker);
    });
  } else {
    // Zone-level circles — add as pulsing HTML markers at zone centers
    locationCandidates.forEach((zone, i) => {
      const coords = ZONE_COORDS[zone.zone_id];
      if (!coords) return;
      const color = ZONE_COLORS[zone.zone_id] || '#8a9390';
      const el = createZoneMarkerEl(zone.zone_id, color, zone.confidence, i === 0);
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([coords.lng, coords.lat])
        .addTo(map);
      markers.push(marker);
    });
  }

  if (markersRef) markersRef.current = markers;
  return markers;
}

function createMarkerEl(emoji, color, label, size = 40) {
  const el = document.createElement('div');
  el.style.cssText = `
    width:${size}px;height:${size}px;border-radius:50%;
    background:${color}22;border:2px solid ${color};
    display:flex;align-items:center;justify-content:center;
    font-size:${size * 0.4}px;cursor:pointer;
    box-shadow:0 0 12px ${color}44;
    position:relative;
  `;
  el.innerHTML = emoji;
  // Pulsing ring
  el.style.animation = 'pulse-marker 2s ease infinite';
  return el;
}

function createZoneMarkerEl(zoneId, color, confidence, isTop) {
  const el = document.createElement('div');
  const size = 60 + Math.round(confidence * 40);
  el.style.cssText = `
    width:${size}px;height:${size}px;border-radius:50%;
    background:${color}18;border:${isTop ? 2 : 1}px solid ${color}66;
    display:flex;align-items:center;justify-content:center;
    flex-direction:column;gap:2px;
    pointer-events:none;
  `;
  el.innerHTML = `
    <div style="font-size:0.7rem;font-weight:700;color:${color};text-align:center;line-height:1.2">${zoneId.replace('_',' ').toUpperCase()}</div>
    <div style="font-size:0.8rem;font-weight:800;color:${color}">${Math.round(confidence * 100)}%</div>
  `;
  return el;
}
