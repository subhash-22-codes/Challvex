/* eslint-disable react/prop-types */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // 1. While the app is checking the token in localStorage, show nothing or a spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // 2. If no user is logged in, send them to login page
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. If the user is logged in but doesn't have the required role (e.g., Student trying to access Admin)
  const hasRequiredRole = allowedRoles.length === 0 || 
    user.roles.some(role => allowedRoles.includes(role));

  if (!hasRequiredRole) {
    // If unauthorized, send them back to the Student Map
    return <Navigate to="/" replace />;
  }

  // 4. Everything is good, show the page
  return children;
}