import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Globe, Heart } from 'lucide-react';

export default function LandingFooter() {
  return (
    <footer className="py-20 px-6 bg-[#09090b] border-t border-zinc-900">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
          
          {/* Brand Column */}
          <div className="space-y-6">
            <Link to="/">
              <img 
                src="/challvex.png" 
                alt="Challvex" 
                className="h-5 w-auto object-contain brightness-90 hover:brightness-100 transition-all"
              />
            </Link>
            <p className="text-[13px] text-zinc-500 leading-relaxed max-w-[240px]">
              A simple place to build and solve coding puzzles. Designed for students who love to learn and challenge each other.
            </p>
            <div className="flex items-center gap-4 text-zinc-600">
              <a href="mailto:support@challvex.com" className="hover:text-white transition-colors"><Mail size={18} /></a>
              <Globe size={18} />
            </div>
          </div>

          {/* Links: Platform */}
          <div className="space-y-5">
            <h4 className="text-[14px] font-semibold text-zinc-200">Platform</h4>
            <ul className="space-y-3 text-[13px] text-zinc-500">
              <li><Link to="/signup" className="hover:text-white transition-colors">Start solving</Link></li>
              <li><Link to="/signup" className="hover:text-white transition-colors">Make a challenge</Link></li>
              <li><Link to="/dashboard" className="hover:text-white transition-colors">Your dashboard</Link></li>
            </ul>
          </div>

          {/* Links: Legal */}
          <div className="space-y-5">
            <h4 className="text-[14px] font-semibold text-zinc-200">Legal</h4>
            <ul className="space-y-3 text-[13px] text-zinc-500">
              <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy policy</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms of service</Link></li>
            </ul>
          </div>

          {/* Links: Support */}
          <div className="space-y-5">
            <h4 className="text-[14px] font-semibold text-zinc-200">Support</h4>
            <ul className="space-y-3 text-[13px] text-zinc-500">
              <li><a href="mailto:admin@challvex.app" className="hover:text-white transition-colors">Contact us</a></li>
              <li><Link to="/about" className="hover:text-white transition-colors">Help guide</Link></li>
              <li className="text-zinc-700 italic">Leaderboard (Soon)</li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-20 pt-8 border-t border-zinc-900 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-[12px] text-zinc-600">
            <span>© {new Date().getFullYear()} Challvex.</span>
            <span className="hidden md:inline text-zinc-800">|</span>
            <div className="flex items-center gap-1.5">
              <span>Made with</span>
              <Heart size={12} className="text-red-900 fill-red-900" />
              <span>for students.</span>
            </div>
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 px-4 py-1.5 bg-zinc-950 border border-zinc-800"
          >
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[11px] text-zinc-500 font-mono italic">
              System is running smoothly
            </span>
          </motion.div>
        </div>

      </div>
    </footer>
  );
}