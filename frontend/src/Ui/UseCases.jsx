import { motion } from 'framer-motion';
import { 
  Briefcase, 
  Users, 
  Laptop, 
  GraduationCap, 
  ArrowRight,
} from 'lucide-react';

export default function UseCases() {
  const cases = [
    {
      title: "Get ready for interviews",
      desc: "Practice with coding tasks made by others. It helps you get used to solving problems quickly before you go for a real job test.",
      icon: <Briefcase size={18} className="text-zinc-500 group-hover:text-white transition-colors" />
    },
    {
      title: "Test your friends",
      desc: "Make your own coding tasks to see how good your friends or classmates really are. You can check their scores and give them tips.",
      icon: <Users size={18} className="text-zinc-500 group-hover:text-white transition-colors" />
    },
    {
      title: "Solve real logic",
      desc: "Don't just do basic school work. Work on coding problems that look like what real apps and websites use every day.",
      icon: <Laptop size={18} className="text-zinc-500 group-hover:text-white transition-colors" />
    },
    {
      title: "Learn by making",
      desc: "The best way to learn is to build tasks for others. When you make the rules, you find mistakes you never noticed before.",
      icon: <GraduationCap size={18} className="text-zinc-500 group-hover:text-white transition-colors" />
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.4, ease: 'easeOut' } 
    }
  };

  return (
    <section className="py-20 md:py-24 px-6 border-b border-zinc-800 bg-[#09090b] antialiased">
      <div className="max-w-7xl mx-auto space-y-12 md:space-y-16">
        
        {/* Header - Consistent with previous sections */}
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
            <span className="text-[10px] font-mono text-zinc-600 font-bold tracking-widest italic">
              Ways to use the arena
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-medium text-white tracking-tighter italic">
            How people use Challvex.
          </h2>
        </motion.div>

        {/* Use Case Grid - Professional Hairline Border Logic */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 gap-px bg-zinc-800 border border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.5)]"
        >
          {cases.map((item, i) => (
            <motion.div 
              key={i} 
              variants={itemVariants}
              className="bg-[#0c0c0e] p-8 md:p-12 space-y-6 group hover:bg-[#0e0e11] transition-all duration-300"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-zinc-950 border border-zinc-800 flex items-center justify-center group-hover:border-zinc-600 transition-colors rounded-none">
                  {item.icon}
                </div>
                <h3 className="text-[15px] font-medium text-zinc-100 italic tracking-tight">
                  {item.title}
                </h3>
              </div>

              <p className="text-[12px] md:text-[13px] text-zinc-500 leading-relaxed max-w-sm italic border-l border-zinc-900 pl-5">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom Bar - IDE Styled Utility */}
        <div className="pt-10 border-t border-zinc-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-4 h-[1px] bg-zinc-800" />
            <p className="text-[11px] text-zinc-600 font-mono italic tracking-tight">
              All tools are ready for both makers and solvers.
            </p>
          </div>
          
          <button className="flex items-center gap-2 text-[11px] font-bold text-zinc-400 hover:text-white transition-all active:scale-95 group">
            <span>Look at current challenges</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

      </div>
    </section>
  );
}