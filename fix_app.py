import re

with open('frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Add import
import_target = "import NCRPDemo from './components/NCRPDemo';"
import_replacement = import_target + "\nimport AIAnalysisOverlay from './components/AIAnalysisOverlay';"
if "AIAnalysisOverlay" not in c:
    c = c.replace(import_target, import_replacement)

# Add state
state_target = "const [showComplaintTracker, setShowComplaintTracker] = useState(false);"
state_replacement = state_target + "\n  const [isAnalyzing, setIsAnalyzing] = useState(false);"
if "isAnalyzing" not in c:
    c = c.replace(state_target, state_replacement)

# Modify openCase
openCase_target = """  const openCase = useCallback((caseId) => {
    setSelectedCaseId(caseId);
    setView('workspace');
    setCurrentStep(1);
    setCompletedSteps(new Set());
  }, []);"""

openCase_replacement = """  const openCase = useCallback((caseId) => {
    setSelectedCaseId(caseId);
    if (isOfficer || isAdmin) {
      setIsAnalyzing(true);
    } else {
      setView('workspace');
    }
    setCurrentStep(1);
    setCompletedSteps(new Set());
  }, [isOfficer, isAdmin]);"""
c = c.replace(openCase_target, openCase_replacement)

# Add rendering of AIAnalysisOverlay
render_target = "        <AnimatePresence mode=\"wait\">"
render_replacement = "        {isAnalyzing && <AIAnalysisOverlay onComplete={() => { setIsAnalyzing(false); setView('workspace'); }} />}\n" + render_target
if "isAnalyzing && <AIAnalysisOverlay" not in c:
    c = c.replace(render_target, render_replacement)

with open('frontend/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(c)

print('Done')
