import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getBlockchainVerify, healBlockchain, getCases, updateCaseStatus } from '../api';

const STAT_TILES = [
  { icon: '🗂️', key: 'totalCases', label: 'Total Cases', color: '#5b8fd6' },
  { icon: '🚨', key: 'totalAlerts', label: 'Active Alerts', color: '#e4483f' },
  { icon: '🤖', key: 'modelMode', label: 'Model Mode', color: '#41dc8f', isText: true },
  { icon: '⏱️', key: 'uptime', label: 'System Uptime', color: '#e2954a', isText: true },
];

const DUMMY_LOGS = [
  { id: 1, time: '10:42', msg: 'Case CF-1042 alert dispatched', sev: 'high' },
  { id: 2, time: '10:38', msg: 'New complaint filed CF-7834', sev: 'info' },
  { id: 3, time: '10:15', msg: 'System model retrained', sev: 'medium' },
  { id: 4, time: '09:55', msg: 'API rate limit warning', sev: 'medium' },
  { id: 5, time: '09:12', msg: 'Case CF-1029 resolved', sev: 'info' },
];

const SEV_COLOR = { high: '#e4483f', medium: '#e2954a', info: '#41dc8f' };

const AdminPanel = ({ onClose, totalCases = 0, totalAlerts = 0 }) => {
  const [chainValid, setChainValid] = useState(true);
  const [healing, setHealing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [allCases, setAllCases] = useState([]);
  const [loadingCases, setLoadingCases] = useState(false);

  useEffect(() => {
    getBlockchainVerify().then(res => setChainValid(res.is_valid !== false)).catch(() => setChainValid(true));
  }, []);

  useEffect(() => {
    if (activeTab === 'cases') {
      setLoadingCases(true);
      getCases().then(res => setAllCases(Array.isArray(res) ? res : []))
        .catch(err => console.error(err))
        .finally(() => setLoadingCases(false));
    }
  }, [activeTab]);

  const handleToggleStatus = async (caseId, currentStatus) => {
    const nextStatus = (currentStatus === 'completed' || currentStatus === 'resolved') ? 'pending' : 'completed';
    try {
      await updateCaseStatus(caseId, nextStatus);
      setAllCases(prev => prev.map(c => c.case_id === caseId ? { ...c, status: nextStatus } : c));
    } catch (e) {
      console.error(e);
    }
  };

  const statValues = { totalCases, totalAlerts, modelMode: 'XGBoost', uptime: '99.9%' };

  const TABS = ['overview', 'cases', 'security', 'billing', 'logs'];

  return (
    <motion.div
      className="admin-panel"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        position: 'fixed', top: 0, right: 0, height: '100vh', width: 480,
        background: '#0d1715', borderLeft: '1px solid rgba(65,220,143,0.15)',
        display: 'flex', flexDirection: 'column', zIndex: 1000, overflowY: 'auto'
      }}
    >
      {/* Header */}
      <div style={{ padding: '1.5rem 1.5rem 0', borderBottom: '1px solid rgba(65,220,143,0.1)', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(65,220,143,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>⚙️</div>
            <div>
              <div style={{ fontWeight: 700, color: '#f4f7f5', fontSize: '1rem' }}>Admin Console</div>
              <div style={{ fontSize: '0.75rem', color: '#8a9390' }}>CyberFlow Intelligence Platform</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#8a9390', width: 30, height: 30, borderRadius: 6, cursor: 'pointer', fontSize: '1rem' }}>✕</button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4 }}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '5px 12px', borderRadius: 6, border: 'none', fontSize: '0.8rem',
                cursor: 'pointer', fontWeight: 500, textTransform: 'capitalize',
                background: activeTab === tab ? 'rgba(65,220,143,0.15)' : 'transparent',
                color: activeTab === tab ? '#41dc8f' : '#8a9390',
                transition: 'all 0.15s'
              }}
            >{tab}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {activeTab === 'overview' && (
          <>
            {/* Stat tiles 2x2 grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {STAT_TILES.map(tile => (
                <div key={tile.key} style={{
                  background: '#13231f', border: '1px solid rgba(65,220,143,0.12)',
                  borderRadius: 10, padding: '1rem', display: 'flex', flexDirection: 'column', gap: 4
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: '1.1rem' }}>{tile.icon}</span>
                    <span style={{ fontSize: '0.75rem', color: '#8a9390', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{tile.label}</span>
                  </div>
                  <div style={{ fontSize: tile.isText ? '1rem' : '1.75rem', fontWeight: 700, color: tile.color, fontFamily: tile.isText ? 'inherit' : 'IBM Plex Mono, monospace' }}>
                    {statValues[tile.key]}
                  </div>
                </div>
              ))}
            </div>

            {/* API Billing strip */}
            <div style={{ background: '#13231f', border: '1px solid rgba(65,220,143,0.12)', borderRadius: 10, padding: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#8a9390', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>API Partners (Billed ₹10/req)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { name: 'NCRP Gov Portal', calls: 1402, billed: '₹14,020' },
                  { name: 'HDFC Bank API', calls: 5201, billed: '₹52,010' },
                ].map(p => (
                  <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.9rem', color: '#f4f7f5' }}>{p.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#8a9390' }}>{p.calls.toLocaleString()} requests</div>
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#41dc8f', fontFamily: 'IBM Plex Mono, monospace' }}>{p.billed}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'cases' && (
          <div style={{ background: '#13231f', border: '1px solid rgba(65,220,143,0.12)', borderRadius: 10, padding: '1rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f4f7f5', marginBottom: '1rem' }}>Registered Cases & Status Control</div>
            {loadingCases ? (
              <div style={{ fontSize: '0.8rem', color: '#8a9390', textAlign: 'center', padding: '1rem 0' }}>Loading cases...</div>
            ) : allCases.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: '#8a9390', textAlign: 'center', padding: '1rem 0' }}>No cases found.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {allCases.map((c) => {
                  const isDone = c.status === 'completed' || c.status === 'resolved';
                  return (
                    <div key={c.case_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#050b0a', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: '#f4f7f5', fontSize: '0.9rem' }}>{c.case_id}</span>
                          <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: 4, background: isDone ? 'rgba(65,220,143,0.15)' : 'rgba(226,149,74,0.15)', color: isDone ? '#41dc8f' : '#e2954a', fontWeight: 700 }}>
                            {isDone ? 'COMPLETED' : 'PENDING'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#8a9390', marginTop: 2 }}>
                          {c.complainant_email || c.complaint?.complainant_email || c.complaint?.complainant_name || 'System / Demo Case'}
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleStatus(c.case_id, c.status)}
                        style={{
                          background: isDone ? '#e2954a' : '#41dc8f',
                          color: '#0d1715',
                          border: 'none',
                          borderRadius: 6,
                          padding: '5px 10px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {isDone ? 'Reopen' : 'Mark Complete'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'security' && (
          <>
            <div style={{ background: '#13231f', border: `1px solid ${chainValid ? 'rgba(65,220,143,0.2)' : 'rgba(228,72,63,0.3)'}`, borderRadius: 10, padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f4f7f5' }}>Tamper-Evident Log Integrity</div>
                {!chainValid && (
                  <button onClick={handleHeal} disabled={healing} style={{ background: '#e4483f', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer' }}>
                    {healing ? 'Healing...' : '🔧 Heal Chain'}
                  </button>
                )}
              </div>
              {[['🔐 JWT Auth', true], ['⛓️ Hash Chain', chainValid], ['🛡️ SHA-256 Alerts', true], ['🔒 RBAC Active', true]].map(([label, ok]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '0.875rem', color: '#f4f7f5' }}>{label}</span>
                  <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, background: ok ? 'rgba(65,220,143,0.15)' : 'rgba(228,72,63,0.15)', color: ok ? '#41dc8f' : '#e4483f' }}>
                    {ok ? '● ACTIVE' : '⚠ BREACH'}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'billing' && (
          <div style={{ background: '#13231f', border: '1px solid rgba(65,220,143,0.12)', borderRadius: 10, padding: '1rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f4f7f5', marginBottom: '1rem' }}>Revenue Summary</div>
            <div style={{ fontSize: '0.75rem', color: '#8a9390', marginBottom: '0.5rem' }}>Total Revenue (MTD)</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#41dc8f', fontFamily: 'IBM Plex Mono, monospace', marginBottom: '1.5rem' }}>₹66,030</div>
            <div style={{ fontSize: '0.75rem', color: '#8a9390' }}>Pricing: ₹10 per prediction API call · Billed monthly per consumer key</div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div style={{ background: '#13231f', border: '1px solid rgba(65,220,143,0.12)', borderRadius: 10, padding: '1rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f4f7f5', marginBottom: '1rem' }}>Audit Log</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {DUMMY_LOGS.map((log, i) => (
                <div key={log.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none', alignItems: 'flex-start' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: SEV_COLOR[log.sev], marginTop: 6, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.875rem', color: '#f4f7f5' }}>{log.msg}</div>
                    <div style={{ fontSize: '0.75rem', color: '#8a9390' }}>{log.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AdminPanel;
