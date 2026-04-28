import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, ArrowRight, Sparkles } from 'lucide-react';

export default function FinalCTA() {
  return (
    <section className="py-32 px-6 bg-[#0c0c0e] border-b border-zinc-800 relative overflow-hidden text-center">
      
      {/* Subtle radial glow to give depth to the background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_#ffffff05_0%,_transparent_70%)] pointer-events-none z-0" />

      {/* Static Transparent Overlay Logo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 opacity-[0.03]">
        <img 
          src="/minichallvex.png" 
          alt="" 
          className="w-[600px] md:w-[800px] h-auto grayscale [mask-image:radial-gradient(circle,_black_30%,_transparent_70%)]"
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto space-y-12 relative z-10"
      >
        
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 text-zinc-600">
            <Sparkles size={14} />
            <span className="text-[11px] font-mono tracking-tight">Time to begin</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-medium text-white tracking-tight leading-tight">
            Ready to start coding?
          </h2>
          <p className="text-sm md:text-base text-zinc-500 max-w-lg mx-auto leading-relaxed">
            Join other students and start building your logic today. You can solve puzzles made by the community or create your own in just a few minutes.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            to="/signup" 
            className="bg-white text-black px-10 py-3 text-[13px] font-bold transition-all hover:bg-zinc-200 flex items-center gap-2"
          >
            <UserPlus size={16} />
            <span>Join now</span>
          </Link>

          <Link 
            to="/login" 
            className="border border-zinc-800 text-zinc-300 px-10 py-3 text-[13px] font-bold transition-all hover:bg-zinc-900 hover:border-zinc-700 flex items-center gap-2"
          >
            <span>Login to your account</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="pt-4">
          <p className="text-[11px] font-mono text-zinc-700">
            The arena is open and waiting for your first solution.
          </p>
        </div>
      </motion.div>

    </section>
  );
}