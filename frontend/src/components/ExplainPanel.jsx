import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatPercent, formatINR } from '../utils/format';

const FEATURE_CATEGORIES = {
  Transaction: ['total_volume', 'tx_count', 'max_amount', 'velocity_tx_per_min', 'avg_tx_amount', 'failed_tx_ratio'],
  Graph: ['hop_depth', 'max_fan_out', 'convergence_ratio', 'betweenness_centrality', 'degree_centrality'],
  Behavioral: ['device_consistency_ratio', 'recurring_amount_ratio', 'time_since_last_tx', 'location_variance']
};

const FEATURE_TOOLTIPS = {
  total_volume: 'Total amount of money moved in the recent window.',
  tx_count: 'Number of transactions in the recent window.',
  max_amount: 'Largest single transaction amount.',
  velocity_tx_per_min: 'Speed of transactions (count per minute).',
  hop_depth: 'Distance in the network graph from known bad actors.',
  max_fan_out: 'Maximum number of outgoing connections from a single node.',
  convergence_ratio: 'How much funds funnel into a single account.',
  device_consistency_ratio: 'How often the same device is used.',
  recurring_amount_ratio: 'Ratio of transactions with identical amounts.'
};

function getCategory(featureName) {
  for (const [cat, feats] of Object.entries(FEATURE_CATEGORIES)) {
    if (feats.some(f => featureName.includes(f) || featureName === f)) return cat;
  }
  return 'Other';
}

function FeatureCategoryGroup({ category, features, maxMagnitude }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="explain-category">
      <div className="explain-category-header" onClick={() => setIsOpen(!isOpen)}>
        <span>{category} Features</span>
        <span className="explain-category-toggle">{isOpen ? '▼' : '▶'}</span>
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="explain-category-content"
          >
            {features.map((f, i) => {
              const isShap = f.shap_contribution != null;
              const magnitude = isShap ? Math.abs(f.shap_contribution) : f.model_importance;
              const pct = Math.round((magnitude / maxMagnitude) * 100);
              const increases = isShap ? f.direction === 'increases_risk' : true;
              
              const tooltipText = FEATURE_TOOLTIPS[f.feature] || 'Model feature evaluating risk behavior.';

              return (
                <motion.div
                  key={f.feature}
                  className="explain-feature-row wider"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                >
                  <div className="explain-feature-top" title={tooltipText}>
                    <span className="explain-feature-name" style={{ textDecoration: 'underline dotted rgba(255,255,255,0.3)', cursor: 'help' }}>
                      {f.feature.replace(/_/g, ' ')}
                    </span>
                    <span className="explain-feature-value">value: {f.value}</span>
                    <span
                      className="explain-feature-importance"
                      style={{ color: isShap ? (increases ? 'var(--severity-critical)' : 'var(--accent)') : undefined }}
                    >
                      {isShap ? `${increases ? '+' : '−'}${Math.abs(f.shap_contribution).toFixed(3)}` : formatPercent(f.model_importance)}
                    </span>
                  </div>
                  <div className="explain-feature-track">
                    <motion.div
                      className="explain-feature-fill"
                      style={isShap ? { background: increases ? 'var(--severity-critical)' : 'var(--accent)' } : undefined}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, delay: 0.1 + i * 0.05 }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ExplainContent({ caseData }) {
  const explanation = caseData?.explanation;
  const contributions = caseData?.risk_feature_contributions || [];

  const maxMagnitude = contributions.length > 0 
    ? Math.max(...contributions.map(c => c.shap_contribution != null ? Math.abs(c.shap_contribution) : (c.model_importance || 0)), 0.0001)
    : 1;

  const groupedContributions = contributions.reduce((acc, f) => {
    const cat = getCategory(f.feature);
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(f);
    return acc;
  }, {});

  return (
    <>
      <div className="explain-section-label">Signal checklist for this case</div>
      <div className="explain-list">
        {(explanation || []).map((item, i) => (
          <motion.div
            key={i}
            className="explain-item"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06, duration: 0.35 }}
          >
            <span className="explain-check">✓</span>
            <span>{item}</span>
          </motion.div>
        ))}
      </div>

      {contributions.length > 0 && (
        <>
          <div className="explain-section-label" style={{ marginTop: '24px' }}>
            Model Explanations (SHAP)
            <span className="explain-section-badge">SHAP</span>
          </div>
          
          <div className="explain-feature-groups">
            {Object.entries(groupedContributions).map(([cat, feats]) => (
              <FeatureCategoryGroup key={cat} category={cat} features={feats} maxMagnitude={maxMagnitude} />
            ))}
          </div>

          <div className="explain-feature-footnote">
            Exact Shapley (SHAP) decomposition of THIS case's risk score, grouped by feature type. 
            Red pushes the score up, green pulls it down. Hover over feature names for definitions.
          </div>
        </>
      )}
    </>
  );
}

export default function ExplainPanel({ caseData, isOpen, onClose, inline = false }) {
  const explanation = caseData?.explanation;
  if (!explanation || explanation.length === 0) return null;

  if (inline) {
    return (
      <div className="explain-inline">
        <ExplainContent caseData={caseData} />
      </div>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="right-drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <motion.div
            className="right-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="right-drawer-header">
              <div>
                <div className="right-drawer-title">AI Withdrawal Prediction</div>
                <div className="right-drawer-subtitle">
                  Every number below is produced by a real, trained model reading real
                  transaction features — not a scripted demo value.
                </div>
              </div>
              <button className="right-drawer-close" onClick={onClose}>
                ✕
              </button>
            </div>

            <div className="right-drawer-body">
              <ExplainContent caseData={caseData} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
