import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ACCENT = '#41dc8f';
const WRONG = '#e4483f';

/* ─── Node positions (SVG 780x320 canvas) ─── */
const NODE_A = { x: 100, y: 160, label: 'Node A', sub: 'Distribution Hub' };
const NODE_C = { x: 390, y: 70,  label: 'Node C', sub: 'Layering' };
const NODE_B = { x: 390, y: 250, label: 'Node B', sub: 'Consolidation' };
const NODE_D = { x: 650, y: 250, label: 'SBI ATM', sub: 'Kolkata' };

const NARRATIONS = [
  'Step 1: XGBoost analyses the transaction graph from Node A (Distribution Hub)...',
  'Step 2: XGBoost predicts 87% probability — funds will flow to Node C (Layering).',
  'Step 3: Ground truth arrives via API feed. Funds actually moved to Node B! Contradiction detected.',
  'Step 4: Tabular Q-Learning agent penalises the A\u2192C pair. Q(A, C) = \u22121.0 — will not repeat this.',
  'Step 5: System backtracks to Node A, applies the ground-truth correction. Q(A, B) = +0.8 rewarded.',
  'Step 6: XGBoost re-runs from Node B. New prediction: SBI ATM, Kolkata (71% confidence).',
];

/* ─── SVG node component ─── */
const SvgNode = ({ node, color, glow, label }) => (
  <g>
    {glow && (
      <circle cx={node.x} cy={node.y} r={36} fill={color} opacity={0.12} />
    )}
    <circle cx={node.x} cy={node.y} r={28} fill={color + '22'} stroke={color} strokeWidth={2} />
    <text x={node.x} y={node.y - 2} textAnchor="middle" fill="#fff" fontSize={11} fontWeight={700}>
      {node.label}
    </text>
    <text x={node.x} y={node.y + 13} textAnchor="middle" fill={color} fontSize={9} opacity={0.85}>
      {node.sub}
    </text>
    {label && (
      <text x={node.x} y={node.y - 38} textAnchor="middle" fill={color} fontSize={10} fontWeight={700}>
        {label}
      </text>
    )}
  </g>
);

/* ─── Animated SVG arrow ─── */
const SvgArrow = ({ x1, y1, x2, y2, color, dashed, visible, label }) => {
  if (!visible) return null;
  const dashStr = dashed ? '7 5' : undefined;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2 - 14;

  return (
    <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
      <motion.line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={color}
        strokeWidth={3}
        strokeDasharray={dashStr}
        markerEnd="url(#arrow)"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.9 }}
      />
      {label && (
        <motion.text
          x={mx} y={my}
          textAnchor="middle"
          fill={color}
          fontSize={10}
          fontWeight={700}
          initial={{ opacity: 0, y: my + 6 }}
          animate={{ opacity: 1, y: my }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          {label}
        </motion.text>
      )}
    </motion.g>
  );
};

/* ─── Q-Table Panel ─── */
const QTablePanel = ({ step }) => (
  <AnimatePresence>
    {step >= 3 && (
      <motion.div
        key="qtable"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.4 }}
        style={{
          position: 'absolute', right: 0, top: 0,
          width: 190, background: '#0d1a17',
          border: `1px solid ${step >= 4 ? ACCENT : WRONG}55`,
          borderRadius: 8, padding: '12px 14px', fontSize: '0.78rem',
        }}
      >
        <div style={{ color: '#8a9390', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          Q-Table Update
        </div>
        <div style={{ color: WRONG, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, marginBottom: 6 }}>
          Q(A, C) = -1.0 &darr;
          <span style={{ fontSize: '0.65rem', color: '#8a9390', display: 'block', fontWeight: 400 }}>Penalised — Wrong path</span>
        </div>
        {step >= 4 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{ color: ACCENT, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}
          >
            Q(A, B) = +0.8 &uarr;
            <span style={{ fontSize: '0.65rem', color: '#8a9390', display: 'block', fontWeight: 400 }}>Rewarded — Correct path</span>
          </motion.div>
        )}
      </motion.div>
    )}
  </AnimatePresence>
);

