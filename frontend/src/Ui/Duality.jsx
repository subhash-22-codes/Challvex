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
      transition: { staggerChildren: 0.2 }
    }
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' }
    }
  }

  return (
    <section className="py-20 px-6 border-b border-zinc-800 bg-[#0c0c0e]">
      <div className="max-w-7xl mx-auto space-y-12">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="max-w-xl space-y-2"
        >
          <h2 className="text-xl font-medium text-white tracking-tight">
            Two ways to participate.
          </h2>

          <p className="text-[13px] text-zinc-500 leading-relaxed">
            You can either build your own coding puzzles for others to try, or jump into the arena to solve what the community has made.
          </p>
        </motion.div>

        {/* Grid */}
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
            whileHover={{
              backgroundColor: '#0d0d0f',
              y: -4
            }}
            className="bg-[#09090b] p-8 md:p-10 space-y-8 relative overflow-hidden group"
          >
            {/* Illustration */}
            <img
              src="/challengemaker.png"
              alt="challenge maker"
              className="absolute top-6 right-6 w-28 md:w-36 opacity-90 pointer-events-none select-none transition-transform duration-500 group-hover:scale-105"
            />

            {/* subtle glow */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-zinc-800/20 blur-3xl rounded-full" />

            <div className="space-y-4 relative z-10 pr-20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-900 border border-zinc-800 group-hover:border-zinc-600 transition-colors">
                  <PencilRuler size={18} className="text-zinc-100" />
                </div>

                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                  Step 01
                </span>
              </div>

              <h3 className="text-lg font-medium text-zinc-100">
                The challenge maker
              </h3>

              <p className="text-[13px] text-zinc-400 leading-relaxed">
                Become the architect. Write the story, set the time limits, and create secret test cases to check if others' code actually works.
              </p>
            </div>

            <div className="space-y-3 pt-6 border-t border-zinc-900 relative z-10">
              {[
                { icon: <Zap size={14} />, text: 'Set custom time & memory limits' },
                { icon: <CheckCircle2 size={14} />, text: 'Create hidden test cases' },
                { icon: <Users2 size={14} />, text: 'Give feedback to solvers' }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 text-zinc-500 group-hover:text-zinc-300 transition-colors">
                  <span className="text-zinc-700">{item.icon}</span>
                  <span className="text-[11px]">{item.text}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Solver */}
          <motion.div
            variants={cardVariants}
            whileHover={{
              backgroundColor: '#0d0d0f',
              y: -4
            }}
            className="bg-[#09090b] p-8 md:p-10 space-y-8 relative overflow-hidden group"
          >
            <img
              src="/problemsolver.png"
              alt="problem solver"
              className="absolute top-6 right-6 w-28 md:w-36 opacity-90 pointer-events-none select-none transition-transform duration-500 group-hover:scale-105"
            />

            <div className="absolute top-0 right-0 w-40 h-40 bg-zinc-800/20 blur-3xl rounded-full" />

            <div className="space-y-4 relative z-10 pr-20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-900 border border-zinc-800 group-hover:border-zinc-600 transition-colors">
                  <Terminal size={18} className="text-zinc-100" />
                </div>

                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                  Step 02
                </span>
              </div>

              <h3 className="text-lg font-medium text-zinc-100">
                The problem solver
              </h3>

              <p className="text-[13px] text-zinc-400 leading-relaxed">
                Enter the arena. Write your code in Python or Java, pass all the tests, and see how your logic stacks up against the maker's requirements.
              </p>
            </div>

            <div className="space-y-3 pt-6 border-t border-zinc-900 relative z-10">
              {[
                { icon: <Cpu size={14} />, text: 'Live code execution arena' },
                { icon: <Zap size={14} />, text: 'Real-time score tracking' },
                { icon: <Users2 size={14} />, text: 'Get reviewed by creators' }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 text-zinc-500 group-hover:text-zinc-300 transition-colors">
                  <span className="text-zinc-700">{item.icon}</span>
                  <span className="text-[11px]">{item.text}</span>
                </div>
              ))}
            </div>
          </motion.div>

        </motion.div>


      </div>
    </section>
  )
}