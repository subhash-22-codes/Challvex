import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-[1000] bg-[#09090b]/90 backdrop-blur-md border-b border-zinc-800 h-14"
    >
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        
        {/* Logo Section */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <img 
              src="/challvex.png" 
              alt="Challvex" 
              className="h-5 w-auto object-contain"
            />
          </Link>
          
          {/* Simple Links with Icons */}
          <div className="hidden md:flex items-center gap-6 border-l border-zinc-800 pl-8">
            <Link to="/about" className="flex items-center gap-2 text-[12px] text-zinc-400 hover:text-white transition-colors">
              <BookOpen size={14} />
              <span>Guide</span>
            </Link>
            <Link to="/challenges" className="flex items-center gap-2 text-[12px] text-zinc-400 hover:text-white transition-colors">
              <LayoutDashboard size={14} />
              <span>Challenges</span>
            </Link>
            <div className="flex items-center gap-2 text-[12px] text-zinc-600 cursor-not-allowed select-none">
              <Trophy size={14} />
              <span>Ranks (Soon)</span>
            </div>
          </div>
        </div>

        {/* User Buttons */}
        <div className="flex items-center gap-5">
          {user ? (
            <>
              <Link 
                to={user.roles?.includes('admin') ? '/admin' : '/dashboard'} 
                className="text-[12px] text-zinc-300 hover:text-white flex items-center gap-2"
              >
                <LayoutDashboard size={14} />
                <span>My dashboard</span>
              </Link>
              <button 
                onClick={logout}
                className="text-[12px] text-zinc-500 hover:text-red-400 flex items-center gap-2 transition-colors"
              >
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="flex items-center gap-2 text-[12px] text-zinc-400 hover:text-white transition-colors">
                <LogIn size={14} />
                <span>Login</span>
              </Link>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link 
                  to="/signup" 
                  className="bg-white text-black px-4 py-1.5 text-[12px] font-bold border border-white hover:bg-zinc-200 transition-all rounded-none flex items-center gap-2"
                >
                  <UserPlus size={14} />
                  <span>Join now</span>
                </Link>
              </motion.div>
            </>
          )}
        </div>

      </div>
    </motion.nav>
  );
}