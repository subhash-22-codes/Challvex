import { useAuth } from '../context/AuthContext';
import { Link, useLocation, useNavigate } from 'react-router-dom'; // Added useNavigate

export default function GlobalNavbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate(); // Initialize navigate

  // Handle Sign out safely
  const handleSignOut = () => {
    logout();      // Clears localStorage and User state
    navigate('/login'); // Smoothly redirects to login
  };

  // Hide navbar on auth pages or if not logged in
  const authPages = ['/login', '/signup'];
  if (!user || authPages.includes(location.pathname)) return null;

  const isAdmin = user?.roles?.includes('admin') || false;
  const isStudent = user?.roles?.includes('student') || false;

  return (
    <nav className="bg-[#09090b]/90 backdrop-blur-md border-b border-zinc-800/50 px-4 sm:px-8 h-14 flex justify-between items-center sticky top-0 z-[100]">
      <div className="flex items-center gap-10">
        <Link to="/" className="text-xs font-medium text-zinc-100 tracking-tight transition-opacity hover:opacity-80">
          Platform
        </Link>

        <div className="flex gap-6">
          {isStudent && (
            <Link 
              to="/" 
              className={`text-[11px] transition-colors ${
                location.pathname === '/' || location.pathname.startsWith('/arena')
                  ? 'text-zinc-100' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Challenges
            </Link>
          )}

          {isAdmin && (
            <Link 
              to="/admin" 
              className={`text-[11px] transition-colors ${
                location.pathname.startsWith('/admin') 
                  ? 'text-zinc-100' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Admin
            </Link>
          )}
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-[11px] text-zinc-100 font-medium leading-none mb-1">
            {user?.username || "User"}
          </span>
          <span className="text-[10px] text-zinc-600 font-normal lowercase italic">
            {user?.roles?.length > 0 ? user.roles.join(' / ') : "Standard access"}
          </span>
        </div>

        {/* Updated Button */}
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