import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { forceCollide } from 'd3-force-3d';
import { AnimatePresence } from 'framer-motion';
import { getGraph } from '../api';
import NodeInspector from './NodeInspector';
import { formatINR } from '../utils/format';

const NODE_COLORS = {
  complaint: '#5b8fd6',   // blue — where the case enters the system
  victim: '#e4483f',      // red — harm/loss
  account: '#8a9390',     // neutral grey — the mule-account layer, deliberately unremarkable
  merchant: '#d4b02a',    // yellow — third-party gateway, distinct from the crime path itself
  device: '#5b8fd6',      // same family as complaint — both are "identity" evidence
  atm: '#e2954a',         // accent amber — this is the answer the whole system is pointing at
  zone: '#8a9390',
};

const NODE_SIZES = {
  victim: 8,
  account: 6,
  merchant: 7,
  zone: 9,
  complaint: 9,
  device: 6,
  atm: 8,
};

const LEGEND = [
  { type: 'complaint', label: 'Complaint', color: NODE_COLORS.complaint },
  { type: 'victim', label: 'Victim', color: NODE_COLORS.victim },
  { type: 'account', label: 'Account', color: NODE_COLORS.account },
  { type: 'merchant', label: 'Gateway', color: NODE_COLORS.merchant },
  { type: 'device', label: 'Device', color: NODE_COLORS.device },
  { type: 'atm', label: 'Predicted ATM', color: NODE_COLORS.atm },
  { type: 'zone', label: 'Zone', color: NODE_COLORS.zone },
];

