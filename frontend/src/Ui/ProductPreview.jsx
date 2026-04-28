import { motion } from 'framer-motion';
import { Layout, CheckCircle, Timer, MessageSquare } from 'lucide-react';

export default function ProductPreview() {
  return (
    <section className="py-20 px-6 border-b border-zinc-800 bg-[#0c0c0e]">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Simple Header */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl space-y-3"
        >
          <div className="flex items-center gap-2 text-zinc-500">
            <Layout size={14} />
            <span className="text-[11px] font-mono tracking-tight">
              A look inside the arena
            </span>
          </div>
          <h2 className="text-xl font-medium text-white tracking-tight">
            Everything you need on one screen.
          </h2>
          <p className="text-[13px] text-zinc-500 leading-relaxed">
            The coding space is split in two. Read the rules on the left and write your code on the right. It is built to help you stay focused without jumping between tabs.
          </p>
        </motion.div>

        {/* App Window Preview */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative group bg-[#09090b] border border-zinc-800 p-1 shadow-2xl"
        >
          {/* Top Bar of the Window */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-950/50">
            <div className="flex gap-1.5">
              <div className="w-2 h-2 rounded-full bg-zinc-800" />
              <div className="w-2 h-2 rounded-full bg-zinc-800" />
              <div className="w-2 h-2 rounded-full bg-zinc-800" />
            </div>
            <span className="text-[10px] font-mono text-zinc-600 italic">
              Arena view
            </span>
          </div>

          {/* Your Arena Screenshot */}
          <div className="relative overflow-hidden">
            <img 
              src="/platform.png" 
              alt="The coding arena" 
              className="w-full h-auto brightness-90 group-hover:brightness-100 transition-all duration-700"
            />
            
          </div>
        </motion.div>

        {/* Simple Feature List */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pt-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-zinc-200">
              <CheckCircle size={16} className="text-zinc-500" />
              <h4 className="text-[14px] font-semibold">Test your logic.</h4>
            </div>
            <p className="text-[12px] text-zinc-500 leading-relaxed">
              Run your code and see if it works against different inputs immediately.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-zinc-200">
              <Timer size={16} className="text-zinc-500" />
              <h4 className="text-[14px] font-semibold">Watch your limits.</h4>
            </div>
            <p className="text-[12px] text-zinc-500 leading-relaxed">
              See how much time and memory your code takes to make sure it is fast enough.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-zinc-200">
              <MessageSquare size={16} className="text-zinc-500" />
              <h4 className="text-[14px] font-semibold">Notes from makers.</h4>
            </div>
            <p className="text-[12px] text-zinc-500 leading-relaxed">
              Read personal advice and scores from the people who created the task.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}