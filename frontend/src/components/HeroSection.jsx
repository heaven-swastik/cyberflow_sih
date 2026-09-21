import { motion } from 'framer-motion';
import Aurora from './reactbits/Aurora';
import Magnet from './reactbits/Magnet';
import ShinyText from './reactbits/ShinyText';
import CountUp from './reactbits/CountUp';

const PILLARS = [
  {
    icon: '⏱',
    title: 'Predicts, doesn\'t just log',
    detail: 'Flags the next move — collection → layering → cash-out — before the withdrawal, not after the FIR.',
  },
  {
    icon: '🧬',
    title: 'Shows its work, every time',
    detail: 'No black box. Every score ships with the exact features and statistical proof behind it.',
  },
  {
    icon: '📍',
    title: 'Ends at a real, ranked ATM',
    detail: 'Not "somewhere in the city" — a specific, explainable shortlist a team can actually act on.',
  },
];

const STATS = [
  { label: 'Precision on held-out test set', value: 100, suffix: '%' },
  { label: 'False positives on legit cases', value: 0, suffix: '/30' },
  { label: 'Engineered behavioural features', value: 42, suffix: '' },
];

export default function HeroSection({ activeCases, onRunSimulation }) {
  return (
    <motion.section
      className="hero-section hero-section--hud"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <Aurora />
      <div className="hero-hud-grid" aria-hidden="true" />
      <div className="hero-content">
        <div className="hero-top-row">
          <ShinyText as="div" className="hero-eyebrow">
            Predictive Cyber-Financial Crime Intelligence · SIH 2026
          </ShinyText>
          {activeCases != null && (
            <div className="hero-summary">
              <span className="hero-summary-dot" />
              <span>
                <strong>{activeCases}</strong> active investigation{activeCases !== 1 ? 's' : ''} live right now
              </span>
            </div>
          )}
        </div>

        <h1 className="hero-headline">
          Stop chasing the money. <span className="rb-gradient-word">Predict where it lands.</span>
        </h1>
        <p className="hero-description">
          NCRP tells you a fraud happened. <strong>CyberFlow tells you what stage it's at,
          what happens next, and which ATM to watch</strong> — with the statistical proof and
          feature-level evidence behind every call, running end-to-end on real code, not slides.
        </p>

        <div className="hero-pillars">
          {PILLARS.map((p) => (
            <div className="hero-pillar" key={p.title}>
              <span className="hero-pillar-icon">{p.icon}</span>
              <div>
                <div className="hero-pillar-title">{p.title}</div>
                <div className="hero-pillar-detail">{p.detail}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="hero-cta-row">
          {onRunSimulation && (
            <Magnet strength={0.25}>
              <button className="btn btn-primary btn-lg hero-sim-btn" onClick={onRunSimulation}>
                ▶ Run Incident Simulation
              </button>
            </Magnet>
          )}
          <span className="hero-cta-hint">30-second live run · complaint → predicted ATM → alert</span>
        </div>

        <div className="hero-stat-strip">
          {STATS.map((s) => (
            <div className="hero-stat" key={s.label}>
              <div className="hero-stat-value">
                <CountUp value={s.value} />{s.suffix}
              </div>
              <div className="hero-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
