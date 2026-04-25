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
      <nav className="h-14 border-b border-zinc-800/50 flex items-center px-6 shrink-0 bg-[#09090b] justify-between z-[100]">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/admin')} className="text-[11px] text-zinc-500 hover:text-zinc-100 transition-colors">
            back to list
          </button>
          <div className="h-3 w-[1px] bg-zinc-800"></div>
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-zinc-100">{submission?.student_name}</span>
            <span className="text-[10px] text-zinc-500 font-mono lowercase">id: {studentId}</span>
          </div>
        </div>

        {/* Question Switcher */}
        <div className="flex items-center gap-2">
          {challenge?.questions.map((_, idx) => (
            <button 
              key={idx} 
              onClick={() => setActiveQ(idx)} 
              className={`w-7 h-7 rounded text-[10px] font-mono border transition-all ${activeQ === idx ? 'bg-zinc-100 text-zinc-950 border-zinc-100' : 'text-zinc-500 border-zinc-800 hover:border-zinc-700'}`}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-8">
            <div className="flex flex-col items-end">
                <span className="text-[9px] text-zinc-500 uppercase tracking-widest">average score</span>
                <span className="text-sm font-mono font-medium text-emerald-400">{averageScore}<span className="text-zinc-600">/10</span></span>
            </div>
            <button 
              onClick={handleFinalizeReview}
              disabled={isSaving}
              className="bg-zinc-100 text-zinc-950 px-6 py-1.5 rounded text-[11px] font-medium hover:bg-white transition-all disabled:opacity-30"
            >
              {isSaving ? 'saving...' : 'finalize review'}
            </button>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT PANEL: AUDIT & CONTEXT */}
        <div className="w-1/3 overflow-y-auto p-8 border-r border-zinc-800/50 custom-scrollbar bg-[#09090b]">
          
          {/* Score Input */}
          <div className="mb-10 bg-zinc-900/30 border border-zinc-800/50 p-5 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] text-zinc-400 uppercase tracking-wider">q{activeQ + 1} performance</span>
                  <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        max="10" 
                        min="0"
                        step="0.5"
                        value={scores[activeQ] || ""}
                        onChange={(e) => handleScoreChange(e.target.value)}
                        className="w-14 bg-black border border-zinc-800 rounded px-2 py-1 text-center font-mono text-emerald-400 text-sm outline-none focus:border-emerald-500/50"
                      />
                      <span className="text-zinc-600 font-medium text-xs">/ 10</span>
                  </div>
              </div>
              <p className="text-[10px] text-zinc-500 leading-relaxed italic">
                rate based on logic, efficiency, and edge case handling.
              </p>
          </div>

          <section className="mb-12 animate-in fade-in duration-500">
            <span className="text-[10px] text-zinc-600 uppercase tracking-widest block mb-4">problem description</span>
            <h2 className="text-base font-medium text-zinc-100 mb-4">{currentQuestion?.title}</h2>
            <div className="text-[13px] text-zinc-400 leading-relaxed custom-scrollbar">
              <Markdown components={{
                p: (props) => <p className="mb-4" {...props} />,
                code: (props) => <code className="bg-zinc-900 border border-zinc-800 text-zinc-300 px-1 rounded font-mono text-[11px]" {...props} />
              }}>
                {currentQuestion?.storyline}
              </Markdown>
            </div>
          </section>

          <section className="space-y-6">
             <span className="text-[10px] text-zinc-600 uppercase tracking-widest block">execution results</span>
             
             {/* CRITICAL FAILURE BOX */}
             {(results?.status === "COMPILATION_ERROR" || results?.test_results?.some(r => r.status === "RUNTIME_ERROR")) && (
                <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-md">
                  <span className="text-red-400 text-[10px] font-medium uppercase mb-2 block tracking-wide">error traceback</span>
                  <pre className="text-[11px] text-red-300/70 font-mono whitespace-pre-wrap leading-relaxed bg-black/20 p-3 rounded">
                    {results?.status === "COMPILATION_ERROR" 
                      ? results.message 
                      : results.test_results.find(r => r.status === "RUNTIME_ERROR")?.message}
                  </pre>
                </div>
             )}

             {/* TEST CASE LIST */}
             <div className="space-y-2">
                {results?.test_results?.map((res, i) => (
                  <div key={i} className={`p-3 rounded border ${res.passed ? 'border-emerald-500/10 bg-emerald-500/[0.02]' : 'border-red-500/10 bg-red-500/[0.02]'}`}>
                    <div className="flex justify-between items-center">
                      <span className={`text-[10px] font-medium uppercase ${res.passed ? 'text-emerald-500' : 'text-red-400'}`}>
                        case {res.case}: {res.status === "RUNTIME_ERROR" ? "crash" : (res.passed ? "passed" : "failed")}
                      </span>
                    </div>
                    
                    {!res.passed && res.status !== "RUNTIME_ERROR" && (
                      <div className="space-y-1.5 text-[10px] font-mono border-t border-zinc-800/50 mt-2 pt-2">
                        <div className="flex gap-2"><span className="text-zinc-600 w-10 uppercase">exp:</span> <span className="text-zinc-400 whitespace-pre-wrap">{res.expected}</span></div>
                        <div className="flex gap-2"><span className="text-zinc-600 w-10 uppercase">act:</span> <span className="text-red-400/80 whitespace-pre-wrap">{res.actual}</span></div>
                      </div>
                    )}
                  </div>
                ))}
             </div>
          </section>
        </div>

        {/* RIGHT PANEL: CODE & FEEDBACK */}
        <div className="w-2/3 flex flex-col bg-[#0c0c0e]">
          <div className="h-10 border-b border-zinc-800/50 flex items-center px-6 bg-zinc-900/20 shrink-0">
            <span className="text-[10px] text-zinc-500 font-mono tracking-wider lowercase italic">submission_viewer.py</span>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-10 bg-[#0c0c0e]">
            <pre className="font-mono text-[13px] leading-relaxed animate-in fade-in duration-700">
              <code dangerouslySetInnerHTML={{ 
                __html: highlight(studentCode, languages.python, 'python') 
              }} />
            </pre>
          </div>

          {/* FEEDBACK AREA */}
          <div className="h-64 border-t border-zinc-800 bg-[#09090b] p-6 flex flex-col gap-3 shrink-0">
              <div className="flex justify-between items-center">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">technical feedback</span>
                  <span className="text-[10px] text-zinc-700 italic">visible to student after finalization</span>
              </div>
              <textarea 
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="comments on complexity, readability, or logic improvements..."
                className="flex-1 bg-zinc-900/30 border border-zinc-800 rounded-lg p-4 text-[13px] text-zinc-300 outline-none focus:border-zinc-600 resize-none transition-all custom-scrollbar whitespace-pre-wrap"
              />
          </div>
        </div>
      </div>
    </div>
  );
}