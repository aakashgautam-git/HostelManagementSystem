import { useEffect, useState } from 'react';
import api, { apiError } from '../../api';
import { money } from '../../components/ui';

// Admin home: headline numbers from GET /admin/stats (one aggregated query).
export default function Dashboard() {
  const [s, setS] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/stats').then((r) => setS(r.data)).catch((e) => setError(apiError(e)));
  }, []);

  if (error) return <div className="message message-error">{error}</div>;
  if (!s) return <p className="muted">Loading…</p>;

  const tiles = [
    { label: 'Students', value: s.total_students },
    { label: 'Rooms', value: s.total_rooms },
    { label: 'Free beds', value: s.free_beds },
    { label: 'Open complaints', value: s.open_complaints },
    { label: 'Total outstanding', value: money(s.total_outstanding) },
    { label: 'Collected today', value: money(s.collected_today) },
  ];

  return (
    <>
      <h1 className="page-title">Admin Dashboard</h1>
      <div className="grid grid-3">
        {tiles.map((t) => (
          <div className="stat" key={t.label}>
            <div className="label">{t.label}</div>
            <div className="value">{t.value}</div>
          </div>
        ))}
      </div>
    </>
  );
}
