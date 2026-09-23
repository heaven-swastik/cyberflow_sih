import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const EVENT_TEMPLATES = [
  { severity: '🔴', text: 'New complaint filed — ₹{amount}L flagged for investigation ({cid})' },
  { severity: '🟠', text: 'AI classification complete — {type} detected ({cid})' },
  { severity: '🟡', text: 'Risk threshold exceeded — {zone} cashout probability {prob}% ({cid})' },
  { severity: '🟢', text: 'Alert dispatched to LEA — {city} field team notified' },
  { severity: '🔴', text: 'Rapid fund movement detected — {n} accounts in {t} min window' },
  { severity: '🟠', text: 'Mule network convergence — {n} accounts consolidating to {zone}' },
  { severity: '🟡', text: 'Pattern match — {prob}% similarity to known {type} topology' },
  { severity: '🟢', text: 'Bank API notification — {bank} freeze request processed' },
  { severity: '🔴', text: 'New high-priority case — ₹{amount}L digital arrest complaint ({cid})' },
  { severity: '🟠', text: 'Predictive model update — {zone} risk elevated to HIGH' },
];

const FRAUD_TYPES = ['investment scam', 'digital arrest', 'fake payment gateway'];
const ZONES = ['Delhi NCR', 'Kolkata', 'Mumbai'];
const BANKS = ['HDFC', 'SBI', 'ICICI', 'Axis', 'PNB', 'Kotak'];
const CASE_IDS = ['CF-1042', 'CF-2001', 'CF-3001', 'CF-4012', 'CF-5087', 'CF-6201'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function generateEvent() {
  const tpl = pick(EVENT_TEMPLATES);
  const msg = tpl.text
    .replace('{amount}', (1.5 + Math.random() * 23.5).toFixed(1))
    .replace('{cid}', pick(CASE_IDS))
    .replace('{type}', pick(FRAUD_TYPES))
    .replace('{zone}', pick(ZONES))
    .replace('{city}', pick(ZONES))
    .replace('{prob}', String(50 + Math.floor(Math.random() * 45)))
    .replace('{n}', String(2 + Math.floor(Math.random() * 6)))
    .replace('{t}', String(3 + Math.floor(Math.random() * 12)))
    .replace('{bank}', pick(BANKS));

  const now = new Date();
  return {
    id: Date.now() + Math.random(),
    severity: tpl.severity,
    text: msg,
    timestamp: now.toTimeString().split(' ')[0],
  };
}

export default function LiveFeed() {
  const [events, setEvents] = useState([]);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      setEvents(Array.from({ length: 3 }, generateEvent).reverse());
      initialized.current = true;
    }

    const interval = setInterval(() => {
      setEvents((prev) => {
        const updated = [generateEvent(), ...prev];
        return updated.length > 6 ? updated.slice(0, 6) : updated;
      });
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        marginTop: 32,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '6px',
        padding: '24px 28px',
      }}
    >
      {/* Section title */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 20,
          fontSize: '0.82rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--text-muted)',
        }}
      >
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: 9,
            height: 9,
            borderRadius: '50%',
            background: 'var(--severity-clear)',
            boxShadow: '0 0 8px var(--severity-clear)',
          }}
        />
        Live Intelligence Feed
      </div>

      {/* Events list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 280 }}>
        <AnimatePresence initial={false}>
          {events.map((evt) => {
            let borderColor = 'transparent';
            if (evt.severity === '🔴') borderColor = 'var(--severity-critical)';
            else if (evt.severity === '🟠') borderColor = 'var(--severity-high)';
            else if (evt.severity === '🟡') borderColor = 'var(--severity-medium)';
            else if (evt.severity === '🟢') borderColor = 'var(--severity-clear)';
            
            return (
              <motion.div
                key={evt.id}
                initial={{ opacity: 0, y: -16, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-elevated)',
                  fontSize: '0.82rem',
                  borderLeft: `3px solid ${borderColor}`,
                  overflow: 'hidden',
                }}
              >
                <span
                  style={{
                    fontFamily: '"IBM Plex Mono", monospace',
                    color: 'var(--text-muted)',
                    fontSize: '0.72rem',
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  {evt.timestamp}
                </span>
                <span style={{ color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  {evt.severity} {evt.text}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
