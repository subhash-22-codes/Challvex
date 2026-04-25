/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllChallenges, getAllSubmissions } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function StudentDashboard() {
  const [challenges, setChallenges] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [challengesData, submissionsData] = await Promise.all([
          getAllChallenges(),
          getAllSubmissions()
        ]);
        setChallenges(challengesData);
        setSubmissions(submissionsData);
      } catch (err) {
        console.error("Sync failed");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getChallengeStatus = (ch) => {
    // UPDATED: Comparing slot_id (strings) instead of day_number (numbers)
    const userSub = submissions.find(s => s.slot_id === ch.slot_id);
    
    if (userSub) {
      if (userSub.status === "reviewed") {
        return { type: "reviewed", average_score: userSub.average_score || 0 };
      }
      return { type: "submitted" };
    }

    if (ch.status === "draft") return { type: "locked" };
    return { type: "active" };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <span className="text-xs text-zinc-500 animate-pulse">Loading dashboard...</span>
      </div>
    );
  }

  const reviewedSubs = submissions.filter(s => s.status === 'reviewed');
  const avgScore = reviewedSubs.length > 0 
    ? (reviewedSubs.reduce((acc, curr) => acc + (curr.average_score || 0), 0) / reviewedSubs.length).toFixed(1) 
    : '0.0';

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-300 font-sans">
      <main className="max-w-4xl mx-auto px-4 py-16 lg:py-24">
        
        {/* Profile Header */}
        <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-1">
            <h1 className="text-lg font-medium text-zinc-100 tracking-tight">
              Hello, {user?.username || 'Developer'}
            </h1>
            <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
              Track your progress and complete assessments to unlock the next stage.
            </p>
          </div>

          <div className="flex gap-6">
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider">Completed</p>
              <p className="text-sm font-medium text-zinc-100">
                 {submissions.length} <span className="text-zinc-600">/ {challenges.filter(c => c.status === 'published').length}</span>
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider">Average Score</p>
              <p className="text-sm font-medium text-zinc-100">
                {avgScore} <span className="text-zinc-600 text-xs">/ 10</span>
              </p>
            </div>
          </div>
        </header>

        {/* List of Challenges */}
        <div className="space-y-1">
          <div className="pb-4 border-b border-zinc-800/50 mb-6">
            <h2 className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest">Assessments</h2>
          </div>

          <div className="space-y-2">
            {challenges.map((ch) => {
              const status = getChallengeStatus(ch);
              const isLocked = status.type === 'locked';
              
              return (
                <div 
                  // UPDATED: Using slot_id as key
                  key={ch.slot_id}
                  className={`flex items-center justify-between p-4 rounded-md border transition-colors ${
                    isLocked 
                      ? 'bg-transparent border-transparent opacity-40' 
                      : 'bg-zinc-900/40 border-zinc-800/50 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-6">
                    {/* UPDATED: Displaying the slot_id as the ID tag */}
                    <span className="text-[10px] font-mono text-zinc-500 w-fit px-2 py-0.5 border border-zinc-800 rounded bg-black/20">
                      {ch.slot_id}
                    </span>

                    <div>
                      <h3 className={`text-sm font-medium ${isLocked ? 'text-zinc-500' : 'text-zinc-100'}`}>
                        {/* UPDATED: Defaulting to slot_id if title is missing */}
                        {ch.title || `Challenge ${ch.slot_id}`}
                      </h3>
                      
                      <div className="mt-0.5 flex items-center gap-3">
                          {status.type === 'reviewed' && (
                            <span className="text-[10px] text-emerald-500 font-mono">
                              Score: {status.average_score || 0}/10
                            </span>
                          )}
                        {status.type === 'submitted' && (
                           <span className="text-[10px] text-amber-500">Under review</span>
                        )}
                        {status.type === 'active' && (
                           <span className="text-[10px] text-zinc-400">Available Now</span>
                        )}

                        {!isLocked && ch.created_by && (
                          <>
                            <div className="w-1 h-1 rounded-full bg-zinc-800"></div>
                            <span className="text-[10px] text-zinc-600 lowercase">
                              by {ch.created_by} • {new Date(ch.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          </>
                        )}

                        {isLocked && (
                           <span className="text-[10px] text-zinc-600 italic">Opening Soon</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {!isLocked && (
                    <Link 
                      // UPDATED: Navigation now uses slot_id string
                      to={`/arena/${ch.slot_id}`}
                      className={`text-[11px] font-medium px-4 py-1.5 rounded transition-all ${
                        status.type === 'active' 
                          ? 'bg-zinc-100 text-zinc-950 hover:bg-white shadow-sm' 
                          : 'text-zinc-400 hover:text-zinc-100 border border-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      {status.type === 'reviewed' ? 'View Code' : 'Start Assessment'}
                    </Link>
                  )}
                </div>
              );
            })}

            {challenges.length === 0 && (
              <div className="py-20 text-center">
                <p className="text-xs text-zinc-600 italic">No assessments available yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* System Footer */}
        <footer className="mt-32 pt-6 border-t border-zinc-900 flex justify-between items-center text-[10px] text-zinc-600">
          <span>Platform v3.5 (Slot Logic)</span>
          <div className="flex gap-4">
            <span className="hover:text-zinc-400 cursor-pointer">Support</span>
            <span className="hover:text-zinc-400 cursor-pointer">Terms</span>
          </div>
        </footer>
      </main>
    </div>
  );
}