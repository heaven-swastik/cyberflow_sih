import { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  stateLabel,
  stateColor,
  fraudTypeLabel,
  formatINR,
  formatPercent,
  nextActionLabel,
} from '../utils/format';

/**
 * A single case card on the landing page's "Active Investigations"
 * grid. Extracted from CaseList so the spotlight glow's ref/handler
 * lives one-per-card (see KpiCard.jsx for the same pattern). Content
 * and classNames are unchanged from the original inline version —
 * only the outer element gained a ref, a mousemove handler, and the
 * `rb-spotlight` class.
 */
export default function InvestigationCard({ caseItem: c, index, onSelect }) {
  const ref = useRef(null);

  const handleMouseMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--rb-x', `${e.clientX - rect.left}px`);
    el.style.setProperty('--rb-y', `${e.clientY - rect.top}px`);
  }, []);

  const predicted = c.next_action?.predicted;
  const probability = c.next_action?.probabilities?.[predicted];
  const etaRange = c.expected_time_window_minutes;

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      className="investigation-card rb-spotlight"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.1 + index * 0.08,
        duration: 0.45,
        ease: [0.16, 1, 0.3, 1],
      }}
      layoutId={`case-card-${c.case_id}`}
    >
      <div className="inv-card-header">
        <div className="inv-case-id" style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
          {c.case_id}
          {c.case_id === 'CF-1042' && <span style={{fontSize: '0.65rem', background: '#e4483f22', color: '#e4483f', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e4483f55'}}>RL DEMO</span>}
        </div>
      </div>
      <div className="inv-fraud-type">{fraudTypeLabel(c.fraud_type)}</div>

      <div className="inv-badges">
        <span
          className="badge badge-state"
          style={{
            color: stateColor(c.current_state),
            borderColor: `${stateColor(c.current_state)}33`,
          }}
        >
          {stateLabel(c.current_state)}
        </span>
        <span className={`badge badge-priority-${c.intervention_priority}`}>
          {c.intervention_priority}
        </span>
      </div>

      <div className="inv-metrics">
        <div className="inv-metric">
          <span>{formatINR(c.potential_exposure_inr)} potential exposure</span>
        </div>
        {predicted && probability != null && (
          <div className="inv-metric">
            <span>
              {nextActionLabel(predicted)} predicted ·{' '}
              <span className="inv-metric-value">{formatPercent(probability)}</span>
            </span>
          </div>
        )}
        {etaRange && (
          <div className="inv-metric">
            <span>
              Expected in{' '}
              <span className="inv-metric-value">
                {etaRange[0]}–{etaRange[1]} min
              </span>
            </span>
          </div>
        )}
      </div>

      <button className="inv-open-btn" onClick={() => onSelect(c.case_id)}>
        Open Investigation →
      </button>
    </motion.div>
  );
}
