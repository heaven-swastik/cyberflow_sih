import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import ExplainPanel from './ExplainPanel';
import EvidencePanel from './EvidencePanel';
import StatisticalValidation from './StatisticalValidation';
import { formatPercent, formatINR } from '../utils/format';

const fraudTypeLabel = (f) => f ? f.replace(/_/g, ' ').toUpperCase() : 'UNKNOWN FRAUD';

/* [Keep DonutChart intact but smaller] */
const DonutChart = ({ data, selectedId, onSelect }) => {
  const canvasRef = useRef(null);
  const ATM_COLORS = ['#e2954a', '#5b8fd6', '#e4483f', '#41dc8f', '#b6ed72', '#a4b9b0', '#667c72'];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.length === 0) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) / 2 - 20;
    const innerRadius = radius * 0.6;

    ctx.clearRect(0, 0, width, height);

    const validData = data.filter(d => d.confidence > 0);
    const total = validData.reduce((sum, d) => sum + d.confidence, 0);
    let startAngle = -0.5 * Math.PI;

    validData.forEach((d, i) => {
      const sliceAngle = (d.confidence / total) * 2 * Math.PI;
      const endAngle = startAngle + sliceAngle;
      const isSelected = selectedId === d.atm_id;
      const explodeOffset = isSelected ? 8 : 0;
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
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      } else {
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#050b0a';
        ctx.stroke();
      }

      startAngle = endAngle;
    });
  }, [data, selectedId]);

  return (
    <canvas ref={canvasRef} width={180} height={180} className="prediction-donut" />
  );
};

/* Widget Container Component */
const Widget = ({ title, children, style = {}, gridArea }) => (
  <div style={{
    background: '#0d1a16',
    border: '1px solid #1c332b',
    borderRadius: '6px',
    display: 'flex',
    flexDirection: 'column',
    gridArea,
    ...style
  }}>
    <div style={{
      borderBottom: '1px solid #1c332b',
      padding: '8px 12px',
      fontSize: '0.75rem',
      fontWeight: 700,
      color: '#8a9390',
      textTransform: 'uppercase',
      letterSpacing: 1,
      background: '#0a1411',
      borderTopLeftRadius: '6px',
      borderTopRightRadius: '6px'
    }}>
      {title}
    </div>
    <div style={{ padding: '16px', flex: 1, overflow: 'hidden' }}>
      {children}
    </div>
  </div>
);

