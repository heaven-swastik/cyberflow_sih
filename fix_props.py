import re

with open('frontend/src/components/CrimeGraph.jsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('export default function CrimeGraph({ caseId, timelineStep, maxStep, currentState }) {', 
              'export default function CrimeGraph({ caseId, timelineStep, maxStep, currentState, refreshTrigger }) {')

c = c.replace('}, [caseId]);', '}, [caseId, refreshTrigger]);')

with open('frontend/src/components/CrimeGraph.jsx', 'w', encoding='utf-8') as f:
    f.write(c)

with open('frontend/src/components/TimelineScrubber.jsx', 'r', encoding='utf-8') as f:
    c = f.read()
    
c = c.replace('export default function TimelineScrubber({ caseId, onStepChange, onStateChange, caseData, isOpen, onClose, autoPlay, inline = false }) {',
              'export default function TimelineScrubber({ caseId, onStepChange, onStateChange, caseData, isOpen, onClose, autoPlay, inline = false, refreshTrigger }) {')
c = c.replace('}, [caseId]);', '}, [caseId, refreshTrigger]);')

with open('frontend/src/components/TimelineScrubber.jsx', 'w', encoding='utf-8') as f:
    f.write(c)

with open('frontend/src/components/InvestigationCard.jsx', 'r', encoding='utf-8') as f:
    c = f.read()

card_id = '<div className="inv-case-id">{c.case_id}</div>'
card_id_new = """<div className="inv-case-id" style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
          {c.case_id}
          {c.case_id === 'CF-1042' && <span style={{fontSize: '0.65rem', background: '#e4483f22', color: '#e4483f', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e4483f55'}}>RL DEMO</span>}
        </div>"""
c = c.replace(card_id, card_id_new)

with open('frontend/src/components/InvestigationCard.jsx', 'w', encoding='utf-8') as f:
    f.write(c)

print('Done')
