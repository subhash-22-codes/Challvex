import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PlusCircle, Rocket, ChevronRight } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 px-6 overflow-hidden bg-[#09090b] antialiased">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
        
        {/* Left Side: Content - Tight and small font scaling */}
        <div className="lg:col-span-6 space-y-8">
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-5"
          >
            <h1 className="text-3xl md:text-5xl font-medium text-white tracking-tighter leading-[1.1]">
              Build your logic. <br />
              <span className="text-zinc-500 italic">Solve the best tasks.</span>
            </h1>
            <p className="text-[12px] md:text-[13px] text-zinc-500 leading-relaxed max-w-md italic border-l border-zinc-800 pl-5">
              Join a community of students who love coding. Solve fun problems created by others, or make your own tasks to challenge your friends and track their progress.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="flex flex-wrap gap-3"
          >
            <Link 
              to="/signup" 
              className="bg-white text-black px-5 py-2 text-[11px] font-bold transition-all flex items-center gap-2 rounded-none active:scale-[0.98]"
            >
              <Rocket size={13} />
              <span>Browse challenges</span>
              <ChevronRight size={13} />
            </Link>
            
            <Link 
              to="/signup" 
              className="border border-zinc-800 text-zinc-400 px-5 py-2 text-[11px] font-bold hover:bg-zinc-900 transition-all flex items-center gap-2 rounded-none active:scale-[0.98]"
            >
              <PlusCircle size={13} />
              <span>Make a challenge</span>
            </Link>
          </motion.div>
        </div>

        {/* Right Side: Product Image - Hairline Framing */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="lg:col-span-6 relative"
        >
          <div className="relative bg-[#0c0c0e] border border-white/5 p-1 shadow-2xl">
            <img 
              src="/platform.png" 
              alt="Coding Arena" 
              className="w-full h-auto brightness-[0.8] transition-all duration-700 select-none"
            />
          </div>
        </motion.div>
      </div>

      {/* Minimal Background Grid */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.02] pointer-events-none" 
        style={{ 
          backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', 
          backgroundSize: '32px 32px' 
        }} 
      />
    </section>
  );
}