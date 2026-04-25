import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signupUser, verifyUserOtp } from '../api/client';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    roles: ["student", "admin"] 
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [step, setStep] = useState(1); 
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "info" });
  const navigate = useNavigate();

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => setToast({ ...toast, show: false }), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const triggerToast = (message, type = "info") => {
    setToast({ show: true, message, type });
  };

  const handleRoleToggle = (role) => {
    const newRoles = formData.roles.includes(role)
      ? formData.roles.filter(r => r !== role)
      : [...formData.roles, role];
    
    if (newRoles.length > 0) {
      setFormData({ ...formData, roles: newRoles });
    }
  };

  const validate = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      triggerToast("Please provide a valid email address.", "error");
      return false;
    }
    if (formData.password.length < 8) {
      triggerToast("Password must be at least 8 characters.", "error");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      triggerToast("Passwords do not match.", "error");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload = { ...formData };
      delete payload.confirmPassword;

      await signupUser(payload);
      
      triggerToast("OTP sent to your email.", "success");
      setStep(2); 
    } catch (err) {
      const isSystemError = err.message === 'Failed to fetch' || !navigator.onLine;
      triggerToast(
        isSystemError ? "Service unreachable." : (err.message || "Signup failed."), 
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.length < 6) return triggerToast("Enter 6-digit OTP.", "error");

    setIsVerifying(true);
    try {
      // Use verifyUserOtp from client.js
      await verifyUserOtp(formData.email, otp);
      triggerToast("Verification successful!", "success");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      triggerToast(err.message || "Invalid OTP.", "error");
    } finally {
      setIsVerifying(false);
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
          <h1 className="text-base font-medium tracking-tight text-zinc-100">
            {step === 1 ? "Create an account" : "Verify Email"}
          </h1>
          <p className="text-xs text-zinc-500">
            {step === 1 ? "Join the platform to build and solve challenges" : `Code sent to ${formData.email}`}
          </p>
        </header>

        {step === 1 ? (

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest">Full name</label>
              <input 
                type="text" required
                disabled={isSubmitting}
                value={formData.username} 
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                className="w-full bg-zinc-900/40 border border-zinc-800 rounded-none px-3 py-2 text-xs outline-none focus:border-zinc-600 transition-all placeholder:text-zinc-700 disabled:opacity-50"
                placeholder="John Doe"
              />
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest">Email address</label>
              <input 
                type="email" required
                disabled={isSubmitting}
                value={formData.email} 
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full bg-zinc-900/40 border border-zinc-800 rounded-none px-3 py-2 text-xs outline-none focus:border-zinc-600 transition-all placeholder:text-zinc-700 disabled:opacity-50"
                placeholder="name@company.com"
              />
              <p className="text-[10px] text-zinc-600 italic leading-none">Please use a permanent email for account recovery.</p>
            </div>

            {/* Password */}
            <div className="space-y-1.5 relative">
              <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest">Password</label>
              <div className="relative">
                <input 
                  type={showPass ? "text" : "password"} required
                  disabled={isSubmitting}
                  value={formData.password} 
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full bg-zinc-900/40 border border-zinc-800 rounded-none pl-3 pr-10 py-2 text-xs outline-none focus:border-zinc-600 transition-all placeholder:text-zinc-700 disabled:opacity-50"
                  placeholder="At least 8 characters"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300"
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
                  type={showConfirm ? "text" : "password"} required
                  disabled={isSubmitting}
                  value={formData.confirmPassword} 
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  className="w-full bg-zinc-900/40 border border-zinc-800 rounded-none pl-3 pr-10 py-2 text-xs outline-none focus:border-zinc-600 transition-all placeholder:text-zinc-700 disabled:opacity-50"
                  placeholder="Re-enter password"
                />
                <button 
                  type="button" 
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300"
                >
                  {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {/* Account Permissions */}
            <div className="space-y-2.5 pt-2">
              <div className="flex justify-between items-end">
                <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest">Permissions</label>
                <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-tight">Both Recommended</span>
              </div>
              <div className="flex gap-2">
                {[
                  { id: 'student', label: 'Solver' },
                  { id: 'admin', label: 'Creator' }
                ].map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleRoleToggle(role.id)}
                    className={`flex-1 py-1.5 px-3 rounded-none border text-[11px] transition-all duration-200 ${
                      formData.roles.includes(role.id) 
                        ? 'bg-zinc-100 border-zinc-100 text-zinc-950 font-semibold' 
                        : 'bg-transparent border-zinc-800 text-zinc-500 hover:border-zinc-700'
                    }`}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold py-2.5 rounded-none transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Create account'}
          </button>
        </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest">Enter Code</label>
              <input 
                type="text" required maxLength={6}
                disabled={isVerifying}
                value={otp} 
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="w-full bg-zinc-900/40 border border-zinc-800 rounded-none px-3 py-3 text-center text-lg tracking-[0.5em] font-bold outline-none focus:border-zinc-600 transition-all placeholder:text-zinc-700"
                placeholder="000000"
              />
            </div>

            <button 
              type="submit" 
              disabled={isVerifying}
              className="w-full bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold py-2.5 rounded-none transition-all disabled:opacity-30"
            >
              {isVerifying ? 'Verifying...' : 'Verify & Activate'}
            </button>

            <button 
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-widest"
            >
              ← Wrong email? Go back
            </button>
          </form>
        )}

        <footer className="pt-2 text-center">
          <p className="text-[11px] text-zinc-500">
            Already have an account? <Link to="/login" className="text-zinc-200 font-medium hover:text-white transition-colors">Sign in</Link>
          </p>
        </footer>
      </div>
    </div>
  );
}