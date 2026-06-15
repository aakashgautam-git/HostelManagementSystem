import { useEffect, useState } from 'react';
import api, { apiError } from '../../api';
import { Card, Badge, Message } from '../../components/ui';

const CATEGORIES = ['maintenance', 'mess', 'cleanliness', 'wifi', 'other'];

// Raise complaints and track their status. The DB trigger forces every new
// complaint to start as 'pending' with a server timestamp.
export default function Complaints() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ category: 'maintenance', subject: '', description: '' });
  const [msg, setMsg] = useState(null);

  const load = () => api.get('/complaints/me').then((r) => setRows(r.data));
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    try {
      await api.post('/complaints', form);
      setForm({ category: 'maintenance', subject: '', description: '' });
      setMsg({ type: 'success', text: 'Complaint submitted' });
      load();
    } catch (err) { setMsg({ type: 'error', text: apiError(err) }); }
  }

  return (
    <>
      <h1 className="page-title">Complaints</h1>
      <Message msg={msg} />

      <Card title="Raise a complaint">
        <form onSubmit={submit}>
          <div className="row">
            <div className="field">
              <label>Category</label>
              <select value={form.category} onChange={set('category')}>
                {CATEGORIES.map((c) => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>)}
              </select>
            </div>
            <div className="field" style={{ flex: 3 }}>
              <label>Subject</label>
              <input value={form.subject} onChange={set('subject')} required />
            </div>
          </div>
          <div className="field">
            <label>Description</label>
            <textarea rows="3" value={form.description} onChange={set('description')} />
          </div>
          <button className="btn">Submit complaint</button>
        </form>
      </Card>

      <Card title="My complaints">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Subject</th><th>Category</th><th>Status</th><th>Raised</th><th>Remark</th></tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.complaint_id}>
                  <td>{c.subject}</td>
                  <td style={{ textTransform: 'capitalize' }}>{c.category}</td>
                  <td><Badge value={c.status} /></td>
                  <td>{String(c.created_at).slice(0, 10)}</td>
                  <td className="muted">{c.admin_remark || '—'}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan="5" className="empty">No complaints raised.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
