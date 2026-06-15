import { useEffect, useState } from 'react';
import api, { apiError } from '../../api';
import { Card, money } from '../../components/ui';

// Mess report: per-day meal counts straight from the daily_meal_count_view VIEW.
export default function Meals() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/meals/daily-count').then((r) => setRows(r.data)).catch((e) => setError(apiError(e)));
  }, []);

  return (
    <>
      <h1 className="page-title">Mess Report</h1>
      {error && <div className="message message-error">{error}</div>}

      <Card title="Daily meal counts (daily_meal_count_view)">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Date</th><th>Breakfast</th><th>Lunch</th><th>Dinner</th><th>Total meals</th><th>Revenue</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.meal_date}>
                  <td>{r.meal_date}</td>
                  <td>{r.breakfast_count}</td>
                  <td>{r.lunch_count}</td>
                  <td>{r.dinner_count}</td>
                  <td><strong>{r.total_meals}</strong></td>
                  <td>{money(r.total_revenue)}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan="6" className="empty">No meals booked yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
