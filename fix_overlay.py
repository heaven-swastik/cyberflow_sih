import re

with open('frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Fix the render location of AIAnalysisOverlay
bad_render = "        {isAnalyzing && <AIAnalysisOverlay onComplete={() => { setIsAnalyzing(false); setView('workspace'); }} />}\n        <AnimatePresence mode=\"wait\">"
good_render = "        <AnimatePresence mode=\"wait\">\n"

if bad_render in c:
    c = c.replace(bad_render, good_render)
    
    # Put it outside AnimatePresence, right after <div className="app-main">
    main_target = "<div className=\"app-main\">"
    main_replacement = main_target + "\n        {isAnalyzing && <AIAnalysisOverlay onComplete={() => { setIsAnalyzing(false); setView('workspace'); }} />}"
    c = c.replace(main_target, main_replacement)

with open('frontend/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(c)
print('Done')
