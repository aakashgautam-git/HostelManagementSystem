import { useEffect, useState } from 'react';
import api, { apiError } from '../../api';
import { Card, Badge, Message, money } from '../../components/ui';

// Generate monthly bills (generate_monthly_bill procedure) and view all bills.
export default function Billing() {
  const [students, setStudents] = useState([]);
  const [bills, setBills] = useState([]);
  const [studentId, setStudentId] = useState('');
  const [msg, setMsg] = useState(null);

  function load() {
    api.get('/students').then((r) => setStudents(r.data));
    api.get('/billing/bills').then((r) => setBills(r.data));
  }
  useEffect(() => { load(); }, []);

  async function generate(e) {
    e.preventDefault();
    setMsg(null);
    try {
      await api.post('/billing/generate', { student_id: Number(studentId) });
      setMsg({ type: 'success', text: 'Monthly bill generated (rent + mess + fines)' });
      load();
    } catch (err) { setMsg({ type: 'error', text: apiError(err) }); }
  }

  return (
    <>
      <h1 className="page-title">Billing</h1>
      <Message msg={msg} />

      <Card title="Generate monthly bill">
        <form className="row" onSubmit={generate}>
          <div className="field" style={{ flex: 3 }}>
            <label>Student</label>
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)} required>
              <option value="">Select…</option>
              {students.map((s) => <option key={s.student_id} value={s.student_id}>{s.name}</option>)}
            </select>
          </div>
          <div className="field" style={{ justifyContent: 'flex-end' }}>
            <label>&nbsp;</label>
            <button className="btn">Generate bill</button>
          </div>
        </form>
        <p className="muted" style={{ fontSize: '.82rem' }}>
          Calls the <code>generate_monthly_bill(student_id)</code> stored procedure for the current month.
        </p>
      </Card>

      <Card title="All bills">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Month</th><th>Student</th><th>Rent</th><th>Mess</th><th>Fines</th><th>Total</th><th>Paid</th><th>Status</th></tr>
            </thead>
            <tbody>
              {bills.map((b) => (
                <tr key={b.bill_id}>
                  <td>{String(b.bill_month).slice(0, 7)}</td>
                  <td>{b.student_name}</td>
                  <td>{money(b.rent_amount)}</td>
                  <td>{money(b.mess_amount)}</td>
                  <td>{money(b.fine_amount)}</td>
                  <td>{money(b.total_amount)}</td>
                  <td>{money(b.paid_amount)}</td>
                  <td><Badge value={b.status} /></td>
                </tr>
              ))}
              {!bills.length && <tr><td colSpan="8" className="empty">No bills yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
