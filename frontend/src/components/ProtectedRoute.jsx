import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth';

// Guards a route: requires login, and optionally a specific role.
export default function ProtectedRoute({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/student'} replace />;
  }
  return children;
}
