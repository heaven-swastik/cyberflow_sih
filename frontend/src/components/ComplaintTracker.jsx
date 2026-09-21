import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { getCase } from '../api';

const STAGES = [
  'Filed',
  'Under Analysis',
  'Investigation Active',
  'Alert Dispatched',
  'Resolved'
];

const ComplaintTracker = ({ onOpenCase, caseIds = [] }) => {
  const { currentUser } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCases = async () => {
      setLoading(true);
      try {
        const casePromises = caseIds.map((id) => getCase(id));
        const results = await Promise.all(casePromises);
        setCases(results.filter(Boolean));
      } catch (error) {
        console.error("Error fetching cases:", error);
      } finally {
        setLoading(false);
      }
    };

    if (caseIds.length > 0) {
      fetchCases();
    } else {
      setLoading(false);
    }
  }, [caseIds]);

  const getStageIndex = (state, status) => {
    if (status === 'resolved') return 4;
    switch (state) {
      case 'emerging':
      case 'collection':
        return 1; // Under Analysis
      case 'distribution':
      case 'layering':
        return 2; // Investigation Active
      case 'consolidation':
      case 'cashout_prep':
        return 3; // Alert Dispatched
      default:
        return 0; // Filed
    }
  };

  const getPriorityClass = (priority) => {
    if (!priority) return 'tracker-badge-low';
    const p = priority.toLowerCase();
    if (p === 'high') return 'tracker-badge-high';
    if (p === 'medium') return 'tracker-badge-medium';
    return 'tracker-badge-low';
  };

  return (
    <motion.div 
      className="tracker-container"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="tracker-header">My Complaints</h2>
      
      {loading ? (
        <div className="tracker-empty">Loading cases...</div>
      ) : cases.length === 0 ? (
        <div className="tracker-empty">No complaints filed yet.</div>
      ) : (
        <div className="tracker-list">
          {cases.map((c) => {
            const currentStage = getStageIndex(c.state, c.status);
            
            return (
              <div key={c.id} className="tracker-card">
                <div className="tracker-card-header">
                  <div className="tracker-title-group">
                    <span className="tracker-id">{c.id}</span>
                    <span className={`tracker-badge ${getPriorityClass(c.priority)}`}>
                      {c.priority || 'LOW'}
                    </span>
                  </div>
                  <button 
                    className="tracker-btn"
                    onClick={() => onOpenCase(c.id)}
                  >
                    View Investigation
                  </button>
                </div>
                
                <div className="tracker-details">
                  <div className="tracker-detail">
                    <span className="tracker-label">Type:</span>
                    <span className="tracker-value">{c.type || 'Unknown'}</span>
                  </div>
                  <div className="tracker-detail">
                    <span className="tracker-label">Filed:</span>
                    <span className="tracker-value">{c.timestamp ? new Date(c.timestamp).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div className="tracker-detail">
                    <span className="tracker-label">Risk Score:</span>
                    <span className="tracker-value">{c.riskScore ? `${(c.riskScore * 100).toFixed(0)}%` : 'N/A'}</span>
                  </div>
                </div>

                <div className="tracker-progress-container">
                  <div className="tracker-progress-track">
                    <div 
                      className="tracker-progress-fill" 
                      style={{ width: `${(currentStage / (STAGES.length - 1)) * 100}%` }}
                    />
                  </div>
                  <div className="tracker-stages">
                    {STAGES.map((stage, idx) => (
                      <div 
                        key={stage} 
                        className={`tracker-stage ${idx <= currentStage ? 'active' : ''}`}
                      >
                        {stage}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default ComplaintTracker;
