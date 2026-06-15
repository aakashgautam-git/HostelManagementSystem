import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { apiError } from '../../api';
import { Card, money } from '../../components/ui';

// Student home: profile summary, current room, wallet balance and dues.
// Data comes from GET /students/me which joins the student_dues_view VIEW.
export default function Dashboard() {
  const [me, setMe] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/students/me')
      .then((r) => setMe(r.data))
      .catch((e) => setError(apiError(e)));
  }, []);

  if (error) return <div className="message message-error">{error}</div>;
  if (!me) return <p className="muted">Loading…</p>;

  return (
    <>
      <h1 className="page-title">Welcome, {me.name.split(' ')[0]} 👋</h1>

      <div className="grid grid-3">
        <div className="stat">
          <div className="label">Wallet balance</div>
          <div className="value">{money(me.balance)}</div>
        </div>
        <div className="stat">
          <div className="label">Total dues</div>
          <div className="value" style={{ color: me.total_due > 0 ? 'var(--bad)' : 'var(--ok)' }}>
            {money(me.total_due)}
          </div>
        </div>
        <div className="stat">
          <div className="label">Pending bills</div>
          <div className="value">{me.pending_bills}</div>
        </div>
      </div>

      <div className="grid grid-2 mt">
        <Card title="My Room">
          {me.room ? (
            <table>
              <tbody>
                <tr><th>Room</th><td>{me.room.room_number} (Block {me.room.block})</td></tr>
                <tr><th>Type</th><td>{me.room.room_type}</td></tr>
                <tr><th>Monthly rent</th><td>{money(me.room.monthly_rent)}</td></tr>
                <tr><th>Allocated on</th><td>{me.room.allocated_on}</td></tr>
              </tbody>
            </table>
          ) : (
            <p className="muted">No room allocated yet. Please contact the warden.</p>
          )}
        </Card>

        <Card title="My Profile">
          <table>
            <tbody>
              <tr><th>Name</th><td>{me.name}</td></tr>
              <tr><th>Email</th><td>{me.email}</td></tr>
              <tr><th>Phone</th><td>{me.phone || '—'}</td></tr>
              <tr><th>Course</th><td>{me.course || '—'} {me.year_of_study ? `(Year ${me.year_of_study})` : ''}</td></tr>
            </tbody>
          </table>
          <div className="mt">
            <Link className="btn btn-light btn-sm" to="/student/fees">Go to Fees</Link>{' '}
            <Link className="btn btn-light btn-sm" to="/student/meals">Book a Meal</Link>
          </div>
        </Card>
      </div>
    </>
  );
}
