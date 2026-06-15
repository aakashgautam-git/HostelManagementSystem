import { useEffect, useState } from 'react';
import api, { apiError } from '../../api';
import { Card, Badge, Message, money } from '../../components/ui';

// Wallet top-up + bills + paying a bill (server runs the pay_bill TRANSACTION)
// + payment history + fines.
export default function Fees() {
  const [me, setMe] = useState(null);
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [fines, setFines] = useState([]);
  const [topupAmt, setTopupAmt] = useState('');
  const [msg, setMsg] = useState(null);

  function load() {
    api.get('/students/me').then((r) => setMe(r.data));
    api.get('/billing/bills/me').then((r) => setBills(r.data));
    api.get('/billing/payments/me').then((r) => setPayments(r.data));
    api.get('/billing/fines/me').then((r) => setFines(r.data));
  }
  useEffect(() => { load(); }, []);

  async function topup(e) {
    e.preventDefault();
    setMsg(null);
    try {
      await api.post('/billing/topup', { amount: Number(topupAmt) });
      setTopupAmt('');
      setMsg({ type: 'success', text: 'Wallet topped up' });
      load();
    } catch (err) { setMsg({ type: 'error', text: apiError(err) }); }
  }

  // Pay the full outstanding amount of a bill -> POST /billing/pay -> pay_bill txn.
  async function pay(bill) {
    setMsg(null);
    const due = Number(bill.total_amount) - Number(bill.paid_amount);
    try {
      await api.post('/billing/pay', { bill_id: bill.bill_id, amount: due });
      setMsg({ type: 'success', text: `Paid ${money(due)} for ${bill.bill_month}` });
      load();
    } catch (err) {
      // e.g. "Insufficient wallet balance" raised + rolled back by the procedure
      setMsg({ type: 'error', text: apiError(err) });
    }
  }

  if (!me) return <p className="muted">Loading…</p>;

  return (
    <>
      <h1 className="page-title">Fees & Payments</h1>
      <Message msg={msg} />

      <div className="grid grid-2">
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
      </div>

      <Card title="Top up wallet" >
        <form className="row" onSubmit={topup}>
          <div className="field">
            <label>Amount (₹)</label>
            <input type="number" min="1" value={topupAmt} onChange={(e) => setTopupAmt(e.target.value)} required />
          </div>
          <div className="field" style={{ justifyContent: 'flex-end' }}>
            <label>&nbsp;</label>
            <button className="btn">Add money</button>
          </div>
        </form>
      </Card>

      <Card title="My bills">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Month</th><th>Rent</th><th>Mess</th><th>Fines</th><th>Total</th><th>Paid</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {bills.map((b) => {
                const due = Number(b.total_amount) - Number(b.paid_amount);
                return (
                  <tr key={b.bill_id}>
                    <td>{String(b.bill_month).slice(0, 7)}</td>
                    <td>{money(b.rent_amount)}</td>
                    <td>{money(b.mess_amount)}</td>
                    <td>{money(b.fine_amount)}</td>
                    <td>{money(b.total_amount)}</td>
                    <td>{money(b.paid_amount)}</td>
                    <td><Badge value={b.status} /></td>
                    <td>
                      {b.status !== 'paid' && (
                        <button className="btn btn-sm" onClick={() => pay(b)}>Pay {money(due)}</button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!bills.length && <tr><td colSpan="8" className="empty">No bills generated yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-2">
        <Card title="Payment history">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Bill</th><th>Amount</th><th>Method</th></tr></thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.payment_id}>
                    <td>{String(p.payment_date).slice(0, 10)}</td>
                    <td>#{p.bill_id}</td>
                    <td>{money(p.amount)}</td>
                    <td>{p.method}</td>
                  </tr>
                ))}
                {!payments.length && <tr><td colSpan="4" className="empty">No payments yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="My fines">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Reason</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {fines.map((f) => (
                  <tr key={f.fine_id}>
                    <td>{f.reason}</td>
                    <td>{money(f.amount)}</td>
                    <td><Badge value={f.status} /></td>
                  </tr>
                ))}
                {!fines.length && <tr><td colSpan="3" className="empty">No fines. 🎉</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
