# CyberFlow Frontend Dashboard

Proactive Cyber-Financial Crime Intelligence dashboard — SIH 2026, Ministry of Home Affairs / I4C.

## Quick Start

```bash
cd Frontend
npm install
npm run dev
```

Opens at `http://localhost:5173`

## Mock vs Live API

By default the app runs against embedded mock data (`case_export.json`). To point at the live backend:

```bash
# Create a .env file or set env vars:
VITE_USE_MOCK=false
VITE_API_BASE=http://localhost:3001/api
```

Then restart the dev server.

## Demo Flow (10 beats)

1. **Select Case CF-1042** → auto-selected on load
2. **View transaction graph** → force-directed network appears
3. **Press Play** on timeline → network grows visually
4. **State updates** to Consolidation as timeline advances
5. **AI panel shows** Next Action: Cash-out 78%
6. **Map highlights** Zone B at 72% confidence
7. **Click WHY?** → explanation checklist reveals
8. **Click Simulate** → compare Zone A vs B vs C intervention
9. **Zone B recommended** → highest preventable impact
10. **Generate Alert** → alert card + hash chain audit trail

## Stack

- React (Vite)
- recharts — charts & probability bars
- react-force-graph-2d — crime network visualization
- framer-motion — animations & transitions

## Structure

```
src/
├── api/index.js          — API abstraction (mock/live toggle)
├── data/caseExport.json  — mock data for all 3 cases
├── utils/format.js       — INR, %, state label formatters
├── components/
│   ├── OverviewBar.jsx   — 4 stat tiles
│   ├── CaseList.jsx      — case selector sidebar
│   ├── CrimeGraph.jsx    — force-directed network graph
│   ├── TimelineScrubber.jsx — play/scrub timeline
│   ├── IntelPanel.jsx    — intelligence briefing
│   ├── RiskMap.jsx       — SVG zone risk map
│   ├── ExplainPanel.jsx  — WHY? explainability
│   ├── InterventionSim.jsx — zone comparison simulator
│   ├── AlertTrail.jsx    — alert generation + audit trail
│   └── GuardrailFooter.jsx — trust disclaimers
└── App.jsx               — main layout shell
```
