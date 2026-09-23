import { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import CountUp from './reactbits/CountUp';

/**
 * A single KPI tile on the landing page's overview bar.
 * Extracted from OverviewBar so the cursor-tracked spotlight glow
 * (a ref + one mousemove handler) is one hook-call-per-card-instance,
 * which is the safe way to do it under React's rules of hooks.
 */
export default function KpiCard({ tile, value, index }) {
  const ref = useRef(null);

  const handleMouseMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--rb-x', `${e.clientX - rect.left}px`);
    el.style.setProperty('--rb-y', `${e.clientY - rect.top}px`);
  }, []);

  const formatter = tile.formatter || ((n) => String(n).padStart(2, '0'));

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      className={`kpi-card rb-spotlight ${tile.className}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="kpi-icon">{tile.icon}</div>
      <div className="kpi-value">
        <CountUp value={value ?? 0} format={formatter} />
      </div>
      <div className="kpi-label">{tile.label}</div>
      <div className="kpi-sub">{tile.sub}</div>
    </motion.div>
  );
}
