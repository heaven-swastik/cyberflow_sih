import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getCase } from '../api';

const STAGES = ['Filed', 'Under Analysis', 'Investigation Active', 'Alert Dispatched', 'Resolved'];

const getStageIndex = (state, status) => {
  if (status === 'resolved') return 4;
  if (state === 'emerging' || state === 'collection') return 1;
  if (state === 'distribution' || state === 'layering') return 2;
  if (state === 'consolidation' || state === 'cashout_prep') return 3;
  return 0;
};

const getPriorityColor = (priority) => {
  const normalizedPriority = priority?.toUpperCase();
  if (normalizedPriority === 'HIGH') return '#e4483f';
  if (normalizedPriority === 'MEDIUM') return '#e2954a';
  return '#41dc8f';
};

const ComplaintTracker = ({ onOpenCase, onClose, caseIds = [] }) => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCases = async () => {
      setLoading(true);
      try {
        const results = await Promise.all(caseIds.map((id) => getCase(id)));
        setCases(results.filter(Boolean));
      } catch (error) {
        console.error('Error fetching cases:', error);
      } finally {
        setLoading(false);
      }
    };

    if (caseIds.length > 0) fetchCases();
    else {
      setCases([]);
      setLoading(false);
    }
  }, [caseIds]);

  return (
    <AnimatePresence>
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(5, 11, 10, 0.8)', backdropFilter: 'blur(8px)' }} onClick={onClose} />
        <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} style={{ position: 'relative', width: '100%', maxWidth: 800, background: '#0d1715', border: '1px solid rgba(65, 220, 143, 0.2)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(65, 220, 143, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div><h2 style={{ margin: 0, fontSize: '1.25rem', color: '#f4f7f5' }}>My Complaints</h2><div style={{ fontSize: '0.85rem', color: '#8a9390', marginTop: 4 }}>Real-time investigation status</div></div>
            <button onClick={onClose} aria-label="Close complaint tracker" style={{ background: 'transparent', border: 'none', color: '#8a9390', cursor: 'pointer', fontSize: '1.2rem' }}>X</button>
          </div>
          <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
            {loading ? <div style={{ textAlign: 'center', color: '#8a9390', padding: '3rem 0' }}>Loading your cases...</div> : cases.length === 0 ? <div style={{ textAlign: 'center', padding: '4rem 0' }}><div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📋</div><div style={{ color: '#f4f7f5', fontWeight: 600, fontSize: '1.1rem', marginBottom: 8 }}>No complaints filed yet</div><div style={{ color: '#8a9390', fontSize: '0.9rem' }}>File a complaint to track its progress here.</div></div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {cases.map((complaint) => {
                  const currentStage = getStageIndex(complaint.state, complaint.status);
                  const priorityColor = getPriorityColor(complaint.priority);
                  const progress = (currentStage / (STAGES.length - 1)) * 100;
                  return (
                    <div key={complaint.id} style={{ background: '#13231f', border: '1px solid rgba(65, 220, 143, 0.15)', borderRadius: 12, padding: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '1.1rem', color: '#f4f7f5', fontWeight: 600 }}>{complaint.id}</span><span style={{ background: `${priorityColor}22`, color: priorityColor, border: `1px solid ${priorityColor}44`, borderRadius: 6, padding: '2px 8px', fontSize: '0.75rem', fontWeight: 700 }}>{complaint.priority || 'LOW'}</span></div><button onClick={() => onOpenCase(complaint.id)} style={{ background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)', borderRadius: 6, padding: '6px 14px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>View Details -&gt;</button></div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: '2rem' }}>
                        <div style={{ background: '#050b0a', borderRadius: 8, padding: '10px 14px' }}><div className="tracker-label">Fraud Type</div><div className="tracker-value">{complaint.type || 'Unknown'}</div></div>
                        <div style={{ background: '#050b0a', borderRadius: 8, padding: '10px 14px' }}><div className="tracker-label">Filed On</div><div className="tracker-value">{complaint.timestamp ? new Date(complaint.timestamp).toLocaleDateString() : 'N/A'}</div></div>
                        <div style={{ background: '#050b0a', borderRadius: 8, padding: '10px 14px' }}><div className="tracker-label">Network Risk</div><div className="tracker-value">{complaint.riskScore ? `${(complaint.riskScore * 100).toFixed(0)}%` : 'N/A'}</div></div>
                      </div>
                      <div style={{ position: 'relative', paddingTop: 10 }}><div style={{ position: 'absolute', top: 15, left: 10, right: 10, height: 2, background: 'rgba(255, 255, 255, 0.1)' }}><div style={{ height: '100%', background: '#41dc8f', width: `${progress}%`, transition: 'width 0.5s ease-out' }} /></div><div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>{STAGES.map((stage, index) => <div key={stage} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: 80 }}><div style={{ width: 12, height: 12, borderRadius: '50%', background: index <= currentStage ? '#41dc8f' : '#13231f', border: `2px solid ${index <= currentStage ? '#41dc8f' : 'rgba(255, 255, 255, 0.2)'}`, zIndex: 2 }} /><div style={{ fontSize: '0.75rem', color: index <= currentStage ? '#f4f7f5' : '#8a9390', textAlign: 'center', lineHeight: 1.2 }}>{stage}</div></div>)}</div></div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ComplaintTracker;