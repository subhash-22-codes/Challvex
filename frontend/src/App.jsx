/* eslint-disable react/prop-types */
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import LandingPage from './pages/LandingPage';
import AdminDashboard from './pages/AdminDashboard';
import StudentArena from './pages/StudentArena';
import StudentDashboard from './pages/StudentDashboard';
import AdminReview from './pages/AdminReview';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import GlobalNavbar from './components/GlobalNavbar';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

/**
 * ProtectedRoute Component
 * Prevents unauthorized access and handles role-based filtering.
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="text-zinc-500 font-mono text-xs animate-pulse">
          Checking access...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Ensure roles is treated as an array even if backend sends a string
  const userRoles = Array.isArray(user.roles) ? user.roles : [user.roles];
  const hasAccess = userRoles.some(role => allowedRoles.includes(role));

  return hasAccess ? children : <Navigate to="/" replace />;
};

/**
 * AppContent Component
 * Contains the routing logic and global layout elements.
 */
function AppContent() {
  const { user, loading } = useAuth(); 
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="text-zinc-700 font-medium text-xs tracking-tight">
          Starting...
        </div>
      </div>
    );
  }

  // Show Navbar on all pages EXCEPT the landing page
  const showGlobalNav = location.pathname !== "/";

  return (
    <div className="min-h-screen bg-[#09090b]">
      {showGlobalNav && <GlobalNavbar />}
      
      <Routes>
        {/* SMART ROOT ROUTE: 
          If logged in, automatically redirect to the correct dashboard.
          If not logged in, show the Landing Page.
        */}
        <Route 
          path="/" 
          element={
            user ? (
              user.roles?.includes("creator") 
                ? <Navigate to="/dashboard" replace /> 
                : <Navigate to="/dashboard" replace />
            ) : (
              <LandingPage />
            )
          } 
        />
        
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Student Protected Routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <StudentDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/arena/:slotId" 
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <StudentArena />
            </ProtectedRoute>
          } 
        />
        
        {/* Admin Protected Routes */}
        <Route 
          path="/creator" 
          element={
            <ProtectedRoute allowedRoles={["creator"]}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/creator/review/:slotId/:studentId" 
          element={
            <ProtectedRoute allowedRoles={["creator"]}>
              <AdminReview />
            </ProtectedRoute>
          } 
        />

        {/* Catch-all: Redirect unknown routes back to root */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

/**
 * Main App Component
 */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}