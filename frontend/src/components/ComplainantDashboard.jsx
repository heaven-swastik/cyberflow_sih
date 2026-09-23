import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { getMyCases } from '../api';

const priorityColor = (p) => (p === 'HIGH' ? '#e4483f' : p === 'MEDIUM' ? '#e2954a' : '#41dc8f');

const STAGE_MAP = {
  emerging: 'Under Analysis', collection: 'Under Analysis', distribution: 'Investigation Active',
  layering: 'Investigation Active', consolidation: 'Alert Dispatched', cashout_prep: 'Alert Dispatched',
};
const stageLabel = (state) => STAGE_MAP[state] || 'Filed';

export default function ComplainantDashboard({ onOpenCase, onFileComplaint }) {
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
    const highPriority = cases.filter((c) => c.intervention_priority === 'HIGH').length;
    const avgRisk = total
      ? Math.round((cases.reduce((sum, c) => sum + (c.network_risk || 0), 0) / total) * 100)
      : 0;
    const totalExposure = cases.reduce((sum, c) => sum + (c.potential_exposure_inr || 0), 0);
    return { total, highPriority, avgRisk, totalExposure };
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
              {cases.map((c, i) => (
                <motion.div
                  key={c.case_id || i}
                  className="complainant-case-card"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => onOpenCase(c.case_id)}
                >
                  <div className="complainant-case-card-top">
                    <div className="complainant-case-id-row">
                      <span className="complainant-case-id">{c.case_id}</span>
                      <span
                        className="complainant-priority-pill"
                        style={{
                          background: `${priorityColor(c.intervention_priority)}22`,
                          color: priorityColor(c.intervention_priority),
                          border: `1px solid ${priorityColor(c.intervention_priority)}44`,
                        }}
                      >
                        {c.intervention_priority || 'LOW'}
                      </span>
                    </div>
                    <span className="complainant-case-stage">{stageLabel(c.current_state)}</span>
                  </div>

                  <div className="complainant-case-metrics">
                    <div className="complainant-case-metric">
                      <div className="complainant-case-metric-label">Fraud Type</div>
                      <div className="complainant-case-metric-value">{(c.fraud_type || 'Unknown').replace(/_/g, ' ')}</div>
                    </div>
                    <div className="complainant-case-metric">
                      <div className="complainant-case-metric-label">Network Risk</div>
                      <div
                        className="complainant-case-metric-value"
                        style={{ color: c.network_risk > 0.7 ? '#e4483f' : c.network_risk > 0.4 ? '#e2954a' : '#41dc8f', fontWeight: 700 }}
                      >
                        {c.network_risk != null ? `${Math.round(c.network_risk * 100)}%` : 'N/A'}
                      </div>
                    </div>
                    <div className="complainant-case-metric">
                      <div className="complainant-case-metric-label">Exposure</div>
                      <div className="complainant-case-metric-value">
                        {c.potential_exposure_inr ? `₹${(c.potential_exposure_inr / 100000).toFixed(1)}L` : 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="complainant-case-cta">View full investigation →</div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* ── Right: pictorial summary rail ── */}
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
                <div className="complainant-stat-icon" style={{ background: 'rgba(228,72,63,0.14)', color: '#e4483f' }}>🚨</div>
                <div>
                  <div className="complainant-stat-value">{stats.highPriority}</div>
                  <div className="complainant-stat-label">High Priority</div>
                </div>
              </div>
              <div className="complainant-stat-tile">
                <div className="complainant-stat-icon" style={{ background: 'rgba(226,149,74,0.14)', color: '#e2954a' }}>📈</div>
                <div>
                  <div className="complainant-stat-value">{stats.avgRisk}%</div>
                  <div className="complainant-stat-label">Avg. Network Risk</div>
                </div>
              </div>
              <div className="complainant-stat-tile">
                <div className="complainant-stat-icon" style={{ background: 'rgba(91,143,214,0.14)', color: '#5b8fd6' }}>◈</div>
                <div>
                  <div className="complainant-stat-value">₹{(stats.totalExposure / 100000).toFixed(1)}L</div>
                  <div className="complainant-stat-label">Total Exposure</div>
                </div>
              </div>
            </div>

            <div className="complainant-helper-card">
              <div className="complainant-helper-title">What happens next?</div>
              <div className="complainant-helper-text">
                Every complaint is automatically screened, classified and — where
                the evidence supports it — routed to an active investigation with
                predicted cash-out tracking. You can check back here any time.
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.section>
  );
}
