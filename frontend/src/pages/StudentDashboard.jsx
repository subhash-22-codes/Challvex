/* eslint-disable no-unused-vars */
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { getAllChallenges, getAllSubmissions } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function StudentDashboard() {
  const [challenges, setChallenges] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [filteredChallenges, setFilteredChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: "" });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const { user } = useAuth();

  // Notification auto-hide logic
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => setToast({ show: false, message: "" }), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [challengesData, submissionsData] = await Promise.all([
          getAllChallenges(),
          getAllSubmissions(),
        ]);
        setChallenges(challengesData || []);
        setSubmissions(submissionsData || []);
      } catch (error) {
        setToast({ show: true, message: "We're having trouble updating your dashboard. Please refresh." });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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
    let data = [...challenges];
    data = data.filter((challenge) => {
      const term = search.toLowerCase();
      const matchesSearch =
        (challenge.title || "").toLowerCase().includes(term) ||
        (challenge.slot_id || "").toLowerCase().includes(term) ||
        (challenge.created_by || "").toLowerCase().includes(term);

      const status = getChallengeStatus(challenge);
      const matchesStatus = statusFilter === "all" || status.type === statusFilter;
      return matchesSearch && matchesStatus;
    });

    data.sort((a, b) => {
      if (sortBy === "oldest") return new Date(a.created_at) - new Date(b.created_at);
      if (sortBy === "title") return (a.title || "").localeCompare(b.title || "");
      return new Date(b.created_at) - new Date(a.created_at);
    });

    setFilteredChallenges(data);
  }, [challenges, search, statusFilter, sortBy, getChallengeStatus]);

  const reviewedSubs = submissions.filter((sub) => sub.status === "reviewed");
  const avgScore = reviewedSubs.length > 0
    ? (reviewedSubs.reduce((acc, curr) => acc + (curr.average_score || 0), 0) / reviewedSubs.length).toFixed(1)
    : "0.0";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-1 h-1 bg-zinc-600 animate-pulse" />
          <span className="text-[11px] text-zinc-500 tracking-wider">Loading your dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-300 font-sans antialiased">
      
      {/* Minimalist White Notification */}
      {toast.show && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[1000] animate-in slide-in-from-top-4">
          <div className="bg-white text-black px-5 py-2.5 shadow-2xl flex items-center gap-3">
            <span className="text-[11px] font-bold tracking-tight">{toast.message}</span>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-6 py-12 lg:py-20">
        
        {/* Welcome Section */}
        <section className="mb-12">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10">
            <header className="space-y-1">
              <p className="text-[11px] font-medium text-zinc-500 tracking-widest">
                Solver dashboard
              </p>
              <h1 className="text-2xl font-medium text-white tracking-tight">
                Hello, {user?.username || "Guest"}
              </h1>
              <p className="text-xs text-zinc-500 max-w-sm leading-relaxed">
                Track your progress, view your scores, and continue solving technical challenges.
              </p>
            </header>

            {/* Overview Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-zinc-800 border border-zinc-800">
              {[
                { label: "Total challenges", value: challenges.length },
                { label: "Submitted", value: submissions.length },
                { label: "Reviewed", value: reviewedSubs.length },
                { label: "Average score", value: avgScore },
              ].map((stat) => (
                <div key={stat.label} className="bg-[#09090b] px-5 py-3 min-w-[120px]">
                  <p className="text-[10px] text-zinc-500 font-medium">{stat.label}</p>
                  <p className="text-base font-semibold text-white mt-0.5">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Toolbar */}
        <section className="mb-10">
          <div className="flex flex-col md:flex-row gap-px bg-zinc-800 border border-zinc-800">
            <div className="flex-1 bg-[#09090b] flex items-center px-4">
              <svg className="w-3.5 h-3.5 text-zinc-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input
                type="text"
                placeholder="Search by title or creator..."
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

        {/* Challenge List */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">Available challenges</h2>
            <span className="text-[10px] text-zinc-600 font-mono">{filteredChallenges.length} total results</span>
          </div>

          <div className="border-t border-zinc-800">
            {filteredChallenges.length > 0 ? (
              filteredChallenges.map((challenge) => {
                const status = getChallengeStatus(challenge);
                const isLocked = status.type === "locked";

                return (
                  <div
                    key={challenge.slot_id}
                    className={`group flex flex-col md:flex-row md:items-center justify-between p-5 border-b border-zinc-800 transition-colors ${
                      isLocked ? "opacity-40 grayscale" : "hover:bg-zinc-900/30"
                    }`}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-zinc-600">
                          {challenge.slot_id}
                        </span>

                        <div className="flex items-center gap-1.5 px-2 py-0.5 border border-zinc-800 bg-zinc-950">
                          <div
                            className={`w-1 h-1 rounded-full ${
                              status.type === "reviewed"
                                ? "bg-emerald-500"
                                : status.type === "submitted"
                                ? "bg-amber-500"
                                : status.type === "active"
                                ? "bg-zinc-400"
                                : "bg-zinc-700"
                            }`}
                          />

                          <span className="text-[10px] text-zinc-400 font-medium">
                            {status.type === "reviewed"
                              ? `${status.average_score}/10`
                              : status.type === "submitted"
                              ? "Under review"
                              : status.type === "locked"
                              ? "Draft"
                              : "Live"}
                          </span>
                        </div>
                      </div>
                      <h3 className="text-[13px] font-medium text-zinc-100 leading-none group-hover:text-white transition-colors">
                        {challenge.title || `Challenge ${challenge.slot_id}`}
                      </h3>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-600">
                        <span>By {challenge.created_by || "Admin"}</span>
                        <span>•</span>
                        <span>{new Date(challenge.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </div>

                    <div className="mt-4 md:mt-0">
                     {!isLocked && (
                      <Link
                        to={`/arena/${challenge.slot_id}`}
                        className={`inline-flex items-center h-8 px-4 text-[11px] font-bold border rounded-none transition-all ${
                          status.type === "reviewed"
                            ? "border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-200"
                            : status.type === "submitted"
                            ? "bg-amber-400 border-amber-400 text-black hover:bg-amber-300"
                            : "bg-white border-white text-black hover:bg-zinc-200"
                        }`}
                      >
                        {status.type === "reviewed"
                          ? "View submission"
                          : status.type === "submitted"
                          ? "Under review"
                          : "Start assessment"}
                      </Link>
                    )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-20 text-center border-b border-zinc-800 border-dashed">
                <p className="text-[11px] text-zinc-600 tracking-widest uppercase">No challenges match your search</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}