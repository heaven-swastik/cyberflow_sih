/**
 * CyberFlow — Shared formatting utilities
 * Single source of truth for all display formatting.
 */

const STATE_LABELS = {
  emerging: 'Emerging',
  collection: 'Collection',
  distribution: 'Distribution',
  layering: 'Layering',
  consolidation: 'Consolidation',
  cashout_prep: 'Cash-out Prep',
};

const STATE_COLORS = {
  emerging: '#64748b',
  collection: '#94a3b8',
  distribution: '#eab308',
  layering: '#f97316',
  consolidation: '#ef4444',
  cashout_prep: '#dc2626',
};

const PRIORITY_COLORS = {
  HIGH: '#ef4444',
  MEDIUM: '#eab308',
  LOW: '#10b981',
};

const FRAUD_TYPE_LABELS = {
  investment_scam: 'Investment Scam',
  digital_arrest: 'Digital Arrest',
  fake_payment_gateway: 'Fake Payment Gateway',
};

const NEXT_ACTION_LABELS = {
  cashout: 'Cash-out',
  further_layering: 'Further Layering',
  external_transfer: 'External Transfer',
  other: 'Other',
};

/**
 * Format INR value with Indian notation.
 * 840000 → "₹8.4L", 12500000 → "₹1.3Cr"
 */
export function formatINR(value) {
  if (value == null) return '—';
  const abs = Math.abs(value);
  if (abs >= 10000000) {
    return `₹${(value / 10000000).toFixed(1)}Cr`;
  }
  if (abs >= 100000) {
    return `₹${(value / 100000).toFixed(1)}L`;
  }
  if (abs >= 1000) {
    return `₹${(value / 1000).toFixed(1)}K`;
  }
  return `₹${value}`;
}

/**
 * Format float 0–1 as percentage string.
 * 0.78 → "78%"
 */
export function formatPercent(value) {
  if (value == null) return '—';
  return `${Math.round(value * 100)}%`;
}

export function stateLabel(state) {
  return STATE_LABELS[state] || state;
}

export function stateColor(state) {
  return STATE_COLORS[state] || '#94a3b8';
}

export function priorityColor(priority) {
  return PRIORITY_COLORS[priority] || '#94a3b8';
}

export function fraudTypeLabel(type) {
  return FRAUD_TYPE_LABELS[type] || type;
}

export function nextActionLabel(action) {
  return NEXT_ACTION_LABELS[action] || action;
}

const ZONE_CITIES = {
  zone_a: 'Delhi NCR',
  zone_b: 'Kolkata',
  zone_c: 'Mumbai',
};

export function zoneLabel(zoneId) {
  return ZONE_CITIES[zoneId] || zoneId;
}

export function zoneCityLabel(zoneId) {
  const map = {
    zone_a: 'Delhi NCR Hub',
    zone_b: 'Kolkata Hub',
    zone_c: 'Mumbai Hub',
  };
  return map[zoneId] || zoneId;
}
