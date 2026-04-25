import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { resetPassword } from '../api/client';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "" });

  const token = searchParams.get('token');

  // Auto-hide toast logic
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => setToast({ ...toast, show: false }), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const triggerToast = (message) => {
    setToast({ show: true, message });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      return triggerToast("Password must be at least 8 characters.");
    }

    if (newPassword !== confirmPassword) {
      return triggerToast("Passwords do not match.");
    }

    if (!token) {
      return triggerToast("Invalid or missing reset token.");
    }

    setIsUpdating(true);

    try {
      const response = await resetPassword(token, newPassword);
      triggerToast(response?.message || "Password updated successfully.");
      
      // Redirect after a short delay
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      const isSystemError = err.message === 'Failed to fetch' || !navigator.onLine;

      triggerToast(
        isSystemError 
          ? "We're having trouble reaching our services. Please try again shortly." 
          : (err.message || "Failed to reset password. The link may be expired.")
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const EyeIcon = () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  );

  const EyeOffIcon = () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"/>
    </svg>
  );

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-6 font-sans text-zinc-100">
      
      {/* Minimalist White Toast */}
      {toast.show && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[1000] animate-in slide-in-from-top-4 duration-300">
          <div className="bg-white text-black px-5 py-2.5 shadow-2xl flex items-center gap-3">
            <span className="text-[11px] font-bold uppercase tracking-tight">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Brand Logo */}
      <div className="mb-10 animate-in fade-in zoom-in-95 duration-700">
        <img src="/challvex.png" alt="Challvex" className="h-5 w-auto opacity-80" />
      </div>

      <div className="w-full max-w-[340px] space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <header className="space-y-1 text-center">
          <h1 className="text-base font-medium tracking-tight">Reset password</h1>
          <p className="text-xs text-zinc-500">Choose a new password to secure your account</p>
        </header>

        {!token ? (
          <div className="p-3 border border-red-500/20 bg-red-500/5 text-red-400 text-[11px] leading-relaxed text-center">
            The reset link is invalid or has expired.
            <div className="mt-4">
               <Link to="/forgot-password" size="sm" className="text-zinc-100 font-medium hover:underline underline-offset-4">Request new link</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {/* New Password */}
              <div className="space-y-1.5 relative">
                <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest">New password</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    required
                    disabled={isUpdating}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-zinc-900/40 border border-zinc-800 rounded-none pl-3 pr-10 py-2 text-xs outline-none focus:border-zinc-600 transition-all placeholder:text-zinc-700 disabled:opacity-50"
                    placeholder="8+ characters"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors"
                  >
                    {showPass ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5 relative">
                <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest">Confirm password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    required
                    disabled={isUpdating}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-zinc-900/40 border border-zinc-800 rounded-none pl-3 pr-10 py-2 text-xs outline-none focus:border-zinc-600 transition-all placeholder:text-zinc-700 disabled:opacity-50"
                    placeholder="Re-enter password"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors"
                  >
                    {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isUpdating}
              className="w-full bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold py-2.5 rounded-none transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isUpdating ? "Updating..." : "Update password"}
            </button>
          </form>
        )}

        <footer className="pt-2 text-center">
          <Link 
            to="/login" 
            className="text-[11px] text-zinc-500 hover:text-white transition-colors"
          >
            Back to sign in
          </Link>
        </footer>
      </div>
    </div>
  );
}