/* eslint-disable react/prop-types */
import { useState, useRef, useEffect } from "react";
import { verifyChallengeAccess } from "../api/client";

export default function AccessCodeModal({ isOpen, onClose, slotId, onSuccess }) {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputs = useRef([]);

  // Handle backspace and auto-focus
  const handleChange = (e, index) => {
    const value = e.target.value;
    if (isNaN(value)) return;

    const newCode = [...code];
    newCode[index] = value.substring(value.length - 1);
    setCode(newCode);

    // Move to next input if value is entered
    if (value && index < 5) {
      inputs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputs.current[index - 1].focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fullCode = code.join("");
    if (fullCode.length !== 6) return;

    setLoading(true);
    setError("");

    try {
      await verifyChallengeAccess(slotId, fullCode);
      onSuccess(); // Let the student into the Arena
    } catch (err) {
      setError(err.message);
      // If the error message mentions waiting, we can trigger a local timer if we want,
      // but the backend strictly enforces the 1-minute block.
      if (err.message.includes("wait")) {
          setCooldown(60);
      }
    } finally {
      setLoading(false);
    }
  };

  // Simple countdown for the cooldown UI
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm px-4">
      <div className="bg-[#0c0c0e] border border-zinc-800 p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
        
        <header className="text-center mb-8">
          <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
            <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-[14px] font-semibold text-white tracking-tight">Access Required</h3>
          <p className="text-[11px] text-zinc-500 mt-1">This challenge is gated. Enter the 6-digit PIN to proceed.</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-between gap-2">
            {code.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputs.current[idx] = el)}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(e, idx)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                disabled={loading || cooldown > 0}
                className="w-10 h-12 bg-zinc-950 border border-zinc-800 text-center text-lg font-mono text-emerald-400 outline-none focus:border-emerald-500 transition-all disabled:opacity-30"
              />
            ))}
          </div>

          {error && (
            <div className="bg-red-500/5 border border-red-900/20 p-3">
              <p className="text-[10px] text-red-400 text-center leading-relaxed">
                {error} {cooldown > 0 && `(Retry in ${cooldown}s)`}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={loading || code.join("").length !== 6 || cooldown > 0}
              className="w-full py-3 bg-zinc-100 text-black text-[11px] font-bold tracking-widest hover:bg-white transition-all disabled:opacity-20"
            >
              {loading ? "Verifying..." : "Enter Arena"}
            </button>
            
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Cancel and return
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}