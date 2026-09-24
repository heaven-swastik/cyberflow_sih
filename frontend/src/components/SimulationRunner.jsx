import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Orchestrates the ~70-90s guided demo by driving the same step wizard
 * a user would click through manually. Not a separate "demo mode" UI —
 * it literally advances the wizard steps with a narration caption and
 * elapsed progress bar.
 *
 * 6 beats map to 5 wizard steps:
 *  Beat 0 (Intake, 7s)     → Step 1
 *  Beat 1 (Timeline, 16s)  → Step 2 (graph + timeline autoplay)
 *  Beat 2 (Database, 11s)  → Step 2 continued (auto-expand DB panel)
 *  Beat 3 (Prediction, 13s)→ Step 3
 *  Beat 4 (GIS Map, 15s)   → Step 4
 *  Beat 5 (Alert, 11s)     → Step 5 (auto-generate alert)
 */
function buildScript(caseData) {
  const topZoneLabel = caseData?.location_candidates?.[0]?.zone_id || 'the predicted zone';
  const bank = caseData?.atm_candidates?.[0]?.bank_name || 'the predicted bank';
  return [
    {
      wizardStep: 1,
      durationMs: 7000,
      caption: 'New complaint filed',
      detail: `${caseData?.complaint?.complainant_name || 'Complainant'} reports ${caseData?.fraud_type?.replace(/_/g, ' ') || 'a fraudulent transaction'}. Intake logged.`,
    },
    {
      wizardStep: 2,
      durationMs: 18000,
      caption: 'Resolving related accounts',
      detail: 'Correlating the complaint against linked accounts, transactions, and devices via relational SQL joins.',
      autoPlayTimeline: true,
    },
    {
      wizardStep: 3,
      durationMs: 13000,
      caption: 'AI prediction generated',
      detail: `Network risk scored, next action ranked, cash-out zone estimated (${topZoneLabel}).`,
    },
    {
      wizardStep: 4,
      durationMs: 15000,
      caption: 'Predicted ATM highlighted on the map',
      detail: `Zone-level prediction resolved to a specific ${bank} ATM, ranked against device proximity and withdrawal history.`,
    },
    {
      wizardStep: 5,
      durationMs: 11000,
      caption: 'Alert dispatched',
      detail: 'Intelligence sent to LEA / bank fraud ops, hash-chained into the audit trail.',
      onEnter: 'generateAlert',
    },
  ];
}

export default function SimulationRunner({
  isRunning,
  caseData,
  onStepChange,
  onExpandDb,
  onAutoPlayTimeline,
  onGenerateAlert,
  onFinish,
}) {
  const [beatIndex, setBeatIndex] = useState(-1);
  const [elapsed, setElapsed] = useState(0);
  const timeoutRef = useRef(null);
  const tickRef = useRef(null);
  const script = useRef([]);

  useEffect(() => {
    if (!isRunning) {
      setBeatIndex(-1);
      clearTimeout(timeoutRef.current);
      clearInterval(tickRef.current);
      return;
    }
    script.current = buildScript(caseData);
    setBeatIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning]);

  useEffect(() => {
    if (!isRunning || beatIndex < 0) return;
    const beat = script.current[beatIndex];
    if (!beat) {
      onFinish?.();
      return;
    }

    // Drive the wizard step
    onStepChange?.(beat.wizardStep);

    // Beat-specific actions
    if (beat.autoPlayTimeline) {
      onAutoPlayTimeline?.(true);
    }
    if (beat.expandDb) {
      onExpandDb?.(true);
    }
    if (beat.onEnter === 'generateAlert') {
      setTimeout(() => onGenerateAlert?.(), 600);
    }

    setElapsed(0);
    tickRef.current = setInterval(() => setElapsed((e) => e + 100), 100);

    timeoutRef.current = setTimeout(() => {
      clearInterval(tickRef.current);
      // Turn off beat-specific states before advancing
      if (beat.autoPlayTimeline) onAutoPlayTimeline?.(false);
      setBeatIndex((i) => i + 1);
    }, beat.durationMs);

    return () => {
      clearTimeout(timeoutRef.current);
      clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beatIndex, isRunning]);

  if (!isRunning || beatIndex < 0 || !script.current[beatIndex]) return null;

  const beat = script.current[beatIndex];
  const totalBeats = script.current.length;
  const progressPct = Math.min(100, (elapsed / beat.durationMs) * 100);
  const overallPct = Math.round(((beatIndex + progressPct / 100) / totalBeats) * 100);

  return (
    <AnimatePresence>
      <motion.div
        className="sim-runner-banner"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
      >
        <div className="sim-runner-top">
          <span className="sim-runner-live-dot" />
          <span className="sim-runner-step-count">STEP {beatIndex + 1} / {totalBeats}</span>
          <span className="sim-runner-caption">{beat.caption}</span>
          <button className="sim-runner-skip" onClick={() => onFinish?.()}>Skip ✕</button>
        </div>
        <div className="sim-runner-detail">{beat.detail}</div>
        <div className="sim-runner-progress-track">
          <div className="sim-runner-progress-fill" style={{ width: `${overallPct}%` }} />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
