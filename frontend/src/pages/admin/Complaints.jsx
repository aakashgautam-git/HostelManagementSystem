import { useEffect, useState } from 'react';
import api, { apiError } from '../../api';
import { Card, Badge, Message } from '../../components/ui';

// Admin resolves complaints. Marking 'resolved' makes the DB trigger stamp
// resolved_at automatically.
export default function Complaints() {
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState(null);

  const load = () => api.get('/complaints').then((r) => setRows(r.data));
  useEffect(() => { load(); }, []);

  async function update(c, status) {
    setMsg(null);
    const remark = status === 'resolved'
      ? window.prompt('Resolution remark (optional):', c.admin_remark || '') ?? c.admin_remark
      : c.admin_remark;
    try {
      await api.put(`/complaints/${c.complaint_id}/status`, { status, admin_remark: remark });
      setMsg({ type: 'success', text: `Complaint #${c.complaint_id} marked ${status}` });
      load();
    } catch (err) { setMsg({ type: 'error', text: apiError(err) }); }
  }

  return (
    <>
      <h1 className="page-title">Complaints</h1>
      <Message msg={msg} />

      <Card title="All complaints">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>#</th><th>Student</th><th>Subject</th><th>Category</th><th>Status</th><th>Raised</th><th>Resolved</th><th>Action</th></tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.complaint_id}>
                  <td>{c.complaint_id}</td>
                  <td>{c.student_name}</td>
                  <td>
                    {c.subject}
                    {c.description && <div className="muted" style={{ fontSize: '.8rem' }}>{c.description}</div>}
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{c.category}</td>
                  <td><Badge value={c.status} /></td>
                  <td>{String(c.created_at).slice(0, 10)}</td>
                  <td>{c.resolved_at ? String(c.resolved_at).slice(0, 10) : '—'}</td>
                  <td>
                    {c.status !== 'in_progress' && c.status !== 'resolved' && (
                      <button className="btn btn-light btn-sm" onClick={() => update(c, 'in_progress')}>Start</button>
                    )}{' '}
                    {c.status !== 'resolved' && (
                      <button className="btn btn-sm" onClick={() => update(c, 'resolved')}>Resolve</button>
                    )}
                  </td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan="8" className="empty">No complaints.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
