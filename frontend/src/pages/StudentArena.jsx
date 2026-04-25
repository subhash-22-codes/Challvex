/* eslint-disable no-unused-vars */
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getChallengeBySlot, getSubmissionBySlot, saveSubmission, runCode, discardSubmission } from '../api/client';
import Markdown from 'react-markdown';

// Editor & Syntax Highlighting
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-python'; 
import 'prismjs/themes/prism-tomorrow.css'; 

export default function StudentArena() {
  const { slotId } = useParams();
  const navigate = useNavigate();
  
  // --- CORE DATA ---
  const [challenge, setChallenge] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // --- CODE STATE ---
  const [answers, setAnswers] = useState({}); 
  const [currentCode, setCurrentCode] = useState(""); 
  const [langPref, setLangPref] = useState({}); 
  const [activeQ, setActiveQ] = useState(0);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  
  // --- COMPILER STATE ---
  const [isExecuting, setIsExecuting] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [terminalOpen, setTerminalOpen] = useState(false);

  // --- TIMER & CONTROLS ---
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // --- UX MODALS ---
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState(false);

  // --- REFS & MEMOS ---
  const isDiscarding = useRef(false);
  const DRAFT_KEY = useMemo(() => `arena_draft_slot_${slotId}`, [slotId]);

  const getBoilerplate = useCallback((language) => {
  if (language === 'python') {
    return `# Write your code here\n# Use input() to read data\n\ndef solve():\n    pass\n\nif __name__ == "__main__":\n    solve()`;
  }
  
  // Professional Java Template
  return `import java.util.*;\nimport java.io.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        \n        // Write your logic here\n        // Example: int n = sc.nextInt();\n        \n    }\n}`;
}, []);

  const restoreFromLocal = useCallback(() => {
    const localDraft = localStorage.getItem(DRAFT_KEY);
    if (localDraft) {
      const parsed = JSON.parse(localDraft);
      setAnswers(parsed.answers || {});
      setLangPref(parsed.langPref || {});
      setActiveQ(parsed.activeQ || 0);
      setCurrentCode(parsed.currentCode || getBoilerplate('python'));
    }
  }, [DRAFT_KEY, getBoilerplate]);

  // --- 1. DATA SYNC ---
  useEffect(() => {
    const loadArena = async () => {
      try {
        const [challengeData, submissionData] = await Promise.all([
          getChallengeBySlot(slotId),
          getSubmissionBySlot(slotId)
        ]);

        setChallenge(challengeData);
        setSubmission(submissionData);
        
        if (submissionData && (submissionData.status === "pending" || submissionData.status === "reviewed")) {
          localStorage.removeItem(DRAFT_KEY);
          setAnswers(submissionData.answers || {});
          setIsViewOnly(true);
          setTimerActive(false); 
          setCurrentCode(submissionData.answers?.["0"] || "");
        } 
        else if (submissionData?.start_time) {
          const utcString = submissionData.start_time.endsWith('Z') ? submissionData.start_time : `${submissionData.start_time}Z`;
          const startTime = new Date(utcString).getTime();
          const elapsed = Math.floor((new Date().getTime() - startTime) / 1000);
          const remaining = (challengeData.total_time * 60) - elapsed;

          if (remaining <= 0) {
            setIsViewOnly(true);
            setTimeLeft(0);
            setTimerActive(false);
          } else {
            setTimeLeft(remaining);
            setTimerActive(true);
          }
          restoreFromLocal();
        } 
        else {
          setTimeLeft(challengeData.total_time * 60);
          const initLangs = {};
          challengeData.questions.forEach((_, i) => { initLangs[i] = 'python'; });
          setLangPref(initLangs);
          setCurrentCode(getBoilerplate('python'));
        }
      } catch (err) {
        console.error("Arena sync failure", err);
      } finally {
        setLoading(false);
      }
    };
    loadArena();
  }, [slotId, DRAFT_KEY, restoreFromLocal, getBoilerplate]);

  // --- 2. ENGINES ---
  useEffect(() => {
    let interval = null;
    if (timerActive && timeLeft > 0 && !isViewOnly) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft, isViewOnly]);

  useEffect(() => {
    if (!loading && !isViewOnly && !isDiscarding.current && timerActive) {
      const draftState = { answers, langPref, activeQ, currentCode, timeLeft };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftState));
    }
  }, [answers, langPref, activeQ, currentCode, timeLeft, loading, isViewOnly, timerActive, DRAFT_KEY]);

  // --- 3. HANDLERS ---
  // --- FIX THIS BLOCK ---
