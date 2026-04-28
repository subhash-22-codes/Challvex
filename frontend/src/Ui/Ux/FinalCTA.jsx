import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, ArrowRight, Sparkles } from 'lucide-react';

export default function FinalCTA() {
  return (
    <section className="py-24 px-6 bg-[#0c0c0e] border-b border-zinc-800 relative overflow-hidden text-center">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="max-w-3xl mx-auto space-y-10 relative z-10"
      >
        
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 text-zinc-500">
            <Sparkles size={14} />
            <span className="text-[11px] font-mono tracking-tight">Time to begin</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-medium text-white tracking-tight leading-tight">
            Ready to start coding?
          </h2>
          <p className="text-base text-zinc-500 max-w-lg mx-auto leading-relaxed">
            Join other students and start building your logic today. You can solve puzzles made by the community or create your own in just a few minutes.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link 
              to="/signup" 
              className="bg-white text-black px-8 py-3 text-[14px] font-bold rounded-none hover:bg-zinc-200 transition-all flex items-center gap-2"
            >
              <UserPlus size={18} />
              <span>Join now</span>
            </Link>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link 
              to="/login" 
              className="border border-zinc-700 text-zinc-300 px-8 py-3 text-[14px] font-bold rounded-none hover:bg-zinc-900 transition-all flex items-center gap-2"
            >
              <span>Login to your account</span>
              <ArrowRight size={18} />
            </Link>
          </motion.div>
        </div>

        <p className="text-[11px] font-mono text-zinc-700 italic">
          The arena is open and waiting for your first solution.
        </p>
      </motion.div>

      {/* Clean background text - Sentence case */}
      <div className="absolute inset-0 opacity-[0.01] pointer-events-none select-none font-mono text-[120px] text-white flex items-center justify-center font-bold">
        Challvex
      </div>
    </section>
  );
}