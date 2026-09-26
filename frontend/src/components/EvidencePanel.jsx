import React, { useState, useEffect } from 'react';

export default function EvidencePanel({ caseId, caseData }) {
  const [proofData, setProofData] = useState(null);

  useEffect(() => {
    fetch('/api/model-proof', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('cyberflow_token')}` }
    })
      .then(r => r.json())
      .then(data => setProofData(data))
      .catch(e => console.error(e));
  }, []);

  if (!proofData) return null;

  const proof = proofData.model_proof;
  const zoneAcc = proof?.test_metrics?.zone_classifier_accuracy;
  const baseline = proof?.test_metrics?.naive_fraud_type_lookup_baseline_accuracy;
  const hash = caseData?.alert?.alert_hash || 'Pending dispatch';

  return (
    <div className="action-final-section" style={{ marginTop: 24, border: '1px solid rgba(65,220,143,0.3)', borderRadius: 8, padding: 16, background: '#13231f' }}>
      <h3 style={{ color: '#41dc8f', margin: '0 0 12px 0' }}>Evidence & Cryptographic Proof</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: '0.85rem' }}>
        <div>
          <div style={{ color: '#8a9390', marginBottom: 4 }}>MODEL PROVENANCE (SHA-256)</div>
          {proof?.model_files && Object.entries(proof.model_files).map(([name, h]) => (
            <div key={name} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span>{name}</span>
              <span style={{ fontFamily: 'monospace', color: '#5b8fd6' }}>{h.substring(0, 16)}...</span>
            </div>
          ))}
        </div>
        
        <div>
          <div style={{ color: '#8a9390', marginBottom: 4 }}>ZONE CLASSIFIER VALIDATION</div>
          <div style={{ marginBottom: 4 }}>Model Accuracy: <strong>{zoneAcc ? (zoneAcc * 100).toFixed(1) + '%' : 'N/A'}</strong></div>
          <div>Naive Baseline: <strong>{baseline ? (baseline * 100).toFixed(1) + '%' : 'N/A'}</strong></div>
          <div style={{ marginTop: 8, color: '#8a9390' }}>ALERT HASH CHAIN LINK</div>
          <div style={{ fontFamily: 'monospace', color: '#e2954a', wordBreak: 'break-all' }}>{hash}</div>
        </div>
      </div>
    </div>
  );
}
