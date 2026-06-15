// Small presentational helpers reused across pages.

export function Card({ title, action, children }) {
  return (
    <section className="card">
      {(title || action) && (
        <div className="card-head">
          <h3>{title}</h3>
          {action}
        </div>
      )}
      <div className="card-body">{children}</div>
    </section>
  );
}

// Colored status pill (pending / resolved / paid / full ...).
export function Badge({ value }) {
  const v = String(value || '').toLowerCase();
  const tone =
    ['paid', 'resolved', 'available', 'served'].includes(v) ? 'ok' :
    ['pending', 'unpaid', 'booked'].includes(v) ? 'warn' :
    ['full', 'cancelled'].includes(v) ? 'bad' :
    ['partial', 'in_progress', 'billed', 'maintenance'].includes(v) ? 'info' : 'muted';
  return <span className={`badge badge-${tone}`}>{value}</span>;
}

// Inline success / error banner.
export function Message({ msg }) {
  if (!msg?.text) return null;
  return <div className={`message message-${msg.type}`}>{msg.text}</div>;
}

// Currency formatter (Indian rupee).
export const money = (n) =>
  '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
