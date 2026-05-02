import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Trophy, 
  BookOpen, 
  LogIn, 
  UserPlus, 
  LogOut 
} from 'lucide-react';

export default function LandingNavbar() {
  const { user, logout } = useAuth();

  return (
    <motion.nav 
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-[1000] bg-[#09090b]/80 backdrop-blur-xl border-b border-white/5 h-12 antialiased"
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 h-full flex justify-between items-center gap-4">
        
        <div className="flex items-center h-full">
          {/* Logo Section - Adaptive switch for mobile context */}
          <Link to="/" className="transition-all hover:opacity-70 shrink-0 flex items-center">
            <img 
              src="/minichallvex.png" 
              alt="Challvex" 
              className="h-4 w-auto brightness-125 md:hidden" 
            />
            <img 
              src="/challvex.png" 
              alt="Challvex" 
              className="h-3 w-auto brightness-125 hidden md:block" 
            />
          </Link>
          
          {/* Internal Links - High density spacing */}
          <div className="flex items-center gap-4 sm:gap-6 ml-4 sm:ml-8 border-l border-white/10 pl-4 sm:pl-8 h-4">
            <Link to="/about" className="flex items-center gap-2 text-[11px] font-medium text-zinc-500 hover:text-white transition-colors">
              <BookOpen size={13} className="shrink-0" />
              <span className="hidden xs:inline">Guide</span>
            </Link>
            <Link to="/challenges" className="flex items-center gap-2 text-[11px] font-medium text-zinc-500 hover:text-white transition-colors">
              <LayoutDashboard size={13} className="shrink-0" />
              <span className="hidden xs:inline">Challenges</span>
            </Link>
            <div className="flex items-center gap-2 text-[11px] font-medium text-zinc-700 cursor-not-allowed select-none">
              <Trophy size={13} className="shrink-0" />
              <span className="hidden sm:inline">Ranks (Soon)</span>
            </div>
          </div>
        </div>

        {/* User Context Actions */}
        <div className="flex items-center gap-3 sm:gap-6 h-full">
          {user ? (
            <>
              <Link 
                to={user.roles?.includes('admin') ? '/admin' : '/dashboard'} 
                className="text-[11px] font-medium text-zinc-400 hover:text-white flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <LayoutDashboard size={13} />
                <span className="hidden sm:inline">My dashboard</span>
              </Link>
              <button 
                onClick={logout}
                className="text-[11px] font-medium text-zinc-500 hover:text-red-400 flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap"
              >
                <LogOut size={13} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link 
                to="/login" 
                className="text-[11px] font-medium text-zinc-500 hover:text-white transition-colors whitespace-nowrap"
              >
                <span className="flex items-center gap-2">
                  <LogIn size={13} />
                  Login
                </span>
              </Link>
              <Link 
                to="/signup" 
                className="bg-white text-black px-3 sm:px-4 h-7 text-[11px] font-bold border border-white hover:bg-zinc-200 transition-all active:scale-[0.97] flex items-center gap-2 rounded-none whitespace-nowrap"
              >
                <UserPlus size={13} />
                <span>Join now</span>
              </Link>
            </>
          )}
        </div>

      </div>
    </motion.nav>
  );
}