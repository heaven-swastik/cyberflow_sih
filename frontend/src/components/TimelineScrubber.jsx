import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTimeline } from '../api';
import { stateLabel, stateColor } from '../utils/format';

export default function TimelineScrubber({ caseId, onStepChange, onStateChange, caseData, isOpen, onClose, autoPlay, inline = false }) {
  const [timeline, setTimeline] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!caseId) return;
    getTimeline(caseId).then((data) => {
      setTimeline(data);
      setCurrentStep(0);
      setIsPlaying(false);
    });
  }, [caseId]);

  const maxStep = timeline.length - 1;
  const isAtEnd = currentStep >= maxStep;
  const currentPoint = timeline[currentStep];

  // Guided-simulation mode: auto-start playback
  const isVisible = inline || isOpen;
  useEffect(() => {
    if (isVisible && autoPlay && timeline.length > 0) {
      setCurrentStep(0);
      setIsPlaying(true);
    }
  }, [isVisible, autoPlay, timeline.length]);

  // Notify parent of changes
  useEffect(() => {
    if (!currentPoint) return;
    onStepChange?.(currentStep + 1, maxStep + 1);
    onStateChange?.(currentPoint.state);
  }, [currentStep, currentPoint]);

  // Auto-play
  useEffect(() => {
    if (isPlaying && !isAtEnd) {
      intervalRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= maxStep) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1800);
    }
    return () => clearInterval(intervalRef.current);
  }, [isPlaying, maxStep, isAtEnd]);

  const handlePlay = useCallback(() => {
    if (isAtEnd) {
      setCurrentStep(0);
      setIsPlaying(true);
    } else {
      setIsPlaying((p) => !p);
    }
  }, [isAtEnd]);

  const handleSlider = useCallback((e) => {
    setCurrentStep(Number(e.target.value));
    setIsPlaying(false);
  }, []);

  if (timeline.length === 0) return null;

  // Shared timeline content
  const timelineContent = (
    <>
      <div className="timeline-drawer-title">Crime Evolution</div>

      <div className="timeline-controls">
        <button className="timeline-play-btn" onClick={handlePlay} title={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? '⏸' : '▶'}
        </button>

        <div className="timeline-track">
          <div className="timeline-slider-row">
            <input
              className="timeline-slider"
              type="range"
              min={0}
              max={maxStep}
              value={currentStep}
              onChange={handleSlider}
            />
          </div>
          <div className="timeline-labels">
            {timeline.map((point, i) => (
              <span
                key={i}
                className={`timeline-label ${i === currentStep ? 'active' : ''} ${i < currentStep ? 'passed' : ''}`}
              >
                {stateLabel(point.state)}
              </span>
            ))}
          </div>
        </div>

        <div className="timeline-state-badge">
          {currentPoint && (
            <span
              className="badge badge-state"
              style={{
                color: stateColor(currentPoint.state),
                borderColor: `${stateColor(currentPoint.state)}33`,
                fontSize: '0.75rem',
              }}
            >
              {stateLabel(currentPoint.state)}
            </span>
          )}
        </div>
      </div>

      {/* NOW forecast at end */}
      {isAtEnd && caseData && (
        <div className="now-forecast">
          <span className="now-pulse" />
          <span className="now-forecast-label">
            AI Forecast — Next: {caseData.next_action?.predicted === 'cashout' ? 'Cash-out' : caseData.next_action?.predicted}
          </span>
          <span className="now-forecast-value">
            {Math.round((caseData.next_action?.probabilities?.[caseData.next_action?.predicted] || 0) * 100)}%
          </span>
        </div>
      )}
    </>
  );

  // Inline mode: render without drawer wrapper
  if (inline) {
    return (
      <div className="timeline-inline">
        {timelineContent}
      </div>
    );
  }

  // Drawer mode (original behavior)
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="bottom-drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />

          {/* Bottom drawer */}
          <motion.div
            className="bottom-drawer"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="bottom-drawer-handle" />
            {timelineContent}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
