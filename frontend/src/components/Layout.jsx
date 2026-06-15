import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth';

// Shared shell: top bar with role-aware navigation + an <Outlet/> for pages.
const STUDENT_NAV = [
  { to: '/student', label: 'Dashboard', end: true },
  { to: '/student/meals', label: 'Mess Meals' },
  { to: '/student/fees', label: 'Fees & Payments' },
  { to: '/student/complaints', label: 'Complaints' },
];

const ADMIN_NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/students', label: 'Students' },
  { to: '/admin/rooms', label: 'Rooms' },
  { to: '/admin/billing', label: 'Billing' },
  { to: '/admin/meals', label: 'Mess Report' },
  { to: '/admin/complaints', label: 'Complaints' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = user?.role === 'admin' ? ADMIN_NAV : STUDENT_NAV;

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">🏠 HostelHub</div>
        <nav className="nav">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className="nav-link">
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="user-box">
          <span className="user-name">
            {user?.name} <span className="role-tag">{user?.role}</span>
          </span>
          <button className="btn btn-ghost" onClick={handleLogout}>Logout</button>
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
