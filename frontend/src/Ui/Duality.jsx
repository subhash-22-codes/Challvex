import { motion } from 'framer-motion'
import {
  PencilRuler,
  Terminal,
  CheckCircle2,
  Cpu,
  Users2,
  Zap
} from 'lucide-react'

export default function Duality() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: 'easeOut' }
    }
  }

  return (
    <section className="py-20 md:py-24 px-6 border-b border-zinc-800 bg-[#0c0c0e] antialiased">
      <div className="max-w-7xl mx-auto space-y-12">

        {/* Header - Consistent with Hero spacing */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="max-w-xl space-y-3"
        >
          <h2 className="text-xl md:text-2xl font-medium text-white tracking-tighter italic">
            Two ways to participate.
          </h2>

          <p className="text-[12px] md:text-[13px] text-zinc-500 leading-relaxed italic border-l border-zinc-800 pl-5">
            You can either build your own coding puzzles for others to try, or jump into the arena to solve what the community has made.
          </p>
        </motion.div>

        {/* Grid - Standardized zinc-800 hairline */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-zinc-800 border border-zinc-800"
        >

          {/* Maker */}
          <motion.div
            variants={cardVariants}
            className="bg-[#09090b] p-8 md:p-10 space-y-10 relative overflow-hidden group transition-colors duration-300 hover:bg-[#0c0c0e]"
          >
            <img
              src="/challengemaker.png"
              alt="challenge maker"
              className="absolute top-6 right-6 w-24 md:w-32 opacity-40 grayscale group-hover:grayscale-0 group-hover:opacity-80 transition-all duration-700 pointer-events-none select-none"
            />

            <div className="space-y-6 relative z-10 pr-20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-900 border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                  <PencilRuler size={16} className="text-zinc-400 group-hover:text-white" />
                </div>
                <span className="text-[10px] font-mono text-zinc-600 tracking-widest font-bold">Step 01</span>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-medium text-zinc-100 italic tracking-tight">
                  The challenge maker
                </h3>
                <p className="text-[12px] md:text-[13px] text-zinc-500 leading-relaxed italic">
                  Become the architect. Write the story, set the time limits, and create secret test cases to check if others' code actually works.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-8 border-t border-zinc-900 relative z-10">
              {[
                { icon: <Zap size={13} />, text: 'Set custom time & memory limits' },
                { icon: <CheckCircle2 size={13} />, text: 'Create hidden test cases' },
                { icon: <Users2 size={13} />, text: 'Give feedback to solvers' }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 text-zinc-600 group-hover:text-zinc-400 transition-colors">
                  <span className="text-zinc-800">{item.icon}</span>
                  <span className="text-[11px] font-medium tracking-tight whitespace-nowrap">{item.text}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Solver */}
          <motion.div
            variants={cardVariants}
            className="bg-[#09090b] p-8 md:p-10 space-y-10 relative overflow-hidden group transition-colors duration-300 hover:bg-[#0c0c0e]"
          >
            <img
              src="/problemsolver.png"
              alt="problem solver"
              className="absolute top-6 right-6 w-24 md:w-32 opacity-40 grayscale group-hover:grayscale-0 group-hover:opacity-80 transition-all duration-700 pointer-events-none select-none"
            />

            <div className="space-y-6 relative z-10 pr-20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-900 border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                  <Terminal size={16} className="text-zinc-400 group-hover:text-white" />
                </div>
                <span className="text-[10px] font-mono text-zinc-600 tracking-widest font-bold">Step 02</span>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-medium text-zinc-100 italic tracking-tight">
                  The problem solver
                </h3>
                <p className="text-[12px] md:text-[13px] text-zinc-500 leading-relaxed italic">
                  Enter the arena. Write your code in Python or Java, pass all the tests, and see how your logic stacks up against the maker's requirements.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-8 border-t border-zinc-900 relative z-10">
              {[
                { icon: <Cpu size={13} />, text: 'Live code execution arena' },
                { icon: <Zap size={13} />, text: 'Real-time score tracking' },
                { icon: <Users2 size={13} />, text: 'Get reviewed by creators' }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 text-zinc-600 group-hover:text-zinc-400 transition-colors">
                  <span className="text-zinc-800">{item.icon}</span>
                  <span className="text-[11px] font-medium tracking-tight whitespace-nowrap">{item.text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}