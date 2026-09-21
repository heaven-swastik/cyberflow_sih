import { useEffect, useState } from 'react';
import { getCases } from '../api';
import InvestigationCard from './InvestigationCard';

export default function CaseList({ onSelectCase }) {
  const [cases, setCases] = useState([]);

  useEffect(() => {
    getCases().then(setCases);
  }, []);

  if (cases.length === 0) return null;

  return (
    <section className="investigations-section">
      <h2 className="investigations-title">Active Investigations</h2>
      <div className="investigations-grid">
        {cases.map((c, i) => (
          <InvestigationCard key={c.case_id} caseItem={c} index={i} onSelect={onSelectCase} />
        ))}
      </div>
    </section>
  );
}
