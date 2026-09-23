import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getDbPreview } from '../api';

const CHAIN = ['Complainant', 'Complaint', 'Account', 'Transaction', 'Device', 'ATM', 'WithdrawalHistory'];

function DatabaseContent() {
  const [preview, setPreview] = useState(null);
  const [activeQuery, setActiveQuery] = useState(0);

  useEffect(() => {
    getDbPreview().then(setPreview).catch(() => setPreview({ tables: [], sample_queries: [] }));
  }, []);

  if (!preview) {
    return <div style={{ color: 'var(--text-muted)', padding: '20px 0' }}>Loading schema…</div>;
  }

  return (
    <>
      <div className="db-chain-row">
        {CHAIN.map((t, i) => (
          <span key={t} className="db-chain-step">
            <span className="db-chain-table">{t}</span>
            {i < CHAIN.length - 1 && <span className="db-chain-arrow">→</span>}
          </span>
        ))}
      </div>

      <div className="db-table-grid">
        {preview.tables.map((t) => (
          <div key={t.name} className="db-table-card">
            <div className="db-table-name">{t.name}</div>
            <div className="db-table-count">{t.row_count} rows</div>
            <div className="db-table-cols">{t.columns.join(', ')}</div>
          </div>
        ))}
      </div>

      {preview.sample_queries.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div className="db-query-tabs">
            {preview.sample_queries.map((q, i) => (
              <button
                key={i}
                className={`db-query-tab ${activeQuery === i ? 'active' : ''}`}
                onClick={() => setActiveQuery(i)}
              >
                {q.title}
              </button>
            ))}
          </div>

          {preview.sample_queries[activeQuery] && (
            <>
              <pre className="db-query-sql">{preview.sample_queries[activeQuery].sql}</pre>
              <div className="db-query-results">
                <table>
                  <thead>
                    <tr>
                      {preview.sample_queries[activeQuery].columns.map((c) => (
                        <th key={c}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.sample_queries[activeQuery].rows.map((row, i) => (
                      <tr key={i}>
                        {preview.sample_queries[activeQuery].columns.map((c) => (
                          <td key={c}>{String(row[c] ?? '—')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      <div className="db-honesty-note">
        All rows shown are synthetic demo data generated for this prototype — no
        NCRP / I4C / bank data is used or claimed.
      </div>
    </>
  );
}

export default function DatabasePanel({ isOpen, onClose, inline = false }) {
  // Inline mode: render content directly without modal overlay
  if (inline) {
    return (
      <div className="database-inline">
        <DatabaseContent />
      </div>
    );
  }

  // Modal mode (original behavior)
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="overlay-backdrop" onClick={onClose} style={{ zIndex: 1000 }}>
          <motion.div
            className="overlay-panel"
            style={{ maxWidth: '780px', width: '100%', margin: '0 auto' }}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="overlay-panel-header">
              <div>
                <h3 className="overlay-panel-title">Database — Live Relational Schema</h3>
                <p className="overlay-panel-subtitle">
                  This isn't a mockup — these are real row counts and a real SQL query run
                  against the actual database powering this demo, live.
                </p>
              </div>
              <button className="overlay-close-btn" onClick={onClose}>×</button>
            </div>

            <div className="overlay-panel-content" style={{ padding: '20px' }}>
              <DatabaseContent />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
