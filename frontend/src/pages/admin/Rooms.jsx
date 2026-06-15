import { useEffect, useState } from 'react';
import api, { apiError } from '../../api';
import { Card, Badge, Message, money } from '../../components/ui';

const EMPTY = { room_number: '', block: '', floor: 1, room_type: 'double', capacity: 2, monthly_rent: 5000 };

// List rooms (room_occupancy_view) + create new rooms + see current allocations.
export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [allocs, setAllocs] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [msg, setMsg] = useState(null);

  function load() {
    api.get('/rooms').then((r) => setRooms(r.data));
    api.get('/rooms/allocations').then((r) => setAllocs(r.data));
  }
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function create(e) {
    e.preventDefault();
    setMsg(null);
    try {
      await api.post('/rooms', {
        ...form,
        floor: Number(form.floor), capacity: Number(form.capacity), monthly_rent: Number(form.monthly_rent),
      });
      setMsg({ type: 'success', text: `Room ${form.room_number} created` });
      setForm(EMPTY);
      load();
    } catch (err) { setMsg({ type: 'error', text: apiError(err) }); }
  }

  // Free a student's bed -> POST /rooms/vacate (the +bed trigger runs in the DB).
  async function vacate(student_id, name) {
    setMsg(null);
    try {
      await api.post('/rooms/vacate', { student_id });
      setMsg({ type: 'success', text: `${name} vacated — bed freed` });
      load();
    } catch (err) { setMsg({ type: 'error', text: apiError(err) }); }
  }

  return (
    <>
      <h1 className="page-title">Rooms</h1>
      <Message msg={msg} />

      <Card title="Add room">
        <form onSubmit={create}>
          <div className="row">
            <div className="field"><label>Room number</label><input value={form.room_number} onChange={set('room_number')} required /></div>
            <div className="field"><label>Block</label><input value={form.block} onChange={set('block')} required /></div>
            <div className="field"><label>Floor</label><input type="number" value={form.floor} onChange={set('floor')} /></div>
          </div>
          <div className="row">
            <div className="field">
              <label>Type</label>
              <select value={form.room_type} onChange={set('room_type')}>
                <option value="single">Single</option>
                <option value="double">Double</option>
                <option value="triple">Triple</option>
                <option value="dormitory">Dormitory</option>
              </select>
            </div>
            <div className="field"><label>Capacity</label><input type="number" min="1" value={form.capacity} onChange={set('capacity')} required /></div>
            <div className="field"><label>Monthly rent</label><input type="number" min="0" value={form.monthly_rent} onChange={set('monthly_rent')} required /></div>
          </div>
          <button className="btn">Create room</button>
        </form>
      </Card>

      <Card title="Rooms & occupancy">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Room</th><th>Block</th><th>Type</th><th>Capacity</th><th>Occupied</th><th>Free</th><th>Rent</th><th>Status</th></tr>
            </thead>
            <tbody>
              {rooms.map((r) => (
                <tr key={r.room_id}>
                  <td>{r.room_number}</td>
                  <td>{r.block}</td>
                  <td style={{ textTransform: 'capitalize' }}>{r.room_type}</td>
                  <td>{r.capacity}</td>
                  <td>{r.occupied_beds}</td>
                  <td>{r.available_beds}</td>
                  <td>{money(r.monthly_rent)}</td>
                  <td><Badge value={r.status} /></td>
                </tr>
              ))}
              {!rooms.length && <tr><td colSpan="8" className="empty">No rooms.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Current allocations">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Room</th><th>Block</th><th>Student</th><th>Allocated on</th><th>Action</th></tr></thead>
            <tbody>
              {allocs.map((a) => (
                <tr key={a.allocation_id}>
                  <td>{a.room_number}</td>
                  <td>{a.block}</td>
                  <td>{a.student_name}</td>
                  <td>{a.allocated_on}</td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => vacate(a.student_id, a.student_name)}>Vacate</button></td>
                </tr>
              ))}
              {!allocs.length && <tr><td colSpan="5" className="empty">No active allocations.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
