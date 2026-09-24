import React from 'react';
import { motion } from 'framer-motion';

const MacroHeatmap = ({ onClose, onOpenCase }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(5, 10, 15, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{
        width: '90%',
        maxWidth: 1000,
        height: '80vh',
        background: '#0d1520',
        borderRadius: 16,
        border: '1px solid #1e293b',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, color: '#f1f5f9', fontSize: '1.25rem' }}>Macro Command Center (Heatmap)</h2>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>City-wide threat cluster visualization</p>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>
        
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗺️</div>
          <h3 style={{ color: '#cbd5e1', marginBottom: '0.5rem' }}>Global Heatmap Module Offline</h3>
          <p style={{ color: '#64748b', textAlign: 'center', maxWidth: 400 }}>
            The live aggregate heatmap requires the full production feed. For this demo, please drill down into individual cases via the dashboard.
          </p>
          <button 
            onClick={onClose}
            style={{ marginTop: '1.5rem', padding: '0.75rem 1.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
          >
            Return to Case List
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default MacroHeatmap;
