import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft,
  Plus,
  Check,
  Info
} from 'lucide-react';
import { signupUser, verifyUserOtp } from '../api/client';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    roles: ["student"]
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [step, setStep] = useState(1); 
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
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
    if (role === 'student') return;
    const newRoles = formData.roles.includes(role)
      ? formData.roles.filter(r => r !== role)
      : [...formData.roles, role];
    setFormData({ ...formData, roles: newRoles });
  };

  const validate = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.username.trim()) {
      triggerToast("Please enter your name.", "error");
      return false;
    }
    if (!emailRegex.test(formData.email)) {
      triggerToast("The email address is not valid.", "error");
      return false;
    }
    if (formData.password.length < 8) {
      triggerToast("Password must be 8 characters or more.", "error");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      triggerToast("The passwords do not match.", "error");
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
      triggerToast("Code sent to your email.", "success");
      setStep(2); 
    } catch (err) {
      triggerToast(err.message || "Failed to create account.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.length < 6) return triggerToast("Enter the 6-digit code.", "error");
    setIsVerifying(true);
    try {
      await verifyUserOtp(formData.email, otp);
      triggerToast("Account verified.", "success");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      triggerToast(err.message || "Invalid code.", "error");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-6 selection:bg-white selection:text-black">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toast.show && (
          <motion.div 
            initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
            className="fixed top-8 z-[1000]"
          >
            <div className={`px-4 py-2 shadow-2xl flex items-center gap-3 border ${
              toast.type === 'error' ? 'bg-zinc-950 border-red-900/50 text-red-500' : 'bg-white text-black border-white'
            }`}>
              {toast.type === 'error' ? <AlertCircle size={13} /> : <CheckCircle2 size={13} />}
              <span className="text-[11px] font-medium tracking-tight">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-[340px] space-y-10">
        
        {/* Branding */}
        <header className="flex flex-col items-center text-center space-y-6">
          <img src="/challvex.png" alt="Challvex" className="h-5 w-auto" />
          <div className="space-y-1">
            <h1 className="text-lg font-medium text-white tracking-tight">
              {step === 1 ? "Create account" : "Verify email"}
            </h1>
            <p className="text-[11px] text-zinc-500">
              {step === 1 ? "Join the community of students today." : "Enter the code sent to your inbox."}
            </p>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.form 
              key="signup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onSubmit={handleSubmit} className="space-y-6"
            >
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-zinc-500 font-medium ml-1">Full name</label>
                  <input 
                    type="text" required disabled={isSubmitting}
                    value={formData.username} 
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    className="w-full bg-zinc-900/30 border border-zinc-800 px-3 py-2 text-[12px] text-white outline-none focus:border-zinc-600 transition-all placeholder:text-zinc-700"
                    placeholder="e.g. Rahul Sharma"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-zinc-500 font-medium ml-1">Email address</label>
                  <input 
                    type="email" required disabled={isSubmitting}
                    value={formData.email} 
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-zinc-900/30 border border-zinc-800 px-3 py-2 text-[12px] text-white outline-none focus:border-zinc-600 transition-all placeholder:text-zinc-700"
                    placeholder="name@email.com"
                  />
                </div>

                {/* Password stack */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-zinc-500 font-medium ml-1">Password</label>
                    <div className="relative">
                      <input 
                        type={showPass ? "text" : "password"} required disabled={isSubmitting}
                        value={formData.password} 
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="w-full bg-zinc-900/30 border border-zinc-800 pl-3 pr-10 py-2 text-[12px] text-white outline-none focus:border-zinc-600 transition-all"
                        placeholder="8+ characters"
                      />
                      <button 
                        type="button" onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
                      >
                        {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] text-zinc-500 font-medium ml-1">Confirm password</label>
                    <div className="relative">
                      <input 
                        type={showConfirm ? "text" : "password"} required disabled={isSubmitting}
                        value={formData.confirmPassword} 
                        onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                        className="w-full bg-zinc-900/30 border border-zinc-800 pl-3 pr-10 py-2 text-[12px] text-white outline-none focus:border-zinc-600 transition-all"
                        placeholder="Repeat your password"
                      />
                      <button 
                        type="button" onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
                      >
                        {showConfirm ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Role selection with hidden info toggle */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[11px] text-zinc-500 font-medium">Account roles</label>
                    <button 
                      type="button"
                      onMouseEnter={() => setShowInfo(true)}
                      onMouseLeave={() => setShowInfo(false)}
                      className="text-zinc-600 hover:text-zinc-400 transition-colors"
                    >
                      <Info size={12} />
                    </button>
                  </div>

                  <div className="relative">
                    <div className="flex gap-2">
                      <div className="flex-[1.2] py-2 bg-zinc-900 border border-emerald-900/20 flex items-center justify-center gap-2 cursor-default">
                        <Check size={12} className="text-emerald-500" />
                        <span className="text-[10px] font-bold text-zinc-200">Solver</span>
                      </div>
                      <button
                        type="button" 
                        disabled={isSubmitting}
                        onClick={() => handleRoleToggle('creator')}
                        className={`flex-1 py-2 border text-[10px] font-bold transition-all flex items-center justify-center gap-2 ${
                          formData.roles.includes('creator') 
                            ? 'bg-white border-white text-black' 
                            : 'bg-transparent border-zinc-800 text-zinc-600 hover:border-zinc-700'
                        }`}
                      >
                        {formData.roles.includes('creator') ? <Check size={12} /> : <Plus size={12} />}
                        Creator
                      </button>
                    </div>

                    {/* Hover info reveal */}
                    <AnimatePresence>
                      {showInfo && (
                        <motion.div 
                          initial={{ opacity: 0, y: 5 }} 
                          animate={{ opacity: 1, y: 0 }} 
                          exit={{ opacity: 0, y: 5 }}
                          className="absolute left-0 right-0 top-full mt-2 z-10 p-3 bg-zinc-950 border border-zinc-800 shadow-xl pointer-events-none"
                        >
                          <p className="text-[10px] text-zinc-500 leading-normal italic">
                            Everyone starts as a solver. We recommend choosing creator too—publishing your own problems for others to solve is the fastest way to master logic.
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              <button 
                type="submit" disabled={isSubmitting}
                className="w-full bg-white hover:bg-zinc-200 text-black text-[12px] font-bold py-3 transition-all disabled:opacity-20"
              >
                {isSubmitting ? 'Processing...' : 'Create account'}
              </button>
            </motion.form>
          ) : (
            <motion.form 
              key="verify" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              onSubmit={handleVerify} className="space-y-8"
            >
              <div className="space-y-3">
                <label className="text-[11px] text-zinc-500 font-medium flex justify-center">Enter code</label>
                <input 
                  type="text" required maxLength={6} disabled={isVerifying}
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="w-full bg-zinc-900/30 border border-zinc-800 py-4 text-center text-xl tracking-[0.6em] font-mono font-bold text-white outline-none focus:border-zinc-600"
                  placeholder="000000"
                />
              </div>

              <div className="space-y-4">
                <button 
                  type="submit" disabled={isVerifying}
                  className="w-full bg-white hover:bg-zinc-200 text-black text-[12px] font-bold py-3 transition-all disabled:opacity-20"
                >
                  {isVerifying ? 'Checking...' : 'Verify account'}
                </button>
                <button 
                  type="button" onClick={() => setStep(1)}
                  className="w-full flex items-center justify-center gap-2 text-[10px] text-zinc-600 hover:text-white transition-colors"
                >
                  <ArrowLeft size={12} />
                  <span>Go back</span>
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <footer className="text-center pt-2">
          <p className="text-[11px] text-zinc-600">
            Already have an account? <Link to="/login" className="text-zinc-300 hover:text-white transition-colors underline underline-offset-4 decoration-zinc-800">Sign in</Link>
          </p>
        </footer>
      </div>
    </div>
  );
}