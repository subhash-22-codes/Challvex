import { useState, useEffect } from 'react';
import { forgotPassword } from '../api/client';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "" });

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
    setIsSending(true);

    try {
      const response = await forgotPassword(email);
      triggerToast(response?.message || "Instructions have been sent to your email.");
    } catch (err) {
      const isSystemError = err.message === 'Failed to fetch' || !navigator.onLine;
      
      triggerToast(
        isSystemError 
          ? "We're unable to reach our services. Please try again later." 
          : (err.message || "We couldn't find an account with that email.")
      );
      
      console.error("Forgot Password Error:", err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-6 font-sans text-zinc-100">
      
      {/* Minimalist White Toast */}
      {toast.show && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[1000] animate-in slide-in-from-top-4 duration-300">
          <div className="bg-white text-black px-5 py-2.5 shadow-2xl flex items-center gap-3">
            <span className="text-[11px] font-bold tracking-tight">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Brand Logo */}
      <div className="mb-10 animate-in fade-in zoom-in-95 duration-700">
        <img src="/challvex.png" alt="Challvex" className="h-5 w-auto opacity-80" />
      </div>

      <div className="w-full max-w-[340px] space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <header className="space-y-1 text-center">
          <h1 className="text-base font-medium tracking-tight text-zinc-100">Reset password</h1>
          <p className="text-xs text-zinc-500">Enter your email to receive reset instructions</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-zinc-500 tracking-widest">
              Email address
            </label>
            <input
              type="email"
              required
              disabled={isSending}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-900/40 border border-zinc-800 rounded-none px-3 py-2 text-xs outline-none focus:border-zinc-600 transition-all placeholder:text-zinc-700 disabled:opacity-50"
              placeholder="name@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={isSending}
            className="w-full bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold py-2.5 rounded-none transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isSending ? "Sending link..." : "Send reset link"}
          </button>
        </form>

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