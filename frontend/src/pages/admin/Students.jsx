import { useEffect, useState } from 'react';
import api, { apiError } from '../../api';
import { Card, Message, money } from '../../components/ui';

// Admin view of every student with their dues (student_dues_view), plus actions:
// allocate a room (allocate_room procedure), vacate (bed trigger) and add a fine.
export default function Students() {
  const [students, setStudents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [allocs, setAllocs] = useState([]);
  const [alloc, setAlloc] = useState({ student_id: '', room_id: '' });
  const [fine, setFine] = useState({ student_id: '', reason: '', amount: '' });
  const [msg, setMsg] = useState(null);

  function load() {
    api.get('/students').then((r) => setStudents(r.data));
    api.get('/rooms').then((r) => setRooms(r.data));
    api.get('/rooms/allocations').then((r) => setAllocs(r.data));
  }
  useEffect(() => { load(); }, []);

  async function allocate(e) {
    e.preventDefault();
    setMsg(null);
    try {
      await api.post('/rooms/allocate', {
        student_id: Number(alloc.student_id), room_id: Number(alloc.room_id),
      });
      setMsg({ type: 'success', text: 'Room allocated' });
      setAlloc({ student_id: '', room_id: '' });
      load();
    } catch (err) { setMsg({ type: 'error', text: apiError(err) }); }
  }

  async function vacate(student_id) {
    setMsg(null);
    try {
      await api.post('/rooms/vacate', { student_id });
      setMsg({ type: 'success', text: 'Allocation vacated' });
      load();
    } catch (err) { setMsg({ type: 'error', text: apiError(err) }); }
  }

  async function addFine(e) {
    e.preventDefault();
    setMsg(null);
    try {
      await api.post('/billing/fines', {
        student_id: Number(fine.student_id), reason: fine.reason, amount: Number(fine.amount),
      });
      setMsg({ type: 'success', text: 'Fine added' });
      setFine({ student_id: '', reason: '', amount: '' });
      load();
    } catch (err) { setMsg({ type: 'error', text: apiError(err) }); }
  }

  const freeRooms = rooms.filter((r) => r.available_beds > 0);
  // map student_id -> their active allocation, to show the Room column and to
  // only offer "Vacate" for students who actually have a room.
  const roomOf = {};
  allocs.forEach((a) => { roomOf[a.student_id] = a; });

  return (
    <>
      <h1 className="page-title">Students</h1>
      <Message msg={msg} />

      <div className="grid grid-2">
        <Card title="Allocate room">
          <form onSubmit={allocate}>
            <div className="field">
              <label>Student</label>
              <select value={alloc.student_id} onChange={(e) => setAlloc({ ...alloc, student_id: e.target.value })} required>
                <option value="">Select…</option>
                {students.map((s) => <option key={s.student_id} value={s.student_id}>{s.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Room (free beds)</label>
              <select value={alloc.room_id} onChange={(e) => setAlloc({ ...alloc, room_id: e.target.value })} required>
                <option value="">Select…</option>
                {freeRooms.map((r) => (
                  <option key={r.room_id} value={r.room_id}>
                    {r.room_number} · {r.block} · {r.available_beds} free · {money(r.monthly_rent)}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn">Allocate</button>
          </form>
        </Card>

        <Card title="Add fine">
          <form onSubmit={addFine}>
            <div className="field">
              <label>Student</label>
              <select value={fine.student_id} onChange={(e) => setFine({ ...fine, student_id: e.target.value })} required>
                <option value="">Select…</option>
                {students.map((s) => <option key={s.student_id} value={s.student_id}>{s.name}</option>)}
              </select>
            </div>
            <div className="row">
              <div className="field" style={{ flex: 3 }}>
                <label>Reason</label>
                <input value={fine.reason} onChange={(e) => setFine({ ...fine, reason: e.target.value })} required />
              </div>
              <div className="field">
                <label>Amount</label>
                <input type="number" min="1" value={fine.amount} onChange={(e) => setFine({ ...fine, amount: e.target.value })} required />
              </div>
            </div>
            <button className="btn">Add fine</button>
          </form>
        </Card>
      </div>

      <Card title="All students & dues">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>ID</th><th>Name</th><th>Course</th><th>Room</th><th>Wallet</th><th>Total due</th><th>Pending</th><th>Action</th></tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const room = roomOf[s.student_id];
                return (
                  <tr key={s.student_id}>
                    <td>{s.student_id}</td>
                    <td>{s.name}</td>
                    <td>{s.course || '—'}</td>
                    <td>{room
                      ? <span className="badge badge-info">{room.room_number}</span>
                      : <span className="muted">—</span>}</td>
                    <td>{money(s.balance)}</td>
                    <td style={{ color: s.total_due > 0 ? 'var(--bad)' : 'inherit' }}>{money(s.total_due)}</td>
                    <td>{s.pending_bills}</td>
                    <td>{room
                      ? <button className="btn btn-danger btn-sm" onClick={() => vacate(s.student_id)}>Vacate</button>
                      : <span className="muted" style={{ fontSize: '.8rem' }}>not allocated</span>}</td>
                  </tr>
                );
              })}
              {!students.length && <tr><td colSpan="8" className="empty">No students.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
