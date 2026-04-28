import { motion } from 'framer-motion';
import { 
  Briefcase, 
  Users, 
  Laptop, 
  GraduationCap, 
  ArrowRight,
  Circle
} from 'lucide-react';

export default function UseCases() {
  const cases = [
    {
      title: "Get ready for interviews",
      desc: "Practice with coding tasks made by others. It helps you get used to solving problems quickly before you go for a real job test.",
      icon: <Briefcase size={20} className="text-zinc-400 group-hover:text-white transition-colors" />
    },
    {
      title: "Test your friends",
      desc: "Make your own coding tasks to see how good your friends or classmates really are. You can check their scores and give them tips.",
      icon: <Users size={20} className="text-zinc-400 group-hover:text-white transition-colors" />
    },
    {
      title: "Solve real logic",
      desc: "Don't just do basic school work. Work on coding problems that look like what real apps and websites use every day.",
      icon: <Laptop size={20} className="text-zinc-400 group-hover:text-white transition-colors" />
    },
    {
      title: "Learn by making",
      desc: "The best way to learn is to build tasks for others. When you make the rules, you find mistakes you never noticed before.",
      icon: <GraduationCap size={20} className="text-zinc-400 group-hover:text-white transition-colors" />
    }
  ];

  return (
    <section className="py-20 px-6 border-b border-zinc-800 bg-[#09090b]">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2 text-zinc-600">
            <Circle size={8} fill="currentColor" />
            <span className="text-[11px] font-mono tracking-tight">
              Ways to use the arena
            </span>
          </div>
          <h2 className="text-xl font-medium text-white tracking-tight">
            How people use Challvex.
          </h2>
        </motion.div>

        {/* Use Case Grid */}
        <motion.div 
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={{
            show: { transition: { staggerChildren: 0.1 } }
          }}
          className="grid grid-cols-1 md:grid-cols-2 gap-px bg-zinc-800 border border-zinc-800"
        >
          {cases.map((item, i) => (
            <motion.div 
              key={i} 
              variants={{
                hidden: { opacity: 0, y: 20 },
                show: { opacity: 1, y: 0 }
              }}
              className="bg-[#0c0c0e] p-10 space-y-6 group hover:bg-[#111113] transition-all duration-300"
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-zinc-950 border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                  {item.icon}
                </div>
                <h3 className="text-[15px] font-semibold text-zinc-100">
                  {item.title}
                </h3>
              </div>

              <p className="text-[13px] text-zinc-500 leading-relaxed max-w-sm">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Simple Bottom Bar */}
        <div className="pt-8 border-t border-zinc-900 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 bg-zinc-800" />
            <p className="text-[11px] text-zinc-600 font-mono italic">
              All tools are ready for both makers and solvers.
            </p>
          </div>
          
          <button className="flex items-center gap-2 text-[12px] font-bold text-zinc-300 hover:text-white transition-colors group">
            <span>Look at current challenges</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

      </div>
    </section>
  );
}