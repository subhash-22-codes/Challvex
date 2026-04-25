/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createDailyChallenge, getAllSubmissions, getAllChallenges, updateChallengeStatus, runAdminDryRun } from '../api/client';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('create'); 
  const [submissions, setSubmissions] = useState([]);
  const [challenges, setChallenges] = useState([]); 
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [loadingChallenges, setLoadingChallenges] = useState(false); 
  const [dryRunResults, setDryRunResults] = useState({});
  const [isDryRunning, setIsDryRunning] = useState({});
  
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'success' });

  const emptyQuestion = () => ({
    title: "", 
    difficulty: "Medium", 
    storyline: "", 
    input_format: "", 
    output_format: "", 
    constraints: "",
    time_limit: 2,
    solution_code: "",
    samples: [{ input_data: "", output_data: "", explanation: "" }],
    private_samples: [{ input_data: "", output_data: "" }]
  });

  const [formData, setFormData] = useState({
    title: "", 
    // UPDATED: day_number (int) -> slot_id (str)
    slot_id: "",
    total_time: 30,
    questions: [emptyQuestion()]
  });

  const fetchChallenges = async () => {
    setLoadingChallenges(true);
    try {
      const data = await getAllChallenges(true);
      // UPDATED: Sorting by slot_id or created_at (strings)
      setChallenges(data.sort((a, b) => b.slot_id.localeCompare(a.slot_id)));
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoadingChallenges(false);
    }
  };

 useEffect(() => {
    if (activeTab === 'review') {
      const fetchSubs = async () => {
        setLoadingSubmissions(true);
        try {
          const data = await getAllSubmissions(true);
          
          // UPDATED: FCFS Sorting (First-Come, First-Served)
          // subtracts dates to put the oldest (earliest) submissions first
          setSubmissions(data.sort((a, b) => 
            new Date(a.submitted_at) - new Date(b.submitted_at)
          ));
          
        } catch (err) {
          console.error("Submission sync failed:", err);
        } finally {
          setLoadingSubmissions(false);
        }
      };
      fetchSubs();
    }
    if (activeTab === 'archive') fetchChallenges();
  }, [activeTab]);

  const handleQuestionChange = (qIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, idx) => 
        idx === qIndex ? { ...q, [field]: value } : q
      )
    }));
  };

  const addTestCase = (qIndex, type) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, idx) => {
        if (idx !== qIndex) return q;
        const newCase = type === 'samples' 
          ? { input_data: "", output_data: "", explanation: "" }
          : { input_data: "", output_data: "" };
        return { ...q, [type]: [...q[type], newCase] };
      })
    }));
  };

  const handleTestCaseChange = (qIndex, sIndex, type, field, value) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, qIdx) => {
        if (qIdx !== qIndex) return q;
        return {
          ...q,
          [type]: q[type].map((s, sIdx) => 
            sIdx === sIndex ? { ...s, [field]: value } : s
          )
        };
      })
    }));
  };

  const removeTestCase = (qIndex, sIndex, type) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, qIdx) => {
        if (qIdx !== qIndex || q[type].length <= 1) return q;
        return { ...q, [type]: q[type].filter((_, sIdx) => sIdx !== sIndex) };
      })
    }));
  };

  const addQuestion = () => {
    if (formData.questions.length < 4) {
      setFormData(prev => ({ ...prev, questions: [...prev.questions, emptyQuestion()] }));
    }
  };

  const removeQuestion = (qIndex) => {
    if (formData.questions.length > 1) {
      setFormData(prev => ({
        ...prev,
        questions: prev.questions.filter((_, idx) => idx !== qIndex)
      }));
    }
  };

  const handleSubmit = async (e, statusType) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        status: statusType, 
        // UPDATED: Reference slot_id for default title
        title: formData.title || `Challenge ${formData.slot_id}`
      };
      await createDailyChallenge(payload);
      setModal({
        isOpen: true,
        title: statusType === 'published' ? 'Challenge published' : 'Draft saved',
        // UPDATED: Using slot_id in modal
        message: `Slot ID ${payload.slot_id} has been successfully saved.`,
        type: 'success'
      });
    } catch (error) {
      setModal({
        isOpen: true,
        title: 'Save failed',
        message: 'Ensure the Slot ID is unique and all fields are complete.',
        type: 'error'
      });
    }
  };

  const handleQuickPublish = async (slotId) => {
    try {
      // UPDATED: Using slotId
      await updateChallengeStatus(slotId, "published");
      fetchChallenges(); 
    } catch (err) {
      setModal({ isOpen: true, title: 'Update failed', message: 'Could not publish challenge.', type: 'error' });
    }
  };

  const handleDryRun = async (qIndex) => {
    const question = formData.questions[qIndex];
    
    if (!question.solution_code.trim()) {
      setModal({ isOpen: true, title: 'Missing code', message: 'Please provide a reference solution to run.', type: 'error' });
      return;
    }

    setIsDryRunning(prev => ({ ...prev, [qIndex]: true }));
    
    try {
      const payload = {
        code: question.solution_code,
        language: "python",
        samples: question.samples,
        private_samples: question.private_samples,
        time_limit: question.time_limit
      };

      const response = await runAdminDryRun(payload);
      setDryRunResults(prev => ({ ...prev, [qIndex]: response }));

    } catch (err) {
      setModal({ isOpen: true, title: 'Execution error', message: err.message, type: 'error' });
    } finally {
      setIsDryRunning(prev => ({ ...prev, [qIndex]: false }));
    }
  };

  const closeModal = () => {
    if (modal.type === 'success') {
      setModal({ isOpen: false, title: '', message: '', type: 'success' });
      setActiveTab('archive');
      // UPDATED: reset slot_id to empty string
      setFormData({ title: "", slot_id: "", total_time: 30, questions: [emptyQuestion()] });
    } else {
      setModal({ ...modal, isOpen: false });
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-300 font-sans pb-20">
      
      {modal.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0c0c0e] border border-zinc-800 rounded-lg p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className={`text-sm font-medium mb-2 ${modal.type === 'error' ? 'text-red-400' : 'text-zinc-100'}`}>
              {modal.title}
            </h3>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">{modal.message}</p>
            <div className="flex justify-end">
              <button 
                onClick={closeModal} 
                className="px-4 py-2 bg-zinc-100 text-zinc-950 text-xs font-medium rounded hover:bg-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="border-b border-zinc-800/80 bg-[#09090b]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <span className="text-zinc-100 font-medium text-sm tracking-tight">Dashboard</span>
            <div className="flex gap-6">
              {[
                { id: 'create', label: 'Create' },
                { id: 'review', label: 'Submissions' },
                { id: 'archive', label: 'Archive' }
              ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)} 
                  className={`text-[11px] font-medium transition-colors ${activeTab === tab.id ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <Link to="/" className="text-[11px] text-zinc-500 hover:text-zinc-100 transition-colors">Exit to site</Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-6 lg:p-10">
        
        {activeTab === 'create' && (
          <form className="space-y-12 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-8 border-b border-zinc-800/50 items-end">
              <div className="space-y-4">
                <h1 className="text-base font-medium text-zinc-100">New challenge</h1>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-zinc-500">Title</label>
                  <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="e.g. Arrays and Strings" className="w-full bg-zinc-900/50 border border-zinc-800 rounded-md px-3 py-2 text-xs text-zinc-100 outline-none focus:border-zinc-600 transition-all" required />
                </div>
              </div>
              <div className="flex gap-4 md:justify-end">
                <div className="space-y-1.5">
                  {/* UPDATED: Day Number -> Slot ID (text input) */}
                  <label className="text-[11px] text-zinc-500 block">Slot ID</label>
                  <input type="text" value={formData.slot_id} onChange={(e) => setFormData({...formData, slot_id: e.target.value})} placeholder="e.g. python-01" className="w-32 bg-zinc-900/50 border border-zinc-800 rounded-md px-3 py-2 text-xs text-center text-zinc-100 outline-none focus:border-zinc-600 transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-zinc-500 block">Minutes</label>
                  <input type="number" value={formData.total_time} onChange={(e) => setFormData({...formData, total_time: parseInt(e.target.value)})} className="w-20 bg-zinc-900/50 border border-zinc-800 rounded-md px-3 py-2 text-xs text-center text-zinc-100 outline-none focus:border-zinc-600 transition-all" />
                </div>
              </div>
            </div>

            {formData.questions.map((q, qIndex) => (
              <div key={qIndex} className="space-y-8 relative">
                <div className="flex justify-between items-center border-b border-zinc-800/50 pb-4">
                  <h2 className="text-xs font-medium text-zinc-400">Question {qIndex + 1}</h2>
                  {formData.questions.length > 1 && (
                    <button type="button" onClick={() => removeQuestion(qIndex)} className="text-[10px] text-zinc-600 hover:text-red-400 transition-colors">Remove</button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-[11px] text-zinc-500">Problem title</label>
                    <input type="text" value={q.title} onChange={(e) => handleQuestionChange(qIndex, 'title', e.target.value)} placeholder="Title" className="w-full bg-zinc-900/50 border border-zinc-800 rounded-md px-3 py-2 text-xs text-zinc-100 outline-none focus:border-zinc-600 transition-all" required />
                  </div>
                  <div className="md:col-span-1 space-y-1.5">
                    <label className="text-[11px] text-zinc-500">Difficulty</label>
                    <select value={q.difficulty} onChange={(e) => handleQuestionChange(qIndex, 'difficulty', e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-md px-3 py-2 text-xs text-zinc-100 outline-none cursor-pointer focus:border-zinc-600 transition-all">
                      <option>Easy</option><option>Medium</option><option>Hard</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-zinc-500">Description (Markdown)</label>
                  <textarea rows="5" value={q.storyline} onChange={(e) => handleQuestionChange(qIndex, 'storyline', e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-md px-3 py-2 text-[13px] text-zinc-300 outline-none resize-none focus:border-zinc-600 transition-all custom-scrollbar whitespace-pre-wrap" required />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-zinc-500">Input format</label>
                    <textarea rows="2" value={q.input_format} onChange={(e) => handleQuestionChange(qIndex, 'input_format', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-[11px] font-mono text-zinc-400 outline-none focus:border-zinc-600 transition-all custom-scrollbar whitespace-pre-wrap" required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-zinc-500">Output format</label>
                    <textarea rows="2" value={q.output_format} onChange={(e) => handleQuestionChange(qIndex, 'output_format', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-[11px] font-mono text-zinc-400 outline-none focus:border-zinc-600 transition-all custom-scrollbar whitespace-pre-wrap" required />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-zinc-500">Constraints</label>
                  <textarea rows="2" value={q.constraints} onChange={(e) => handleQuestionChange(qIndex, 'constraints', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-[11px] font-mono text-zinc-400 outline-none focus:border-zinc-600 transition-all custom-scrollbar whitespace-pre-wrap" required />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-zinc-800/50 pb-2">
                      <span className="text-[11px] font-medium text-zinc-300">Public test cases</span>
                      <button type="button" onClick={() => addTestCase(qIndex, 'samples')} className="text-[10px] text-zinc-500 hover:text-zinc-100 transition-colors">+ Add public</button>
                    </div>
                    <div className="space-y-4">
                      {q.samples.map((s, sIndex) => (
                        <div key={sIndex} className="bg-zinc-900/30 border border-zinc-800 rounded-md p-4 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-zinc-500">Case {sIndex + 1}</span>
                            {q.samples.length > 1 && (
                              <button type="button" onClick={() => removeTestCase(qIndex, sIndex, 'samples')} className="text-[10px] text-zinc-600 hover:text-red-400 transition-colors">Remove</button>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-zinc-500">Input</label>
                            <textarea rows="2" value={s.input_data} onChange={(e) => handleTestCaseChange(qIndex, sIndex, 'samples', 'input_data', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800/50 rounded p-2 font-mono text-[11px] text-zinc-300 outline-none focus:border-zinc-600 custom-scrollbar whitespace-pre-wrap" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-zinc-500">Output</label>
                            <textarea rows="2" value={s.output_data} onChange={(e) => handleTestCaseChange(qIndex, sIndex, 'samples', 'output_data', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800/50 rounded p-2 font-mono text-[11px] text-zinc-300 outline-none focus:border-zinc-600 custom-scrollbar whitespace-pre-wrap" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-zinc-500">Explanation</label>
                            <textarea rows="2" value={s.explanation} onChange={(e) => handleTestCaseChange(qIndex, sIndex, 'samples', 'explanation', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800/50 rounded p-2 text-[11px] text-zinc-400 outline-none focus:border-zinc-600 resize-none custom-scrollbar whitespace-pre-wrap" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-zinc-800/50 pb-2">
                      <span className="text-[11px] font-medium text-zinc-300">Hidden test cases</span>
                      <button type="button" onClick={() => addTestCase(qIndex, 'private_samples')} className="text-[10px] text-zinc-500 hover:text-zinc-100 transition-colors">+ Add hidden</button>
                    </div>
                    <div className="space-y-4">
                      {q.private_samples?.map((s, sIndex) => (
                        <div key={sIndex} className="bg-zinc-900/30 border border-zinc-800 rounded-md p-4 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-zinc-500">Case {sIndex + 1}</span>
                            {q.private_samples.length > 1 && (
                              <button type="button" onClick={() => removeTestCase(qIndex, sIndex, 'private_samples')} className="text-[10px] text-zinc-600 hover:text-red-400 transition-colors">Remove</button>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-zinc-500">Input</label>
                            <textarea rows="2" value={s.input_data} onChange={(e) => handleTestCaseChange(qIndex, sIndex, 'private_samples', 'input_data', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800/50 rounded p-2 font-mono text-[11px] text-zinc-300 outline-none focus:border-zinc-600 custom-scrollbar whitespace-pre-wrap" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-zinc-500">Output</label>
                            <textarea rows="2" value={s.output_data} onChange={(e) => handleTestCaseChange(qIndex, sIndex, 'private_samples', 'output_data', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800/50 rounded p-2 font-mono text-[11px] text-zinc-300 outline-none focus:border-zinc-600 custom-scrollbar whitespace-pre-wrap" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-6 mt-6 border-t border-zinc-800/50">
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <label className="text-[11px] text-zinc-300 font-medium">Reference solution</label>
                      <p className="text-[10px] text-zinc-500">Provide a working solution to verify your test cases.</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => handleDryRun(qIndex)}
                      disabled={isDryRunning[qIndex]}
                      className="px-4 py-1.5 rounded text-[10px] font-medium transition-colors border border-zinc-700 hover:bg-zinc-800 text-zinc-300 disabled:opacity-50"
                    >
                      {isDryRunning[qIndex] ? 'Running...' : 'Run tests'}
                    </button>
                  </div>

                  <textarea 
                    rows="8" 
                    value={q.solution_code} 
                    onChange={(e) => handleQuestionChange(qIndex, 'solution_code', e.target.value)} 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-4 text-[12px] font-mono text-zinc-300 outline-none focus:border-zinc-600 transition-all custom-scrollbar" 
                  />

                  {dryRunResults[qIndex] && (
                    <div className="mt-4 border border-zinc-800 rounded-md overflow-hidden bg-zinc-900/30 animate-in fade-in duration-300">
                      {dryRunResults[qIndex].status === "COMPILATION_ERROR" ? (
                        <div className="p-4 border-l-2 border-red-500/50">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="text-[11px] font-medium text-red-400">Execution error</h3>
                            <button type="button" onClick={() => setDryRunResults(prev => { const next = {...prev}; delete next[qIndex]; return next; })} className="text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors">Clear</button>
                          </div>
                          <pre className="text-[11px] font-mono text-zinc-400 whitespace-pre-wrap bg-black/40 p-3 rounded border border-zinc-800/50 custom-scrollbar">
                            {dryRunResults[qIndex].message}
                          </pre>
                        </div>
                      ) : (
                        <>
                          <div className="px-4 py-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
                            <span className="text-[11px] font-medium text-zinc-400">Test results</span>
                            <div className="flex items-center gap-3">
                              <span className={`text-[10px] font-medium ${dryRunResults[qIndex].test_results?.every(r => r.passed) ? 'text-emerald-400' : 'text-red-400'}`}>
                                {dryRunResults[qIndex].test_results?.every(r => r.passed) ? 'All passed' : 'Some tests failed'}
                              </span>
                              <button type="button" onClick={() => setDryRunResults(prev => { const next = {...prev}; delete next[qIndex]; return next; })} className="text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors">Clear</button>
                            </div>
                          </div>

                          <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left">
                              <thead className="bg-zinc-900/50 sticky top-0">
                                <tr className="text-[10px] text-zinc-500 border-b border-zinc-800">
                                  <th className="px-4 py-2 font-normal">Input</th>
                                  <th className="px-4 py-2 font-normal">Expected</th>
                                  <th className="px-4 py-2 font-normal">Actual</th>
                                  <th className="px-4 py-2 font-normal text-right">Result</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-800/50 text-[11px] font-mono text-zinc-400">
                                {dryRunResults[qIndex].test_results.map((res, idx) => (
                                  <tr key={idx}>
                                    <td className="px-4 py-3 truncate max-w-[120px]">{res.input || '-'}</td>
                                    <td className="px-4 py-3 whitespace-pre-wrap">{res.expected}</td>
                                    <td className={`px-4 py-3 whitespace-pre-wrap ${res.passed ? '' : 'text-red-400'}`}>{res.actual}</td>
                                    <td className={`px-4 py-3 text-right ${res.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                                      {res.passed ? 'Pass' : 'Fail'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div className="flex justify-between items-center pt-8 border-t border-zinc-800/50">
              <button type="button" onClick={addQuestion} className="px-4 py-2 border border-zinc-800 rounded text-[11px] font-medium hover:bg-zinc-900 transition-colors text-zinc-300">
                Add question
              </button>
              <div className="flex gap-3">
                <button type="button" onClick={(e) => handleSubmit(e, 'draft')} className="px-4 py-2 border border-zinc-800 rounded text-[11px] font-medium hover:bg-zinc-900 transition-colors text-zinc-300">
                  Save draft
                </button>
                <button type="button" onClick={(e) => handleSubmit(e, 'published')} className="px-6 py-2 bg-zinc-100 text-zinc-950 rounded text-[11px] font-medium hover:bg-white transition-colors">
                  Publish
                </button>
              </div>
            </div>
          </form>
        )}

       {activeTab === 'review' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <header>
            <h1 className="text-base font-medium text-zinc-100">Submissions</h1>
            <p className="text-xs text-zinc-500 mt-1">Review student code and provide feedback.</p>
          </header>
          
          <div className="bg-[#0c0c0e] border border-zinc-800 rounded-md overflow-hidden">
            {/* HEADER: Adjusted spans to fit "Student" */}
            <div className="grid grid-cols-12 bg-zinc-900/30 border-b border-zinc-800 px-6 py-3 text-[11px] font-medium text-zinc-500">
              <div className="col-span-3">Student</div>
              <div className="col-span-2">Slot ID</div>
              <div className="col-span-3">Date</div>
              <div className="col-span-2 text-center">Status</div>
              <div className="col-span-2 text-right">Action</div>
            </div>

            <div className="divide-y divide-zinc-800/50">
              {submissions.map((sub) => (
                <div key={sub._id} className="grid grid-cols-12 px-6 py-4 items-center text-xs hover:bg-zinc-900/20 transition-colors">
                  {/* STUDENT NAME */}
                  <div className="col-span-3 text-zinc-100 font-medium">{sub.username || 'Unknown'}</div>
                  
                  {/* SLOT ID */}
                  <div className="col-span-2 text-zinc-400 font-mono">{sub.slot_id}</div>
                  
                  {/* DATE (Shrunk to col-span-3) */}
                  <div className="col-span-3 text-zinc-500">
                    {new Date(
                      // This check ensures the browser knows the time is UTC
                      sub.submitted_at?.endsWith('Z') ? sub.submitted_at : `${sub.submitted_at}Z`
                    ).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>

                  {/* STATUS (Shrunk to col-span-2) */}
                  <div className="col-span-2 flex justify-center">
                    <span className={`text-[10px] px-2 py-0.5 rounded border capitalize ${
                      sub.status === 'reviewed' ? 'text-zinc-400 border-zinc-800' : 'text-zinc-300 border-zinc-700'
                    }`}>
                      {sub.status}
                    </span>
                  </div>

                  {/* ACTION (Shrunk to col-span-2) */}
                  <div className="col-span-2 text-right">
                    <Link 
                      to={`/admin/review/${sub.slot_id}/${sub.student_id}`} 
                      className={`text-[11px] font-medium px-3 py-1 rounded transition-colors ${
                        sub.status === 'reviewed' 
                          ? 'text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:bg-zinc-800' 
                          : 'text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/10'
                      }`}
                    >
                      {sub.status === 'reviewed' ? 'Edit Grade' : 'Review Now'}
                    </Link>
                  </div>
                </div>
              ))}

              {submissions.length === 0 && !loadingSubmissions && (
                <div className="p-16 text-center text-zinc-500 text-xs italic">No pending submissions found.</div>
              )}
              {loadingSubmissions && (
                <div className="p-16 text-center text-zinc-500 text-xs animate-pulse">Loading data...</div>
              )}
            </div>
          </div>
        </div>
      )}

        {activeTab === 'archive' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <header>
              <h1 className="text-base font-medium text-zinc-100">Challenges Archive</h1>
              <p className="text-xs text-zinc-500 mt-1">Manage existing assessment content.</p>
            </header>
            
            <div className="bg-[#0c0c0e] border border-zinc-800 rounded-md overflow-hidden">
              <div className="grid grid-cols-12 bg-zinc-900/30 border-b border-zinc-800 px-6 py-3 text-[11px] font-medium text-zinc-500">
                {/* UPDATED: Day -> Slot */}
                <div className="col-span-2">Slot ID</div>
                <div className="col-span-4">Title</div>
                <div className="col-span-2 text-center">Status</div>
                <div className="col-span-1 text-center">Qs</div>
                <div className="col-span-3 text-right">Action</div>
              </div>
              <div className="divide-y divide-zinc-800/50">
                {challenges.map((ch) => (
                  <div key={ch._id} className="grid grid-cols-12 px-6 py-4 items-center text-xs hover:bg-zinc-900/20 transition-colors">
                    {/* UPDATED: ch.day_number -> ch.slot_id */}
                    <div className="col-span-2 text-zinc-400 font-mono">{ch.slot_id}</div>
                    <div className="col-span-4 text-zinc-200 truncate pr-4">{ch.title || 'Untitled'}</div>
                    <div className="col-span-2 flex justify-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded border capitalize ${ch.status === 'published' ? 'text-zinc-300 border-zinc-700' : 'text-zinc-400 border-zinc-800'}`}>
                        {ch.status}
                      </span>
                    </div>
                    <div className="col-span-1 text-center text-zinc-500">{ch.questions?.length || 0}</div>
                    <div className="col-span-3 flex justify-end gap-4">
                       {ch.status === 'draft' && (
                         // UPDATED: ch.day_number -> ch.slot_id in publish handler
                         <button onClick={() => handleQuickPublish(ch.slot_id)} className="text-[11px] text-zinc-300 hover:text-zinc-100 transition-colors">Publish</button>
                       )}
                       <button className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">Edit</button>
                    </div>
                  </div>
                ))}
                {challenges.length === 0 && !loadingChallenges && (
                  <div className="p-16 text-center text-zinc-500 text-xs italic">No challenges available.</div>
                )}
                {loadingChallenges && (
                  <div className="p-16 text-center text-zinc-500 text-xs animate-pulse">Loading data...</div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}