const startSession = async () => {
  try {
    // CHANGE: Removed parseInt and changed day_number to slot_id
    const initialPayload = { 
      slot_id: slotId, 
      answers: {}, 
      status: "started" 
    }; 
    const newSub = await saveSubmission(initialPayload);
    setSubmission(newSub);
    setTimerActive(true);
  } catch (err) {
    alert("System connection error. Please try again.");
  }
};

  // --- FIX THIS BLOCK ---
const handleRunCode = async () => {
  if (!timerActive) return alert("Please start the assessment timer first.");
  setIsExecuting(true);
  setTerminalOpen(true);
  setTestResults(null);

  try {
    const result = await runCode({
      // CHANGE: Use slot_id as a string
      slot_id: slotId, 
      question_index: activeQ,
      code: currentCode,
      language: langPref[activeQ] || 'python'
    });
    setTestResults(result);
  } catch (err) {
    setTestResults({ status: "ERROR", message: err.message });
  } finally {
    setIsExecuting(false);
  }
};
  const handleQuestionSwitch = (index) => {
    // Step A: Save what's currently in the editor to the 'answers' map for the OLD question
    setAnswers(prev => ({ ...prev, [activeQ]: currentCode }));
    
    // Step B: Change the active question index
    setActiveQ(index);
    setTestResults(null);
    setTerminalOpen(false);
    
    // Step C: Load the code for the NEW question
    const savedCode = answers[index];
    const targetLang = langPref[index] || 'python';
    
    // If no saved code exists, use the boilerplate for the preferred language of that question
    setCurrentCode(savedCode !== undefined ? savedCode : getBoilerplate(targetLang));
  };

  const handleLanguageChange = (newLang) => {
    if (isViewOnly) return;

    // 1. Check if the current editor is empty or just the old boilerplate
    const oldLang = langPref[activeQ] || 'python';
    const oldBoilerplate = getBoilerplate(oldLang);
    
    // 2. Update the language preference for this specific question
    setLangPref(prev => ({ ...prev, [activeQ]: newLang }));

    // 3. Smart Swap: If they haven't written anything significant yet, 
    // automatically swap to the new language's boilerplate.
    if (currentCode.trim() === "" || currentCode.trim() === oldBoilerplate.trim()) {
      setCurrentCode(getBoilerplate(newLang));
    }
    
    // Clear test results when language changes to avoid confusion
    setTestResults(null);
  };

  // --- FIX THIS BLOCK ---
const handleSaveQuestion = async () => {
  const updatedAnswers = { ...answers, [activeQ]: currentCode };
  setAnswers(updatedAnswers);
  
  try {
    await saveSubmission({ 
      // CHANGE: Changed day_number to slot_id (string)
      slot_id: slotId, 
      answers: updatedAnswers, 
      status: "started" 
    });

    setSaveStatus(true);
    setTimeout(() => setSaveStatus(false), 2000);
  } catch (err) {
    console.error("Cloud Sync Failed:", err);
    alert("Cloud save failed. Your work is only saved locally for now.");
  }
};

  const handleLeaveArena = async () => {
  isDiscarding.current = true;
  setTimerActive(false);
  
  try {
    // 1. Tell the backend to wipe the progress
    await discardSubmission(slotId); 
    
    // 2. Clear the local browser cache
    localStorage.removeItem(DRAFT_KEY); 
    
    // 3. Go home
    navigate("/"); 
  } catch (err) {
    console.error("Failed to clear cloud draft:", err);
    // Even if the network fails, we clear local and leave
    localStorage.removeItem(DRAFT_KEY);
    navigate("/");
  }
};

  // --- FIX THIS BLOCK ---