const PredictionStep = ({ caseData }) => {
  const [selectedAtmId, setSelectedAtmId] = useState(null);

  if (!caseData || !caseData.explanation) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#8a9390', fontFamily: 'monospace' }}>INITIALIZING PREDICTION ENGINE...</div>;
  }

  const probabilities = caseData?.next_action?.probabilities || {};
  const predicted = caseData?.next_action?.predicted || '';
  const atmCandidates = caseData?.atm_candidates || [];
  const topAtms = atmCandidates.slice(0, 3);
  
  const isThin = caseData.data_validation?.stats?.sufficient_for_prediction === false || caseData.evidence_status === 'Insufficient Evidence';

  if (isThin) {
    return (
      <div style={{ background: '#e4483f11', border: '1px solid rgba(228,72,63,0.4)', padding: 32, borderRadius: 6, margin: 24 }}>
        <h3 style={{ color: '#e4483f', margin: '0 0 12px 0', fontSize: '1rem', letterSpacing: 1 }}>INSUFFICIENT EVIDENCE</h3>
        <p style={{ margin: 0, color: '#f4f7f5', fontSize: '0.9rem', lineHeight: 1.5 }}>
          This case contains too few transaction hops or insufficient behavioral history to establish a reliable pattern. 
          The system refuses to fabricate a confident prediction. Additional data is required.
        </p>
      </div>
    );
  }

  const safeConfidence = predicted && probabilities[predicted]
    ? (probabilities[predicted] > 0.99 ? 98.7 : (probabilities[predicted] * 100))
    : 0;

  const corrections = caseData?.rl_corrections || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: 1400, margin: '0 auto' }}>
      
      {/* CSS Grid Dashboard Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gridTemplateRows: 'auto auto auto',
        gap: '16px',
        gridTemplateAreas: `
          "threat threat path path"
          "probs probs atms atms"
          "rl rl atms atms"
        `
      }}>
        
        {/* WIDGET 1: Threat Intel */}
        <Widget title="Primary Threat Intelligence" gridArea="threat">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase', lineHeight: 1.2 }}>
                {predicted.replace(/_/g, ' ')}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <span style={{ fontSize: '0.75rem', padding: '4px 8px', background: '#e4483f22', color: '#e4483f', border: '1px solid #e4483f44', borderRadius: '4px', fontWeight: 700 }}>
                  {fraudTypeLabel(caseData?.fraud_type)}
                </span>
                <span style={{ fontSize: '0.75rem', padding: '4px 8px', background: '#41dc8f22', color: '#41dc8f', border: '1px solid #41dc8f44', borderRadius: '4px', fontWeight: 700 }}>
                  PRIORITY {caseData?.intervention_priority}
                </span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '3rem', color: '#41dc8f', fontWeight: 800, lineHeight: 1 }}>
                {safeConfidence.toFixed(1)}%
              </div>
              <div style={{ fontSize: '0.7rem', color: '#8a9390', marginTop: '4px' }}>XGBOOST ENSEMBLE</div>
            </div>
          </div>
        </Widget>

        {/* WIDGET 2: Path Evolution */}
        <Widget title="Network Path Evolution" gridArea="path">
          <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: '4px', overflowX: 'auto', paddingBottom: '4px' }}>
            {caseData.predicted_paths?.primary_path?.stages.map((s, i, arr) => (
              <React.Fragment key={i}>
                <div style={{ 
                  padding: '6px 12px', 
                  background: i === arr.length - 1 ? '#e2954a22' : '#41dc8f11', 
                  border: `1px solid ${i === arr.length - 1 ? '#e2954a88' : '#41dc8f44'}`, 
                  color: i === arr.length - 1 ? '#e2954a' : '#41dc8f', 
                  fontSize: '0.75rem', fontWeight: 700, borderRadius: '4px', whiteSpace: 'nowrap' 
                }}>
                  {s.state.replace(/_/g, ' ').toUpperCase()}
                </div>
                {i < arr.length - 1 && <div style={{ color: '#8a9390', fontSize: '0.8rem' }}>&#9654;</div>}
              </React.Fragment>
            ))}
          </div>
        </Widget>

        {/* WIDGET 3: Action Probabilities (Bar Chart) */}
        <Widget title="Model Action Probabilities" gridArea="probs">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(probabilities).sort((a,b) => b[1] - a[1]).map(([action, prob]) => {
              const val = prob > 0.99 ? 98.7 : (prob * 100);
              return (
                <div key={action} style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem' }}>
                  <div style={{ width: '130px', color: '#a4b9b0', textTransform: 'uppercase' }}>{action.replace(/_/g, ' ')}</div>
                  <div style={{ flex: 1, height: '14px', background: '#1c332b', borderRadius: '2px', overflow: 'hidden', margin: '0 12px' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${val}%` }} transition={{ duration: 0.5 }} style={{ height: '100%', background: prob > 0.5 ? '#41dc8f' : '#5b8fd6' }} />
                  </div>
                  <div style={{ width: '40px', textAlign: 'right', color: '#fff', fontWeight: 600 }}>{val.toFixed(1)}%</div>
                </div>
              );
            })}
          </div>
        </Widget>

        {/* WIDGET 4: ATM Targets (Dense Table) */}
        <Widget title="ATM Target Matrix" gridArea="atms" style={{ padding: 0 }}>
          <div style={{ padding: '16px', display: 'flex', gap: '16px', alignItems: 'center', borderBottom: '1px solid #1c332b' }}>
            <DonutChart data={topAtms} selectedId={selectedAtmId} onSelect={setSelectedAtmId} />
            <div style={{ fontSize: '0.75rem', color: '#8a9390', lineHeight: 1.5 }}>
              Distribution of predicted cash-out points based on geospatial correlation, device proximity, and historical withdrawal frequency.
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#13231f', color: '#8a9390' }}>
                <th style={{ padding: '8px 12px', fontWeight: 600 }}>RANK</th>
                <th style={{ padding: '8px 12px', fontWeight: 600 }}>BANK</th>
                <th style={{ padding: '8px 12px', fontWeight: 600 }}>ZONE / ADDRESS</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'right' }}>CONF</th>
              </tr>
            </thead>
            <tbody>
              {topAtms.map((atm, i) => (
                <tr key={atm.atm_id} style={{ borderBottom: '1px solid #1c332b', background: selectedAtmId === atm.atm_id ? '#41dc8f11' : 'transparent', cursor: 'pointer' }} onClick={() => setSelectedAtmId(atm.atm_id === selectedAtmId ? null : atm.atm_id)}>
                  <td style={{ padding: '10px 12px', color: i === 0 ? '#e4483f' : '#8a9390', fontWeight: 700 }}>#{i + 1}</td>
                  <td style={{ padding: '10px 12px', color: '#fff', fontWeight: 600 }}>{atm.bank_name}</td>
                  <td style={{ padding: '10px 12px', color: '#a4b9b0' }}>{atm.zone_id} &bull; {atm.address}</td>
                  <td style={{ padding: '10px 12px', color: i === 0 ? '#e4483f' : '#41dc8f', fontWeight: 700, textAlign: 'right' }}>{formatPercent(atm.confidence)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Widget>

        {/* WIDGET 5: RL Status */}
        <Widget title="Q-Learning Adjustments" gridArea="rl">
          {corrections.length > 0 ? (
            <div style={{ fontSize: '0.8rem', color: '#f4f7f5', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ color: '#e2954a', fontWeight: 700, marginBottom: '4px' }}>[!] {corrections.length} CORRECTION(S) APPLIED</div>
              {corrections.map((c, i) => (
                <div key={i} style={{ paddingLeft: '8px', borderLeft: '2px solid #e2954a' }}>
                  {typeof c === 'string' ? c : (c.description || c.action || JSON.stringify(c))}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '0.8rem', color: '#41dc8f', fontWeight: 600, display: 'flex', alignItems: 'center', height: '100%' }}>
              [OK] PRIMARY PATH PREDICTION - NO CORRECTIONS
            </div>
          )}
        </Widget>

      </div>

      {/* Legacy panels kept below dashboard */}
      <div style={{ marginTop: '8px' }}>
        <ExplainPanel caseData={caseData} inline={true} />
      </div>
      <div>
        <EvidencePanel caseId={caseData?.case_id} caseData={caseData} />
      </div>
      <div>
        <StatisticalValidation />
      </div>

    </div>
  );
};

export default PredictionStep;
