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

  // Add this with your other state declarations
const [terminalHeight, setTerminalHeight] = useState(300);

// Add this function before your return statement
const handleTerminalResize = (e) => {
  const startY = e.clientY;
  const startHeight = terminalHeight;

  const onMouseMove = (moveEvent) => {
    // We subtract moveEvent.clientY because the terminal grows upwards
    const delta = startY - moveEvent.clientY;
    const newHeight = Math.min(window.innerHeight * 0.8, Math.max(150, startHeight + delta));
    setTerminalHeight(newHeight);
  };

  const onMouseUp = () => {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
};

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
    navigate("/dashboard"); 
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
      languages: langPref, 
      status: "pending" 
    });
    localStorage.removeItem(DRAFT_KEY);
    setShowSubmitModal(false);
    navigate("/dashboard"); 
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
        <div className="absolute inset-0 z-[250] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-[#0c0c0e] border border-zinc-800 p-12 rounded-none max-w-sm w-full text-center shadow-2xl animate-in fade-in zoom-in-95 duration-500">
            
            <div className="space-y-1 mb-10">
              <h2 className="text-base font-medium text-white tracking-tight">
                {challenge?.title}
              </h2>
              <p className="text-[11px] text-zinc-500 leading-relaxed italic">
                You will have {challenge?.total_time} minutes to complete this challenge.
              </p>
            </div>

            <button 
              onClick={startSession} 
              className="w-full py-3 bg-zinc-100 text-zinc-950 text-[11px] font-semibold hover:bg-white transition-colors rounded-none"
            >
              Start assessment
            </button>
            
          </div>
        </div>
      )}

      {/* 2. NAVIGATION */}
      <nav className="h-14 border-b border-zinc-800/50 flex items-center px-4 sm:px-6 shrink-0 bg-[#09090b] justify-between z-[100]">
        <div className="flex items-center gap-4 w-1/3">
          <button onClick={() => isViewOnly ? navigate("/dashboard") : setShowLeaveModal(true)} className="text-[11px] text-zinc-500 hover:text-zinc-100 transition-colors whitespace-nowrap">
            Back to Dashboard
          </button>
          <div className="h-3 w-[1px] bg-zinc-800 hidden sm:block"></div>
          <span className="text-[11px] font-medium text-zinc-100 truncate hidden lg:block">{challenge?.title}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {challenge?.questions.map((_, idx) => {
            const isSaved = Object.prototype.hasOwnProperty.call(answers, idx) && answers[idx]?.trim() !== "";
            const isActive = activeQ === idx;

            return (
              <button 
                key={idx} 
                onClick={() => handleQuestionSwitch(idx)} 
                className={`w-6 h-6 rounded-none text-[10px] font-medium transition-all border ${
                  isActive
                    ? 'bg-zinc-100 text-zinc-950 border-zinc-100'
                    : isSaved
                      ? 'bg-zinc-800 text-zinc-200 border-zinc-700'
                      : 'text-zinc-600 border-zinc-800 hover:border-zinc-700'
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
             className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors hidden sm:block"
           >
             {timerActive ? 'Pause' : 'Resume'}
           </button>
           <div className={`font-mono text-xs px-3 py-1 border transition-colors tabular-nums ${timeLeft < 300 ? 'text-red-400 border-red-500/20 bg-red-400/5' : 'text-zinc-300 border-zinc-800 bg-zinc-900/30'}`}>
             {formatTime(timeLeft)}
           </div>
        </div>
      </nav>

      {/* 3. WORKSPACE */}
     <div className="flex-1 flex overflow-hidden flex-col md:flex-row">
  
      {/* Left: Problem specification */}
      <div className="w-full md:w-1/2 overflow-y-auto p-6 sm:p-10 lg:p-12 border-r border-zinc-800 bg-[#09090b] custom-scrollbar">
        <div className="max-w-2xl mx-auto space-y-10 animate-in fade-in slide-in-from-left-4 duration-600">
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 font-medium">
              Question {activeQ + 1}
            </span>
          </div>

          <header className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div
                className={`px-2 py-0.5 text-[9px] font-bold border tracking-wider ${
                  challenge?.questions[activeQ].difficulty === "Hard"
                    ? "border-red-900/50 text-red-500 bg-red-500/5"
                    : "border-emerald-900/50 text-emerald-500 bg-emerald-500/5"
                }`}
              >
                {challenge?.questions[activeQ].difficulty}
              </div>

              <span className="text-[10px] text-zinc-500 italic">
                Estimated time: {challenge?.total_time} minutes
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-medium text-white tracking-tight leading-snug">
              {challenge?.questions[activeQ].title}
            </h1>
          </header>

          <article className="max-w-none text-[13px] text-zinc-300 prose prose-invert prose-p:my-0 prose-li:my-0">
            <Markdown
              components={{
                p: ({ children }) => (
                  <p className="mb-3 leading-6">{children}</p>
                ),
                h2: ({ children }) => (
                  <h2 className="mt-6 mb-3 text-sm font-semibold text-white">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="mt-5 mb-2 text-sm font-semibold text-white">{children}</h3>
                ),
                ul: ({ children }) => (
                  <ul className="mb-4 list-disc pl-5 space-y-1">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-4 list-decimal pl-5 space-y-1">{children}</ol>
                ),
                li: ({ children }) => (
                  <li className="leading-6">{children}</li>
                ),
                pre: ({ children }) => (
                  <pre className="my-4 overflow-x-auto rounded-none border border-zinc-800 bg-zinc-950 px-4 py-3">{children}</pre>
                ),
                code: ({ children }) => (
                  <code className="rounded bg-zinc-800/80 px-1 py-0.5 text-[11px] text-zinc-200 font-mono">
                    {children}
                  </code>
                ),
              }}
            >
              {challenge?.questions[activeQ].storyline}
            </Markdown>
          </article>

          <section className="space-y-10">
            <div className="grid grid-cols-1 gap-6">
              {[
                { label: "Input format", content: challenge?.questions[activeQ].input_format },
                { label: "Output format", content: challenge?.questions[activeQ].output_format },
                { label: "Constraints", content: challenge?.questions[activeQ].constraints },
              ].map((item) => (
                <div key={item.label} className="space-y-2">
                  <h3 className="text-[11px] font-medium text-zinc-500">
                    {item.label}
                  </h3>
                  <pre className="overflow-x-auto border border-zinc-800 bg-zinc-900/30 px-4 py-3 text-[11px] leading-relaxed text-zinc-300 font-mono whitespace-pre-wrap italic">
                    {item.content?.trim()?.replace(/\n{3,}/g, "\n\n") || ""}
                  </pre>
                </div>
              ))}
            </div>
            
            <div className="space-y-5 pt-2">
              <h3 className="text-[11px] font-medium text-zinc-500">Examples</h3>
              <div className="space-y-4">
                {challenge?.questions[activeQ].samples.map((s, i) => (
                  <div key={i} className="border border-zinc-800 bg-[#0c0c0e]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-zinc-800 border-b border-zinc-800">
                      <div className="p-4">
                        <span className="text-[10px] text-zinc-600 font-medium block mb-2">Input</span>
                        <pre className="text-[11px] font-mono text-zinc-300 whitespace-pre-wrap">{s.input_data}</pre>
                      </div>
                      <div className="p-4">
                        <span className="text-[10px] text-zinc-600 font-medium block mb-2">Output</span>
                        <pre className="text-[11px] font-mono text-zinc-100 whitespace-pre-wrap">{s.output_data}</pre>
                      </div>
                    </div>
                    {s.explanation && (
                      <div className="p-4 bg-zinc-950/40">
                        <span className="text-[10px] text-zinc-600 font-medium block mb-1">Explanation</span>
                        <div className="text-[11px] text-zinc-400 italic leading-relaxed whitespace-pre-wrap">
                          {s.explanation}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Right: Code editor & execution */}
      <div className="w-full md:w-1/2 flex flex-col bg-[#0c0c0e] relative h-full">
        <div className="h-10 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900/20 shrink-0">
          <span className="text-[10px] text-zinc-500 font-mono">
            solution.{langPref[activeQ] === 'python' ? 'py' : 'java'}
          </span>
          <select 
            value={langPref[activeQ] || 'python'} 
            onChange={(e) => {
              const newLang = e.target.value;
              const oldLang = langPref[activeQ] || 'python';
              const oldBoilerplate = getBoilerplate(oldLang);
              setLangPref({...langPref, [activeQ]: newLang});
              if (currentCode.trim() === "" || currentCode.trim() === oldBoilerplate.trim()) {
                setCurrentCode(getBoilerplate(newLang));
              }
              setTestResults(null);
            }} 
            disabled={isViewOnly || !timerActive} 
            className="bg-transparent text-[10px] text-zinc-500 hover:text-zinc-100 outline-none cursor-pointer disabled:opacity-50 transition-colors"
          >
            <option value="python" className="bg-[#0c0c0e]">Python</option>
            <option value="java" className="bg-[#0c0c0e]">Java</option>
          </select>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0c0c0e]">
          <Editor
              value={currentCode}
              onValueChange={code => setCurrentCode(code)}
              highlight={code => highlight(
                code, 
                langPref[activeQ] === 'java' ? languages.java : languages.python
              )}
              padding={24}
              disabled={isViewOnly || !timerActive}
              className="font-mono text-sm min-h-full"
              style={{
                fontFamily: '"Fira Code", monospace',
                fontSize: 13,
              }}
            />
        </div>

        {terminalOpen && (
          <div 
            style={{ height: terminalHeight || '300px' }}
            className="absolute bottom-14 left-0 right-0 bg-[#09090b] border-t border-zinc-700 z-50 flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200"
          >
            <div 
              onMouseDown={handleTerminalResize} 
              className="h-1 cursor-row-resize hover:bg-zinc-500/30 transition-colors shrink-0" 
            />

            <div className="h-9 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-950 shrink-0">
              <span className="text-[10px] font-medium text-zinc-400">Terminal output</span>
              <button 
                onClick={() => setTerminalOpen(false)} 
                className="text-zinc-500 hover:text-zinc-100 text-lg transition-colors leading-none"
              >
                &times;
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 font-mono text-[11px] custom-scrollbar bg-[#09090b]">
              {isExecuting ? (
                <div className="text-zinc-600 italic text-center mt-10">Initializing execution environment...</div>
              ) : (
                <div className="space-y-6 max-w-4xl">
                  {(testResults?.status === "COMPILATION_ERROR" || testResults?.test_results?.some(r => r.status === "RUNTIME_ERROR")) && (
                    <div className="bg-red-500/5 border border-red-900/30 p-4">
                      <span className="text-red-500 font-semibold text-[10px] block mb-2">Execution error</span>
                      <pre className="text-zinc-300 whitespace-pre-wrap leading-relaxed italic">
                        {testResults?.status === "COMPILATION_ERROR" 
                          ? testResults.message 
                          : testResults.test_results.find(r => r.status === "RUNTIME_ERROR")?.message}
                      </pre>
                    </div>
                  )}

                  {testResults?.test_results && (() => {
                    const results = testResults.test_results;
                    const passedCases = results.filter(item => item.passed).length;
                    const hiddenFailed = results.filter(item => !item.is_public && !item.passed).length;
                    const publicResults = results.filter(item => item.is_public);

                    return (
                      <div className="space-y-6">
                        <div className="border border-zinc-800 bg-zinc-900/30 p-4 flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-[11px] font-medium text-white">Test results summary</p>
                            <p className="text-[10px] text-zinc-500">Passed {passedCases} out of {results.length} test cases</p>
                          </div>
                          {hiddenFailed > 0 && (
                            <span className="text-[10px] font-medium text-amber-500 bg-amber-500/5 border border-amber-900/30 px-2 py-0.5">
                              {hiddenFailed} hidden case{hiddenFailed > 1 ? "s" : ""} failed
                            </span>
                          )}
                        </div>

                        <div className="space-y-3">
                          {publicResults.map((res, i) => {
                            const displayStatus = res.status 
                              ? res.status.replace('_', ' ') 
                              : (res.passed ? "Passed" : "Failed");

                            return (
                              <div key={i} className="border border-zinc-800 bg-zinc-950 p-4 space-y-4">
                                <div className="flex items-start justify-between">
                                  <div className="space-y-0.5">
                                    <p className={`text-[11px] font-bold ${res.passed ? "text-emerald-500" : "text-red-500"}`}>
                                      Case 0{res.case}
                                    </p>
                                    <p className="text-[10px] text-zinc-600 italic">Public test case</p>
                                  </div>
                                  <span className={`px-2 py-0.5 text-[9px] font-bold border rounded-none ${
                                    res.passed 
                                      ? "border-emerald-900/30 text-emerald-500 bg-emerald-500/5" 
                                      : "border-red-900/30 text-red-500 bg-red-500/5"
                                  }`}>
                                    {displayStatus}
                                  </span>
                                </div>

                                {res.status !== "RUNTIME_ERROR" && res.status !== "TIMEOUT" && (
                                  <div className="grid grid-cols-1 gap-4 pt-3 border-t border-zinc-900 text-[10px] font-mono leading-relaxed italic">
                                    <div className="space-y-1">
                                      <span className="text-zinc-600 block">Input</span>
                                      <pre className="whitespace-pre-wrap text-zinc-400">{res.input}</pre>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-1">
                                        <span className="text-zinc-600 block">Expected</span>
                                        <pre className="whitespace-pre-wrap text-zinc-500">{res.expected}</pre>
                                      </div>
                                      <div className="space-y-1">
                                        <span className="text-zinc-600 block">Actual</span>
                                        <pre className={`whitespace-pre-wrap ${res.passed ? "text-emerald-500" : "text-red-400"}`}>
                                          {res.actual}
                                        </pre>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        <footer className="h-14 border-t border-zinc-800 flex items-center justify-between px-6 bg-[#09090b] shrink-0 z-[60]">
          {!isViewOnly ? (
            <>
              <button 
                onClick={handleRunCode} 
                disabled={isExecuting || !timerActive} 
                className="text-[11px] font-medium text-zinc-500 hover:text-zinc-100 transition-colors disabled:opacity-30"
              >
                {isExecuting ? 'Running...' : 'Run code'}
              </button>

              <div className="flex items-center gap-4">
                <button 
                  onClick={handleSaveQuestion} 
                  disabled={!timerActive}
                  className={`text-[11px] font-medium px-4 py-1.5 rounded-none transition-all duration-300 disabled:opacity-30 border ${
                    saveStatus 
                      ? 'bg-emerald-500/5 text-emerald-500 border-emerald-900/50' 
                      : 'text-zinc-400 border-zinc-800 hover:bg-zinc-900 hover:text-zinc-100'
                  }`}
                >
                  {saveStatus ? 'Saved' : 'Save code'}
                </button>
                <button 
                  onClick={() => setShowSubmitModal(true)} 
                  disabled={!timerActive}
                  className="bg-zinc-100 text-zinc-950 hover:bg-white text-[11px] font-semibold px-6 py-1.5 rounded-none transition-colors disabled:opacity-30"
                >
                  Submit
                </button>
              </div>
            </>
          ) : (
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-zinc-500 font-medium">Result</span>
                  <span className={`text-[11px] font-mono px-3 py-1 border tabular-nums ${
                    submission?.status === 'reviewed' 
                      ? 'border-emerald-900/30 text-emerald-400 bg-emerald-500/5' 
                      : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                  }`}>
                    {submission?.status === 'reviewed' 
                      ? `${submission.average_score} / 10` 
                      : 'Awaiting review'}
                  </span>
                </div>
                {submission?.feedback && (
                  <div className="flex items-center gap-3 border-l border-zinc-800 pl-8">
                    <span className="text-[11px] text-zinc-500 font-medium">Feedback</span>
                    <button 
                      onClick={() => setShowFeedbackModal(true)}
                      className="text-[11px] text-zinc-300 hover:text-white transition-colors underline underline-offset-8 decoration-zinc-800"
                    >
                      Read notes
                    </button>
                  </div>
                )}
              </div>

              <button 
                onClick={() => navigate("/dashboard")} 
                className="text-[11px] font-medium text-zinc-500 hover:text-white bg-zinc-900 px-4 py-1.5 border border-zinc-800 rounded-none transition-colors"
              >
                Return to Dashboard
              </button>
            </div>
          )}
        </footer>
      </div>
    </div>

      {showSubmitModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 animate-in fade-in duration-200">
          <div className="bg-[#0c0c0e] border border-zinc-800 rounded-none p-8 max-w-sm w-full shadow-2xl">
            <h3 className="text-sm font-medium text-zinc-100 mb-2">Submit assessment?</h3>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed italic border-l border-zinc-800 pl-4">
              You have saved {Object.keys(answers).length} out of {challenge?.questions.length} questions. You cannot edit your code after submitting.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowSubmitModal(false)} className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors">Cancel</button>
              <button onClick={confirmSubmit} disabled={isSubmitting} className="px-5 py-2 text-xs font-bold bg-zinc-100 text-zinc-950 hover:bg-white transition-colors disabled:opacity-50">
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLeaveModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 animate-in fade-in duration-200">
          <div className="bg-[#0c0c0e] border border-zinc-800 rounded-none p-8 max-w-sm w-full shadow-2xl">
            <h3 className="text-sm font-medium text-zinc-100 mb-2">Leave page?</h3>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed italic border-l border-zinc-800 pl-4">
              Any unsaved code will be lost. The assessment timer will continue to run in the background.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowLeaveModal(false)} className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors">Stay</button>
              <button onClick={handleLeaveArena} className="px-5 py-2 text-xs font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">Leave</button>
            </div>
          </div>
        </div>
      )}

      {showFeedbackModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 animate-in fade-in duration-200">
          <div className="bg-[#0c0c0e] border border-zinc-800 rounded-none max-w-2xl w-full shadow-2xl flex flex-col max-h-[80vh]">
            
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/20">
              <h3 className="text-[13px] font-medium text-zinc-100">
                Evaluation notes
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-500 font-medium">Grade:</span>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/5 px-2 py-0.5 border border-emerald-900/30">
                  {submission?.average_score}/10
                </span>
              </div>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                <label className="text-[10px] text-zinc-500 font-medium uppercase tracking-tight">
                  Feedback
                </label>
                <p className="text-[12px] text-zinc-300 leading-relaxed whitespace-pre-wrap font-sans italic border-l border-zinc-800 pl-4">
                  {submission?.feedback}
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-zinc-800 flex justify-end bg-zinc-900/10">
              <button 
                onClick={() => setShowFeedbackModal(false)} 
                className="px-6 py-2 text-[11px] font-medium bg-zinc-100 text-zinc-950 rounded-none hover:bg-white transition-colors"
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