const confirmSubmit = async () => {
  if (isViewOnly) return;
  setIsSubmitting(true);
  try {
    const finalAnswers = { ...answers, [activeQ]: currentCode };
    // CHANGE: Changed day_number to slot_id
    await saveSubmission({ 
      slot_id: slotId, 
      answers: finalAnswers, 
      status: "pending" 
    });
    localStorage.removeItem(DRAFT_KEY);
    setShowSubmitModal(false);
    navigate("/"); 
  } catch (err) {
    alert("Failed to submit. Please check your connection.");
  } finally {
    setIsSubmitting(false);
  }
};
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) return (
    <div className="h-screen bg-[#09090b] flex items-center justify-center text-xs text-zinc-500 animate-pulse">
      loading environment...
    </div>
  );

  return (
    <div className="h-screen bg-[#09090b] text-zinc-300 flex flex-col font-sans overflow-hidden relative">
      
      {/* 1. START OVERLAY */}
      {!timerActive && !isViewOnly && !submission?.start_time && (
        <div className="absolute inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-[#0c0c0e] border border-zinc-800 p-10 rounded-xl max-w-sm w-full text-center shadow-2xl animate-in fade-in duration-300">
            <h2 className="text-lg font-medium text-zinc-100 mb-2">{challenge?.title}</h2>
            <p className="text-xs text-zinc-500 mb-8">Time limit: {challenge?.total_time} minutes</p>
            <button onClick={startSession} className="w-full py-2.5 bg-zinc-100 text-zinc-950 font-medium rounded-md hover:bg-white transition-colors text-xs">
              Start assessment
            </button>
          </div>
        </div>
      )}

      {/* 2. NAVIGATION */}
      <nav className="h-14 border-b border-zinc-800/50 flex items-center px-6 shrink-0 bg-[#09090b] justify-between z-[100]">
        <div className="flex items-center gap-4 w-1/3">
          <button onClick={() => isViewOnly ? navigate("/") : setShowLeaveModal(true)} className="text-[11px] text-zinc-500 hover:text-zinc-100 transition-colors">
            back
          </button>
          <div className="h-3 w-[1px] bg-zinc-800"></div>
          <span className="text-[11px] font-medium text-zinc-100 truncate">{challenge?.title}</span>
        </div>

        <div className="flex items-center justify-center gap-2.5 w-1/3">
          {challenge?.questions.map((_, idx) => {
            // 1. Is there code saved for this index?
            const isSaved = Object.prototype.hasOwnProperty.call(answers, idx) && answers[idx]?.trim() !== "";
            const isActive = activeQ === idx;

            return (
              <button 
                key={idx} 
                onClick={() => handleQuestionSwitch(idx)} 
                className={`w-7 h-7 rounded text-[10px] font-mono transition-all duration-300 border ${
                  isActive
                    ? isSaved
                      ? 'bg-emerald-400 text-zinc-950 border-emerald-400 font-medium scale-110 shadow-[0_0_15px_rgba(52,211,153,0.3)]' // Active + Saved (Solid Green)
                      : 'bg-zinc-100 text-zinc-950 border-zinc-100 font-medium scale-110 shadow-sm' // Active + Unsaved (White)
                    : isSaved
                      ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30 hover:bg-emerald-400/20' // Not Active + Saved (Ghost Green)
                      : 'text-zinc-500 border-zinc-800 hover:border-zinc-600 bg-transparent' // Not Active + Unsaved (Gray)
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-5 w-1/3">
           <button 
             onClick={() => !isViewOnly && setTimerActive(!timerActive)}
             className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
           >
             {timerActive ? 'pause' : 'resume'}
           </button>
           <div className={`font-mono text-xs px-3 py-1 rounded border transition-colors ${timeLeft < 300 ? 'text-red-400 border-red-500/20 bg-red-400/5' : 'text-zinc-300 border-zinc-800 bg-zinc-900/30'}`}>
             {formatTime(timeLeft)}
           </div>
        </div>
      </nav>

      {/* 3. WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT: CONTEXT */}
        <div className="w-1/2 overflow-y-auto p-8 lg:p-12 border-r border-zinc-800/50 custom-scrollbar bg-[#09090b]">
          <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[10px] text-zinc-500 font-medium">Question {activeQ + 1}</span>
              <span className="text-[10px] text-zinc-700">•</span>
              <span className={`text-[10px] font-medium ${challenge?.questions[activeQ].difficulty === 'Hard' ? 'text-red-400' : 'text-emerald-400'}`}>
                {challenge?.questions[activeQ].difficulty}
              </span>
            </div>
            <h2 className="text-xl font-medium text-zinc-100 mb-6 tracking-tight">{challenge?.questions[activeQ].title}</h2>
            
            <div className="text-[13px] text-zinc-400 leading-relaxed mb-12">
              <Markdown components={{ 
                  p: ({node, ...props}) => <p className="mb-4 whitespace-pre-wrap" {...props} />,
                  code: ({node, inline, ...props}) => <code className="bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-300 font-mono text-[11px]" {...props} />
              }}>{challenge?.questions[activeQ].storyline}</Markdown>
            </div>

            <div className="space-y-8">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Input format</span>
                  <div className="text-[11px] text-zinc-400 bg-zinc-900/30 p-4 border border-zinc-800/50 rounded-md font-mono whitespace-pre-wrap">{challenge?.questions[activeQ].input_format}</div>
                </div>
                <div className="space-y-2">
                  <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Output format</span>
                  <div className="text-[11px] text-zinc-400 bg-zinc-900/30 p-4 border border-zinc-800/50 rounded-md font-mono whitespace-pre-wrap">{challenge?.questions[activeQ].output_format}</div>
                </div>
                <div className="space-y-2">
                  <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Constraints</span>
                  <div className="text-[11px] text-zinc-400 bg-zinc-900/30 p-4 border border-zinc-800/50 rounded-md font-mono whitespace-pre-wrap">{challenge?.questions[activeQ].constraints}</div>
                </div>
              </div>
              
              <div className="space-y-4 pt-4 pb-12">
                <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Examples</span>
                {challenge?.questions[activeQ].samples.map((s, i) => (
                  <div key={i} className="border border-zinc-800 rounded-md bg-zinc-900/10 overflow-hidden">
                    <div className="grid grid-cols-2 divide-x divide-zinc-800 border-b border-zinc-800">
                      <div className="p-4">
                        <span className="text-[10px] text-zinc-600 block mb-2">Input</span>
                        <pre className="text-[11px] font-mono text-zinc-300 whitespace-pre-wrap">{s.input_data}</pre>
                      </div>
                      <div className="p-4">
                        <span className="text-[10px] text-zinc-600 block mb-2">Output</span>
                        <pre className="text-[11px] font-mono text-zinc-300 whitespace-pre-wrap">{s.output_data}</pre>
                      </div>
                    </div>
                    {s.explanation && (
                      <div className="p-4 text-xs text-zinc-500 italic bg-zinc-900/20 whitespace-pre-wrap">
                        {s.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: COMPILER */}
        <div className="w-1/2 flex flex-col bg-[#0c0c0e] relative h-full">
          
          <div className="h-10 border-b border-zinc-800/50 flex items-center justify-between px-4 bg-zinc-900/20 shrink-0">
             <span className="text-[10px] text-zinc-500 font-mono tracking-wider">
               solution.{langPref[activeQ] === 'python' ? 'py' : 'java'}
             </span>
             <select 
              value={langPref[activeQ] || 'python'} 
              onChange={(e) => {
                const newLang = e.target.value;
                const oldLang = langPref[activeQ] || 'python';
                const oldBoilerplate = getBoilerplate(oldLang);

                // 1. Update the language preference
                setLangPref({...langPref, [activeQ]: newLang});

                // 2. SAFETY CHECK: Only overwrite if they haven't written real code yet
                if (currentCode.trim() === "" || currentCode.trim() === oldBoilerplate.trim()) {
                  setCurrentCode(getBoilerplate(newLang));
                }
                
                setTestResults(null); // Clear old results to avoid confusion
              }} 
              disabled={isViewOnly || !timerActive} 
              className="bg-transparent text-[10px] text-zinc-500 hover:text-zinc-100 outline-none cursor-pointer disabled:opacity-50 transition-colors"
            >
              <option value="python">Python</option>
              <option value="java">Java</option>
            </select>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0c0c0e]">
             <Editor
                value={currentCode}
                onValueChange={code => setCurrentCode(code)}
                // DYNAMIC HIGHLIGHTING: 
                highlight={code => highlight(
                  code, 
                  langPref[activeQ] === 'java' ? languages.java : languages.python
                )}
                padding={20}
                disabled={isViewOnly || !timerActive}
                className="font-mono text-sm min-h-full"
                style={{
                  fontFamily: '"Fira Code", "Fira Mono", monospace',
                  fontSize: 13,
                }}
              />
          </div>

          {/* TERMINAL OVERLAY */}
          {terminalOpen && (
            <div className="absolute bottom-14 left-0 right-0 h-[45%] bg-[#09090b] border-t border-zinc-800 z-50 flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
               <div className="h-9 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900/30">
                  <span className="text-[10px] font-medium text-zinc-400">Console</span>
                  <button onClick={() => setTerminalOpen(false)} className="text-zinc-500 hover:text-zinc-100 text-lg transition-colors">&times;</button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-6 font-mono text-[11px] space-y-4 custom-scrollbar">
                  {isExecuting ? (
                    <div className="text-zinc-500 animate-pulse text-center mt-10">running code...</div>
                  ) : (
                    <>
                      {(testResults?.status === "COMPILATION_ERROR" || testResults?.test_results?.some(r => r.status === "RUNTIME_ERROR")) && (
                        <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-md mb-4">
                           <span className="text-red-400 font-medium block mb-2">Execution error</span>
                           <pre className="text-zinc-400 whitespace-pre-wrap">
                             {testResults?.status === "COMPILATION_ERROR" 
                               ? testResults.message 
                               : testResults.test_results.find(r => r.status === "RUNTIME_ERROR")?.message}
                           </pre>
                        </div>
                      )}

                      {testResults?.test_results && (
                        <div className="space-y-3 pb-8">
                           {testResults.test_results.map((res, i) => (
                             <div key={i} className="p-4 rounded-md border border-zinc-800 bg-zinc-900/20">
                                <div className="flex justify-between items-start">
                                   <div className="space-y-1">
                                      <span className={`text-xs font-medium ${res.passed ? 'text-emerald-500' : 'text-red-500'}`}>
                                        Test case {res.case}: {res.status === "RUNTIME_ERROR" ? 'Error' : (res.passed ? 'Passed' : 'Failed')}
                                      </span>
                                      <div className="text-[10px] text-zinc-500">{res.is_public ? 'Public test' : 'Hidden test'}</div>
                                   </div>
                                </div>
                                
                                {res.is_public && !res.passed && res.status !== "RUNTIME_ERROR" && (
                                  <div className="grid grid-cols-1 gap-2 border-t border-zinc-800/50 pt-3 mt-3 text-zinc-400">
                                    <div><span className="text-zinc-500">Input:</span> <span className="whitespace-pre-wrap">{res.input}</span></div>
                                    <div><span className="text-zinc-500">Expected:</span> <span className="whitespace-pre-wrap text-emerald-500/70">{res.expected}</span></div>
                                    <div><span className="text-zinc-500">Actual:</span> <span className="whitespace-pre-wrap text-red-400">{res.actual}</span></div>
                                  </div>
                                )}
                                
                                {!res.is_public && !res.passed && (
                                   <div className="text-[10px] text-zinc-500 italic mt-2">
                                      Hidden test failed. Check edge cases.
                                   </div>
                                )}
                             </div>
                           ))}
                        </div>
                      )}
                    </>
                  )}
               </div>
            </div>
          )}

          {/* ACTION FOOTER */}
          <div className="h-14 border-t border-zinc-800/50 flex items-center justify-between px-6 bg-[#09090b] shrink-0 z-[60]">
             {!isViewOnly ? (
               <>
                <button 
                  onClick={handleRunCode} 
                  disabled={isExecuting || !timerActive} 
                  className="text-[11px] font-medium text-zinc-400 hover:text-zinc-100 transition-colors disabled:opacity-50"
                >
                  {isExecuting ? 'running...' : 'run code'}
                </button>

                <div className="flex items-center gap-3">
                   <button 
                     onClick={handleSaveQuestion} 
                     disabled={!timerActive}
                     className={`text-[11px] font-medium px-4 py-1.5 rounded transition-all duration-300 disabled:opacity-30 ${
                       saveStatus 
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/50' 
                        : 'text-zinc-400 border border-zinc-800 hover:bg-zinc-800 hover:text-zinc-100'
                     }`}
                   >
                     {saveStatus ? 'saved' : 'save code'}
                   </button>
                   <button 
                     onClick={() => setShowSubmitModal(true)} 
                     disabled={!timerActive}
                     className="bg-zinc-100 text-zinc-950 hover:bg-white text-[11px] font-medium px-5 py-1.5 rounded transition-colors disabled:opacity-30"
                   >
                     submit
                   </button>
                </div>
               </>
              ) : (
                <div className="w-full flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    {/* 1. The Score Badge */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Result</span>
                      <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                        submission?.status === 'reviewed' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {submission?.status === 'reviewed' 
                          ? `${submission.average_score}/10` 
                          : 'Pending Review'}
                      </span>
                    </div>
                    {submission?.feedback && (
                      <div className="flex items-center gap-2 border-l border-zinc-800 pl-6">
                        <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Feedback</span>
                        <button 
                          onClick={() => setShowFeedbackModal(true)}
                          className="text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors underline underline-offset-4 decoration-emerald-500/30"
                        >
                          Read Professor&apos;s Note
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 3. The Navigation Button */}
                  <button 
                    onClick={() => navigate("/")} 
                    className="text-[11px] text-zinc-500 hover:text-zinc-100 transition-colors bg-zinc-800/50 px-3 py-1 rounded border border-zinc-700/50"
                  >
                    return to dashboard
                  </button>
                </div>
              )}
          </div>
        </div>
      </div>

      {/* SUBMIT MODAL */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 animate-in fade-in duration-200">
          <div className="bg-[#0c0c0e] border border-zinc-800 rounded-lg p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-sm font-medium text-zinc-100 mb-2">Submit assessment?</h3>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
              You have saved {Object.keys(answers).length} out of {challenge?.questions.length} questions. You cannot edit your code after submitting.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowSubmitModal(false)} className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors">Cancel</button>
              <button onClick={confirmSubmit} disabled={isSubmitting} className="px-4 py-2 text-xs font-medium bg-zinc-100 text-zinc-950 rounded hover:bg-white transition-colors disabled:opacity-50">
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEAVE MODAL */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 animate-in fade-in duration-200">
          <div className="bg-[#0c0c0e] border border-zinc-800 rounded-lg p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-sm font-medium text-zinc-100 mb-2">Leave page?</h3>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
              Any unsaved code will be lost. The assessment timer will continue to run in the background.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowLeaveModal(false)} className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors">Stay</button>
              <button onClick={handleLeaveArena} className="px-4 py-2 text-xs font-medium bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 transition-colors">Leave</button>
            </div>
          </div>
        </div>
      )}

      {showFeedbackModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 animate-in fade-in duration-200">
          <div className="bg-[#0c0c0e] border border-zinc-800 rounded-lg max-w-2xl w-full shadow-2xl flex flex-col max-h-[80vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-100">Review Feedback</h3>
              <span className="text-xs font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                Score: {submission?.average_score}/10
              </span>
            </div>

            {/* Modal Body - This part scrolls if the text is 20 lines! */}
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap font-mono">
                {submission?.feedback}
              </p>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-zinc-800 flex justify-end">
              <button 
                onClick={() => setShowFeedbackModal(false)} 
                className="px-4 py-2 text-xs font-medium bg-zinc-100 text-zinc-950 rounded hover:bg-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}