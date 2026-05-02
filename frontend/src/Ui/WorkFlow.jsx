import { motion } from 'framer-motion';
import { UserCircle2, Swords, BarChart3, ArrowRight } from 'lucide-react';

export default function WorkFlow() {
  const steps = [
    {
      icon: <UserCircle2 size={18} className="text-zinc-400 group-hover:text-white transition-colors" />,
      title: "Join the community",
      desc: "Create your free account in seconds. This lets you save your code and track your progress."
    },
    {
      icon: <Swords size={18} className="text-zinc-400 group-hover:text-white transition-colors" />,
      title: "Enter the arena",
      desc: "Pick a challenge to solve or make your own coding puzzle for your friends to try out."
    },
    {
      icon: <BarChart3 size={18} className="text-zinc-400 group-hover:text-white transition-colors" />,
      title: "See your growth",
      desc: "Get instant results for your code and see feedback from other creators to get better."
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.4, ease: 'easeOut' } 
    }
  };

  return (
    <section className="py-20 md:py-24 px-6 border-b border-zinc-800 bg-[#09090b] antialiased">
      <div className="max-w-7xl mx-auto space-y-12 md:space-y-20">
        
        {/* Header - Consistent with Hero/Duality */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="space-y-3"
        >
          <h2 className="text-xl md:text-2xl font-medium text-white tracking-tighter italic">
            How to get started.
          </h2>
          <p className="text-[12px] md:text-[13px] text-zinc-500 max-w-md leading-relaxed italic border-l border-zinc-800 pl-5">
            Challvex is designed to be simple. Follow these three steps to start your coding journey.
          </p>
        </motion.div>

        {/* Steps Grid - Hairline Logic */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16 relative"
        >
          {/* Connecting Line - Subtle Hairline */}
          <div className="hidden md:block absolute top-5 left-0 right-0 h-[1px] bg-zinc-800/40 z-0" />

          {steps.map((step, i) => (
            <motion.div 
              key={i} 
              variants={itemVariants}
              className="relative z-10 space-y-6 group"
            >
              {/* Icon Box - Consistent with Duality Step Style */}
              <div className="w-10 h-10 bg-[#0c0c0e] border border-zinc-800 flex items-center justify-center group-hover:border-zinc-600 transition-all rounded-none">
                {step.icon}
              </div>

              <div className="space-y-4 pr-4">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-zinc-600 font-bold tracking-widest">0{i + 1}</span>
                  <h3 className="text-[14px] font-medium text-zinc-200 tracking-tight italic">
                    {step.title}
                  </h3>
                </div>
                <p className="text-[12px] text-zinc-500 leading-relaxed italic">
                  {step.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Action Note - Refined Footer */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8 pt-10 border-t border-zinc-900"
        >
          <p className="text-[11px] text-zinc-600 italic">
            Ready to test your logic?
          </p>
          <button className="flex items-center gap-2 text-[11px] font-bold text-zinc-400 hover:text-white transition-all active:scale-95 group">
            <span>Go to challenges</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>

      </div>
    </section>
  );
}