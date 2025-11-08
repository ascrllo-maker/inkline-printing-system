import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import StudentPortal from './pages/StudentPortal';
import AdminPortal from './pages/AdminPortal';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to={getDefaultRoute(user.role)} replace />} />
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentPortal />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/it"
        element={
          <ProtectedRoute allowedRoles={['it_admin']}>
            <AdminPortal shop="IT" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/ssc"
        element={
          <ProtectedRoute allowedRoles={['ssc_admin']}>
            <AdminPortal shop="SSC" />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to={user ? getDefaultRoute(user.role) : '/login'} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function getDefaultRoute(role) {
  switch (role) {
    case 'it_admin':
      return '/admin/it';
    case 'ssc_admin':
      return '/admin/ssc';
    case 'student':
      return '/student';
    default:
      return '/login';
  }
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <AppRoutes />
          <Toaster position="top-right" />
      </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