/* ─── Main Modal ─── */
const RLAnimationModal = ({ onClose }) => {
  const [step, setStep] = useState(0);
  const timersRef = React.useRef([]);

  const startAnimation = useCallback(() => {
    // Clear any existing timers
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    const schedule = [
      [1500, 1],
      [4000, 2],
      [6500, 3],
      [9000, 4],
      [12000, 5],
    ];

    schedule.forEach(([delay, s]) => {
      const t = setTimeout(() => setStep(s), delay);
      timersRef.current.push(t);
    });
  }, []);

  useEffect(() => {
    startAnimation();
    return () => timersRef.current.forEach(clearTimeout);
  }, [startAnimation]);

  const handleReplay = () => {
    setStep(0);
    // Small delay so reset renders first
    setTimeout(startAnimation, 50);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
      zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'IBM Plex Sans, Inter, sans-serif',
    }}>
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ duration: 0.25 }}
        style={{
          background: '#0d1a17',
          border: '1px solid rgba(65,220,143,0.25)',
          borderRadius: 14,
          width: 860,
          maxWidth: '96vw',
          padding: '28px 28px 20px',
          position: 'relative',
          boxShadow: '0 0 60px rgba(65,220,143,0.06)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ color: ACCENT, fontSize: '0.72rem', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>
              Reinforcement Learning
            </div>
            <h2 style={{ margin: 0, color: '#fff', fontSize: '1.25rem', fontWeight: 800 }}>
              RL Backtracking &amp; Correction Demo
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff', width: 34, height: 34, borderRadius: 8,
              cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            &#x2715;
          </button>
        </div>

        {/* SVG Network */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <svg width="100%" viewBox="0 0 780 330" style={{ display: 'block', overflow: 'visible' }}>
            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill="currentColor" />
              </marker>
            </defs>

            {/* Always: Node A */}
            <SvgNode node={NODE_A} color={ACCENT} glow={true} />

            {/* Step 1+: Node C + arrow A→C */}
            <AnimatePresence>
              {step >= 1 && (
                <motion.g key="nodeC" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <SvgNode node={NODE_C} color={step >= 2 ? WRONG : ACCENT} label={step === 1 ? 'XGBoost: 87%' : undefined} />
                </motion.g>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {step >= 1 && (
                <SvgArrow
                  key="arrowAC"
                  x1={NODE_A.x + 28} y1={NODE_A.y - 8}
                  x2={NODE_C.x - 28} y2={NODE_C.y + 8}
                  color={step >= 2 ? WRONG : ACCENT}
                  dashed={step >= 2}
                  visible={true}
                  label={step === 1 ? 'XGBoost Predicts: 87%' : undefined}
                />
              )}
            </AnimatePresence>

            {/* Step 2+: Wrong badge */}
            <AnimatePresence>
              {step >= 2 && (
                <motion.g
                  key="wrongBadge"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  style={{ transformOrigin: '245px 20px' }}
                >
                  <rect x={130} y={8} width={280} height={28} rx={14} fill={WRONG} />
                  <text x={270} y={27} textAnchor="middle" fill="#fff" fontSize={11} fontWeight={700}>
                    WRONG PREDICTION — Ground Truth: A&#x2192;B
                  </text>
                </motion.g>
              )}
            </AnimatePresence>

            {/* Step 4+: Node B + corrected arrow */}
            <AnimatePresence>
              {step >= 4 && (
                <motion.g key="nodeB" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <SvgNode node={NODE_B} color={ACCENT} glow={true} label="Backtracked &amp; Corrected" />
                </motion.g>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {step >= 4 && (
                <SvgArrow
                  key="arrowAB"
                  x1={NODE_A.x + 28} y1={NODE_A.y + 8}
                  x2={NODE_B.x - 28} y2={NODE_B.y - 8}
                  color={ACCENT}
                  dashed={false}
                  visible={true}
                  label="Q(A,B) = +0.8"
                />
              )}
            </AnimatePresence>

            {/* Step 5+: New ATM prediction from B */}
            <AnimatePresence>
              {step >= 5 && (
                <motion.g key="nodeD" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <SvgNode node={NODE_D} color="#5b8fd6" label="71% — New Prediction" />
                </motion.g>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {step >= 5 && (
                <SvgArrow
                  key="arrowBD"
                  x1={NODE_B.x + 28} y1={NODE_B.y}
                  x2={NODE_D.x - 28} y2={NODE_D.y}
                  color="#5b8fd6"
                  dashed={false}
                  visible={true}
                  label="New ATM Prediction: 71%"
                />
              )}
            </AnimatePresence>
          </svg>

          {/* Q-Table Panel (absolute top-right of svg area) */}
          <div style={{ position: 'absolute', top: 0, right: 0 }}>
            <QTablePanel step={step} />
          </div>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 12 }}>
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              style={{
                width: 28, height: 4, borderRadius: 2,
                background: step >= i ? ACCENT : 'rgba(255,255,255,0.12)',
                transition: 'background 0.3s',
              }}
            />
          ))}
        </div>

        {/* Narration bar */}
        <div style={{
          background: 'var(--bg-surface, #0a110f)',
          border: '1px solid rgba(65,220,143,0.15)',
          borderRadius: 8, padding: '12px 16px',
          minHeight: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              style={{ color: '#c8d4cf', fontSize: '0.88rem', flex: 1 }}
            >
              {NARRATIONS[step]}
            </motion.div>
          </AnimatePresence>
          <button
            onClick={handleReplay}
            style={{
              background: 'rgba(65,220,143,0.1)', border: '1px solid rgba(65,220,143,0.3)',
              color: ACCENT, padding: '6px 14px', borderRadius: 6, cursor: 'pointer',
              fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            &#x21BA; Replay
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default RLAnimationModal;