// Lightens a #rrggbb hex color toward white by `amt` (0-1) — used to give
// each graph node a subtle spherical highlight instead of a flat fill.
function lighten(hex, amt) {
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const mix = (c) => Math.round(c + (255 - c) * amt);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

export default function CrimeGraph({ caseId, timelineStep, maxStep, currentState }) {
  const [graphData, setGraphData] = useState(null);
  const containerRef = useRef(null);
  const fgRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 });

  const [selectedNode, setSelectedNode] = useState(null);
  const [hoverNode, setHoverNode] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [frozenNodes, setFrozenNodes] = useState(new Set());
  const [toastMessage, setToastMessage] = useState(null);
  const hasAutoFitRef = useRef(false);

  const nodeFirstSeenRef = useRef({});
  const [invalidatedNodes, setInvalidatedNodes] = useState(new Set());
  const prevTimelineStepRef = useRef(timelineStep);
  const prevVisibleNodesRef = useRef(new Set());

  const [, forceRender] = useState(0);
  useEffect(() => {
    let raf;
    const tick = () => { forceRender(n => n + 1); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!caseId) return;
    setInvalidatedNodes(new Set());
    nodeFirstSeenRef.current = {};
    getGraph(caseId).then(setGraphData);
  }, [caseId]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!graphData) return;
    const step = timelineStep ?? maxStep ?? 999;
    const visibleEdges = graphData.edges.filter((e) => (e.step || 1) <= step);
    const visibleNodeIds = new Set();
    visibleEdges.forEach((e) => {
      visibleNodeIds.add(e.source.id || e.source);
      visibleNodeIds.add(e.target.id || e.target);
    });
    if (visibleNodeIds.size === 0 && graphData.nodes.length > 0) {
      visibleNodeIds.add(graphData.nodes[0].id);
    }

    if (timelineStep < prevTimelineStepRef.current) {
      const newInvalidated = new Set(invalidatedNodes);
      prevVisibleNodesRef.current.forEach(id => {
        if (!visibleNodeIds.has(id)) {
          newInvalidated.add(id);
        }
      });
      setInvalidatedNodes(newInvalidated);
    }
    prevTimelineStepRef.current = timelineStep;
    prevVisibleNodesRef.current = visibleNodeIds;
  }, [timelineStep, graphData, maxStep, invalidatedNodes]);

  // Filter graph based on timeline step
  const filteredData = useMemo(() => {
    if (!graphData) return { nodes: [], links: [] };

    const step = timelineStep ?? maxStep ?? 999;
    const visibleEdges = graphData.edges.filter((e) => (e.step || 1) <= step);
    const visibleNodeIds = new Set();
    visibleEdges.forEach((e) => {
      visibleNodeIds.add(e.source.id || e.source);
      visibleNodeIds.add(e.target.id || e.target);
    });

    // Always show at least the first node
    if (visibleNodeIds.size === 0 && graphData.nodes.length > 0) {
      visibleNodeIds.add(graphData.nodes[0].id);
    }

    const nodesToRenderIds = new Set([...visibleNodeIds, ...invalidatedNodes]);

    const nodes = graphData.nodes
      .filter((n) => nodesToRenderIds.has(n.id))
      .map((n) => ({ ...n }));

    const nowTs = Date.now();
    nodes.forEach(n => {
      if (visibleNodeIds.has(n.id) && !nodeFirstSeenRef.current[n.id]) {
        nodeFirstSeenRef.current[n.id] = nowTs;
      }
    });

    const links = graphData.edges
      .filter(e => nodesToRenderIds.has(e.source.id || e.source) && nodesToRenderIds.has(e.target.id || e.target))
      .filter(e => nodeFirstSeenRef.current[e.source.id || e.source] && nodeFirstSeenRef.current[e.target.id || e.target])
      .map((e) => ({
        source: e.source,
        target: e.target,
        amount: e.amount,
        step: e.step,
      }));

    return { nodes, links };
  }, [graphData, timelineStep, maxStep, invalidatedNodes]);

  // Strengthen repulsion and add an explicit collision force so sibling
  // nodes remain readable at each left-to-right rank.
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg || filteredData.nodes.length === 0) return;
    hasAutoFitRef.current = false;
    fg.d3Force('charge')?.strength(-260).distanceMax(420);
    fg.d3Force('link')?.distance(90);
    fg.d3Force('collide', forceCollide(34));
    fg.d3ReheatSimulation();
  }, [filteredData]);


  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
  }, []);

  const handleNodeHover = useCallback((node) => {
    if (node) {
      setHoverNode(node);
    } else {
      setHoverNode(null);
    }
  }, []);
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      setTooltipPos({ x: e.clientX, y: e.clientY });
    };
    if (hoverNode) {
      window.addEventListener('mousemove', handleMouseMove);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [hoverNode]);

  const handleFreeze = useCallback((nodeId) => {
    setFrozenNodes(prev => {
      const next = new Set(prev);
      next.add(nodeId);
      return next;
    });
    setToastMessage(`Account ${nodeId} freeze request submitted`);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const handleFlag = useCallback((nodeId) => {
    setToastMessage(`Account ${nodeId} flag request submitted`);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;

    const firstSeen = nodeFirstSeenRef.current[node.id] || Date.now();
    const age = Date.now() - firstSeen;
    const opacity = Math.min(1, age / 600); // fade in over 600ms

    ctx.save();
    ctx.globalAlpha = opacity;

    const isInvalidated = invalidatedNodes.has(node.id);
    const size = NODE_SIZES[node.type] || 6;
    let color = NODE_COLORS[node.type] || '#94a3b8';
    
    if (isInvalidated) {
      color = '#4a2020';
    }

    const isFrozen = frozenNodes.has(node.id);
    const drawColor = isFrozen ? '#e4483f' : color;
    const time = Date.now() / 1000;
    
    // Outer pulsing ring for interactive nodes
    const pulseSpeed = isInvalidated ? 6 : 3;
    const pulseFactor = (Math.sin(time * pulseSpeed) + 1) / 2; // 0 to 1
    const pulseRadius = size + 2 + (pulseFactor * 4);
    
    ctx.beginPath();
    ctx.arc(node.x, node.y, pulseRadius, 0, 2 * Math.PI);
    if (isInvalidated) {
      ctx.fillStyle = `#e4483f${Math.floor(40 * (1 - pulseFactor)).toString(16).padStart(2, '0')}`;
    } else {
      ctx.fillStyle = `${drawColor}${Math.floor(40 * (1 - pulseFactor)).toString(16).padStart(2, '0')}`;
    }
    ctx.fill();

    let drawColorFilled = false;
    try {
      if (!isInvalidated) {
        // Outer glow halo — gives each node a "signal" feel rather than a flat dot
        const glowRadius = Number(size * 2.6);
        if (glowRadius > 0 && Number.isFinite(glowRadius)) {
          const glow = ctx.createRadialGradient(Number(node.x), Number(node.y), 0, Number(node.x), Number(node.y), glowRadius);
          glow.addColorStop(0, `${drawColor}55`);
          glow.addColorStop(1, `${drawColor}00`);
          ctx.beginPath();
          ctx.fillStyle = glow;
          ctx.arc(node.x, node.y, glowRadius, 0, 2 * Math.PI);
          ctx.fill();
        }

        // Core circle with a subtle radial shade for depth (flat -> spherical)
        const r0 = Number(size * 0.15);
        const r1 = Number(size);
        if (r0 >= 0 && r1 >= 0 && Number.isFinite(r0) && Number.isFinite(r1)) {
          const core = ctx.createRadialGradient(
            Number(node.x - size * 0.35), Number(node.y - size * 0.35), r0,
            Number(node.x), Number(node.y), r1
          );
          core.addColorStop(0, lighten(drawColor, 0.35));
          core.addColorStop(1, drawColor);

          ctx.beginPath();
          ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
          ctx.fillStyle = core;
          ctx.fill();
          drawColorFilled = true;
        }
      }
    } catch (e) {
      console.warn("Gradient error:", e, node);
    }
    
    if (!drawColorFilled) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
      ctx.fillStyle = drawColor;
      ctx.fill();
    }

    // Crisp border
    ctx.strokeStyle = isFrozen ? '#ffffff' : (isInvalidated ? '#e4483f' : `${drawColor}99`);
    ctx.lineWidth = isFrozen ? 2 : 1.4;
    ctx.stroke();

    if (isFrozen || isInvalidated) {
      ctx.beginPath();
      ctx.moveTo(node.x - size, node.y - size);
      ctx.lineTo(node.x + size, node.y + size);
      ctx.moveTo(node.x - size, node.y + size);
      ctx.lineTo(node.x + size, node.y - size);
      ctx.strokeStyle = '#e4483f';
      ctx.lineWidth = 2 / globalScale;
      ctx.stroke();
    }

    // Label — pill-style chip with a colored accent tick, not just a text box
    if (globalScale > 0.6) {
      const fontSize = Math.max(10 / globalScale, 3.5);
      ctx.font = `600 ${fontSize}px IBM Plex Sans, sans-serif`;
      const label = node.label || node.id;

      const textWidth = ctx.measureText(label).width;
      const padX = 7;
      const chipW = textWidth + padX * 2;
      const chipH = fontSize + 7;
      const chipX = node.x - chipW / 2;
      const chipY = node.y + size + 3;
      const radius = chipH / 2;

      ctx.beginPath();
      ctx.moveTo(chipX + radius, chipY);
      ctx.arcTo(chipX + chipW, chipY, chipX + chipW, chipY + chipH, radius);
      ctx.arcTo(chipX + chipW, chipY + chipH, chipX, chipY + chipH, radius);
      ctx.arcTo(chipX, chipY + chipH, chipX, chipY, radius);
      ctx.arcTo(chipX, chipY, chipX + chipW, chipY, radius);
      ctx.closePath();
      ctx.fillStyle = 'rgba(8, 14, 12, 0.86)';
      ctx.fill();
      ctx.strokeStyle = `${drawColor}55`;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#f4f7f5';
      const textY = chipY + chipH / 2 + 0.5;
      ctx.fillText(label, node.x, textY);
      
      if (isInvalidated) {
         ctx.beginPath();
         ctx.moveTo(chipX + padX - 2, textY);
         ctx.lineTo(chipX + chipW - padX + 2, textY);
         ctx.strokeStyle = '#e4483f';
         ctx.lineWidth = 1.5 / globalScale;
         ctx.stroke();
      }
    }
    
    ctx.restore();
  }, [frozenNodes, invalidatedNodes]);

  const linkCanvasObject = useCallback((link, ctx) => {
    const start = link.source;
    const end = link.target;
    if (!Number.isFinite(start.x) || !Number.isFinite(start.y) ||
        !Number.isFinite(end.x) || !Number.isFinite(end.y)) return;

    const isFrozen = frozenNodes.has(start.id) || frozenNodes.has(end.id);
    const isInvalidated = invalidatedNodes.has(start.id) || invalidatedNodes.has(end.id);
    
    const sourceColor = NODE_COLORS[start.type] || '#8a9390';

    ctx.save();

    if (isInvalidated) {
      ctx.setLineDash([5, 4]);
      ctx.lineDashOffset = -(Date.now() / 100) % 20;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.strokeStyle = 'rgba(228, 72, 63, 0.7)'; // red
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      // Check if it's a NEW path edge (corrected branch)
      // We can assume an edge is a new branch if its step is greater than prevTimelineStep
      const isNewBranch = link.step > prevTimelineStepRef.current && prevTimelineStepRef.current > 1;

      const grad = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
      if (isFrozen) {
        grad.addColorStop(0, 'rgba(239, 68, 68, 0.55)');
        grad.addColorStop(1, 'rgba(239, 68, 68, 0.15)');
      } else {
        grad.addColorStop(0, `${sourceColor}66`);
        grad.addColorStop(1, 'rgba(255, 255, 255, 0.08)');
      }

      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      if (isNewBranch) {
        ctx.strokeStyle = 'rgba(65, 220, 143, 0.9)'; // bright accent green
        ctx.lineWidth = 2;
      } else {
        ctx.strokeStyle = grad;
        ctx.lineWidth = isFrozen ? 1.6 : 1.3;
      }
      ctx.stroke();

      // Arrow
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;
      
      let arrowLen = 5;
      let arrowStroke = isFrozen ? 'rgba(239, 68, 68, 0.7)' : `${sourceColor}88`;
      let arrowX = midX;
      let arrowY = midY;
      
      if (isNewBranch) {
         // Animated moving arrow
         const progress = (Date.now() / 1500) % 1;
         arrowX = start.x + (end.x - start.x) * progress;
         arrowY = start.y + (end.y - start.y) * progress;
         arrowLen = 8;
         arrowStroke = 'rgba(65, 220, 143, 0.9)';
      }

      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(
        arrowX - arrowLen * Math.cos(angle - Math.PI / 6),
        arrowY - arrowLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(
        arrowX - arrowLen * Math.cos(angle + Math.PI / 6),
        arrowY - arrowLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.strokeStyle = arrowStroke;
      ctx.lineWidth = isNewBranch ? 2 : 1.4;
      ctx.stroke();
    }
    
    ctx.restore();
  }, [frozenNodes, invalidatedNodes]);

  const getTooltipContent = () => {
    if (!hoverNode) return null;
    let metric = '';
    if (['account', 'victim', 'merchant'].includes(hoverNode.type) && graphData) {
      const outgoingEdges = graphData.edges.filter(e => {
        const srcId = typeof e.source === 'object' ? e.source.id : e.source;
        return srcId === hoverNode.id;
      });
      const totalOutflow = outgoingEdges.reduce((sum, e) => sum + (e.amount || 0), 0);
      metric = ` — ${formatINR(totalOutflow)} outflow`;
    }
    return `${hoverNode.label || hoverNode.type.toUpperCase()}${metric}`;
  };

  return (
    <div className="graph-workspace" ref={containerRef}>
      {filteredData.nodes.length > 0 && (
        <ForceGraph2D
          ref={fgRef}
          graphData={filteredData}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor="transparent"
          nodeCanvasObject={nodeCanvasObject}
          linkCanvasObject={linkCanvasObject}
          nodeRelSize={6}
          dagMode="lr"
          dagLevelDistance={150}
          cooldownTicks={150}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.4}
          enableZoomInteraction={true}
          enablePanInteraction={true}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          onEngineStop={() => {
            if (hasAutoFitRef.current) return;
            hasAutoFitRef.current = true;
            fgRef.current?.zoomToFit(450, 64);
          }}
        />
      )}

      {hoverNode && !selectedNode && (
        <div 
          className="graph-tooltip" 
          style={{ left: tooltipPos.x + 10, top: tooltipPos.y + 10 }}
        >
          {getTooltipContent()}
        </div>
      )}

      <AnimatePresence>
        {selectedNode && (
          <NodeInspector
            node={selectedNode}
            graphData={graphData}
            bounds={dimensions}
            onClose={() => setSelectedNode(null)}
            onFreeze={handleFreeze}
            onFlag={handleFlag}
          />
        )}
      </AnimatePresence>

      {toastMessage && (
        <div className="graph-toast">{toastMessage}</div>
      )}

      {/* Entity-chain caption — this graph IS the relational schema, rendered */}
      <div className="graph-schema-caption">
        <span className="graph-schema-caption-path">
          Complaint → Account → Transaction → Device → ATM
        </span>
        <span className="graph-schema-caption-hint">Click a node for its record</span>
      </div>

      {/* Legend */}
      <div className="graph-legend">
        {LEGEND.map((item) => (
          <div key={item.type} className="legend-item">
            <span className="legend-dot" style={{ background: item.color, color: item.color }} />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}



