/* eslint-disable no-unused-vars */
import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAllChallenges, getAllSubmissions } from "../api/client";
import { useAuth } from "../context/AuthContext";
import AccessCodeModal from "../components/AccessCodeModal";

export default function StudentDashboard() {
  const { user, currentOrg, switchOrg } = useAuth();
  const navigate = useNavigate();
  
  const [challenges, setChallenges] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [filteredChallenges, setFilteredChallenges] = useState([]);
  
  const [page, setPage] = useState(1);
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "" });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [hallwayTab, setHallwayTab] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedGatedSlot, setSelectedGatedSlot] = useState(null);

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => setToast({ show: false, message: "" }), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchData = useCallback(async (targetPage = 1, isLoadMore = false) => {
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);

    try {
      const [challengesRes, submissionsData] = await Promise.all([
        getAllChallenges(false, currentOrg?.id, targetPage, 20),
        targetPage === 1 ? getAllSubmissions() : Promise.resolve(null),
      ]);

      if (isLoadMore) {
        setChallenges((prev) => [...prev, ...challengesRes.challenges]);
        setPage(targetPage);
      } else {
        setChallenges(challengesRes.challenges || []);
        if (submissionsData) setSubmissions(submissionsData);
        setPage(1);
      }

      setHasMore(challengesRes.has_more);
      setTotalAvailable(challengesRes.total);
    } catch (error) {
      setToast({ show: true, message: "We're having trouble updating your dashboard." });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [currentOrg]);

  useEffect(() => {
    fetchData(1, false);
  }, [currentOrg, fetchData]);

  const getChallengeStatus = useCallback(
    (challenge) => {
      const userSub = submissions.find((sub) => sub.slot_id === challenge.slot_id);
      if (userSub) {
        if (userSub.status === "reviewed") {
          return { type: "reviewed", average_score: userSub.average_score || 0 };
        }
        return { type: "submitted" };
      }
      if (challenge.status === "draft") return { type: "locked" };
      return { type: "active" };
    },
    [submissions]
  );

  useEffect(() => {
    let data = challenges.map(c => ({ ...c, itemType: 'challenge' }));

    data = data.filter((item) => {
      const term = search.toLowerCase();
      const matchesSearch =
        (item.title || "").toLowerCase().includes(term) ||
        (item.slot_id || "").toLowerCase().includes(term) ||
        (item.org_name || "").toLowerCase().includes(term) ||
        (item.created_by || "").toLowerCase().includes(term);

      if (currentOrg) {
        if (item.org_id !== currentOrg.id) return false;
      }

      if (hallwayTab === 'public' && item.org_id) return false;
      if (hallwayTab === 'community' && !item.org_id) return false;

      const status = getChallengeStatus(item);
      const matchesStatus = 
        statusFilter === "all" || 
        (statusFilter === "organization" && !!item.org_id) || 
        status.type === statusFilter;

      return matchesSearch && matchesStatus;
    });

    data.sort((a, b) => {
      if (sortBy === "oldest") return new Date(a.created_at) - new Date(b.created_at);
      if (sortBy === "title") return (a.title || "").localeCompare(b.title || "");
      return new Date(b.created_at) - new Date(a.created_at);
    });

    setFilteredChallenges(data);
  }, [challenges, currentOrg, search, statusFilter, hallwayTab, sortBy, getChallengeStatus]);

  const handleStartChallenge = (item) => {
    if (item.status === "draft") return;
    if (item.requires_code) {
      setSelectedGatedSlot(item.slot_id);
    } else {
      navigate(`/arena/${item.slot_id}`);
    }
  };

  const reviewedSubs = submissions.filter((sub) => sub.status === "reviewed");
  const avgScore = reviewedSubs.length > 0
    ? (reviewedSubs.reduce((acc, curr) => acc + (curr.average_score || 0), 0) / reviewedSubs.length).toFixed(1)
    : "0.0";

  if (loading && page === 1) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-1 h-1 bg-zinc-600 animate-pulse" />
          <span className="text-[11px] text-zinc-500 tracking-wider font-mono">Updating dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-300 font-sans antialiased pb-24">
      <AccessCodeModal 
        isOpen={!!selectedGatedSlot}
        slotId={selectedGatedSlot}
        onClose={() => setSelectedGatedSlot(null)}
        onSuccess={() => {
          const slot = selectedGatedSlot;
          setSelectedGatedSlot(null);
          navigate(`/arena/${slot}`);
        }}
      />
      
      {toast.show && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[1000] animate-in slide-in-from-top-4">
          <div className="bg-white text-black px-5 py-2.5 shadow-2xl flex items-center gap-3">
            <span className="text-[11px] font-bold tracking-tight">{toast.message}</span>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-6 py-12 lg:py-20">
        <section className="mb-12">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10">
            <header className="space-y-1">
              <p className="text-[11px] font-medium text-zinc-500">
                {currentOrg ? currentOrg.name : "Solver dashboard"}
              </p>
              <h1 className="text-2xl font-medium text-white tracking-tight">
                Hello, {user?.username || "Guest"}
              </h1>
              <p className="text-xs text-zinc-500 max-w-sm leading-relaxed italic">
                {currentOrg 
                  ? `Viewing assessments for the ${currentOrg.name} community.`
                  : "Track your progress or select an assessment to solve."}
              </p>
            </header>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-zinc-800 border border-zinc-800">
              {[
                { label: "Available", value: totalAvailable },
                { label: "Submitted", value: submissions.length },
                { label: "Reviewed", value: reviewedSubs.length },
                { label: "Average score", value: avgScore },
              ].map((stat) => (
                <div key={stat.label} className="bg-[#09090b] px-5 py-3 min-w-[120px]">
                  <p className="text-[10px] text-zinc-500 font-medium tracking-tight">{stat.label}</p>
                  <p className="text-base font-semibold text-white mt-0.5">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-10">
          <div className="flex flex-col md:flex-row gap-px bg-zinc-800 border border-zinc-800">
            <div className="flex-1 bg-[#09090b] flex items-center px-4">
              <svg className="w-3.5 h-3.5 text-zinc-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input
                type="text"
                placeholder="Search slots, titles, or organizations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-11 bg-transparent text-xs text-zinc-200 placeholder:text-zinc-600 outline-none"
              />
            </div>
            <div className="flex flex-row gap-px bg-zinc-800">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-11 bg-[#09090b] px-4 text-[11px] text-zinc-400 outline-none border-none cursor-pointer hover:text-zinc-100 transition-colors"
              >
                <option value="all">All status</option>
                <option value="active">Available</option>
                <option value="submitted">Under review</option>
                <option value="reviewed">Reviewed</option>
                <option value="locked">Coming soon</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-11 bg-[#09090b] px-4 text-[11px] text-zinc-400 outline-none border-none cursor-pointer hover:text-zinc-100 transition-colors"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="title">Alphabetical</option>
              </select>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-6">
              {[
                { id: 'all', label: currentOrg ? `${currentOrg.name} assessments` : "All assessments" },
                { id: 'public', label: "Public" },
                { id: 'community', label: "Community" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setHallwayTab(tab.id)}
                  className={`text-[11px] font-semibold tracking-wider transition-colors ${
                    hallwayTab === tab.id ? "text-white" : "text-zinc-600 hover:text-zinc-400"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            
            {currentOrg && (
              <button 
                onClick={() => switchOrg(null)}
                className="text-[10px] text-zinc-600 hover:text-white font-bold tracking-widest transition-colors"
              >
                ← Exit community
              </button>
            )}
          </div>

          <div className="border-t border-zinc-800">
            {filteredChallenges.length > 0 ? (
              <>
                {filteredChallenges.map((item) => {
                  const status = getChallengeStatus(item);
                  const isLocked = status.type === "locked";

                  return (
                    <div
                      key={item.slot_id}
                      className={`group flex flex-col md:flex-row md:items-center justify-between p-5 border-b border-zinc-800 transition-colors ${
                        isLocked ? "opacity-30 grayscale cursor-not-allowed" : "hover:bg-zinc-900/30"
                      }`}
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-[10px] font-mono text-zinc-600">
                            {item.slot_id}
                          </span>

                          <div className="flex items-center gap-1.5 px-2 py-0.5 border border-zinc-800 bg-zinc-950">
                            {item.requires_code && !["reviewed", "submitted"].includes(status.type) && (
                              <svg className="w-2.5 h-2.5 text-amber-500 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" clipRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"/></svg>
                            )}
                            <div className={`w-1 h-1 rounded-full ${
                              status.type === "reviewed" ? "bg-emerald-500" : 
                              status.type === "submitted" ? "bg-amber-500" : 
                              status.type === "active" ? "bg-zinc-400" : "bg-zinc-700"
                            }`} />
                            <span className="text-[10px] text-zinc-400 font-medium">
                              {status.type === "reviewed" ? `${status.average_score}/10` : 
                               status.type === "submitted" ? "Under review" : 
                               status.type === "locked" ? "Coming soon" : 
                               item.requires_code ? "Gated" : "Available"}
                            </span>
                          </div>
                        </div>

                        <h3 className="text-[13px] font-medium leading-none text-zinc-100 group-hover:text-white transition-colors">
                          {item.title || `Challenge ${item.slot_id}`}
                        </h3>

                        <div className="flex items-center gap-2 text-[10px] text-zinc-600 flex-wrap">
  <span className="flex items-center gap-1">
    By {item.org_name || item.created_by || "Challvex admin"}
    {/* ONE STAR SYMBOL: Only shows if the item belongs to an organization */}
    {item.org_id && (
      <svg 
        className="w-2.5 h-2.5 text-amber-500/80" 
        viewBox="0 0 24 24" 
        fill="currentColor"
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    )}
  </span>
  <span className="opacity-40">•</span>
  <span>
    {new Date(item.created_at).toLocaleDateString(undefined, { 
      month: "short", 
      day: "numeric", 
      year: "numeric" 
    })}
  </span>
</div>
                      </div>

                      <div className="mt-4 md:mt-0">
                        {!isLocked && (
                          <button
                            onClick={() => handleStartChallenge(item)}
                            className={`inline-flex items-center h-8 px-6 text-[11px] font-bold border rounded-none transition-all cursor-pointer ${
                              status.type === "reviewed" ? "border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-200" :
                              status.type === "submitted" ? "bg-amber-400 border-amber-400 text-black hover:bg-amber-300" :
                              "bg-white text-black hover:bg-zinc-200"
                            }`}
                          >
                            {status.type === "reviewed" ? "View results" : status.type === "submitted" ? "Under review" : "Start assessment"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {hasMore && (
                  <button
                    onClick={() => fetchData(page + 1, true)}
                    disabled={loadingMore}
                    className="w-full py-6 flex items-center justify-center border-b border-zinc-800 hover:bg-zinc-900/20 transition-colors disabled:opacity-50"
                  >
                    <span className="text-[10px] text-zinc-500 font-bold tracking-[0.2em] uppercase">
                      {loadingMore ? "Fetching next assessments..." : "Load more assessments"}
                    </span>
                  </button>
                )}
              </>
            ) : (
              <div className="py-20 text-center border-b border-zinc-800 border-dashed">
                <p className="text-[11px] text-zinc-600 tracking-widest">No assessments found</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}