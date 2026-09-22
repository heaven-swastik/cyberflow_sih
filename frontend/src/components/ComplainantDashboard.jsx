import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { getMyCases } from '../api';

export default function ComplainantDashboard({ onOpenCase, onFileComplaint }) {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyCases().then(data => {
      setCases(Array.isArray(data) ? data : []);
    }).catch(() => setCases([])).finally(() => setLoading(false));
  }, []);

  const priorityColor = (p) => p === 'HIGH' ? '#e4483f' : p === 'MEDIUM' ? '#e2954a' : '#41dc8f';
  const stageLabel = (state) => {
    const map = { emerging: 'Under Analysis', collection: 'Under Analysis', distribution: 'Investigation Active',
      layering: 'Investigation Active', consolidation: 'Alert Dispatched', cashout_prep: 'Alert Dispatched' };
    return map[state] || 'Filed';
  };

  return (
    <motion.section
      className="complainant-dashboard"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ maxWidth: 900, margin: '2rem auto', padding: '0 1.5rem' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>My Cases</div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 600, color: 'var(--text-primary)' }}>Complaint Dashboard</h2>
        </div>
        <button
          onClick={onFileComplaint}
          style={{
            background: 'var(--accent)', color: '#050b0a', border: 'none', borderRadius: 8,
            padding: '10px 20px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer'
          }}
        >
          + File New Complaint
        </button>
      </div>

      {loading && <div style={{ color: 'var(--text-secondary)', padding: '2rem 0' }}>Loading your cases...</div>}

      {!loading && cases.length === 0 && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
          padding: '3rem', textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📋</div>
          <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 8 }}>No complaints filed yet</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            File a complaint to track its investigation status in real time.
          </div>
          <button onClick={onFileComplaint} className="btn btn-primary">File Your First Complaint</button>
        </div>
      )}

      {!loading && cases.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {cases.map((c, i) => (
            <motion.div
              key={c.case_id || i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '1.25rem', cursor: 'pointer',
                transition: 'border-color 0.2s'
              }}
              onClick={() => onOpenCase(c.case_id)}
              onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(65,220,143,0.5)'}
              onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.95rem', color: 'var(--accent)' }}>{c.case_id}</span>
                  <span style={{
                    background: `${priorityColor(c.intervention_priority)}22`,
                    color: priorityColor(c.intervention_priority),
                    border: `1px solid ${priorityColor(c.intervention_priority)}44`,
                    borderRadius: 6, padding: '2px 8px', fontSize: '0.75rem', fontWeight: 700
                  }}>{c.intervention_priority || 'LOW'}</span>
                </div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{stageLabel(c.current_state)}</span>
              </div>

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 100 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 2 }}>FRAUD TYPE</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{(c.fraud_type || 'Unknown').replace(/_/g, ' ')}</div>
                </div>
                <div style={{ flex: 1, minWidth: 100 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 2 }}>NETWORK RISK</div>
                  <div style={{ fontSize: '0.9rem', color: c.network_risk > 0.7 ? '#e4483f' : c.network_risk > 0.4 ? '#e2954a' : '#41dc8f', fontWeight: 700 }}>{c.network_risk != null ? `${Math.round(c.network_risk * 100)}%` : 'N/A'}</div>
                </div>
                <div style={{ flex: 1, minWidth: 100 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 2 }}>EXPOSURE</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{c.potential_exposure_inr ? `₹${(c.potential_exposure_inr/100000).toFixed(1)}L` : 'N/A'}</div>
                </div>
              </div>

              <div style={{ marginTop: 12, fontSize: '0.8rem', color: 'var(--accent)' }}>View full investigation →</div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.section>
  );
}
