import { useEffect, useState } from 'react';
import { getOverview } from '../api';
import { formatINR } from '../utils/format';
import KpiCard from './KpiCard';

const tiles = [
  {
    key: 'active_cases',
    label: 'Active Cases',
    icon: '◎',
    className: 'kpi-cases',
    sub: 'Across current investigations',
  },
  {
    key: 'high_priority',
    label: 'High Priority',
    icon: '▲',
    className: 'kpi-priority',
    sub: 'Requires immediate review',
  },
  {
    key: 'predicted_cashout',
    label: 'Predicted Cash-outs',
    icon: '⏱',
    className: 'kpi-cashout',
    sub: 'Expected soon',
  },
  {
    key: 'potential_exposure_inr',
    label: 'Potential Exposure',
    icon: '◈',
    className: 'kpi-exposure',
    sub: 'Across active cases',
    formatter: formatINR,
  },
];

export default function OverviewBar() {
  const [data, setData] = useState(null);

  useEffect(() => {
    getOverview().then(setData);
  }, []);

  if (!data) return null;

  return (
    <div className="kpi-grid">
      {tiles.map((tile, i) => (
        <KpiCard key={tile.key} tile={tile} value={data[tile.key]} index={i} />
      ))}
    </div>
  );
}
