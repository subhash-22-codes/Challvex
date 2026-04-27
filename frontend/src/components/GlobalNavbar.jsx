import { useAuth } from '../context/AuthContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function GlobalNavbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Handle Sign out safely
  const handleSignOut = () => {
    logout(); 
    navigate('/login');
  };

  // 1. Hide navbar on auth pages
  const authPages = ['/login', '/signup', '/forgot-password', '/reset-password'];
  
  // 2. Focus Mode: Hide navbar on dynamic routes like Arena or Admin Review
  const isFocusMode = 
    location.pathname.startsWith('/arena/') || 
    location.pathname.startsWith('/admin/review/');

  // 3. The Logic Gate: Don't render if not logged in, on auth pages, or in focus mode
  if (!user || authPages.includes(location.pathname) || isFocusMode) {
    return null;
  }

  const isCreator = user?.roles?.includes("admin") || false;
  const isSolver = user?.roles?.includes("student") || false;

  return (
    <nav className="bg-[#09090b]/90 backdrop-blur-md border-b border-zinc-800/50 px-4 sm:px-8 h-14 flex justify-between items-center sticky top-0 z-[100]">
      <div className="flex items-center gap-10">
        <Link to="/" className="transition-opacity hover:opacity-80">
          <img 
            src="/challvex.png" 
            alt="Challvex" 
            className="h-4 w-auto brightness-110" 
          />
        </Link>

        <div className="flex gap-6">
          {isSolver && (
            <Link 
              to="/" 
              className={`text-[11px] transition-colors ${
                location.pathname === '/' 
                  ? 'text-zinc-100' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Challenges
            </Link>
          )}

          {isCreator && (
            <Link 
              to="/admin" 
              className={`text-[11px] transition-colors ${
                location.pathname.startsWith('/admin') 
                  ? 'text-zinc-100' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
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
            {isCreator && isSolver
              ? "creator / solver"
              : isCreator
              ? "creator access"
              : isSolver
              ? "solver access"
              : "standard access"}
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