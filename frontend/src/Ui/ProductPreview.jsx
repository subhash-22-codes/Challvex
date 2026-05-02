import { motion } from 'framer-motion';
import { Layout, CheckCircle, Timer, MessageSquare } from 'lucide-react';

export default function ProductPreview() {
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
    <section className="py-20 md:py-24 px-6 border-b border-zinc-800 bg-[#0c0c0e] antialiased">
      <div className="max-w-7xl mx-auto space-y-12 md:space-y-16">
        
        {/* Header - Consistent with Hero/WorkFlow/Duality */}
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="max-w-2xl space-y-3"
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-zinc-950 border border-zinc-800">
                <Layout size={13} className="text-zinc-600" />
            </div>
            <span className="text-[10px] font-mono text-zinc-600 font-bold tracking-widest">
              A look inside the arena
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-medium text-white tracking-tighter italic">
            Everything you need on one screen.
          </h2>
          <p className="text-[12px] md:text-[13px] text-zinc-500 leading-relaxed italic border-l border-zinc-800 pl-5 max-w-md">
            The coding space is split in two. Read the rules on the left and write your code on the right. It is built to help you stay focused without jumping between tabs.
          </p>
        </motion.div>

        {/* App Window Preview - Hairline precision framing */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative group bg-[#09090b] border border-white/5 p-1 md:p-1.5 shadow-[0_0_50px_rgba(0,0,0,0.8)] ring-1 ring-white/5"
        >
          {/* Top Bar - IDE style cleanliness */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-zinc-950/50">
            <div className="flex gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
            </div>
            <span className="text-[9px] font-mono text-zinc-700 font-bold tracking-widest italic">
              Arena view
            </span>
          </div>

          <div className="relative overflow-hidden bg-black">
            <img 
              src="/platform.png" 
              alt="The coding arena" 
              className="w-full h-auto brightness-[0.75] group-hover:brightness-100 transition-all duration-700 ease-in-out select-none"
            />
          </div>
        </motion.div>

        {/* Feature List - Staggered scroll motion */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16 pt-10 border-t border-zinc-900"
        >
          <motion.div variants={itemVariants} className="space-y-4 group">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-zinc-950 border border-zinc-800 flex items-center justify-center group-hover:border-zinc-600 transition-all">
                <CheckCircle size={14} className="text-zinc-600 group-hover:text-emerald-500 transition-colors" />
              </div>
              <h4 className="text-[14px] font-medium text-zinc-200 tracking-tight italic">Test your logic.</h4>
            </div>
            <p className="text-[12px] text-zinc-500 leading-relaxed italic pr-4">
              Run your code and see if it works against different inputs immediately.
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-4 group">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-zinc-950 border border-zinc-800 flex items-center justify-center group-hover:border-zinc-600 transition-all">
                <Timer size={14} className="text-zinc-600 group-hover:text-white transition-colors" />
              </div>
              <h4 className="text-[14px] font-medium text-zinc-200 tracking-tight italic">Watch your limits.</h4>
            </div>
            <p className="text-[12px] text-zinc-500 leading-relaxed italic pr-4">
              See how much time and memory your code takes to make sure it is fast enough.
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-4 group">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-zinc-950 border border-zinc-800 flex items-center justify-center group-hover:border-zinc-600 transition-all">
                <MessageSquare size={14} className="text-zinc-600 group-hover:text-white transition-colors" />
              </div>
              <h4 className="text-[14px] font-medium text-zinc-200 tracking-tight italic">Notes from makers.</h4>
            </div>
            <p className="text-[12px] text-zinc-500 leading-relaxed italic pr-4">
              Read personal advice and scores from the people who created the task.
            </p>
          </motion.div>
        </motion.div>

      </div>
    </section>
  );
}