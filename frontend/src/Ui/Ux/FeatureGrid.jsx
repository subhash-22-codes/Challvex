import { motion } from 'framer-motion';
import { 
  TerminalSquare, 
  Star, 
} from 'lucide-react';

export default function FeatureGrid() {
  const tools = [
    {
      title: "Automatic code checks",
      desc: "Our system scans your solution against multiple test cases to verify logic instantly.",
      // High-level "Scanning" Composition
      illustration: (
        <div className="relative w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 bg-emerald-500/5 blur-2xl rounded-full group-hover:bg-emerald-500/10 transition-colors" />
          <svg viewBox="0 0 100 100" className="w-full h-full text-zinc-800 group-hover:text-zinc-400 transition-colors duration-500" fill="none" stroke="currentColor">
            <rect x="20" y="20" width="60" height="60" rx="6" strokeWidth="1" />
            <motion.path 
              initial={{ y: 0 }}
              animate={{ y: [0, 40, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              d="M25 30h50" stroke="#10b981" strokeWidth="2" strokeLinecap="round" opacity="0.8" 
            />
            <path d="M30 45h20M30 55h30M30 65h10" strokeWidth="1" opacity="0.3" />
            <circle cx="75" cy="75" r="8" fill="#09090b" stroke="#10b981" strokeWidth="1" />
            <path d="M72 75l2 2 4-4" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )
    },
    {
      title: "Create problem rules",
      desc: "Set custom time limits and memory constraints for every challenge you architect.",
      // High-level "Configuration" Composition
      illustration: (
        <div className="relative w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 bg-zinc-500/5 blur-2xl rounded-full" />
          <svg viewBox="0 0 100 100" className="w-full h-full text-zinc-800 group-hover:text-zinc-400 transition-colors duration-500" fill="none" stroke="currentColor">
            <circle cx="50" cy="50" r="38" strokeWidth="1" strokeDasharray="4 4" />
            <circle cx="50" cy="50" r="25" strokeWidth="1" />
            <motion.line 
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
              x1="50" y1="50" x2="50" y2="30" stroke="#f4f4f5" strokeWidth="2" strokeLinecap="round" style={{ originX: "50px", originY: "50px" }}
            />
            <rect x="70" y="45" width="12" height="10" rx="2" fill="#09090b" stroke="currentColor" />
          </svg>
        </div>
      )
    },
    {
      title: "Real creator feedback",
      desc: "Receive scores and architectural notes directly from the people who built the tasks.",
      // High-level "Human Review" Composition
      illustration: (
        <div className="relative w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 bg-blue-500/5 blur-2xl rounded-full" />
          <svg viewBox="0 0 100 100" className="w-full h-full text-zinc-800 group-hover:text-zinc-400 transition-colors duration-500" fill="none" stroke="currentColor">
            <path d="M30 70c0-11 9-20 20-20s20 9 20 20" strokeWidth="1" />
            <circle cx="50" cy="35" r="10" strokeWidth="1.5" />
            <motion.path 
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              d="M65 20h20v20L75 30l-10 10V20z" 
              fill="#f4f4f5" stroke="#f4f4f5" opacity="0.1" 
            />
            <path d="M65 20h20v20L75 30l-10 10V20z" stroke="currentColor" strokeWidth="1" />
          </svg>
        </div>
      )
    },
    {
      title: "Your stats and progress",
      desc: "Monitor your completion rates and history through a simplified performance profile.",
      // High-level "Data Growth" Composition
      illustration: (
        <div className="relative w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 bg-emerald-500/5 blur-2xl rounded-full" />
          <svg viewBox="0 0 100 100" className="w-full h-full text-zinc-800 group-hover:text-emerald-500/60 transition-colors duration-500" fill="none" stroke="currentColor">
            <path d="M20 80h60" strokeWidth="1" />
            <motion.path 
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              d="M20 70l15-10 15 5 15-25 15 10" 
              stroke="currentColor" 
              strokeWidth="2" 
            />
            <circle cx="80" cy="50" r="3" fill="currentColor" />
          </svg>
        </div>
      )
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.12 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <section className="py-24 px-6 border-b border-zinc-800 bg-[#09090b]">
      <div className="max-w-7xl mx-auto space-y-20">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
            </div>
            <h2 className="text-2xl font-medium text-white tracking-tight">
              Tools for technical growth.
            </h2>
          </div>
          <p className="text-sm text-zinc-500 max-w-sm leading-relaxed">
            Everything you need to build, solve, and track coding challenges in a single workspace.
          </p>
        </div>

        {/* 4-Column Feature Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-zinc-800 border border-zinc-800"
        >
          {tools.map((tool, i) => (
            <motion.div 
              key={i} 
              variants={itemVariants}
              className="bg-[#0c0c0e] p-10 space-y-10 hover:bg-[#111113] transition-all group relative overflow-hidden"
            >
              {/* Subtle lighting effect on hover */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-[50px] opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="flex justify-center group-hover:scale-110 transition-transform duration-700">
                {tool.illustration}
              </div>

              <div className="space-y-3 text-center">
                <h3 className="text-[15px] font-semibold text-zinc-200">
                  {tool.title}
                </h3>
                <p className="text-[13px] text-zinc-500 leading-relaxed">
                  {tool.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Technical Specification Footer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-zinc-800 border border-zinc-800">
          <div className="p-10 bg-[#0c0c0e] group">
            <div className="flex items-start gap-5">
              <div className="p-3 bg-zinc-950 border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                <TerminalSquare size={20} className="text-zinc-500" />
              </div>
              <div className="space-y-3">
                <h4 className="text-[14px] font-semibold text-zinc-100">Execution workspace</h4>
                <p className="text-[12px] text-zinc-500 leading-relaxed font-mono">
                  Supported runtimes: Python 3.x and Java 17. All code is verified within a sub-second latency window.
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-10 bg-[#0c0c0e] group">
            <div className="flex items-start gap-5">
              <div className="p-3 bg-zinc-950 border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                <Star size={20} className="text-zinc-500" />
              </div>
              <div className="space-y-3">
                <h4 className="text-[14px] font-semibold text-zinc-100">Quality verification</h4>
                <p className="text-[12px] text-zinc-500 leading-relaxed font-mono">
                  Manual reviews provide depth beyond logic. Every submission generates a permanent quality record.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-zinc-900">
          
          <p className="text-[10px] font-mono text-zinc-700 italic">
            * Data integrity is maintained across all creator and solver dashboards.
          </p>
        </div>
      </div>
    </section>
  );
}