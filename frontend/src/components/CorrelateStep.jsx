import React, { useState, useEffect } from 'react';
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [rlSequenceStep, setRlSequenceStep] = useState(0);

  useEffect(() => {
    const handleBacktrack = (e) => {
      const { nodeId } = e.detail;
      if (timelineStep > 1 && onStepChange) {
        setTimeout(() => {
          onStepChange(Math.max(1, timelineStep - 1), maxStep);
        }, 1000);
      }
    };
    window.addEventListener('node-backtrack', handleBacktrack);
    return () => window.removeEventListener('node-backtrack', handleBacktrack);
  }, [timelineStep, maxStep, onStepChange]);

  const triggerLiveRL = async () => {
     setRlSequenceStep(1); 
     await new Promise(r => setTimeout(r, 2500));
     setRlSequenceStep(2); 
     await new Promise(r => setTimeout(r, 2500));
     
     try {
       const token = localStorage.getItem('cyberflow_token');
       await fetch(`/api/cases/${caseId}/verify-evidence`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
         body: JSON.stringify({ verified_state: 'layering' })
       });
       setRefreshTrigger(prev => prev + 1);
       setRlSequenceStep(3); 
       await new Promise(r => setTimeout(r, 3000));
       setRlSequenceStep(4);
       setTimeout(() => {
         setRlSequenceStep(0);
       }, 5000);
     } catch (e) {
       console.error(e);
       setRlSequenceStep(0);
     }
  };

  return (
    <ErrorBoundary>
    <div className={`correlate-step ${isExpanded ? 'graph-expanded-mode' : ''}`} style={{position: 'relative'}}>
      
      <AnimatePresence>
        {rlSequenceStep > 0 && (
          <motion.div 
            initial={{opacity: 0, y: -20}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, y: -20}}
            style={{
              position: 'absolute', top: 120, left: '50%', transform: 'translateX(-50%)', 
              zIndex: 9999, background: '#13231f', border: '2px solid #e4483f', 
              borderRadius: '8px', padding: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
              width: '500px', textAlign: 'center', color: '#fff'
            }}
          >
            {rlSequenceStep === 1 && (
              <>
                <h3 style={{color: '#e4483f', marginTop: 0}}>🚨 API Ground Truth Mismatch</h3>
                <p>Bank API reported funds diverted to <strong>Layering</strong>, not <em>Consolidation</em> as predicted.</p>
              </>
            )}
            {rlSequenceStep === 2 && (
              <>
                <h3 style={{color: '#e2954a', marginTop: 0}}>⚙️ RL Agent Updating Q-Table</h3>
                <p>Applying -1.0 penalty to <em>[Distribution → Consolidation]</em>.</p>
                <p>Applying +1.0 reward to <em>[Distribution → Layering]</em>.</p>
                <div style={{height: 4, background: '#e2954a', width: '100%', marginTop: 12, animation: 'pulse-marker 1s infinite'}} />
              </>
            )}
            {rlSequenceStep === 3 && (
              <>
                <h3 style={{color: '#41dc8f', marginTop: 0}}>✅ Graph Corrected & Rebuilt</h3>
                <p>Live transaction graph has been updated with the verified node path. Downstream predictions re-rolled.</p>
              </>
            )}
            {rlSequenceStep === 4 && (
              <>
                <h3 style={{color: '#5b8fd6', marginTop: 0}}>🚨 Alerts & Blocking Triggered</h3>
                <div style={{ textAlign: 'left', background: 'rgba(91, 143, 214, 0.1)', padding: '12px', borderRadius: '6px', fontSize: '0.9rem' }}>
                  <div style={{marginBottom: 8}}>📍 <strong>New Zone Officer Notified:</strong> Intelligence report dispatched to Kolkata Hub.</div>
                  <div style={{marginBottom: 8}}>🏦 <strong>Card Blocking Request:</strong> Issued immediate API block requests to SBI & HDFC for newly identified mule accounts.</div>
                  <div>🛡️ <strong>Network Hardened:</strong> New prediction topology locked in.</div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

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
          {caseId === 'CF-1042' && (
             <button 
                className="btn btn-primary" 
                style={{padding:'6px 14px', fontSize:'0.85rem', background: '#e4483f', borderColor: '#e4483f'}} 
                onClick={triggerLiveRL} 
                disabled={rlSequenceStep > 0}
             >
               🔄 Run Live RL Correction
             </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="correlate-status-dot" />
            <span>LIVE CASE GRAPH</span>
          </div>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '4px 12px', fontSize: '0.8rem' }}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? '↙ Collapse' : '↗ Expand'}
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
          timelineStep={(rlSequenceStep === 1 || rlSequenceStep === 2) ? Math.max(1, timelineStep - 1) : timelineStep}
          maxStep={maxStep}
          currentState={currentState}
          refreshTrigger={refreshTrigger}
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
          refreshTrigger={refreshTrigger}
        />
      </div>
    </div>
    </ErrorBoundary>
  );
};

export default CorrelateStep;
