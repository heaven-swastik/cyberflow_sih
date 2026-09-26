import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { getMyCases } from '../api';

const priorityColor = (p) => (p === 'HIGH' ? '#e4483f' : p === 'MEDIUM' ? '#e2954a' : '#41dc8f');

const statusLabel = (caseItem) => {
  if (caseItem.status === 'completed' || caseItem.status === 'resolved' || caseItem.prediction_outcome?.status === 'confirmed_correct') {
    return 'Completed';
  }
  return 'Pending';
};

export default function ComplainantDashboard({ onFileComplaint }) {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyCases().then((data) => setCases(Array.isArray(data) ? data : []))
      .catch(() => setCases([]))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const total = cases.length;
    const pending = cases.filter((c) => statusLabel(c) === 'Pending').length;
    const solved = cases.filter((c) => statusLabel(c) === 'Completed').length;
    return { total, pending, solved };
  }, [cases]);

  return (
    <motion.section
      className="complainant-dashboard"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="complainant-dashboard-header">
        <div>
          <div className="complainant-dashboard-eyebrow">My Cases</div>
          <h2 className="complainant-dashboard-title">Complaint Dashboard</h2>
        </div>
        <button className="btn btn-primary" onClick={onFileComplaint}>+ File New Complaint</button>
      </div>

      {loading && <div className="complainant-dashboard-loading">Loading your cases...</div>}

      {!loading && cases.length === 0 && (
        <div className="complainant-empty-state">
          <div className="complainant-empty-icon">📋</div>
          <div className="complainant-empty-title">No complaints filed yet</div>
          <div className="complainant-empty-sub">
            File a complaint to track its investigation status in real time.
          </div>
          <button onClick={onFileComplaint} className="btn btn-primary">File Your First Complaint</button>
        </div>
      )}

      {!loading && cases.length > 0 && (
        <div className="dashboard-grid">
          {/* ── Left: case list ── */}
          <div className="dashboard-main">
            <div className="complainant-case-list">
              {cases.map((c, i) => {
                const isCompleted = statusLabel(c) === 'Completed';
                return (
                  <motion.div
                    key={c.case_id || i}
                    className="complainant-case-card"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                  >
                    <div className="complainant-case-card-top">
                      <div className="complainant-case-id-row">
                        <span className="complainant-case-id">{c.case_id}</span>
                      </div>
                      <span
                        className="complainant-case-stage"
                        style={{
                          background: isCompleted ? 'rgba(65, 220, 143, 0.15)' : 'rgba(226, 149, 74, 0.15)',
                          color: isCompleted ? '#41dc8f' : '#e2954a',
                          border: `1px solid ${isCompleted ? 'rgba(65, 220, 143, 0.3)' : 'rgba(226, 149, 74, 0.3)'}`,
                          borderRadius: 6,
                          padding: '4px 10px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                        }}
                      >
                        {isCompleted ? '✓ Completed' : '⏳ Pending'}
                      </span>
                    </div>

                    <div className="complainant-case-metrics">
                      <div className="complainant-case-metric">
                        <div className="complainant-case-metric-label">Fraud Type</div>
                        <div className="complainant-case-metric-value">{(c.fraud_type || 'Unknown').replace(/_/g, ' ')}</div>
                      </div>
                      
                      <div className="complainant-case-metric">
                        <div className="complainant-case-metric-label">Exposure</div>
                        <div className="complainant-case-metric-value">
                          {c.potential_exposure_inr ? `₹${(c.potential_exposure_inr / 100000).toFixed(1)}L` : 'N/A'}
                        </div>
                      </div>
                    </div>

                    {c.status_updated_at && (
                      <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#8a9390' }}>
                        Updated by {c.status_updated_by || 'Officer'} on {new Date(c.status_updated_at).toLocaleDateString()}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* ── Right: status summary rail ── */}
          <div className="dashboard-side">
            <div className="complainant-stat-tiles">
              <div className="complainant-stat-tile">
                <div className="complainant-stat-icon" style={{ background: 'rgba(65,220,143,0.14)', color: '#41dc8f' }}>🗂️</div>
                <div>
                  <div className="complainant-stat-value">{stats.total}</div>
                  <div className="complainant-stat-label">Total Cases</div>
                </div>
              </div>
              <div className="complainant-stat-tile">
                <div className="complainant-stat-icon" style={{ background: 'rgba(226,149,74,0.14)', color: '#e2954a' }}>⏳</div>
                <div>
                  <div className="complainant-stat-value">{stats.pending}</div>
                  <div className="complainant-stat-label">Pending</div>
                </div>
              </div>
              <div className="complainant-stat-tile">
                <div className="complainant-stat-icon" style={{ background: 'rgba(65,220,143,0.14)', color: '#41dc8f' }}>✓</div>
                <div>
                  <div className="complainant-stat-value">{stats.solved}</div>
                  <div className="complainant-stat-label">Solved</div>
                </div>
              </div>
              <div className="complainant-stat-tile">
                <div className="complainant-stat-icon" style={{ background: 'rgba(91,143,214,0.14)', color: '#5b8fd6' }}>ℹ</div>
                <div>
                  <div className="complainant-stat-value">Status</div>
                  <div className="complainant-stat-label">Check back for updates</div>
                </div>
              </div>
            </div>

            <div className="complainant-helper-card">
              <div className="complainant-helper-title">What happens next?</div>
              <div className="complainant-helper-text">
                Your complaint status will appear here after submission. Check back
                later for updates from the investigation team.
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.section>
  );
}
