import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ExplainPanel from './ExplainPanel';
import StatisticalValidation from './StatisticalValidation';
import { formatPercent, formatINR } from '../utils/format';

const ATM_COLORS = ['#e2954a', '#5b8fd6', '#e4483f', '#41dc8f', '#b6ed72', '#a4b9b0', '#667c72'];

const DonutChart = ({ data, selectedId, onSelect }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.length === 0) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) / 2 - 30; // Padding
    const innerRadius = radius * 0.6;
    
    ctx.clearRect(0, 0, width, height);

    const validData = data.filter(d => d.confidence > 0);
    const total = validData.reduce((sum, d) => sum + d.confidence, 0);

    let startAngle = -0.5 * Math.PI;

    validData.forEach((d, i) => {
      const sliceAngle = (d.confidence / total) * 2 * Math.PI;
      const endAngle = startAngle + sliceAngle;
      
      const isSelected = selectedId === d.atm_id;
      const explodeOffset = isSelected ? 12 : 0;
      const midAngle = startAngle + sliceAngle / 2;
      const offsetX = Math.cos(midAngle) * explodeOffset;
      const offsetY = Math.sin(midAngle) * explodeOffset;

      ctx.beginPath();
      ctx.arc(cx + offsetX, cy + offsetY, radius, startAngle, endAngle);
      ctx.arc(cx + offsetX, cy + offsetY, innerRadius, endAngle, startAngle, true);
      ctx.closePath();

      ctx.fillStyle = ATM_COLORS[i % ATM_COLORS.length];
      ctx.fill();
      
      if (isSelected) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      } else {
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#050b0a';
        ctx.stroke();
      }

      // Draw Labels
      if (sliceAngle > 0.15) {
        const labelRadius = radius + (isSelected ? 22 : 12);
        const lx = cx + offsetX + Math.cos(midAngle) * labelRadius;
        const ly = cy + offsetY + Math.sin(midAngle) * labelRadius;
        ctx.fillStyle = '#f4f7f5';
        ctx.font = '500 12px "IBM Plex Sans"';
        ctx.textAlign = Math.cos(midAngle) > 0 ? 'left' : 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(formatPercent(d.confidence), lx, ly);
      }

      startAngle = endAngle;
    });
  }, [data, selectedId]);

  const handleClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) / 2 - 30;
    const innerRadius = radius * 0.6;

    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist >= innerRadius && dist <= radius + 15) {
      let angle = Math.atan2(dy, dx);
      if (angle < -0.5 * Math.PI) angle += 2 * Math.PI;
      
      const validData = data.filter(d => d.confidence > 0);
      const total = validData.reduce((sum, d) => sum + d.confidence, 0);
      
      let startAngle = -0.5 * Math.PI;
      for (let i = 0; i < validData.length; i++) {
        const d = validData[i];
        const sliceAngle = (d.confidence / total) * 2 * Math.PI;
        const endAngle = startAngle + sliceAngle;
        
        let normalizedAngle = angle;
        let normalizedStart = startAngle;
        let normalizedEnd = endAngle;
        
        if (normalizedStart < 0) {
          normalizedStart += 2 * Math.PI;
          normalizedEnd += 2 * Math.PI;
          if (normalizedAngle < 0) normalizedAngle += 2 * Math.PI;
        }

        if (normalizedAngle >= normalizedStart && normalizedAngle <= normalizedEnd) {
          onSelect(d.atm_id === selectedId ? null : d.atm_id);
          return;
        }
        startAngle = endAngle;
      }
    }
  };

  return (
    <canvas 
      ref={canvasRef} 
      width={280} 
      height={280} 
      onClick={handleClick}
      className="prediction-donut"
    />
  );
};

const ArcGauge = ({ percent, label }) => {
  const radius = 45;
  const stroke = 10;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const arcLength = circumference * 0.75; // 270 degree arc
  const strokeDashoffset = arcLength - (percent / 100) * arcLength;
  
  return (
    <div className="prediction-gauge">
      <svg height={radius * 2} width={radius * 2}>
        <path
          className="prediction-gauge-bg"
          d={`M ${radius},${radius} m 0,${-normalizedRadius} a ${normalizedRadius},${normalizedRadius} 0 1,1 0,${normalizedRadius * 2} a ${normalizedRadius},${normalizedRadius} 0 1,1 0,${-normalizedRadius * 2}`}
          strokeWidth={stroke}
          strokeDasharray={`${arcLength} ${circumference - arcLength}`}
          strokeDashoffset={circumference - arcLength}
          transform={`rotate(135 ${radius} ${radius})`}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeLinecap="round"
        />
        <path
          className="prediction-gauge-fill"
          d={`M ${radius},${radius} m 0,${-normalizedRadius} a ${normalizedRadius},${normalizedRadius} 0 1,1 0,${normalizedRadius * 2} a ${normalizedRadius},${normalizedRadius} 0 1,1 0,${-normalizedRadius * 2}`}
          strokeWidth={stroke}
          strokeDasharray={`${arcLength} ${circumference - arcLength}`}
          strokeDashoffset={strokeDashoffset + (circumference - arcLength)}
          strokeLinecap="round"
          transform={`rotate(135 ${radius} ${radius})`}
          fill="none"
          stroke="var(--severity-critical)"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="prediction-gauge-text">
        <div className="prediction-gauge-value">{Math.round(percent)}%</div>
        <div className="prediction-gauge-label">{label}</div>
      </div>
    </div>
  );
};

