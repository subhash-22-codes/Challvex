import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Code2, PlusCircle, Rocket, ChevronRight } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 px-6 overflow-hidden bg-[#09090b]">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
        
        {/* Left Side: Content */}
        <div className="lg:col-span-6 space-y-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <h1 className="text-4xl md:text-6xl font-medium text-white tracking-tight leading-[1.1]">
              Build your logic. <br />
              <span className="text-zinc-500 italic font-serif">Solve the best tasks.</span>
            </h1>
            <p className="text-base text-zinc-400 leading-relaxed max-w-lg">
              Join a community of students who love coding. Solve fun problems created by others, or make your own tasks to challenge your friends and track their progress.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex flex-wrap gap-4"
          >
            <Link 
              to="/signup" 
              className="bg-white text-black px-6 py-3 text-[13px] font-bold rounded-none hover:bg-zinc-200 transition-all flex items-center gap-2 group"
            >
              <Rocket size={16} />
              <span>Browse challenges</span>
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <Link 
              to="/signup" 
              className="border border-zinc-700 text-zinc-300 px-6 py-3 text-[13px] font-bold rounded-none hover:bg-zinc-900 transition-all flex items-center gap-2"
            >
              <PlusCircle size={16} />
              <span>Make a challenge</span>
            </Link>
          </motion.div>
        </div>

        {/* Right Side: Product Image */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="lg:col-span-6 relative group"
        >
          <div className="absolute -inset-1 bg-white/5 blur-2xl rounded-full" />
          <div className="relative bg-[#0c0c0e] border border-zinc-800 p-1 shadow-2xl">
            <img 
              src="/image_4bba74.png" 
              alt="Coding Arena" 
              className="w-full h-auto brightness-90 group-hover:brightness-100 transition-all duration-500"
            />
            
            {/* Simple Student-Friendly Overlay */}
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/80 px-3 py-1.5 border border-zinc-800 backdrop-blur-sm">
              <Code2 size={14} className="text-emerald-500" />
              <span className="text-[10px] font-mono text-zinc-300 tracking-tight">Practice mode active</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Very Subtle Grid - Not too much motion */}
      <div className="absolute inset-0 z-0 opacity-[0.02] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
    </section>
  );
}