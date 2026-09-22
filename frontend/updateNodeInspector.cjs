const fs = require('fs');
const path = 'e:/projects/CyberFlow_SIH_final - Copy/frontend/src/components/NodeInspector.jsx';
let content = fs.readFileSync(path, 'utf8');

const replacement = `        return (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', padding: '0 4px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#8a9390', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Classification</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 600, color: '#f4f7f5' }}>{typeBadge.toUpperCase()}</span>
                  <span style={{ background: 'rgba(228,72,63,0.15)', color: '#e4483f', fontSize: '0.7rem', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>KYC PENDING</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: '#8a9390', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Bank</div>
                <div style={{ fontWeight: 600, color: '#f4f7f5' }}>{bankName}</div>
              </div>
            </div>
            
            <div style={{ background: '#13231f', borderRadius: 10, padding: '1rem', border: '1px solid rgba(65, 220, 143, 0.15)', marginBottom: '1.2rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#8a9390', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Account ID</div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '1.1rem', color: '#41dc8f', fontWeight: 600, letterSpacing: '0.02em' }}>{node.id}</div>
            </div>

            {(isSink || highFanIn) && (
              <div style={{ background: 'rgba(228,72,63,0.1)', border: '1px solid rgba(228,72,63,0.3)', borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'center', color: '#e4483f', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1.2rem' }}>
                <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                {isSink ? 'Suspicious Sink Node Detected' : 'High Fan-In Account (Hub)'}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: '1.5rem' }}>
              <div style={{ background: '#13231f', borderRadius: 8, padding: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '0.7rem', color: '#8a9390', textTransform: 'uppercase', marginBottom: 6 }}>Total Inflow</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#41dc8f', fontFamily: 'IBM Plex Mono, monospace' }}>{formatINR(totalInflow)}</div>
              </div>
              <div style={{ background: '#13231f', borderRadius: 8, padding: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '0.7rem', color: '#8a9390', textTransform: 'uppercase', marginBottom: 6 }}>Total Outflow</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#e4483f', fontFamily: 'IBM Plex Mono, monospace' }}>{formatINR(totalOutflow)}</div>
              </div>
              <div style={{ background: '#13231f', borderRadius: 8, padding: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '0.7rem', color: '#8a9390', textTransform: 'uppercase', marginBottom: 6 }}>Net Flow</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f4f7f5', fontFamily: 'IBM Plex Mono, monospace' }}>{formatINR(netFlow)}</div>
              </div>
              <div style={{ background: '#13231f', borderRadius: 8, padding: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '0.7rem', color: '#8a9390', textTransform: 'uppercase', marginBottom: 6 }}>Connected</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f4f7f5', fontFamily: 'IBM Plex Mono, monospace' }}>{connectedAccounts.size} accounts</div>
              </div>
            </div>

            <div className="node-drawer-section">
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f4f7f5', marginBottom: '0.75rem' }}>Transaction History</div>
              <div className="node-drawer-table-wrapper">
                <table className="node-drawer-table">
                  <thead>
                    <tr>
                      <th>From → To</th>
                      <th>Amount</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allRelatedEdges.slice(0, 10).map((e, i) => {
                      const src = typeof e.source === 'object' ? e.source.id : e.source;
                      const tgt = typeof e.target === 'object' ? e.target.id : e.target;
                      return (
                        <tr key={i}>
                          <td className="monospace" title={\`\${src} → \${tgt}\`}>
                            {src.slice(0, 4)}... → {tgt.slice(0, 4)}...
                          </td>
                          <td>{formatINR(e.amount)}</td>
                          <td>{e.timestamp || 'Just now'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {node.type !== 'victim' && (
              <div className="node-drawer-actions">
                <button className="node-drawer-btn freeze" onClick={() => onFreeze(node.id)}>🧊 Freeze Account</button>
                <button className="node-drawer-btn flag" onClick={() => onFlag(node.id)}>🚩 Flag to Bank</button>
              </div>
            )}
          </>
        );
      } else if (node.type === 'complaint') {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#13231f', borderRadius: 10, padding: '1rem', border: '1px solid rgba(65, 220, 143, 0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#8a9390', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Case ID</div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '1.1rem', color: '#41dc8f', fontWeight: 600 }}>{node.id}</div>
                </div>
                <span style={{ background: 'rgba(65,220,143,0.15)', color: '#41dc8f', fontSize: '0.7rem', padding: '4px 8px', borderRadius: 6, fontWeight: 700 }}>ACTIVE</span>
              </div>
              <div style={{ display: 'flex', gap: 24 }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#8a9390', textTransform: 'uppercase', marginBottom: 4 }}>Filed Date</div>
                  <div style={{ fontSize: '0.9rem', color: '#f4f7f5', fontWeight: 500 }}>{node.date || '2026-09-21'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#8a9390', textTransform: 'uppercase', marginBottom: 4 }}>Fraud Type</div>
                  <div style={{ fontSize: '0.9rem', color: '#f4f7f5', fontWeight: 500 }}>{node.fraudType || 'UPI Fraud'}</div>
                </div>
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '1rem', fontSize: '0.85rem', color: '#f4f7f5', lineHeight: 1.5, borderLeft: '3px solid #5b8fd6' }}>
              {node.description || 'Victim reported unauthorized transfer of funds following a suspicious SMS link click.'}
            </div>
          </div>
        );
      } else if (node.type === 'device') {
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1', background: '#13231f', borderRadius: 10, padding: '1rem', border: '1px solid rgba(91, 143, 214, 0.2)' }}>
              <div style={{ fontSize: '0.75rem', color: '#8a9390', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Device ID</div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '1.1rem', color: '#5b8fd6', fontWeight: 600, letterSpacing: '0.02em' }}>{node.id}</div>
            </div>
            <div style={{ background: '#13231f', borderRadius: 8, padding: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '0.7rem', color: '#8a9390', textTransform: 'uppercase', marginBottom: 6 }}>Last Seen</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f4f7f5' }}>{node.zone || 'Zone 4'}</div>
            </div>
            <div style={{ background: '#13231f', borderRadius: 8, padding: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '0.7rem', color: '#8a9390', textTransform: 'uppercase', marginBottom: 6 }}>Time Ago</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f4f7f5' }}>{node.minutesAgo || '14 min'}</div>
            </div>
          </div>
        );
      } else if (node.type === 'atm') {
        const conf = node.confidence || 92;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#13231f', borderRadius: 10, padding: '1rem', border: '1px solid rgba(226, 149, 74, 0.2)' }}>
              <div style={{ fontSize: '0.75rem', color: '#8a9390', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>ATM ID</div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '1.1rem', color: '#e2954a', fontWeight: 600, letterSpacing: '0.02em' }}>{node.id}</div>
            </div>
            <div style={{ background: '#13231f', borderRadius: 8, padding: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '0.7rem', color: '#8a9390', textTransform: 'uppercase', marginBottom: 6 }}>Bank Name</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f4f7f5', marginBottom: '1rem' }}>{node.bank || 'HDFC Bank'}</div>
              <div style={{ fontSize: '0.7rem', color: '#8a9390', textTransform: 'uppercase', marginBottom: 6 }}>Address / City</div>
              <div style={{ fontSize: '0.85rem', color: '#f4f7f5', lineHeight: 1.4 }}>{node.address || 'Koramangala, Bengaluru'}</div>
            </div>
            
            <div style={{ background: 'rgba(65, 220, 143, 0.05)', borderRadius: 8, padding: '1rem', border: '1px solid rgba(65, 220, 143, 0.15)', marginTop: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#8a9390', textTransform: 'uppercase' }}>Prediction Confidence</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#41dc8f' }}>{conf}%</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#41dc8f', width: \`\${conf}%\`, borderRadius: 3 }} />
              </div>
            </div>
            
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f4f7f5', marginBottom: '0.75rem', paddingLeft: 4 }}>Reasoning Factors</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {['High zone confidence (Device proximity)', 'Historical withdrawal patterns match', 'Multiple mule accounts geolocated nearby'].map((factor, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: 6 }}>
                    <span style={{ color: '#41dc8f', fontSize: '0.8rem', marginTop: 1 }}>✓</span>
                    <span style={{ fontSize: '0.8rem', color: '#f4f7f5', lineHeight: 1.4 }}>{factor}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }
`;

const lines = content.split('\n');
const startIdx = lines.findIndex((l, i) => l.includes('return (') && lines[i+1]?.includes('<>'));
let endIdx = -1;
for (let i = startIdx + 1; i < lines.length; i++) {
  if (lines[i].includes('return null;')) {
    endIdx = i;
    break;
  }
}

if (startIdx !== -1 && endIdx !== -1) {
  const newLines = [
    ...lines.slice(0, startIdx),
    replacement,
    ...lines.slice(endIdx)
  ];
  fs.writeFileSync(path, newLines.join('\n'));
  console.log('Successfully replaced node properties layout!');
} else {
  console.log('Could not find start or end index', startIdx, endIdx);
}