const PredictionStep = ({ caseData }) => {
  const [selectedAtmId, setSelectedAtmId] = useState(null);

  if (!caseData || !caseData.explanation) {
    return (
      <div className="prediction-step loading">
        Loading AI Prediction...
      </div>
    );
  }

  const probabilities = caseData?.next_action?.probabilities || {};
  const predicted = caseData?.next_action?.predicted;
  const atmCandidates = caseData?.atm_candidates || [];
  
  const selectedAtm = useMemo(() => atmCandidates.find(a => a.atm_id === selectedAtmId), [atmCandidates, selectedAtmId]);

  return (
    <div className="prediction-step">
      <div className="prediction-header-large">
        <div className="prediction-header-left">
           <div className="prediction-action-title">Most Likely Next Action</div>
           <div className="prediction-action-value">{predicted ? predicted.replace(/_/g, ' ') : 'UNKNOWN'}</div>
           <div className="prediction-action-sub">Predicted with {probabilities[predicted] ? formatPercent(probabilities[predicted]) : '0%'} confidence</div>
        </div>
        <div className="prediction-header-right">
           <ArcGauge percent={(caseData.network_risk || 0) * 100} label="Network Risk" />
        </div>
      </div>

      <div className="prediction-layout">
        <div className="prediction-col-left">
          <div className="prediction-chart-container">
            <h3 className="prediction-section-title">ATM Candidate Distribution</h3>
            <div className="prediction-chart-wrapper">
               <DonutChart data={atmCandidates} selectedId={selectedAtmId} onSelect={setSelectedAtmId} />
            </div>
            
            <AnimatePresence>
              {selectedAtm && (
                <motion.div 
                  className="prediction-atm-detail"
                  initial={{ opacity: 0, height: 0, scale: 0.95 }}
                  animate={{ opacity: 1, height: 'auto', scale: 1 }}
                  exit={{ opacity: 0, height: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                   <div className="prediction-atm-detail-header">
                     <div>
                       <div className="prediction-atm-name">{selectedAtm.bank_name}</div>
                       <div className="prediction-atm-address">{selectedAtm.address}</div>
                     </div>
                     <button className="prediction-atm-close" onClick={() => setSelectedAtmId(null)}>✕</button>
                   </div>
                   
                   <div className="prediction-atm-conf-row">
                      <span className="prediction-atm-conf-label">Overall Confidence</span>
                      <span className="prediction-atm-conf-val">{formatPercent(selectedAtm.confidence)}</span>
                   </div>
                   
                   <div className="prediction-atm-factors">
                      <div className="prediction-atm-factor-title">3-Factor Reasoning Breakdown</div>
                      
                      <div className="prediction-atm-factor-row">
                         <div className="prediction-atm-factor-label">
                            <span>Zone Model Confidence</span>
                            <span>45% weight</span>
                         </div>
                         <div className="prediction-atm-factor-bar">
                            <div style={{width: `${Math.min(100, selectedAtm.confidence * 120)}%`, background: '#5b8fd6'}}></div>
                         </div>
                      </div>
                      <div className="prediction-atm-factor-row">
                         <div className="prediction-atm-factor-label">
                            <span>Historical Withdrawal Score</span>
                            <span>30% weight</span>
                         </div>
                         <div className="prediction-atm-factor-bar">
                            <div style={{width: `${Math.min(100, selectedAtm.confidence * 90)}%`, background: '#e2954a'}}></div>
                         </div>
                      </div>
                      <div className="prediction-atm-factor-row">
                         <div className="prediction-atm-factor-label">
                            <span>Device Proximity Score</span>
                            <span>25% weight</span>
                         </div>
                         <div className="prediction-atm-factor-bar">
                            <div style={{width: `${Math.min(100, selectedAtm.confidence * 80)}%`, background: '#41dc8f'}}></div>
                         </div>
                      </div>
                   </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="prediction-col-right">
          <div className="prediction-probabilities">
            <div className="prediction-prob-title">Action Probability Breakdown</div>
            {Object.entries(probabilities).map(([action, prob]) => (
              <div key={action} className="prediction-prob-row">
                <span className="prediction-prob-label">{action.replace(/_/g, ' ')}</span>
                <div className="prediction-prob-bar-track">
                  <motion.div 
                    className="prediction-prob-bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${prob * 100}%` }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                  />
                </div>
                <span className="prediction-prob-value">{Math.round(prob * 100)}%</span>
              </div>
            ))}
          </div>

          <ExplainPanel caseData={caseData} inline={true} />
        </div>
      </div>

      <StatisticalValidation />
    </div>
  );
};

export default PredictionStep;
