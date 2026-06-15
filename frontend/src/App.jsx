import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Register from './pages/Register';

import StudentDashboard from './pages/student/Dashboard';
import StudentMeals from './pages/student/Meals';
import StudentFees from './pages/student/Fees';
import StudentComplaints from './pages/student/Complaints';

import AdminDashboard from './pages/admin/Dashboard';
import AdminStudents from './pages/admin/Students';
import AdminRooms from './pages/admin/Rooms';
import AdminBilling from './pages/admin/Billing';
import AdminMeals from './pages/admin/Meals';
import AdminComplaints from './pages/admin/Complaints';

export default function App() {
  const { user } = useAuth();

  // Send "/" to the right home depending on who is logged in.
  const home = !user ? '/login' : user.role === 'admin' ? '/admin' : '/student';

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Student area */}
      <Route
        element={
          <ProtectedRoute role="student">
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/student/meals" element={<StudentMeals />} />
        <Route path="/student/fees" element={<StudentFees />} />
        <Route path="/student/complaints" element={<StudentComplaints />} />
      </Route>

      {/* Admin area */}
      <Route
        element={
          <ProtectedRoute role="admin">
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/students" element={<AdminStudents />} />
        <Route path="/admin/rooms" element={<AdminRooms />} />
        <Route path="/admin/billing" element={<AdminBilling />} />
        <Route path="/admin/meals" element={<AdminMeals />} />
        <Route path="/admin/complaints" element={<AdminComplaints />} />
      </Route>

      <Route path="*" element={<Navigate to={home} replace />} />
    </Routes>
  );
}
