/* eslint-disable react/prop-types */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// --- Page Imports (Ensure these filenames match exactly on your disk!) ---
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
 * PROTECTED ROUTE (Gatekeeper)
 * Checks if the user is logged in and has the required role.
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="text-blue-500 font-mono text-xs uppercase animate-pulse">
          Authenticating...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const hasAccess = user?.roles?.some(role => allowedRoles.includes(role));

  return hasAccess ? children : <Navigate to="/" replace />;
};

/**
 * APP CONTENT
 * Separated so we can use the useAuth hook inside the Router.
 */
function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="text-zinc-700 font-bold text-xs tracking-widest uppercase">
          Initializing System...
        </div>
      </div>
    );
  }

  return (
    // Note: I added "border-4 border-red-500" and "bg-slate-950" 
    // just so you can VISUALLY see if the app is rendering.
    <div className="min-h-screen bg-[#09090b] border-2 border-red-900/20">
      
      {/* 1. If the page goes white after adding this, GlobalNavbar.jsx has an error */}
      <GlobalNavbar />
      
      <Routes>
        {/* Public access */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Student Access */}
        <Route 
          path="/" 
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
        
        {/* Admin Access */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/review/:slotId/:studentId" 
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminReview />
            </ProtectedRoute>
          } 
        />

        {/* Catch-all Redirect */}
        <Route path="*" element={<Navigate to={user ? "/" : "/login"} replace />} />
      </Routes>
    </div>
  );
}

/**
 * MAIN APP COMPONENT
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