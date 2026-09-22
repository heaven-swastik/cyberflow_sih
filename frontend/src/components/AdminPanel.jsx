import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

const DUMMY_LOGS = [
  { id: 1, time: '10:42 AM', message: 'Case CF-1042 alert dispatched', severity: 'high' },
  { id: 2, time: '10:38 AM', message: 'New complaint filed CF-7834', severity: 'info' },
  { id: 3, time: '10:15 AM', message: 'System model retrained successfully', severity: 'medium' },
  { id: 4, time: '09:55 AM', message: 'API rate limit threshold warning', severity: 'medium' },
  { id: 5, time: '09:12 AM', message: 'Case CF-1029 resolved', severity: 'info' },
];

const AdminPanel = ({ onClose, totalCases = 0, totalAlerts = 0 }) => {
  return (
    <motion.div 
      className="admin-panel"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="admin-header">
        <h2 className="admin-title">System Administration</h2>
        <button className="admin-close-btn" onClick={onClose}>×</button>
      </div>

      <div className="admin-content">
        <section className="admin-section">
          <h3 className="admin-section-title">System Status</h3>
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <span className="admin-stat-label">Total Cases</span>
              <span className="admin-stat-value">{totalCases}</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-label">Active Alerts</span>
              <span className="admin-stat-value admin-alert-val">{totalAlerts}</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-label">System Mode</span>
              <span className="admin-stat-value">ML (XGBoost)</span>
            </div>
          </div>
        </section>

        <section className="admin-section">
          <h3 className="admin-section-title">Security Status</h3>
          <div className="admin-security-grid">
            <div className="admin-sec-card">
              <div className="admin-sec-indicator active"></div>
              <span>Backend JWT Active</span>
            </div>
            <div className="admin-sec-card">
              <div className="admin-sec-indicator active"></div>
              <span>Chain Valid</span>
            </div>
            <div className="admin-sec-card">
              <div className="admin-sec-indicator active"></div>
              <span>SHA-256 Alert Hashing</span>
            </div>
          </div>
        </section>

        <section className="admin-section">
          <h3 className="admin-section-title">API Integrations & Billing</h3>
          <div className="admin-stats-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="admin-stat-card">
              <span className="admin-stat-label">NCRP Gov Portal</span>
              <span className="admin-stat-value">1,402 calls</span>
              <span className="admin-stat-label" style={{ marginTop: '0.25rem', color: 'var(--accent)' }}>₹14,020 (Billed)</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-label">HDFC Bank API</span>
              <span className="admin-stat-value">5,201 calls</span>
              <span className="admin-stat-label" style={{ marginTop: '0.25rem', color: 'var(--accent)' }}>₹52,010 (Billed)</span>
            </div>
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            CyberFlow Prediction API is billed at ₹10 per request via x-api-key.
          </div>
        </section>

        <section className="admin-section admin-log-section">
          <h3 className="admin-section-title">Audit Log</h3>
          <div className="admin-log-list">
            {DUMMY_LOGS.map(log => (
              <div key={log.id} className="admin-log-item">
                <span className="admin-log-time">{log.time}</span>
                <span className={`admin-log-badge admin-log-${log.severity}`}>
                  {log.severity.toUpperCase()}
                </span>
                <span className="admin-log-msg">{log.message}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </motion.div>
  );
};

export default AdminPanel;
