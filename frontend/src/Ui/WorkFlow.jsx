import { motion } from 'framer-motion';
import { UserCircle2, Swords, BarChart3, ArrowRight } from 'lucide-react';

export default function WorkFlow() {
  const steps = [
    {
      icon: <UserCircle2 size={20} className="text-zinc-100" />,
      title: "Join the community",
      desc: "Create your free account in seconds. This lets you save your code and track your progress."
    },
    {
      icon: <Swords size={20} className="text-zinc-100" />,
      title: "Enter the arena",
      desc: "Pick a challenge to solve or make your own coding puzzle for your friends to try out."
    },
    {
      icon: <BarChart3 size={20} className="text-zinc-100" />,
      title: "See your growth",
      desc: "Get instant results for your code and see feedback from other creators to get better."
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <section className="py-20 px-6 border-b border-zinc-800 bg-[#09090b]">
      <div className="max-w-7xl mx-auto space-y-16">
        
        {/* Header */}
        <div className="space-y-3">
          <h2 className="text-xl font-medium text-white tracking-tight">
            How to get started.
          </h2>
          <p className="text-[13px] text-zinc-500 max-w-md leading-relaxed">
            Challvex is designed to be simple. Follow these three steps to start your coding journey.
          </p>
        </div>

        {/* Steps Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 relative"
        >
          {/* Connecting Line (Hidden on mobile) */}
          <div className="hidden md:block absolute top-10 left-0 right-0 h-[1px] bg-zinc-800 z-0" />

          {steps.map((step, i) => (
            <motion.div 
              key={i} 
              variants={itemVariants}
              className="relative z-10 space-y-6 group"
            >
              {/* Icon Circle */}
              <div className="w-10 h-10 bg-[#0c0c0e] border border-zinc-800 flex items-center justify-center group-hover:border-zinc-500 transition-colors">
                {step.icon}
              </div>

              <div className="space-y-3 pr-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-600">0{i + 1}</span>
                  <h3 className="text-[14px] font-semibold text-zinc-200">
                    {step.title}
                  </h3>
                </div>
                <p className="text-[12px] text-zinc-500 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Action Note */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col sm:flex-row items-center gap-6 pt-8 border-t border-zinc-900"
        >
          <p className="text-[11px] text-zinc-600 italic">
            Ready to test your logic?
          </p>
          <button className="flex items-center gap-2 text-[11px] font-bold text-zinc-300 hover:text-white transition-all group">
            <span>Go to challenges</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>

      </div>
    </section>
  );
}