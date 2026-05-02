import { useAuth } from '../context/AuthContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function GlobalNavbar() {
  const { user, logout, currentOrg } = useAuth();
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = () => {
    logout(); 
    navigate('/login');
    setShowSignOutModal(false);
  };

  const authPages = ['/login', '/signup', '/forgot-password', '/reset-password'];
  const isFocusMode = 
    location.pathname.startsWith('/arena/') || 
    location.pathname.startsWith('/creator/review/');

  if (!user || authPages.includes(location.pathname) || isFocusMode) {
    return null;
  }

  const isCreator = user?.roles?.includes("creator") || false;
  const isSolver = user?.roles?.includes("student") || false;

  return (
    <>
      <nav className="bg-[#09090b]/80 backdrop-blur-xl border-b border-white/[0.05] h-12 flex items-center sticky top-0 z-[100] antialiased">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 w-full flex justify-between items-center">
          
          <div className="flex items-center h-full">
            {/* Adaptive Logo Switch */}
            <Link to="/dashboard" className="transition-all hover:opacity-70 shrink-0">
              <img 
                src="/minichallvex.png" 
                alt="Challvex" 
                className="h-3.5 w-auto brightness-125 md:hidden" 
              />
              <img 
                src="/challvex.png" 
                alt="Challvex" 
                className="h-3 w-auto brightness-125 hidden md:block" 
              />
            </Link>

            {/* Desktop-only Identity Stamp to prevent overlap on small screens */}
            <div className="hidden lg:flex items-center ml-6 border-l border-white/10 pl-6 h-4">
              <span className="text-[11px] font-medium text-zinc-500 tracking-tight select-none">
                {currentOrg ? currentOrg.name : "Personal Workspace"}
              </span>
            </div>

            {/* Navigation Links - Tight and neat Sentence case */}
            <div className="flex items-center gap-5 ml-6 sm:ml-8 border-l lg:border-none border-white/10 pl-6 lg:pl-0 h-4 lg:h-auto">
              {isSolver && (
                <Link 
                  to="/dashboard" 
                  className={`text-[11px] font-medium transition-all relative ${
                    location.pathname === '/dashboard' 
                      ? 'text-white' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Challenges
                  {location.pathname === '/dashboard' && (
                    <div className="absolute -bottom-[17px] left-0 right-0 h-[1px] bg-white" />
                  )}
                </Link>
              )}
              {isCreator && (
                <Link 
                  to="/creator" 
                  className={`text-[11px] font-medium transition-all relative ${
                    location.pathname.startsWith('/creator') 
                      ? 'text-white' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Creator
                  {location.pathname.startsWith('/creator') && (
                    <div className="absolute -bottom-[17px] left-0 right-0 h-[1px] bg-white" />
                  )}
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-8">
            {/* User Metadata */}
            <div className="hidden sm:flex flex-col items-end justify-center">
              <span className="text-[10px] text-zinc-100 font-semibold tracking-tight leading-none mb-1">
                {user?.username}
              </span>
              <span className="text-[9px] text-zinc-600 font-medium lowercase italic leading-none tracking-tighter">
                {currentOrg ? `${currentOrg.role} @ ${currentOrg.slug}` : (isCreator ? "global creator" : "solver access")}
              </span>
            </div>

            {/* Sign out - Hairline border button */}
            <button 
              onClick={() => setShowSignOutModal(true)}
              className="text-[10px] font-bold text-zinc-500 hover:text-white border border-white/10 hover:border-white/30 px-3 py-1 transition-all active:scale-95 bg-white/[0.02] rounded-none"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      {/* Professional Sign Out Modal */}
      {showSignOutModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/90 backdrop-blur-sm p-6 animate-in fade-in duration-200">
          <div className="bg-[#09090b] border border-white/10 rounded-none p-10 max-w-sm w-full shadow-[0_0_50px_rgba(0,0,0,1)] ring-1 ring-white/5">
            <div className="w-8 h-[1px] bg-zinc-800 mb-6" />
            <h3 className="text-[13px] font-semibold text-white mb-3 tracking-tight italic">Sign out?</h3>
            <p className="text-[11px] text-zinc-500 mb-10 leading-relaxed italic border-l border-zinc-800 pl-4">
              Are you sure you want to end your current session?
            </p>
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setShowSignOutModal(false)} 
                className="px-6 py-2 text-[10px] font-bold text-zinc-500 hover:text-zinc-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSignOut} 
                className="px-6 py-2 text-[10px] font-bold bg-zinc-100 text-black hover:bg-zinc-200 transition-all"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}