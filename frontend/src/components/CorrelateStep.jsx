import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CrimeGraph from './CrimeGraph';
import TimelineScrubber from './TimelineScrubber';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { this.setState({ error, info }); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: 'red', padding: 20, zIndex: 9999, background: 'black', position: 'relative' }}>
          <h2>Error in CorrelateStep</h2>
          <pre>{this.state.error?.toString()}</pre>
          <pre>{this.state.info?.componentStack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const CorrelateStep = ({
  caseId,
  caseData,
  timelineStep,
  maxStep,
  currentState,
  onStepChange,
  onStateChange,
  frozenNodes,
  onFreezeNode,
  autoPlayTimeline
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <ErrorBoundary>
    <div className={`correlate-step ${isExpanded ? 'graph-expanded-mode' : ''}`}>
      <div className="correlate-header">
        <div>
          <div className="correlate-eyebrow">Step 02 / Relationship intelligence</div>
          <h1 className="correlate-title">Entity correlation</h1>
          <p className="correlate-description">
            Follow the money trail from the complaint to the predicted cash-out point.
            Each node is a database record and each edge is a transaction.
          </p>
        </div>
        <div className="correlate-status" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="correlate-status-dot" />
            <span>LIVE CASE GRAPH</span>
          </div>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '4px 12px', fontSize: '0.8rem' }}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? '✕ Collapse' : '⛶ Expand'}
          </button>
        </div>
      </div>

      <div className={`correlate-graph-container ${isExpanded ? 'expanded' : ''}`}>
        {isExpanded && (
          <button 
            className="btn btn-secondary"
            style={{ position: 'absolute', top: '20px', right: '400px', zIndex: 1001, background: '#13231f', border: '1px solid rgba(65, 220, 143, 0.2)' }}
            onClick={() => setIsExpanded(false)}
          >
            ✕ Exit Fullscreen
          </button>
        )}
        <aside className="graph-context-rail">
          <span className="graph-rail-label">Trace direction</span>
          <div className="graph-trace-path">
            <span>Complaint</span>
            <span>Account</span>
            <span>Transaction</span>
            <span>Device</span>
            <strong>ATM</strong>
          </div>
          <div className="graph-rail-note">
            <span className="graph-rail-note-mark">+</span>
            <span>Click any node to inspect its record and linked activity.</span>
          </div>
        </aside>
        <CrimeGraph
          caseId={caseId}
          timelineStep={timelineStep}
          maxStep={maxStep}
          currentState={currentState}
        />
      </div>

      <div className="correlate-timeline-band">
        <div className="correlate-timeline-label">
          <span className="correlate-eyebrow">Evidence playback</span>
          <strong>Transaction timeline</strong>
        </div>
        <TimelineScrubber
          caseId={caseId}
          onStepChange={onStepChange}
          onStateChange={onStateChange}
          caseData={caseData}
          inline={true}
          autoPlay={autoPlayTimeline}
        />
      </div>
    </div>
    </ErrorBoundary>
  );
};

export default CorrelateStep;
