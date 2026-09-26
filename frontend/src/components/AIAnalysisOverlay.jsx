import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const MOCK_LOGS = [
  "[SYS] Connection established with I4C Gateway: 192.168.10.45",
  "[AUTH] Validating RSA-4096 handshake... OK",
  "[NCRP] Polling new complaint metadata... 1 record found.",
  "[ETL] Ingesting transaction ledger for ID: CF-9311",
  "[GRAPH] Expanding network horizon (hop_depth=3)...",
  "[GRAPH] Found 14 linked entity nodes. Resolving edges...",
  "[FEATURE_ENG] Extracting temporal clustering metrics...",
  "[FEATURE_ENG] Calculating geospatial dispersion (haversine_dist)...",
  "[FEATURE_ENG] Mapping categorical node properties...",
  "[ML_MODEL] Booting XGBoost ensemble [cyberflow-v4.2.bin]...",
  "[ML_MODEL] Inferring topological risk_score...",
  "[ML_MODEL] Generating probable action_sequence...",
  "[RL_AGENT] Loading Q-table weights...",
  "[RL_AGENT] Aligning predictive states with environment...",
  "[GEO] Querying MapLibre spatial index for physical ATMs...",
  "[GEO] Applying distance penalty decay...",
  "[GEO] Ranking candidate cash-out points...",
  "[SYS] Intelligence package assembled. Booting workspace..."
];

const AIAnalysisOverlay = ({ onComplete }) => {
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState(0);
  const containerRef = useRef(null);

  const getFormattedTime = () => {
    const now = new Date();
    const hrs = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const secs = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    return `${hrs}:${mins}:${secs}.${ms}`;
  };

  useEffect(() => {
    let currentLog = 0;
    
    const logInterval = setInterval(() => {
      if (currentLog < MOCK_LOGS.length) {
        const timeStr = getFormattedTime();
        setLogs(prev => [...prev, { time: timeStr, text: MOCK_LOGS[currentLog] }]);
        setProgress(Math.floor((currentLog / (MOCK_LOGS.length - 1)) * 100));
        currentLog++;
      } else {
        clearInterval(logInterval);
        setTimeout(onComplete, 800);
      }
    }, 280); 

    return () => clearInterval(logInterval);
  }, [onComplete]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(0, 0, 0, 0.85)', 
      backdropFilter: 'blur(8px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }} 
        animate={{ opacity: 1, y: 0, scale: 1 }} 
        style={{ 
          width: '850px', height: '550px', 
          background: '#ffffff', 
          borderRadius: '10px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'Consolas, "SF Mono", "Courier New", monospace', 
        }}
      >
        {/* macOS Style Header */}
        <div style={{ 
          background: '#e5e5e5', 
          borderBottom: '1px solid #d1d1d1',
          padding: '10px 16px', 
          display: 'flex', alignItems: 'center', 
          position: 'relative',
        }}>
          <div style={{ display: 'flex', gap: '8px', zIndex: 2 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f56' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffbd2e' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#27c93f' }} />
          </div>
          <div style={{ 
            position: 'absolute', inset: 0, 
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            color: '#4d4d4d', fontSize: '0.85rem', fontWeight: 600, zIndex: 1
          }}>
            bash - root@cyberflow-intel - 80x24
          </div>
          <div style={{ position: 'absolute', right: 16, color: '#888', fontSize: '0.8rem', fontWeight: 600, zIndex: 2 }}>
            {progress}%
          </div>
        </div>
        
        {/* Terminal Body */}
        <div ref={containerRef} style={{ 
          flex: 1, padding: '20px', 
          overflowY: 'hidden', 
          display: 'flex', flexDirection: 'column', gap: '8px',
          background: '#fafafa',
          color: '#1c1c1e'
        }}>
          {logs.map((log, idx) => (
            <div key={idx} style={{ fontSize: '0.9rem', whiteSpace: 'nowrap', display: 'flex', gap: 16 }}>
              <span style={{ color: '#888', minWidth: '110px' }}>
                [{log.time}]
              </span>
              <span style={{ 
                color: (log.text || "").includes('[SYS]') ? '#0066cc' : 
                       (log.text || "").includes('[ML_MODEL]') ? '#d73a49' : 
                       (log.text || "").includes('[GRAPH]') ? '#6f42c1' :
                       (log.text || "").includes('[RL_AGENT]') ? '#e36209' : '#24292e',
                fontWeight: (log.text || "").includes('[') ? 600 : 400
              }}>
                {log.text}
              </span>
            </div>
          ))}
          {progress < 100 && (
            <div style={{ display: 'flex', gap: 16 }}>
              <span style={{ color: '#888', minWidth: '110px' }}>[{getFormattedTime()}]</span>
              <motion.div
                animate={{ opacity: [1, 0] }}
                transition={{ repeat: Infinity, duration: 0.6 }}
                style={{ width: '8px', height: '16px', background: '#1c1c1e', marginTop: '2px' }}
              />
            </div>
          )}
        </div>
        
        {/* Progress Bar */}
        <div style={{ height: '4px', background: '#e0e0e0' }}>
          <motion.div 
            style={{ height: '100%', background: '#0066cc' }}
            animate={{ width: `${progress}%` }}
            transition={{ type: 'tween', ease: 'linear', duration: 0.2 }}
          />
        </div>
      </motion.div>
    </div>
  );
};

export default AIAnalysisOverlay;
