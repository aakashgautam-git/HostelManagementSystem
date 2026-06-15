import { useEffect, useState } from 'react';
import api, { apiError } from '../../api';
import { Card, Badge, Message, money } from '../../components/ui';

const PRICES = { breakfast: 40, lunch: 70, dinner: 60 };
const today = () => new Date().toISOString().slice(0, 10);

// Book breakfast/lunch/dinner and view/cancel your bookings.
export default function Meals() {
  const [rows, setRows] = useState([]);
  const [date, setDate] = useState(today());
  const [type, setType] = useState('breakfast');
  const [msg, setMsg] = useState(null);

  const load = () =>
    api.get('/meals/me').then((r) => setRows(r.data)).catch((e) => setMsg({ type: 'error', text: apiError(e) }));

  useEffect(() => { load(); }, []);

  async function book(e) {
    e.preventDefault();
    setMsg(null);
    try {
      await api.post('/meals', { meal_date: date, meal_type: type });
      setMsg({ type: 'success', text: `Booked ${type} for ${date} (${money(PRICES[type])})` });
      load();
    } catch (err) {
      setMsg({ type: 'error', text: apiError(err) });
    }
  }

  async function cancel(id) {
    try {
      await api.delete(`/meals/${id}`);
      load();
    } catch (err) {
      setMsg({ type: 'error', text: apiError(err) });
    }
  }

  return (
    <>
      <h1 className="page-title">Mess Meals</h1>
      <Message msg={msg} />

      <Card title="Book a meal">
        <form className="row" onSubmit={book}>
          <div className="field">
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="field">
            <label>Meal</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="breakfast">Breakfast — ₹40</option>
              <option value="lunch">Lunch — ₹70</option>
              <option value="dinner">Dinner — ₹60</option>
            </select>
          </div>
          <div className="field" style={{ justifyContent: 'flex-end' }}>
            <label>&nbsp;</label>
            <button className="btn">Book meal</button>
          </div>
        </form>
      </Card>

      <Card title="My bookings">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Date</th><th>Meal</th><th>Price</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.booking_id}>
                  <td>{r.meal_date}</td>
                  <td style={{ textTransform: 'capitalize' }}>{r.meal_type}</td>
                  <td>{money(r.price)}</td>
                  <td><Badge value={r.status} /></td>
                  <td>
                    {r.status === 'booked' && (
                      <button className="btn btn-danger btn-sm" onClick={() => cancel(r.booking_id)}>Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan="5" className="empty">No meals booked yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
