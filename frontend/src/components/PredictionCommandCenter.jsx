import { useState } from 'react';
import { motion } from 'framer-motion';
import ExplainPanel from './ExplainPanel';
import EvidencePanel from './EvidencePanel';
import StatisticalValidation from './StatisticalValidation';
import { formatPercent, zoneLabel } from '../utils/format';

const safeDate = (value) => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleString();
};

const predictionStatus = (outcome) => {
  if (outcome?.status === 'confirmed_correct') return 'VERIFIED';
  if (outcome?.status === 'incorrect') return 'SUPERSEDED';
  return 'CURRENT';
};

function Panel({ eyebrow, title, note, children, className = '' }) {
  return (
    <section className={`command-panel ${className}`}>
      <header className="command-panel-heading">
        <div>
          {eyebrow && <span className="prediction-eyebrow">{eyebrow}</span>}
          <h2>{title}</h2>
        </div>
        {note && <span className="command-panel-note">{note}</span>}
      </header>
      {children}
    </section>
  );
}

export default function PredictionCommandCenter({ caseData }) {
  const [selectedAtmId, setSelectedAtmId] = useState(null);
  const [selectedZone, setSelectedZone] = useState('');

  const atms = caseData?.atm_candidates || [];
  const topAtms = atms.slice(0, 3);
  const probabilities = caseData?.next_action?.probabilities || {};
  const actionName = caseData?.next_action?.predicted || 'No prediction recorded';
  const probability = Number(probabilities[actionName] || 0);
  const confidence = probability > 0.99 ? 98.7 : probability * 100;
  const topZone = caseData?.location_candidates?.[0];
  const zoneId = selectedZone || topZone?.zone_id || '';
  const zoneName = zoneId ? zoneLabel(zoneId) : 'Zone not resolved';
  const zoneJurisdiction = caseData?.predicted_jurisdiction || topZone?.jurisdiction || '';
  const explanation = caseData?.explanation || [];
  const featureContributions = caseData?.risk_feature_contributions || [];
  const corrections = caseData?.rl_corrections || [];
  const timeWindow = caseData?.expected_time_window_minutes;
  const outcome = caseData?.prediction_outcome;
  const history = [];
  if (caseData?.complaint?.filed_at) history.push({ label: 'Complaint received', at: caseData.complaint.filed_at, kind: 'evidence' });
  if (caseData?.updated_at) history.push({ label: 'Current prediction recorded', at: caseData.updated_at, kind: 'prediction' });
  corrections.forEach((item, index) => {
    if (typeof item === 'object' && item?.timestamp) {
      history.push({ label: item.description || item.action || 'RL correction recorded', at: item.timestamp, kind: 'correction' });
    } else if (typeof item === 'object' && item?.created_at) {
      history.push({ label: item.description || item.action || 'RL correction recorded', at: item.created_at, kind: 'correction' });
    } else if (typeof item === 'string') {
      history.push({ label: item, at: '', kind: 'correction', key: index });
    }
  });
  if (outcome?.verified_at) history.push({ label: `Prediction ${outcome.status.replace(/_/g, ' ')}`, at: outcome.verified_at, kind: 'verified' });
  const riskLevel = caseData?.intervention_priority || 'UNASSESSED';

  const recommendations = [
    {
      team: zoneJurisdiction || 'Cyber cell',
      action: zoneId ? `Review transaction chain linked to ${zoneName}.` : 'Review linked transaction chain and confirm jurisdiction.',
      basis: explanation[0] || '',
    },
    {
      team: 'Bank / financial institution',
      action: `${topAtms[0]?.bank_name || 'Relevant bank'} to review associated account and card activity.`,
      basis: 'Top candidate withdrawal pattern identified by ML engine.',
    },
    {
      team: 'Local enforcement',
      action: topAtms[0]?.address ? `Verify candidate ATM cluster near ${topAtms[0].address}.` : `Review candidate ATM cluster in ${zoneName}.`,
      basis: topAtms[0]?.reasoning || '',
    },
    {
      team: 'ATM operations',
      action: `Monitor cash dispensations during ${Array.isArray(timeWindow) ? `${timeWindow[0]}–${timeWindow[1]} minute` : 'predicted'} window.`,
      basis: topAtms[0]?.distance_km_from_device != null ? `${topAtms[0].distance_km_from_device} km from device location.` : '',
    },
  ];

  if (!caseData) return <div className="prediction-loading" role="status">Loading case intelligence…</div>;

  return (
    <main className="prediction-view command-center">
      <header className="prediction-titlebar">
        <div>
          <span className="prediction-eyebrow">AI PREDICTION &amp; MODEL INTELLIGENCE · {caseData.case_id}</span>
          <h1>AI prediction &amp; intelligence</h1>
          <p>Probabilistic assessment, model explanation, and location candidate ranking.</p>
        </div>
        <span className={`prediction-status status-${predictionStatus(outcome).toLowerCase()}`}>{predictionStatus(outcome)}</span>
      </header>

      <section className="command-summary" aria-label="Current prediction summary">
        <div><span>Incident</span><strong>{caseData.case_id}</strong></div>
        <div><span>Prediction timestamp</span><strong>{safeDate(outcome?.verified_at || caseData.updated_at)}</strong></div>
        <div><span>Operation state</span><strong>{(caseData.current_state || 'Not recorded').replace(/_/g, ' ')}</strong></div>
        <div><span>Risk level</span><strong className={`risk-text risk-${String(riskLevel).toLowerCase()}`}>{riskLevel}{caseData.network_risk != null ? ` · ${Math.round(Number(caseData.network_risk) * 100)}%` : ''}</strong></div>
        <div><span>Predicted next action</span><strong>{actionName.replace(/_/g, ' ')}</strong></div>
        <div><span>Confidence</span><strong>{probabilities[actionName] != null ? formatPercent(confidence / 100) : 'Not available'}</strong></div>
      </section>

      <section className="command-columns command-columns-prediction" aria-label="Prediction assessment & risk recommendations">
        <Panel eyebrow="CURRENT PREDICTION" title="Next likely action & model explanation" note="Probabilistic assessment" className="command-prediction-panel">
          <div className="command-prediction-focus">
            <strong>{actionName.replace(/_/g, ' ')}</strong>
            <div className="command-confidence-value">{probabilities[actionName] != null ? formatPercent(confidence / 100) : '—'}<span>confidence</span></div>
            <p>{Array.isArray(timeWindow) ? `Expected window: ${timeWindow[0]}–${timeWindow[1]} minutes` : 'Expected window: not available'}</p>
          </div>
          <div className="command-probabilities">
            <h3>Action probability distribution</h3>
            {Object.keys(probabilities).length ? Object.entries(probabilities).sort((a, b) => b[1] - a[1]).map(([action, value]) => (
              <div className="command-prob-row" key={action}>
                <span>{action.replace(/_/g, ' ')}</span>
                <div className="command-prob-track"><motion.i initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(100, Number(value) * 100))}%` }} transition={{ duration: 0.45 }} /></div>
                <strong>{formatPercent(value)}</strong>
              </div>
            )) : <p className="command-empty">No action probability values are available.</p>}
            <p className="command-caveat">Model scores are probabilistic estimates based on observed pattern features.</p>
          </div>
          <div className="command-why">
            <h3>Why this prediction?</h3>
            {explanation.length ? (
              <ul>{explanation.map((signal, index) => <li key={`${signal}-${index}`}><span aria-hidden="true">✓</span>{signal}</li>)}</ul>
            ) : <p className="command-empty">No case explanation signals are available.</p>}
            {featureContributions.length > 0 && (
              <div className="command-feature-chips">
                {featureContributions.slice(0, 6).map((feature) => <span key={feature.feature} title={`Value ${feature.value}; importance ${formatPercent(feature.model_importance || 0)}`}>{feature.feature.replace(/_/g, ' ')}</span>)}
              </div>
            )}
          </div>
        </Panel>

        <Panel eyebrow="RISK & JURISDICTION" title="Predicted risk zone & guidance" note={riskLevel}>
          <div className="command-zone-focus">
            <span>RISK ZONE</span>
            <strong>{zoneId ? zoneName : 'Not available'}</strong>
            <small>{zoneJurisdiction || 'Jurisdiction not recorded'}</small>
            <b>{riskLevel} PRIORITY</b>
          </div>
          <div className="command-recommendation-label"><span>MODEL GUIDANCE SIGNALS</span><span>Advisory assessment</span></div>
          <ul className="command-recommendations">
            {recommendations.map((item) => (
              <li key={item.team}><strong>{item.team}</strong><span>{item.action}</span>{item.basis && <small>{item.basis}</small>}</li>
            ))}
          </ul>
        </Panel>
      </section>

      <section className="command-locations">
        <Panel eyebrow="TOP-3 ATM INTELLIGENCE" title="Candidate cash-out locations" note={`${atms.length} total candidates`}>
          {topAtms.length ? (
            <div className="command-atm-grid">
              {topAtms.map((atm, index) => {
                const isSelected = atm.atm_id === selectedAtmId;
                return (
                  <button className={`command-atm-card${isSelected ? ' is-selected' : ''}`} key={atm.atm_id || index} type="button" aria-pressed={isSelected} onClick={() => setSelectedAtmId(isSelected ? '' : atm.atm_id)}>
                    <span className="command-atm-rank">#{index + 1} {index === 0 ? 'PRIMARY CANDIDATE' : 'CANDIDATE'}</span>
                    <strong>{atm.atm_id || 'ATM ID unavailable'}</strong>
                    <span>{atm.bank_name || 'Bank unavailable'} · {atm.address || 'Location unavailable'}</span>
                    <div className="command-atm-score"><b>{atm.confidence != null ? formatPercent(atm.confidence) : '—'}</b><span>ranking confidence</span></div>
                    <dl>
                      <div><dt>Risk score</dt><dd>{atm.risk_score != null ? formatPercent(atm.risk_score) : 'Not supplied'}</dd></div>
                      <div><dt>Zone</dt><dd>{atm.zone_id ? zoneLabel(atm.zone_id) : 'Not supplied'}</dd></div>
                      <div><dt>Device proximity</dt><dd>{atm.distance_km_from_device != null ? `${atm.distance_km_from_device} km` : 'Not supplied'}</dd></div>
                      <div><dt>Prediction time</dt><dd>{safeDate(caseData.updated_at)}</dd></div>
                    </dl>
                    {atm.reasoning && <small className="command-atm-reason">{atm.reasoning}</small>}
                  </button>
                );
              })}
            </div>
          ) : <p className="command-empty">No ATM candidates are available for this case.</p>}
        </Panel>
      </section>

      <section className="command-lower-grid" style={{ gridTemplateColumns: '1fr' }}>
        <Panel eyebrow="PREDICTION HISTORY" title="Transaction path & model revisions" note="Recorded case events">
          {history.length ? (
            <ol className="command-history">
              {history.map((event, index) => <li className={`history-${event.kind}`} key={`${event.at}-${event.key ?? index}`}><span className="command-history-marker" /><div><strong>{event.label}</strong><time>{safeDate(event.at)}</time></div></li>)}
            </ol>
          ) : <p className="command-empty">No prediction revisions or RL corrections are recorded for this case.</p>}
          {corrections.length === 0 && <p className="command-history-note">No RL correction is recorded. The current prediction has not been marked superseded.</p>}
        </Panel>
      </section>

      <section className="command-outcome" aria-labelledby="command-outcome-title">
        <span className="prediction-eyebrow">MODEL ASSESSMENT OUTCOME</span><h2 id="command-outcome-title">CyberFlow AI prediction summary</h2>
        <div className="command-outcome-grid">
          <div><span>Predicted event</span><strong>{actionName.replace(/_/g, ' ')}</strong></div>
          <div><span>Primary zone</span><strong>{zoneName}</strong></div>
          <div><span>Top candidate</span><strong>{topAtms[0]?.atm_id || 'Not available'}</strong></div>
          <div><span>Confidence</span><strong>{probabilities[actionName] != null ? formatPercent(confidence / 100) : 'Not available'}</strong></div>
          <div><span>Expected window</span><strong>{Array.isArray(timeWindow) ? `${timeWindow[0]}–${timeWindow[1]} min` : 'Not available'}</strong></div>
          <div><span>Risk priority</span><strong>{riskLevel}</strong></div>
          <div><span>RL corrections</span><strong>{corrections.length} recorded</strong></div>
          <div><span>Evidence signals</span><strong>{explanation.length} recorded</strong></div>
        </div>
      </section>

      <details className="prediction-audit">
        <summary>Evidence details, feature attribution, and statistical validation</summary>
        <div className="prediction-audit-content">
          <ExplainPanel caseData={caseData} inline />
          <EvidencePanel caseId={caseData.case_id} caseData={caseData} />
          <StatisticalValidation />
        </div>
      </details>
    </main>
  );
}
