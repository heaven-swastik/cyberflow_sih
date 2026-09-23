export default function StoryRail({
  activePanel,
  onTogglePanel,
  onGenerateAlert,
  generating,
  caseId,
  completedSteps = new Set(),
}) {
  const steps = [
    { id: 'timeline', num: 1, icon: '◷', label: 'Correlate', sub: 'Entity graph', hint: 'See how the complaint links to accounts, transactions & devices' },
    { id: 'predict', num: 2, icon: '✦', label: 'AI Prediction', sub: 'Why + where', hint: 'See what the AI predicts and exactly why' },
    { id: 'riskZones', num: 3, icon: '◎', label: 'Cash-Out Map', sub: 'Predicted ATM', hint: 'See the predicted ATM on a real map' },
    { id: 'alerts', num: 4, icon: '⊕', label: 'Action Center', sub: 'LEA / bank alert', hint: 'See the tamper-evident alert trail' },
  ];

  return (
    <div className="story-rail">
      <div className="story-rail-steps">
        {steps.map((s) => (
          <button
            key={s.id}
            className={`story-rail-step ${activePanel === s.id ? 'active' : ''} ${completedSteps.has(s.id) ? 'done' : ''}`}
            onClick={() => onTogglePanel(s.id)}
            title={s.hint}
          >
            <span className="story-rail-num">{completedSteps.has(s.id) ? '✓' : s.num}</span>
            <span className="story-rail-icon">{s.icon}</span>
            <span className="story-rail-text">
              <span className="story-rail-label">{s.label}</span>
              <span className="story-rail-sub">{s.sub}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="story-rail-actions">
        <button
          className="toolbar-btn"
          onClick={() => onTogglePanel('database')}
          title="View the live relational database behind this graph"
        >
          <span>⌗</span> Database
        </button>
        <button
          className="toolbar-btn toolbar-btn-alert"
          onClick={onGenerateAlert}
          disabled={generating || !caseId}
        >
          {generating ? '⏳ Generating…' : '⊕ Generate Alert'}
        </button>
      </div>
    </div>
  );
}
