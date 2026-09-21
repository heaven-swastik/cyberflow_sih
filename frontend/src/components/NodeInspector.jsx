import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { formatINR } from '../utils/format';

function MiniGraph({ centerNode, edges, nodes }) {
  const neighbors = useMemo(() => {
    const connectedEdges = edges.filter(e => {
      const srcId = typeof e.source === 'object' ? e.source.id : e.source;
      const tgtId = typeof e.target === 'object' ? e.target.id : e.target;
      return srcId === centerNode.id || tgtId === centerNode.id;
    });

    const neighborIds = new Set();
    connectedEdges.forEach(e => {
      const srcId = typeof e.source === 'object' ? e.source.id : e.source;
      const tgtId = typeof e.target === 'object' ? e.target.id : e.target;
      neighborIds.add(srcId);
      neighborIds.add(tgtId);
    });

    return nodes.filter(n => neighborIds.has(n.id));
  }, [centerNode, edges, nodes]);

  // Simple SVG layout: center node in middle, others in a circle
  const cx = 150;
  const cy = 100;
  const r = 60;
  
  const others = neighbors.filter(n => n.id !== centerNode.id);
  const placedOthers = others.map((n, i) => {
    const angle = (i / others.length) * 2 * Math.PI - Math.PI / 2;
    return {
      ...n,
      cx: cx + r * Math.cos(angle),
      cy: cy + r * Math.sin(angle)
    };
  });

  const allPlaced = [{...centerNode, cx, cy}, ...placedOthers];

  const lines = [];
  edges.forEach(e => {
    const srcId = typeof e.source === 'object' ? e.source.id : e.source;
    const tgtId = typeof e.target === 'object' ? e.target.id : e.target;
    
    const s = allPlaced.find(n => n.id === srcId);
    const t = allPlaced.find(n => n.id === tgtId);
    if (s && t && (srcId === centerNode.id || tgtId === centerNode.id)) {
      lines.push({ x1: s.cx, y1: s.cy, x2: t.cx, y2: t.cy, key: `${srcId}-${tgtId}` });
    }
  });

  const getColor = (type) => {
    const colors = {
      complaint: '#5b8fd6',
      victim: '#e4483f',
      account: '#8a9390',
      merchant: '#d4b02a',
      device: '#5b8fd6',
      atm: '#e2954a',
      zone: '#8a9390',
    };
    return colors[type] || '#8a9390';
  };

  return (
    <div className="node-drawer-minigraph">
      <div className="node-drawer-minigraph-title">1-Hop Neighborhood</div>
      <svg width="100%" height="200" viewBox="0 0 300 200">
        {lines.map((l, i) => (
          <line key={l.key + i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="rgba(65, 220, 143, 0.20)" strokeWidth="2" />
        ))}
        {allPlaced.map(n => (
          <g key={n.id}>
            <circle cx={n.cx} cy={n.cy} r={n.id === centerNode.id ? 8 : 5} fill={getColor(n.type)} />
            <text x={n.cx} y={n.cy + 15} fill="#8a9390" fontSize="10" textAnchor="middle">{n.label || n.id}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function NodeInspector({ node, graphData, onClose, onFreeze, onFlag }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!node) return null;

  const edges = graphData?.edges || [];
  const nodes = graphData?.nodes || [];

  const renderContent = () => {
    if (['account', 'victim', 'merchant'].includes(node.type)) {
      const incomingEdges = edges.filter(e => {
        const tgtId = typeof e.target === 'object' ? e.target.id : e.target;
        return tgtId === node.id;
      });
      const outgoingEdges = edges.filter(e => {
        const srcId = typeof e.source === 'object' ? e.source.id : e.source;
        return srcId === node.id;
      });

      const totalInflow = incomingEdges.reduce((sum, e) => sum + (e.amount || 0), 0);
      const totalOutflow = outgoingEdges.reduce((sum, e) => sum + (e.amount || 0), 0);
      const netFlow = totalInflow - totalOutflow;

      const connectedAccounts = new Set();
      incomingEdges.forEach(e => connectedAccounts.add(typeof e.source === 'object' ? e.source.id : e.source));
      outgoingEdges.forEach(e => connectedAccounts.add(typeof e.target === 'object' ? e.target.id : e.target));

      const banks = ['HDFC', 'SBI', 'ICICI', 'Axis', 'PNB', 'Kotak'];
      const bankHash = node.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      let bankName = banks[bankHash % banks.length];
      if (node.label && node.label.includes('Bank')) bankName = node.label;

      const isSink = outgoingEdges.length === 0 && incomingEdges.length > 0;
      const highFanIn = incomingEdges.length >= 3;

      let typeBadge = node.type;
      if (node.type === 'account') {
        if (isSink) typeBadge = 'terminal';
        else if (highFanIn && outgoingEdges.length > 0) typeBadge = 'hub';
        else typeBadge = 'mule';
      }

      const allRelatedEdges = [...incomingEdges, ...outgoingEdges].sort((a, b) => (b.amount || 0) - (a.amount || 0));

      return (
        <>
          <div className="node-drawer-section">
            <div className="node-drawer-row">
              <span className="node-drawer-label">ID</span>
              <span className="node-drawer-value monospace">{node.id}</span>
            </div>
            <div className="node-drawer-row">
              <span className="node-drawer-label">Classification</span>
              <span className="node-drawer-badge">{typeBadge.toUpperCase()}</span>
            </div>
            <div className="node-drawer-row">
              <span className="node-drawer-label">Bank Name</span>
              <span className="node-drawer-value">{bankName}</span>
            </div>
            <div className="node-drawer-row">
              <span className="node-drawer-label">KYC Status</span>
              <span className="node-drawer-value warning">KYC: Pending Verification</span>
            </div>
          </div>

          {(isSink || highFanIn) && (
            <div className="node-drawer-warning-box">
              {isSink ? '⚠️ Suspicious Sink Node Detected' : '⚠️ High Fan-In Account (Hub)'}
            </div>
          )}

          <div className="node-drawer-section">
            <div className="node-drawer-row">
              <span className="node-drawer-label">Total Inflow</span>
              <span className="node-drawer-value text-green">{formatINR(totalInflow)}</span>
            </div>
            <div className="node-drawer-row">
              <span className="node-drawer-label">Total Outflow</span>
              <span className="node-drawer-value text-red">{formatINR(totalOutflow)}</span>
            </div>
            <div className="node-drawer-row">
              <span className="node-drawer-label">Net Flow</span>
              <span className="node-drawer-value">{formatINR(netFlow)}</span>
            </div>
            <div className="node-drawer-row">
              <span className="node-drawer-label">Connected Accounts</span>
              <span className="node-drawer-value">{connectedAccounts.size}</span>
            </div>
          </div>

          <div className="node-drawer-section">
            <div className="node-drawer-subtitle">Transaction History</div>
            <div className="node-drawer-table-wrapper">
              <table className="node-drawer-table">
                <thead>
                  <tr>
                    <th>From → To</th>
                    <th>Amount</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {allRelatedEdges.slice(0, 10).map((e, i) => {
                    const src = typeof e.source === 'object' ? e.source.id : e.source;
                    const tgt = typeof e.target === 'object' ? e.target.id : e.target;
                    return (
                      <tr key={i}>
                        <td className="monospace" title={`${src} → ${tgt}`}>
                          {src.slice(0, 4)}... → {tgt.slice(0, 4)}...
                        </td>
                        <td>{formatINR(e.amount)}</td>
                        <td>{e.timestamp || 'Just now'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {node.type !== 'victim' && (
            <div className="node-drawer-actions">
              <button className="node-drawer-btn freeze" onClick={() => onFreeze(node.id)}>🧊 Freeze Account</button>
              <button className="node-drawer-btn flag" onClick={() => onFlag(node.id)}>🚩 Flag to Bank</button>
            </div>
          )}
        </>
      );
    } else if (node.type === 'complaint') {
      return (
        <div className="node-drawer-section">
          <div className="node-drawer-row">
            <span className="node-drawer-label">Case ID</span>
            <span className="node-drawer-value monospace">{node.id}</span>
          </div>
          <div className="node-drawer-row">
            <span className="node-drawer-label">Filed Date</span>
            <span className="node-drawer-value">{node.date || '2026-09-21'}</span>
          </div>
          <div className="node-drawer-row">
            <span className="node-drawer-label">Fraud Type</span>
            <span className="node-drawer-value">{node.fraudType || 'UPI Fraud'}</span>
          </div>
          <div className="node-drawer-row">
            <span className="node-drawer-label">Status</span>
            <span className="node-drawer-badge">ACTIVE</span>
          </div>
          <div className="node-drawer-desc">
            {node.description || 'Victim reported unauthorized transfer of funds following a suspicious SMS link click.'}
          </div>
        </div>
      );
    } else if (node.type === 'device') {
      return (
        <div className="node-drawer-section">
          <div className="node-drawer-row">
            <span className="node-drawer-label">Device ID</span>
            <span className="node-drawer-value monospace">{node.id}</span>
          </div>
          <div className="node-drawer-row">
            <span className="node-drawer-label">Last Seen Zone</span>
            <span className="node-drawer-value">{node.zone || 'Zone 4'}</span>
          </div>
          <div className="node-drawer-row">
            <span className="node-drawer-label">Minutes Ago</span>
            <span className="node-drawer-value">{node.minutesAgo || '14 min'}</span>
          </div>
        </div>
      );
    } else if (node.type === 'atm') {
      const conf = node.confidence || 92;
      return (
        <div className="node-drawer-section">
          <div className="node-drawer-row">
            <span className="node-drawer-label">ATM ID</span>
            <span className="node-drawer-value monospace">{node.id}</span>
          </div>
          <div className="node-drawer-row">
            <span className="node-drawer-label">Bank Name</span>
            <span className="node-drawer-value">{node.bank || 'HDFC Bank'}</span>
          </div>
          <div className="node-drawer-row">
            <span className="node-drawer-label">Address / City</span>
            <span className="node-drawer-value">{node.address || 'Koramangala, Bengaluru'}</span>
          </div>
          <div className="node-drawer-conf-box">
            <div className="node-drawer-conf-label">
              <span>Prediction Confidence</span>
              <span>{conf}%</span>
            </div>
            <div className="node-drawer-conf-bar">
              <div className="node-drawer-conf-fill" style={{ width: `${conf}%` }}></div>
            </div>
          </div>
          <div className="node-drawer-subtitle mt-4">Reasoning Factors</div>
          <ul className="node-drawer-factors">
            <li>High zone confidence (Device proximity)</li>
            <li>Historical withdrawal patterns match</li>
            <li>Multiple mule accounts geolocated nearby</li>
          </ul>
        </div>
      );
    }
    return null;
  };

  const getEmoji = (type) => {
    switch (type) {
      case 'complaint': return '📄';
      case 'victim': return '👤';
      case 'account': return '🏦';
      case 'merchant': return '🏪';
      case 'device': return '📱';
      case 'atm': return '🏧';
      case 'zone': return '📍';
      default: return '🔘';
    }
  };

  return (
    <motion.div 
      className="node-drawer"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
    >
      <div className="node-drawer-header">
        <div className="node-drawer-title">
          <span className="node-drawer-emoji">{getEmoji(node.type)}</span>
          <span className="node-drawer-node-label">{node.label || node.type.toUpperCase()}</span>
        </div>
        <button className="node-drawer-close" onClick={onClose}>×</button>
      </div>
      <div className="node-drawer-body">
        {renderContent()}
      </div>
      <div className="node-drawer-footer">
        <MiniGraph centerNode={node} edges={edges} nodes={nodes} />
      </div>
    </motion.div>
  );
}
