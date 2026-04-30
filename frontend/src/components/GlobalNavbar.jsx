import { useAuth } from '../context/AuthContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function GlobalNavbar() {
  const { user, logout, currentOrg } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = () => {
    logout(); 
    navigate('/login');
  };

  const authPages = ['/login', '/signup', '/forgot-password', '/reset-password'];
  const isFocusMode = 
    location.pathname.startsWith('/arena/') || 
    location.pathname.startsWith('/admin/review/');

  if (!user || authPages.includes(location.pathname) || isFocusMode) {
    return null;
  }

  const isCreator = user?.roles?.includes("admin") || false;
  const isSolver = user?.roles?.includes("student") || false;

  return (
    <nav className="bg-[#09090b]/90 backdrop-blur-md border-b border-zinc-800/50 px-4 sm:px-8 h-14 flex justify-between items-center sticky top-0 z-[100]">
      <div className="flex items-center gap-4">
        {/* Logo */}
        <Link to="/dashboard" className="transition-opacity hover:opacity-80">
          <img src="/challvex.png" alt="Challvex" className="h-4 w-auto brightness-110" />
        </Link>

        {/* Flat Identity Stamp - No more interactive switcher here */}
        <div className="flex items-center gap-4">
          <span className="text-zinc-800 text-lg font-light select-none">/</span>
          <span className="text-[11px] font-medium text-zinc-500 tracking-tight">
            {currentOrg ? currentOrg.name : "Personal Workspace"}
          </span>
        </div>

        {/* Global Navigation Links */}
        <div className="flex gap-6 ml-6 border-l border-zinc-800/50 pl-6 h-4 items-center">
          {isSolver && (
            <Link to="/dashboard" className={`text-[11px] transition-colors ${location.pathname === '/dashboard' ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
              Challenges
            </Link>
          )}
          {isCreator && (
            <Link to="/admin" className={`text-[11px] transition-colors ${location.pathname.startsWith('/admin') ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
              Creator
            </Link>
          )}
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden sm:flex flex-col items-end text-right">
          <span className="text-[11px] text-zinc-100 font-medium leading-none mb-1">
            {user?.username || "User"}
          </span>
          <span className="text-[10px] text-zinc-600 font-normal lowercase italic">
            {currentOrg ? `${currentOrg.role} @ ${currentOrg.slug}` : (isCreator ? "global creator" : "solver access")}
          </span>
        </div>

        <button 
          onClick={handleSignOut}
          className="text-[11px] text-zinc-500 hover:text-zinc-100 border border-zinc-800 hover:border-zinc-700 px-3 py-1 rounded transition-all active:scale-95"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}