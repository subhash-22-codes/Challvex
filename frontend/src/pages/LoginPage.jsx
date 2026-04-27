import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser } from '../api/client'; 

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "" });
  
  const { login } = useAuth();
  const navigate = useNavigate();

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
    setIsLoggingIn(true);

    try {
      const data = await loginUser({ email, password });
      
      login(
        { username: data.username, roles: data.roles }, 
        data.access_token
      );
      
      navigate("/");
    } catch (err) {
      const isSystemError = err.message === 'Failed to fetch' || !navigator.onLine;
      
      triggerToast(
        isSystemError 
          ? "Service is temporarily unavailable. Please try again." 
          : (err.message || "Invalid credentials. Please check your details.")
      );
      
      console.error("Login Error:", err);
    } finally {
      setIsLoggingIn(false);
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
          <h1 className="text-base font-medium tracking-tight">Sign in</h1>
          <p className="text-xs text-zinc-500">Enter your credentials to access your account</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest">Email address</label>
              <input 
                type="email" 
                required
                disabled={isLoggingIn}
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-900/40 border border-zinc-800 rounded-none px-3 py-2 text-xs outline-none focus:border-zinc-600 transition-all placeholder:text-zinc-700 disabled:opacity-50"
                placeholder="name@example.com"
              />
            </div>
            
            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest">Password</label>
                <Link 
                  to="/forgot-password" 
                  className="text-[10px] text-zinc-500 hover:text-zinc-200 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input 
                  type={showPass ? "text" : "password"} 
                  required
                  disabled={isLoggingIn}
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-900/40 border border-zinc-800 rounded-none pl-3 pr-10 py-2 text-xs outline-none focus:border-zinc-600 transition-all placeholder:text-zinc-700 disabled:opacity-50"
                  placeholder="••••••••"
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
          </div>

          <button 
            type="submit" 
            disabled={isLoggingIn}
            className="w-full bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold py-2.5 rounded-none transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isLoggingIn ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <footer className="pt-2 text-center">
          <p className="text-[11px] text-zinc-500">
            Don't have an account? <Link to="/signup" className="text-zinc-200 font-medium hover:text-white transition-colors">Sign up</Link>
          </p>
        </footer>
      </div>
    </div>
  );
}