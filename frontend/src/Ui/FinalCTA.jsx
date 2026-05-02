import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, ArrowRight, Sparkles } from 'lucide-react';

export default function FinalCTA() {
  return (
    <section className="py-24 md:py-32 px-6 bg-[#0c0c0e] border-b border-zinc-800 relative overflow-hidden text-center antialiased">
      
      {/* Subtle depth glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_#ffffff03_0%,_transparent_70%)] pointer-events-none z-0" />

      {/* Static Transparent Overlay Logo - Technical watermark style */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 opacity-[0.02]">
        <img 
          src="/minichallvex.png" 
          alt="" 
          className="w-[500px] md:w-[700px] h-auto grayscale [mask-image:radial-gradient(circle,_black_30%,_transparent_70%)]"
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="max-w-3xl mx-auto space-y-12 relative z-10"
      >
        
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="w-4 h-[1px] bg-zinc-800" />
            <div className="flex items-center gap-2 text-zinc-600">
              <Sparkles size={13} />
              <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase">Time to begin</span>
            </div>
            <div className="w-4 h-[1px] bg-zinc-800" />
          </div>
          
          <h2 className="text-3xl md:text-5xl font-medium text-white tracking-tighter italic leading-tight">
            Ready to start coding?
          </h2>
          
          <p className="text-[12px] md:text-[13px] text-zinc-500 max-w-md mx-auto leading-relaxed italic border-x border-zinc-900 px-6">
            Join other students and start building your logic today. You can solve puzzles made by the community or create your own in just a few minutes.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link 
            to="/signup" 
            className="w-full sm:w-auto bg-white text-black px-8 py-3 text-[11px] font-bold transition-all hover:bg-zinc-200 flex items-center justify-center gap-2 rounded-none active:scale-[0.98] shadow-[0_0_20px_rgba(255,255,255,0.05)]"
          >
            <UserPlus size={14} />
            <span>Join now</span>
          </Link>

          <Link 
            to="/login" 
            className="w-full sm:w-auto border border-zinc-800 text-zinc-400 px-8 py-3 text-[11px] font-bold transition-all hover:bg-zinc-950 hover:text-white hover:border-zinc-700 flex items-center justify-center gap-2 rounded-none active:scale-[0.98]"
          >
            <span>Login to your account</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="pt-6 border-t border-zinc-900/50 max-w-[200px] mx-auto">
          <p className="text-[10px] font-mono text-zinc-700 font-bold tracking-tight italic leading-relaxed">
            The arena is open and waiting for your first solution.
          </p>
        </div>
      </motion.div>

    </section>
  );
}