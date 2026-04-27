/* eslint-disable no-unused-vars */
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getChallengeBySlot, getSubmissionByStudent, updateSubmissionStatus } from '../api/client';
import Markdown from 'react-markdown';

// Syntax Highlighting for Review
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism-tomorrow.css';

export default function AdminReview() {
  const { slotId, studentId } = useParams();
  const navigate = useNavigate();

  const [challenge, setChallenge] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [activeQ, setActiveQ] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [scores, setScores] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Custom Modal State
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [challengeData, submissionData] = await Promise.all([
          getChallengeBySlot(slotId),
          getSubmissionByStudent(slotId, studentId)
        ]);
        setChallenge(challengeData);
        setSubmission(submissionData);
        setFeedback(submissionData.feedback || "");
        setScores(submissionData.individual_scores || {});
      } catch (err) {
        console.error("Review Sync Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [slotId, studentId]);

  const averageScore = useMemo(() => {
    if (!challenge) return 0;
    const scoreValues = Object.values(scores);
    if (scoreValues.length === 0) return 0;
    const sum = scoreValues.reduce((acc, curr) => acc + (parseFloat(curr) || 0), 0);
    return (sum / challenge.questions.length).toFixed(1);
  }, [scores, challenge]);

  const handleScoreChange = (val) => {
    let num = parseFloat(val);
    if (num > 10) num = 10;
    if (num < 0 || isNaN(num)) num = 0;
    setScores(prev => ({ ...prev, [activeQ]: num }));
  };

  const handleFinalizeReview = async () => {
    if (Object.keys(scores).length < (challenge?.questions.length || 0)) {
       return setModal({
         isOpen: true,
         title: "incomplete assessment",
         message: "please provide a score for all questions before submitting the final grade.",
         type: "error"
       });
    }

    setIsSaving(true);
    try {
      await updateSubmissionStatus(slotId, studentId, {
        status: "reviewed",
        feedback: feedback,
        individual_scores: scores,
        average_score: parseFloat(averageScore)
      });
      setModal({
        isOpen: true,
        title: "review published",
        message: "the student assessment has been successfully updated and finalized.",
        type: "success"
      });
    } catch (err) {
      setModal({
        isOpen: true,
        title: "sync error",
        message: "could not save the review. please check your server connection.",
        type: "error"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return (
    <div className="h-screen bg-[#09090b] flex items-center justify-center text-[11px] text-zinc-500 animate-pulse">
      loading review session...
    </div>
  );
    const currentQuestion = challenge?.questions[activeQ];
    const studentCode = submission?.answers?.[activeQ] || "# No submission for this question.";
    const results = submission?.results?.[activeQ] || null;

    const totalCases = results?.total || 0;
    const passedCases = results?.passed || 0;
    const failedCases = totalCases - passedCases;
    const autoScore = results?.score || 0;

  return (
    <div className="h-screen bg-[#09090b] text-zinc-300 flex flex-col font-sans overflow-hidden">
      
      {/* UI MODAL */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl p-8 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className={`text-sm font-medium mb-2 ${modal.type === 'error' ? 'text-red-400' : 'text-zinc-100'}`}>
              {modal.title}
            </h3>
            <p className="text-xs text-zinc-400 mb-8 leading-relaxed lowercase">{modal.message}</p>
            <button 
              onClick={() => modal.type === 'success' ? navigate('/admin') : setModal({ ...modal, isOpen: false })} 
              className="w-full py-2 bg-zinc-100 text-zinc-950 text-[11px] font-medium rounded hover:bg-white transition-colors"
            >
              {modal.type === 'success' ? 'return to dashboard' : 'close'}
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <nav className="h-16 border-b border-zinc-800 bg-[#09090b]/95 backdrop-blur-md px-6 lg:px-8 flex items-center justify-between shrink-0 z-[100]">

        {/* Left */}
        <div className="flex items-center gap-5 min-w-0">
          <button
            onClick={() => navigate("/admin")}
            className="text-[11px] text-zinc-500 hover:text-zinc-100 transition-colors"
          >
            Back
          </button>

          <div className="h-4 w-px bg-zinc-800" />

          <div className="min-w-0">
            <div className="text-[12px] font-medium text-zinc-100 truncate">
              {submission?.student_name || "Candidate"}
            </div>

            <div className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-2">
              <span className="font-mono">{slotId}</span>
              <span>•</span>
              <span className="capitalize">{submission?.status || "pending"}</span>
            </div>
          </div>
        </div>

        {/* Center Question Tabs */}
        <div className="hidden md:flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
          {challenge?.questions?.map((q, idx) => (
            <button
              key={idx}
              onClick={() => setActiveQ(idx)}
              className={`h-8 min-w-[34px] px-3 text-[11px] border transition-all ${
                activeQ === idx
                  ? "bg-zinc-100 text-black border-zinc-100"
                  : "border-zinc-800 text-zinc-500 hover:text-zinc-200 hover:border-zinc-700"
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        {/* Right */}
        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <div className="text-[9px] uppercase tracking-[0.18em] text-zinc-600">
              Average
            </div>
            <div className="text-sm font-mono text-emerald-400">
              {averageScore}
              <span className="text-zinc-600">/10</span>
            </div>
          </div>

          <button
            onClick={handleFinalizeReview}
            disabled={isSaving}
            className="h-9 px-5 bg-zinc-100 text-black text-[11px] font-medium hover:bg-white transition-colors disabled:opacity-40"
          >
            {isSaving ? "Saving..." : "Finalize Review"}
          </button>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT PANEL: AUDIT & CONTEXT */}
        <div className="w-[34%] min-w-[360px] overflow-y-auto border-r border-zinc-800 bg-[#09090b] custom-scrollbar">

          <div className="p-6 lg:p-7 space-y-7">

            {/* Sticky Review Score */}
            <div className="sticky top-0 z-20 bg-[#09090b] pb-4">
              <div className="border border-zinc-800 bg-[#0d0d10] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                      Question {activeQ + 1}
                    </div>
                    <div className="text-sm text-zinc-100 mt-1 font-medium">
                      Review Score
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.5"
                      value={scores[activeQ] || ""}
                      onChange={(e) => handleScoreChange(e.target.value)}
                      className="w-16 h-9 bg-black border border-zinc-800 px-2 text-center text-sm font-mono text-emerald-400 outline-none focus:border-emerald-500/50"
                    />
                    <span className="text-xs text-zinc-600">/10</span>
                  </div>
                </div>

                <p className="mt-3 text-[10px] text-zinc-500 leading-relaxed">
                  Score logic, correctness, readability and edge-case handling.
                </p>
              </div>
            </div>

            {/* Problem Meta */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-500 font-mono">
                  {slotId}
                </span>

                <span className="text-zinc-700 text-[10px]">/</span>

                <span className="text-[10px] text-zinc-400">
                  Question {activeQ + 1}
                </span>
              </div>

              <h2 className="text-lg font-medium text-white leading-tight">
                {currentQuestion?.title || `Question ${activeQ + 1}`}
              </h2>

              <div className="inline-flex px-2 py-1 border border-zinc-800 text-[10px] text-zinc-400">
                {currentQuestion?.difficulty || "Medium"}
              </div>
            </section>

            {/* Description */}
            <section className="space-y-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                Problem Brief
              </div>

              <div className="text-[13px] text-zinc-400 leading-7">
                <Markdown
                  components={{
                    p: ({ ...props }) => (
                      <p className="mb-4 last:mb-0" {...props} />
                    ),
                    code: ({ ...props }) => (
                      <code
                        className="bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 text-[11px] font-mono text-zinc-300"
                        {...props}
                      />
                    )
                  }}
                >
                  {currentQuestion?.storyline}
                </Markdown>
              </div>
            </section>

            {/* Judge Results */}
            <section className="space-y-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                Execution Summary
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="border border-zinc-800 bg-[#0d0d10] px-4 py-3">
                  <div className="text-[10px] text-zinc-500 uppercase">Passed</div>
                  <div className="mt-1 text-sm font-medium text-emerald-400">
                    {passedCases}
                    <span className="text-zinc-600"> / {totalCases}</span>
                  </div>
                </div>

                <div className="border border-zinc-800 bg-[#0d0d10] px-4 py-3">
                  <div className="text-[10px] text-zinc-500 uppercase">Failed</div>
                  <div className="mt-1 text-sm font-medium text-red-400">
                    {failedCases}
                  </div>
                </div>

                <div className="col-span-2 border border-zinc-800 bg-[#0d0d10] px-4 py-3">
                  <div className="text-[10px] text-zinc-500 uppercase">
                    Auto Score
                  </div>
                  <div className="mt-1 text-sm font-medium text-zinc-100">
                    {autoScore}
                    <span className="text-zinc-600"> / 10</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* RIGHT PANEL: CODE & FEEDBACK */}
        <div className="flex-1 flex flex-col bg-[#0c0c0e] min-w-0">

          {/* Editor Header */}
          <div className="h-11 border-b border-zinc-800 bg-[#111114] px-6 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-zinc-700" />
                <span className="w-2 h-2 rounded-full bg-zinc-700" />
                <span className="w-2 h-2 rounded-full bg-zinc-700" />
              </div>

              <span className="text-[11px] text-zinc-500 font-mono truncate">
                submission_{activeQ + 1}.py
              </span>
            </div>

            <div className="text-[10px] text-zinc-600 uppercase tracking-[0.18em]">
              Candidate Code
            </div>
          </div>

          {/* Code Area */}
          <div className="flex-1 overflow-auto custom-scrollbar px-8 py-7 bg-[#0c0c0e]">
            <pre className="font-mono text-[13px] leading-7 text-zinc-200 whitespace-pre-wrap">
              <code
                dangerouslySetInnerHTML={{
                  __html: highlight(
                    studentCode || "# No submission found.",
                    languages.python,
                    "python"
                  ),
                }}
              />
            </pre>
          </div>

          {/* Feedback Panel */}
          <div className="border-t border-zinc-800 bg-[#09090b] shrink-0">
            <div className="px-6 pt-5 pb-3 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                  Reviewer Feedback
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">
                  Visible to candidate after finalization
                </div>
              </div>

              <div className="text-[10px] text-zinc-700">
                {feedback.length} chars
              </div>
            </div>

            <div className="px-6 pb-6">
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Write concise technical feedback about logic, performance, readability, mistakes, and improvements."
                className="w-full h-40 resize-none bg-[#0f0f12] border border-zinc-800 px-4 py-3 text-[13px] text-zinc-300 outline-none focus:border-zinc-700 custom-scrollbar leading-6"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}