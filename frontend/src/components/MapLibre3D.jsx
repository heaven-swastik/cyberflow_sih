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

// Free light style from OpenFreeMap
const LIGHT_STYLE = {
  version: 8,
  sources: {
    'osm': {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap Contributors'
    }
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
      minzoom: 0,
      maxzoom: 19
    }
  ]
};

export default function MapLibre3D({ atmCandidates = [], locationCandidates = [], deviceLocation = null, withdrawalHistory = [], selectedAtmId = null, onAtmClick }) {
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
      style: LIGHT_STYLE,
      center: [center.lng, center.lat],
      zoom,
      pitch: 65,       // 3D tilt — deeper angle for premium feel
      maxPitch: 85,
      bearing: -25,    // slight rotation for depth
      antialias: true,
    });

    mapRef.current = map;

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

    // Apply light overlay once style loads
    map.on('load', () => {
      // Removed building extrusion logic to prevent WebGL renderer crashes on unsupported styles

      // Add ATM markers as a GeoJSON source
      addMarkers(map, atmCandidates, locationCandidates, deviceLocation, withdrawalHistory, onAtmClick);
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
      map.once('load', () => addMarkers(map, atmCandidates, locationCandidates, deviceLocation, withdrawalHistory, onAtmClick));
    } else {
      // Clear old markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      addMarkers(map, atmCandidates, locationCandidates, deviceLocation, withdrawalHistory, onAtmClick, markersRef);
    }
  }, [atmCandidates, locationCandidates, deviceLocation, withdrawalHistory]);

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

function addMarkers(map, atmCandidates, locationCandidates, deviceLocation, withdrawalHistory, onAtmClick, markersRef) {
  const markers = [];

  
  // Historical withdrawals
  if (withdrawalHistory && withdrawalHistory.length > 0) {
    withdrawalHistory.forEach((wd) => {
      if (!wd.longitude || !wd.latitude) return;
      const el = createMarkerEl('bank', '#8a9390', 'Past', 30);
      el.style.opacity = '0.8';
      el.style.animation = 'none'; // No pulse
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([wd.longitude, wd.latitude])
        .setPopup(new maplibregl.Popup({ offset: 15 }).setHTML(
          `<div style="font-family:IBM Plex Sans,sans-serif;padding:8px">
            <div style="font-weight:700;color:#8a9390">Past Withdrawal</div>
            <div style="font-size:0.8rem">₹${wd.amount_inr} at ${wd.atm_id}</div>
            <div style="font-size:0.75rem;color:#666">${wd.days_ago} days ago</div>
          </div>`
        ))
        .addTo(map);
      markers.push(marker);
    });
  }
  
  // Device location marker

  if (deviceLocation?.longitude && deviceLocation?.latitude) {
    const el = createMarkerEl('device', '#5b8fd6', 'Device', 42);
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
      const color = '#e4483f';
        const el = createMarkerEl('atm', color, `#${i+1}`, isTop ? 56 : 42);
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

function createMarkerEl(type, color, label, size = 40) {
  const el = document.createElement('div');
  if (type === 'atm') {
    el.style.cssText = `width:${size}px;height:${size}px;cursor:pointer;filter:drop-shadow(0 0 8px rgba(228,72,63,0.8));`;
    el.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="${color}"/></svg>`;
  } else if (type === 'device') {
    el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:${color}33;border:3px solid ${color};display:flex;align-items:center;justify-content:center;font-weight:bold;color:${color};font-size:${size*0.4}px;cursor:pointer;box-shadow:0 0 12px ${color}66;`;
    el.textContent = 'D';
  } else {
    el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:${color}33;border:2px solid ${color};display:flex;align-items:center;justify-content:center;font-weight:bold;color:${color};font-size:${size*0.4}px;cursor:pointer;opacity:0.8;`;
    el.textContent = 'W';
  }
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
