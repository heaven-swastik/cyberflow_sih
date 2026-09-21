import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getCase, getOverview, getCases, generateAlert } from './api';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import ComplaintTracker from './components/ComplaintTracker';
import AdminPanel from './components/AdminPanel';
import HeroSection from './components/HeroSection';
import HowItWorks from './components/HowItWorks';
import OverviewBar from './components/OverviewBar';
import CaseList from './components/CaseList';
import LiveFeed from './components/LiveFeed';
import WizardProgressBar from './components/WizardProgressBar';
import WizardNavigation from './components/WizardNavigation';
import IncidentStep from './components/IncidentStep';
import CorrelateStep from './components/CorrelateStep';
import PredictionStep from './components/PredictionStep';
import MapStep from './components/MapStep';
import ActionStep from './components/ActionStep';
import SimulationRunner from './components/SimulationRunner';
import GuardrailFooter from './components/GuardrailFooter';
import ComplaintPortal from './components/ComplaintPortal';
import ApiIntegrationPanel from './components/ApiIntegrationPanel';
import { stateLabel, stateColor } from './utils/format';

// The actual app shell — separated so useAuth() works inside AuthProvider
function AppContent() {
  const { user, role, isAuthenticated, loading: authLoading, logout, isAdmin, isComplainant } = useAuth();

  const [view, setView] = useState('landing');
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [caseData, setCaseData] = useState(null);

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState(new Set());

  // Auth-related overlays
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showComplaintTracker, setShowComplaintTracker] = useState(false);
  const [userCaseIds, setUserCaseIds] = useState([]);

  // Step 2 (Correlate) state
  const [timelineStep, setTimelineStep] = useState(1);
  const [maxTimelineStep, setMaxTimelineStep] = useState(1);
  const [currentState, setCurrentState] = useState(null);
  const [frozenNodes, setFrozenNodes] = useState(new Set());
  const [dbExpanded, setDbExpanded] = useState(false);
  const [autoPlayTimeline, setAutoPlayTimeline] = useState(false);

  // Step 4 (Map) state
  const [simZone, setSimZone] = useState(null);

  // Simulation state
  const [pendingSimulation, setPendingSimulation] = useState(false);
  const [simulationRunning, setSimulationRunning] = useState(false);

  // Overview data for hero
  const [overviewData, setOverviewData] = useState(null);
  useEffect(() => {
    getOverview().then(setOverviewData);
  }, []);

  // Complaint Portal / API Integration overlays (landing page)
  const [showComplaintPortal, setShowComplaintPortal] = useState(false);
  const [showApiIntegration, setShowApiIntegration] = useState(false);

  // Load full case data when selection changes
  useEffect(() => {
    if (!selectedCaseId) return;
    setCaseData(null);
    setSimZone(null);
    setDbExpanded(false);
    setAutoPlayTimeline(false);
    setCompletedSteps(new Set());
    setCurrentStep(1);
    getCase(selectedCaseId).then(setCaseData);
  }, [selectedCaseId]);

  // Once case data has loaded for a pending simulation, start playback
  useEffect(() => {
    if (pendingSimulation && caseData) {
      setPendingSimulation(false);
      setSimulationRunning(true);
    }
  }, [pendingSimulation, caseData]);

  // Timeline callbacks
  const handleTimelineStepChange = useCallback((step, max) => {
    setTimelineStep(step);
    setMaxTimelineStep(max);
  }, []);

  const handleStateChange = useCallback((state) => {
    setCurrentState(state);
  }, []);

  // Node freeze
  const handleFreezeNode = useCallback((nodeId) => {
    setFrozenNodes((prev) => {
      const next = new Set(prev);
      next.add(nodeId);
      return next;
    });
  }, []);

  // Wizard navigation
  const handleWizardStepChange = useCallback((step) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      // Mark all steps before the new step as completed
      for (let i = 1; i < step; i++) next.add(i);
      return next;
    });
    setCurrentStep(step);
  }, []);

  const handleWizardNext = useCallback(() => {
    if (currentStep >= 5) {
      // Complete investigation — go back to landing
      setSimulationRunning(false);
      setView('landing');
      setSelectedCaseId(null);
      setCaseData(null);
      return;
    }
    setCompletedSteps((prev) => new Set(prev).add(currentStep));
    setCurrentStep((prev) => prev + 1);
  }, [currentStep]);

  const handleWizardBack = useCallback(() => {
    if (currentStep <= 1) return;
    setCurrentStep((prev) => prev - 1);
  }, [currentStep]);

  // Alert generation
  const handleGenerateAlert = useCallback(async () => {
    if (!selectedCaseId) return;
    try {
      await generateAlert(selectedCaseId);
    } catch (e) {
      console.error('Alert generation error:', e);
    }
  }, [selectedCaseId]);

  // Navigation
  const openCase = useCallback((caseId) => {
    setSelectedCaseId(caseId);
    setView('workspace');
    setCurrentStep(1);
    setCompletedSteps(new Set());
  }, []);

  const goBackToLanding = useCallback(() => {
    setSimulationRunning(false);
    setView('landing');
    setSelectedCaseId(null);
    setCaseData(null);
  }, []);

  // "Run Incident Simulation" — jump straight into the workspace for the
  // latest case and auto-play the full story
  const handleRunSimulation = useCallback(async () => {
    try {
      const cases = await getCases();
      // Pick the most recently added case (which would be the user's new complaint if they just filed one)
      const chosen = cases[cases.length - 1];
      if (!chosen) return;
      setSelectedCaseId(chosen.case_id);
      setView('workspace');
      setCurrentStep(1);
      setCompletedSteps(new Set());
      setPendingSimulation(true);
    } catch (e) {
      console.error('Could not start simulation:', e);
    }
  }, []);

  const handleSimulationFinish = useCallback(() => {
    setSimulationRunning(false);
    setAutoPlayTimeline(false);
  }, []);

  // Render current wizard step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <IncidentStep caseData={caseData} />;
      case 2:
        return (
          <CorrelateStep
            caseId={selectedCaseId}
            caseData={caseData}
            timelineStep={timelineStep}
            maxStep={maxTimelineStep}
            currentState={currentState}
            onStepChange={handleTimelineStepChange}
            onStateChange={handleStateChange}
            frozenNodes={frozenNodes}
            onFreezeNode={handleFreezeNode}
            dbExpanded={dbExpanded}
            onExpandDb={() => setDbExpanded((prev) => !prev)}
            autoPlayTimeline={autoPlayTimeline}
          />
        );
      case 3:
        return <PredictionStep caseData={caseData} />;
      case 4:
        return (
          <MapStep
            caseData={caseData}
            caseId={selectedCaseId}
            simZone={simZone}
            onZoneSelect={setSimZone}
          />
        );
      case 5:
        return <ActionStep caseId={selectedCaseId} caseData={caseData} onAlertGenerated={handleGenerateAlert} />;
      default:
        return null;
    }
  };

  // Track case IDs created by this user for complaint tracker
  const handleCaseCreated = useCallback((caseId) => {
    setUserCaseIds((prev) => [...prev, caseId]);
    setShowComplaintPortal(false);
    openCase(caseId);
  }, [openCase]);

  // Auth loading
  if (authLoading) {
    return (
      <div className="app-shell">
        <div className="login-loading-screen">
          <div className="login-loading-spinner" />
          <span className="login-loading-text">Initializing CyberFlow…</span>
        </div>
      </div>
    );
  }

  // Not authenticated — show login
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={() => {}} />;
  }

  return (
    <div className="app-shell">
      {/* Header — always visible */}
      <header className="app-header">
        <div className="app-header-left">
          <div className="app-logo">CF</div>
          <div>
            <div
              className="app-title"
              style={{ cursor: view !== 'landing' ? 'pointer' : 'default' }}
              onClick={() => {
                if (view !== 'landing') goBackToLanding();
              }}
            >
              CyberFlow
            </div>
            <div className="app-subtitle">Proactive Cyber-Financial Crime Intelligence</div>
          </div>
        </div>
        <div className="header-right">
          <span className="header-context">SIH 2026 · MHA / I4C (context only — no live integration)</span>
          <span className="live-indicator">
            <span className="live-dot" />
            SYSTEM ACTIVE
          </span>
          {/* User info + actions */}
          <div className="header-user-section">
            {isComplainant && (
              <button className="header-user-btn" onClick={() => setShowComplaintTracker(true)} title="My Complaints">
                📋
              </button>
            )}
            {isAdmin && (
              <button className="header-user-btn" onClick={() => setShowAdminPanel(true)} title="Admin Panel">
                ⚙️
              </button>
            )}
            <div className="header-user-chip">
              <span className="header-user-avatar">{(user?.displayName || user?.email || '?')[0].toUpperCase()}</span>
              <span className="header-user-name">{user?.displayName || user?.email}</span>
              <span className={`header-user-role role-${role}`}>{role}</span>
            </div>
            <button className="header-logout-btn" onClick={logout} title="Sign out">
              ↗
            </button>
          </div>
        </div>
      </header>

      {/* View content */}
      <AnimatePresence mode="wait">
        {/* ═══════════ LANDING ═══════════ */}
        {view === 'landing' && (
          <motion.div
            key="landing"
            className="landing-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <HeroSection activeCases={overviewData?.active_cases} onRunSimulation={handleRunSimulation} />
            <HowItWorks />

            {/* Complaint Portal + API Integration entry points (requirements 1 & 2) */}
            <div className="landing-actions-row">
              <button className="btn btn-primary" onClick={() => setShowComplaintPortal(true)}>
                📝 File a New Complaint (NCRP-style demo)
              </button>
              <button className="btn btn-secondary" onClick={() => setShowApiIntegration(true)}>
                🔌 API Integration Demo
              </button>
            </div>

            {showComplaintPortal && (
              <ComplaintPortal
                onClose={() => setShowComplaintPortal(false)}
                onCaseCreated={handleCaseCreated}
              />
            )}
            {showApiIntegration && (
              <ApiIntegrationPanel onClose={() => setShowApiIntegration(false)} />
            )}

            <OverviewBar />
            <CaseList onSelectCase={openCase} />
            <LiveFeed />
          </motion.div>
        )}

        {/* ═══════════ WORKSPACE (Step Wizard) ═══════════ */}
        {view === 'workspace' && (
          <motion.div
            key="workspace"
            className="workspace-page"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {/* Top bar */}
            <div className="workspace-topbar">
              <div className="workspace-topbar-left">
                <button className="workspace-back-btn" onClick={goBackToLanding}>
                  ← Back
                </button>
                <div className="workspace-case-info">
                  <span className="workspace-case-id">{selectedCaseId}</span>
                  {currentState && (
                    <span
                      className="badge badge-state"
                      style={{
                        color: stateColor(currentState),
                        borderColor: `${stateColor(currentState)}33`,
                      }}
                    >
                      {stateLabel(currentState)}
                    </span>
                  )}
                  {caseData && (
                    <span className={`badge badge-priority-${caseData.intervention_priority}`}>
                      {caseData.intervention_priority}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Wizard Progress Bar */}
            <WizardProgressBar
              currentStep={currentStep}
              completedSteps={completedSteps}
              onStepClick={handleWizardStepChange}
              simulationActive={simulationRunning}
            />

            {/* Step content */}
            <div className="wizard-step-container">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="wizard-step-content"
                >
                  {renderCurrentStep()}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Wizard Navigation (Back / Next) */}
            <WizardNavigation
              currentStep={currentStep}
              totalSteps={5}
              onBack={handleWizardBack}
              onNext={handleWizardNext}
              simulationActive={simulationRunning}
            />

            {/* Simulation Runner banner */}
            <SimulationRunner
              isRunning={simulationRunning}
              caseData={caseData}
              onStepChange={handleWizardStepChange}
              onExpandDb={(expand) => setDbExpanded(expand)}
              onAutoPlayTimeline={(play) => setAutoPlayTimeline(play)}
              onGenerateAlert={handleGenerateAlert}
              onFinish={handleSimulationFinish}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer — always visible */}
      <GuardrailFooter />

      {/* Admin Panel overlay */}
      {showAdminPanel && (
        <AdminPanel
          onClose={() => setShowAdminPanel(false)}
          totalCases={overviewData?.active_cases || 0}
          totalAlerts={0}
        />
      )}

      {/* Complaint Tracker overlay (complainant role) */}
      {showComplaintTracker && (
        <ComplaintTracker
          caseIds={userCaseIds}
          onOpenCase={(caseId) => {
            setShowComplaintTracker(false);
            openCase(caseId);
          }}
          onClose={() => setShowComplaintTracker(false)}
        />
      )}
    </div>
  );
}

// Top-level App wraps AppContent in AuthProvider
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
