import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { getMyCases } from '../api';

const priorityColor = (p) => (p === 'HIGH' ? '#e4483f' : p === 'MEDIUM' ? '#e2954a' : '#41dc8f');

const statusLabel = (caseItem) => {
  if (caseItem.status === 'completed' || caseItem.status === 'resolved' || caseItem.prediction_outcome?.status === 'confirmed_correct') {
    return 'Completed';
  }
  return 'Pending';
};

export default function ComplainantDashboard({ onFileComplaint, onSelectCase }) {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState(null);

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
                    onClick={() => setSelectedCase(c)}
                    style={{ cursor: 'pointer', transition: 'transform 0.2s, border-color 0.2s' }}
                    whileHover={{ scale: 1.01, borderColor: 'rgba(65, 220, 143, 0.4)' }}
                  >
                    <div className="complainant-case-card-top">
                      <div className="complainant-case-id-row">
                        <span className="complainant-case-id">{c.case_id}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                        <span style={{ fontSize: '0.78rem', color: '#41dc8f', fontWeight: 600 }}>
                          View Details →
                        </span>
                      </div>
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
                Click on any case card to view detailed investigation progress, officer updates, and complaint details.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Case Details Modal ── */}
      <AnimatePresence>
        {selectedCase && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem',
              background: 'rgba(5, 11, 10, 0.8)',
              backdropFilter: 'blur(8px)',
            }}
            onClick={() => setSelectedCase(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: 680,
                background: '#0d1715',
                border: '1px solid rgba(65, 220, 143, 0.25)',
                borderRadius: 20,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '85vh',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              }}
            >
              {/* Modal Header */}
              <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(65, 220, 143, 0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '1.3rem', fontWeight: 800, color: '#f4f7f5' }}>
                      {selectedCase.case_id}
                    </span>
                    <span
                      style={{
                        background: statusLabel(selectedCase) === 'Completed' ? 'rgba(65, 220, 143, 0.15)' : 'rgba(226, 149, 74, 0.15)',
                        color: statusLabel(selectedCase) === 'Completed' ? '#41dc8f' : '#e2954a',
                        border: `1px solid ${statusLabel(selectedCase) === 'Completed' ? 'rgba(65, 220, 143, 0.3)' : 'rgba(226, 149, 74, 0.3)'}`,
                        borderRadius: 6,
                        padding: '3px 10px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                      }}
                    >
                      {statusLabel(selectedCase) === 'Completed' ? '✓ Completed' : '⏳ Pending Investigation'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#8a9390', marginTop: 4 }}>
                    Case Details & Investigation Status
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCase(null)}
                  style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#8a9390', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: '1rem' }}
                >
                  ✕
                </button>
              </div>

              {/* Modal Content */}
              <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Grid of Key Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  <div style={{ background: '#13231f', borderRadius: 10, padding: '12px 14px', border: '1px solid rgba(65,220,143,0.1)' }}>
                    <div style={{ fontSize: '0.72rem', color: '#8a9390', textTransform: 'uppercase' }}>Fraud Category</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f4f7f5', marginTop: 2 }}>
                      {selectedCase.complaint?.fraud_type_label || (selectedCase.fraud_type || 'Unknown').replace(/_/g, ' ')}
                    </div>
                  </div>
                  <div style={{ background: '#13231f', borderRadius: 10, padding: '12px 14px', border: '1px solid rgba(65,220,143,0.1)' }}>
                    <div style={{ fontSize: '0.72rem', color: '#8a9390', textTransform: 'uppercase' }}>Reported Loss</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e4483f', marginTop: 2 }}>
                      {selectedCase.potential_exposure_inr ? `₹${(selectedCase.potential_exposure_inr).toLocaleString('en-IN')}` : 'N/A'}
                    </div>
                  </div>
                  <div style={{ background: '#13231f', borderRadius: 10, padding: '12px 14px', border: '1px solid rgba(65,220,143,0.1)' }}>
                    <div style={{ fontSize: '0.72rem', color: '#8a9390', textTransform: 'uppercase' }}>Filing Date</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f4f7f5', marginTop: 2 }}>
                      {selectedCase.updated_at ? new Date(selectedCase.updated_at).toLocaleDateString() : 'Recent'}
                    </div>
                  </div>
                </div>

                {/* Progress Tracker */}
                <div style={{ background: '#13231f', borderRadius: 12, padding: '16px', border: '1px solid rgba(65,220,143,0.12)' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#41dc8f', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                    Investigation Progress Lifecycle
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {[
                      { title: 'Complaint Intake', done: true },
                      { title: 'ML Analysis', done: true },
                      { title: 'Officer Dispatch', done: true },
                      { title: 'Case Completed', done: statusLabel(selectedCase) === 'Completed' }
                    ].map((step, idx) => (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 6 }}>
                        <div
                          style={{
                            width: 26, height: 26, borderRadius: '50%',
                            background: step.done ? '#41dc8f' : '#050b0a',
                            color: step.done ? '#0d1715' : '#8a9390',
                            border: `2px solid ${step.done ? '#41dc8f' : 'rgba(255,255,255,0.2)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.75rem', fontWeight: 800
                          }}
                        >
                          {step.done ? '✓' : idx + 1}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: step.done ? '#f4f7f5' : '#8a9390', fontWeight: step.done ? 600 : 400 }}>
                          {step.title}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Complaint Statement */}
                {selectedCase.complaint?.description && (
                  <div style={{ background: '#13231f', borderRadius: 10, padding: '14px', border: '1px solid rgba(65,220,143,0.1)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8a9390', textTransform: 'uppercase', marginBottom: 6 }}>
                      Complainant Statement & Incident Report
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#f4f7f5', lineHeight: 1.5 }}>
                      {selectedCase.complaint.description}
                    </div>
                  </div>
                )}

                {/* Status Update Info */}
                <div style={{ background: 'rgba(65, 220, 143, 0.06)', borderRadius: 10, padding: '14px', border: '1px solid rgba(65, 220, 143, 0.15)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#41dc8f', marginBottom: 4 }}>
                    Official Officer Status Notice
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#c7d2fe', lineHeight: 1.5 }}>
                    {statusLabel(selectedCase) === 'Completed'
                      ? `This complaint has been investigated and marked COMPLETED by ${selectedCase.status_updated_by || 'the assigned Officer'}${selectedCase.status_updated_at ? ` on ${new Date(selectedCase.status_updated_at).toLocaleString()}` : ''}.`
                      : 'This complaint is currently under active investigation by the Cyber Crime unit. Check back anytime for status updates.'}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(65, 220, 143, 0.1)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                {onSelectCase && (
                  <button
                    onClick={() => { const id = selectedCase.case_id; setSelectedCase(null); onSelectCase(id); }}
                    className="btn btn-primary"
                    style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  >
                    Open Investigation Workspace →
                  </button>
                )}
                <button
                  onClick={() => setSelectedCase(null)}
                  style={{ padding: '8px 16px', fontSize: '0.85rem', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#f4f7f5', borderRadius: 8, cursor: 'pointer' }}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
