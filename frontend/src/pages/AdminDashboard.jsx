/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createDailyChallenge, getAllSubmissions, getAllChallenges, updateChallengeStatus, runAdminDryRun, getChallengeBySlot, updateDailyChallenge, deleteChallenge } from '../api/client';
import { useNavigate } from "react-router-dom";
// 1. Import the code editor component
import Editor from 'react-simple-code-editor';

// 2. Import Prism for logic and highlighting
import { highlight, languages } from 'prismjs/components/prism-core';

// 3. Import the specific languages you want to support
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';

// 4. Import a professional dark theme (essential for visibility)
import 'prismjs/themes/prism-tomorrow.css';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('create'); 
  const [submissions, setSubmissions] = useState([]);
  const [challenges, setChallenges] = useState([]); 
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [loadingChallenges, setLoadingChallenges] = useState(false); 
  const [isSaving, setIsSaving] = useState(false); // NEW: Loader for Submit/Publish
  const [dryRunResults, setDryRunResults] = useState({});
  const [isDryRunning, setIsDryRunning] = useState({});
  const [editingSlotId, setEditingSlotId] = useState(null);

  const navigate = useNavigate();
  
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
    slot_id: "",
    total_time: 30,
    questions: [emptyQuestion()]
  });

  const fetchChallenges = async () => {
    setLoadingChallenges(true);
    try {
      const data = await getAllChallenges(true);
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

  // NEW: Strict validation helper
  const validateForm = () => {
    if (!formData.slot_id.trim()) return "Challenge ID is required.";
    if (!formData.title.trim()) return "Challenge title is required.";
    
    for (let i = 0; i < formData.questions.length; i++) {
      const q = formData.questions[i];
      const qNum = i + 1;
      if (!q.title.trim()) return `Question ${qNum} is missing a title.`;
      if (!q.storyline.trim()) return `Question ${qNum} is missing a description.`;
      if (!q.solution_code.trim()) return `Question ${qNum} is missing a reference solution.`;
      
      // Validate at least one sample exists with data
      if (!q.samples[0].input_data.trim() || !q.samples[0].output_data.trim()) {
        return `Question ${qNum} must have at least one valid public test case.`;
      }
    }
    return null;
  };

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
    
    // 1. Run Validation
    const validationError = validateForm();
    if (validationError) {
      setModal({
        isOpen: true,
        title: "Validation error",
        message: validationError,
        type: "error",
      });
      return;
    }

    setIsSaving(true); // START LOADER

    try {
      const payload = {
        ...formData,
        status: statusType,
        title: formData.title,
      };

      if (editingSlotId) {
        await updateDailyChallenge(editingSlotId, payload);
      } else {
        await createDailyChallenge(payload);
      }

      setModal({
        isOpen: true,
        title: editingSlotId ? "Challenge updated" : "Challenge saved",
        message: statusType === 'live' ? "Challenge is now live for all users." : "Challenge draft has been saved.",
        type: "success",
      });

      setEditingSlotId(null);
    } catch (err) {
      const raw = err?.response?.data?.detail || err?.message || "";
      let message = "Unable to save challenge.";
      if (raw.toLowerCase().includes("already exists")) {
        message = "Challenge ID already exists. Use a new unique ID.";
      } else if (raw) {
        message = raw;
      }

      setModal({
        isOpen: true,
        title: "Save failed",
        message,
        type: "error",
      });
    } finally {
      setIsSaving(false); // STOP LOADER
    }
  };

  const handleQuickPublish = async (slotId) => {
    setModal({
      isOpen: true,
      title: "Publish challenge?",
      message: "Are you ready to make this challenge live for users? This will move it from draft to active status.",
      type: "confirm",
      onConfirm: async () => {
        try {
          await updateChallengeStatus(slotId, "live");
          fetchChallenges();
          setModal({
            isOpen: true,
            title: "Challenge live",
            message: "The challenge is now visible to users.",
            type: "success",
          });
        } catch {
          setModal({
            isOpen: true,
            title: "Update failed",
            message: "Could not make the challenge live.",
            type: "error",
          });
        }
      },
    });
  };

  const handleEdit = async (slotId) => {
    try {
      const challenge = await getChallengeBySlot(slotId);
      setFormData({
        title: challenge.title,
        slot_id: challenge.slot_id,
        total_time: challenge.total_time,
        questions: challenge.questions,
      });
      setEditingSlotId(slotId);
      setActiveTab("create");
    } catch {
      setModal({
        isOpen: true,
        title: "Unable to open",
        message: "Could not load challenge details.",
        type: "error",
      });
    }
  };

  const handleDelete = async (slotId) => {
  setModal({
    isOpen: true,
    title: "Delete Challenge?",
    message:
      "This action cannot be undone.",
    type: "confirm",
    onConfirm: async () => {
      try {
        await deleteChallenge(slotId);
        fetchChallenges();

        setModal({
          isOpen: true,
          title: "Deleted",
          message:
            "Challenge removed successfully.",
          type: "success",
        });
      } catch (err) {
        setModal({
          isOpen: true,
          title: "Delete Failed",
          message: err.message,
          type: "error",
        });
      }
    },
  });
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
      setFormData({ title: "", slot_id: "", total_time: 30, questions: [emptyQuestion()] });
    } else {
      setModal({ ...modal, isOpen: false });
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-300 font-sans pb-20">
      
      {modal.isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300 px-4">
          <div className="bg-[#0c0c0e] border border-zinc-800 rounded-none p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className={`text-[13px] font-semibold mb-3 tracking-tight ${modal.type === "error" ? "text-red-400" : "text-white"}`}>
              {modal.title}
            </h3>
            <p className="text-[11px] text-zinc-400 mb-8 leading-relaxed italic">
              {modal.message}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-5 py-2 bg-zinc-900 text-zinc-400 text-[10px] font-bold tracking-wider border border-zinc-800 hover:text-white hover:border-zinc-600 transition-all rounded-none"
              >
                {modal.type === "confirm" ? "Cancel" : "Close"}
              </button>
              {modal.type === "confirm" && (
                <button
                  onClick={async () => {
                    if (modal.onConfirm) await modal.onConfirm();
                  }}
                  className="px-5 py-2 bg-white text-black text-[10px] font-bold tracking-wider hover:bg-zinc-200 transition-colors rounded-none"
                >
                  Confirm action
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <nav className="border-b border-zinc-800 bg-[#09090b]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <span className="text-zinc-100 font-medium text-[13px] tracking-tight">Admin</span>
            <div className="flex gap-8">
              {[
                { id: 'create', label: 'New challenge' },
                { id: 'review', label: 'Review work' },
                { id: 'archive', label: 'All challenges' }
              ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)} 
                  className={`text-[11px] font-medium transition-colors relative py-4 ${
                    activeTab === tab.id ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-px bg-zinc-100 animate-in fade-in" />}
                </button>
              ))}
            </div>
          </div>
          <Link to="/dashboard" className="text-[11px] text-zinc-500 hover:text-zinc-100 transition-colors">Exit dashboard</Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-6 lg:p-10">
        
        {activeTab === 'create' && (
          <form className="max-w-5xl mx-auto space-y-16 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <header className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-zinc-700 items-end">
              <div className="md:col-span-7 space-y-6">
                <div className="space-y-1">
                  <h1 className="text-lg font-medium text-white tracking-tight">
                    {editingSlotId ? "Edit challenge" : "New challenge"}
                  </h1>
                  <p className="text-[11px] text-zinc-400">Define the technical scope and duration for this assessment.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-zinc-300">Challenge title</label>
                  <input 
                    type="text" 
                    required
                    value={formData.title} 
                    onChange={(e) => setFormData({...formData, title: e.target.value})} 
                    placeholder="e.g. Arrays and sorting fundamentals" 
                    className="w-full bg-zinc-900/50 border border-zinc-700 rounded-none px-4 py-2.5 text-xs text-zinc-100 outline-none focus:border-zinc-400 transition-all placeholder:text-zinc-600" 
                  />
                </div>
              </div>

              <div className="md:col-span-5 flex gap-4 md:justify-end">
                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-zinc-300">Challenge ID</label>
                  <input 
                    type="text" 
                    value={formData.slot_id} 
                    onChange={(e) => setFormData({...formData, slot_id: e.target.value})} 
                    disabled={!!editingSlotId} 
                    placeholder="py-01" 
                    className="w-32 bg-zinc-900/50 border border-zinc-700 rounded-none px-3 py-2.5 text-xs text-center text-zinc-100 outline-none focus:border-zinc-400 transition-all disabled:opacity-30" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-zinc-300">Time (min)</label>
                  <input 
                    type="number" 
                    value={formData.total_time} 
                    onChange={(e) => setFormData({...formData, total_time: parseInt(e.target.value)})} 
                    className="w-24 bg-zinc-900/50 border border-zinc-700 rounded-none px-3 py-2.5 text-xs text-center text-zinc-100 outline-none focus:border-zinc-400 transition-all" 
                  />
                </div>
              </div>
            </header>

            <div className="space-y-20">
              {formData.questions.map((q, qIndex) => (
                <section key={qIndex} className="space-y-10 relative animate-in fade-in duration-500">
                  <header className="flex justify-between items-center border-b border-zinc-700 pb-4">
                    <div className="flex items-center gap-6">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Question 0{qIndex + 1}</span>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-zinc-400 font-medium italic">Difficulty:</label>
                        <select 
                          value={q.difficulty} 
                          onChange={(e) => handleQuestionChange(qIndex, 'difficulty', e.target.value)} 
                          className="bg-transparent text-[11px] font-medium text-zinc-200 outline-none cursor-pointer hover:text-white transition-colors"
                        >
                          <option className="bg-[#09090b]">Easy</option>
                          <option className="bg-[#09090b]">Medium</option>
                          <option className="bg-[#09090b]">Hard</option>
                        </select>
                      </div>
                    </div>
                    {formData.questions.length > 1 && (
                      <button type="button" onClick={() => removeQuestion(qIndex)} className="text-[10px] font-medium text-zinc-500 hover:text-red-400 transition-colors">Remove question</button>
                    )}
                  </header>

                  <div className="grid grid-cols-1 gap-8">
                    <div className="space-y-2">
                      <label className="text-[11px] font-medium text-zinc-300">Problem name</label>
                      <input 
                        type="text" 
                        required
                        value={q.title} 
                        onChange={(e) => handleQuestionChange(qIndex, 'title', e.target.value)} 
                        placeholder="Specific task title..." 
                        className="w-full bg-transparent border-b border-zinc-800 rounded-none pb-2 text-sm text-zinc-100 outline-none focus:border-zinc-400 transition-all" 
                      />
                    </div>

                   <div className="space-y-2">
                      <label className="text-[11px] font-medium text-zinc-300">Markdown description</label>
                      <textarea 
                        rows="12" 
                        required
                        value={q.storyline} 
                        onChange={(e) => handleQuestionChange(qIndex, 'storyline', e.target.value)} 
                        placeholder="Describe the technical logic..."
                        className="w-full bg-[#0c0c0e] border border-zinc-700 rounded-none px-4 py-4 text-xs text-zinc-200 outline-none focus:border-zinc-500 transition-all custom-scrollbar resize-y min-h-[240px] whitespace-pre-wrap leading-relaxed placeholder:text-zinc-800" 
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {[
                        { label: 'Input format', key: 'input_format' },
                        { label: 'Output format', key: 'output_format' },
                        { label: 'Constraints', key: 'constraints' }
                      ].map((field) => (
                        <div key={field.key} className="space-y-2">
                          <label className="text-[11px] font-medium text-zinc-300">{field.label}</label>
                          <textarea 
                            rows="3" 
                            required
                            value={q[field.key]} 
                            onChange={(e) => handleQuestionChange(qIndex, field.key, e.target.value)} 
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-none px-3 py-2 text-[11px] font-mono text-zinc-400 outline-none focus:border-zinc-600 transition-all resize-none" 
                          />
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
                      <div className="space-y-4">
                        <header className="flex justify-between items-center border-b border-zinc-800 pb-2">
                          <span className="text-[10px] font-semibold text-zinc-300 uppercase tracking-wider">Public cases</span>
                          <button type="button" onClick={() => addTestCase(qIndex, 'samples')} className="text-[10px] text-zinc-400 hover:text-white transition-colors">+ New case</button>
                        </header>
                        <div className="space-y-3">
                          {q.samples.map((s, sIndex) => (
                            <div key={sIndex} className="bg-zinc-900/20 border border-zinc-800 p-3 space-y-3 relative">
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] text-zinc-600 font-mono italic leading-none">Case 0{sIndex + 1}</span>
                                {q.samples.length > 1 && (
                                  <button type="button" onClick={() => removeTestCase(qIndex, sIndex, 'samples')} className="text-[9px] text-zinc-700 hover:text-red-500 transition-colors">Remove</button>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[9px] text-zinc-500 font-medium">Input</label>
                                  <textarea rows="2" value={s.input_data} onChange={(e) => handleTestCaseChange(qIndex, sIndex, 'samples', 'input_data', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-none p-2 text-[10px] font-mono text-zinc-300 outline-none focus:border-zinc-500 transition-all custom-scrollbar whitespace-pre-wrap" />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] text-zinc-500 font-medium">Output</label>
                                  <textarea rows="2" value={s.output_data} onChange={(e) => handleTestCaseChange(qIndex, sIndex, 'samples', 'output_data', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-none p-2 text-[10px] font-mono text-zinc-300 outline-none focus:border-zinc-500 transition-all custom-scrollbar whitespace-pre-wrap" />
                                </div>
                              </div>
                              <div className="space-y-2 pt-2">
                                <label className="text-[10px] text-zinc-400 font-medium tracking-tight">Explanation</label>
                                <textarea rows="6" value={s.explanation} onChange={(e) => handleTestCaseChange(qIndex, sIndex, 'samples', 'explanation', e.target.value)} placeholder="Describe logic..." className="w-full bg-[#0c0c0e] border border-zinc-700 rounded-none p-3 text-[11px] text-zinc-300 outline-none focus:border-zinc-500 transition-all custom-scrollbar whitespace-pre-wrap italic leading-relaxed placeholder:text-zinc-800" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <header className="flex justify-between items-center border-b border-zinc-800 pb-2">
                          <span className="text-[10px] font-semibold text-zinc-300 uppercase tracking-wider">Hidden cases</span>
                          <button type="button" onClick={() => addTestCase(qIndex, 'private_samples')} className="text-[10px] text-zinc-400 hover:text-white transition-colors">+ New hidden</button>
                        </header>
                        <div className="space-y-3">
                          {q.private_samples?.map((s, sIndex) => (
                            <div key={sIndex} className="bg-zinc-900/20 border border-zinc-800 p-3 space-y-3 relative">
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] text-zinc-600 font-mono italic leading-none">Hidden 0{sIndex + 1}</span>
                                {q.private_samples.length > 1 && (
                                  <button type="button" onClick={() => removeTestCase(qIndex, sIndex, 'private_samples')} className="text-[9px] text-zinc-700 hover:text-red-500 transition-colors">Remove</button>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[9px] text-zinc-500 font-medium">Input</label>
                                  <textarea rows="2" value={s.input_data} onChange={(e) => handleTestCaseChange(qIndex, sIndex, 'private_samples', 'input_data', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-none p-2 text-[10px] font-mono text-zinc-300 outline-none focus:border-zinc-500 transition-all custom-scrollbar whitespace-pre-wrap" />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] text-zinc-500 font-medium">Output</label>
                                  <textarea rows="2" value={s.output_data} onChange={(e) => handleTestCaseChange(qIndex, sIndex, 'private_samples', 'output_data', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-none p-2 text-[10px] font-mono text-zinc-300 outline-none focus:border-zinc-500 transition-all custom-scrollbar whitespace-pre-wrap" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-8 border-t border-zinc-800 space-y-6">
                      {/* Header: Industrial IDE Toolbar */}
                      <header className="flex justify-between items-end">
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-zinc-300">Reference solution</label>
                          <p className="text-[10px] text-zinc-500 italic">Verify logic against all test cases before saving.</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {dryRunResults[qIndex] && (
                            <button 
                              type="button"
                              onClick={() => setDryRunResults(prev => { const n = {...prev}; delete n[qIndex]; return n; })}
                              className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                              Clear console
                            </button>
                          )}
                          <button 
                            type="button"
                            onClick={() => handleDryRun(qIndex)}
                            disabled={isDryRunning[qIndex]}
                            className="px-6 py-2 bg-zinc-100 text-zinc-950 text-[11px] font-bold hover:bg-white transition-all rounded-none disabled:opacity-30"
                          >
                            {isDryRunning[qIndex] ? 'Verifying...' : 'Run verify'}
                          </button>
                        </div>
                      </header>

                      {/* Code Workspace */}
                      <div className="border border-zinc-800 bg-zinc-950/50">
                        <Editor
                          value={q.solution_code}
                          onValueChange={code => handleQuestionChange(qIndex, 'solution_code', code)}
                          highlight={code => highlight(code, languages.python)}
                          padding={20}
                          className="font-mono text-[13px] min-h-[300px] outline-none"
                          style={{
                            fontFamily: '"Fira Code", monospace',
                            backgroundColor: 'transparent'
                          }}
                        />
                      </div>

                      {/* Verification Console */}
                      {dryRunResults[qIndex] && (() => {
                        const results = dryRunResults[qIndex].results || dryRunResults[qIndex].test_results || [];
                        const systemError = dryRunResults[qIndex].error || dryRunResults[qIndex].message;
                        const allPassed = results.length > 0 && results.every(res => res.passed);
                        const isCrash = !!systemError || results.some(res => res.status === "RUNTIME_ERROR");
                        
                        const failedCases = results.filter(r => !r.passed);
                        const totalCount = results.length;

                        return (
                          <div className="bg-[#09090b] border border-zinc-800 rounded-none animate-in fade-in slide-in-from-top-1 duration-400">
                            
                            {/* Status Bar */}
                            <div className="px-4 py-2 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
                              <div className="flex items-center gap-4">
                                <span className="text-[11px] font-medium text-zinc-400">Verification log</span>
                              </div>
                              <span className={`text-[10px] font-mono px-2 py-0.5 border rounded-none ${
                                allPassed 
                                  ? 'text-emerald-500 border-emerald-900/30 bg-emerald-500/5' 
                                  : 'text-red-500 border-red-900/30 bg-red-500/5'
                              }`}>
                                {allPassed ? 'All cases passed' : isCrash ? 'Execution error' : `${failedCases.length} errors found`}
                              </span>
                            </div>

                            <div className="divide-y divide-zinc-800/50 max-h-[500px] overflow-y-auto custom-scrollbar bg-black/10">
                              {/* Priority 1: System/Syntax Errors (The most important thing to fix) */}
                              {systemError && (
                                <div className="p-4 bg-red-950/5">
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="w-1 h-1 bg-red-500" />
                                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Traceback</span>
                                  </div>
                                  <pre className="text-[11px] font-mono text-zinc-400 whitespace-pre-wrap bg-black/40 p-4 border border-red-900/20 leading-relaxed">
                                    {systemError}
                                  </pre>
                                </div>
                              )}

                              {/* Priority 2: Failed Cases (Debugging data) */}
                              {failedCases.map((res, idx) => (
                                <div key={idx} className="p-5 space-y-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <span className="text-[10px] font-mono text-zinc-500 italic">
                                        {res.is_public ? 'public' : 'hidden'} case {res.case || results.indexOf(res) + 1}
                                      </span>
                                      <span className="text-[10px] font-medium text-red-500">Failed</span>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 gap-3 bg-zinc-950 p-4 border-l border-red-900/40">
                                    <div className="space-y-1">
                                      <span className="text-[9px] text-zinc-600 font-medium uppercase">Input</span>
                                      <pre className="text-[11px] font-mono text-zinc-400 whitespace-pre-wrap">{res.input || 'N/A'}</pre>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-zinc-900">
                                      <div className="space-y-1">
                                        <span className="text-[9px] text-zinc-600 font-medium uppercase">Expected</span>
                                        <pre className="text-[11px] font-mono text-zinc-500 whitespace-pre-wrap">{res.expected}</pre>
                                      </div>
                                      <div className="space-y-1">
                                        <span className="text-[9px] text-zinc-600 font-medium uppercase">Actual</span>
                                        <pre className="text-[11px] font-mono text-red-400 whitespace-pre-wrap">{res.actual || "no output"}</pre>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}

                              {/* Priority 3: Success Summary (Compact) */}
                              {allPassed && (
                                <div className="p-10 text-center space-y-2">
                                  <p className="text-[11px] text-zinc-400">All {totalCount} test cases verified against the reference solution.</p>
                                  <p className="text-[10px] text-zinc-600 italic font-mono">Status: 0 errors / {totalCount} success</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </section>
              ))}
            </div>

            <footer className="flex flex-col md:flex-row justify-between items-center pt-10 border-t border-zinc-700 gap-8">
              <button type="button" onClick={addQuestion} className="w-full md:w-auto px-8 py-3 cursor-pointer border border-zinc-600 text-[11px] font-medium text-zinc-200 hover:bg-zinc-800 transition-all rounded-none">Add another question</button>
              <div className="flex gap-4 w-full md:w-auto">
                <button 
                  type="button" 
                  disabled={isSaving}
                  onClick={(e) => handleSubmit(e, 'draft')} 
                  className="flex-1 md:flex-none px-8 py-3 border border-zinc-600 cursor-pointer text-[11px] font-medium text-zinc-200 hover:bg-zinc-800 transition-all rounded-none disabled:opacity-30"
                >
                  {isSaving ? 'Saving...' : 'Save draft'}
                </button>
                <button 
                  type="button" 
                  disabled={isSaving}
                  onClick={(e) => handleSubmit(e, 'live')} 
                  className="flex-1 md:flex-none px-10 py-3 bg-zinc-100 cursor-pointer text-black text-[11px] font-bold hover:bg-white transition-all rounded-none disabled:opacity-30"
                >
                  {isSaving ? 'Publishing...' : 'Publish challenge'}
                </button>
              </div>
            </footer>
          </form>
        )}

        {activeTab === 'review' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <header>
              <h1 className="text-base font-medium text-zinc-100">Submissions</h1>
              <p className="text-xs text-zinc-500 mt-1">Review student code and provide feedback.</p>
            </header>
            <div className="bg-[#0c0c0e] border border-zinc-800 rounded-none overflow-hidden">
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
                    <div className="col-span-3 text-zinc-100 font-medium">{sub.username || 'Unknown'}</div>
                    <div className="col-span-2 text-zinc-400 font-mono">{sub.slot_id}</div>
                    <div className="col-span-3 text-zinc-500">{new Date(sub.submitted_at?.endsWith('Z') ? sub.submitted_at : `${sub.submitted_at}Z`).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</div>
                    <div className="col-span-2 flex justify-center text-[10px] text-zinc-400 italic capitalize">{sub.status}</div>
                    <div className="col-span-2 text-right">
                      <Link to={`/admin/review/${sub.slot_id}/${sub.student_id}`} className={`text-[11px] font-medium px-3 py-1 rounded-none transition-colors border ${sub.status === 'reviewed' ? 'text-zinc-500 border-zinc-800' : 'text-emerald-400 border-emerald-900/30 bg-emerald-500/5'}`}>
                        {sub.status === 'reviewed' ? 'Edit Grade' : 'Review Now'}
                      </Link>
                    </div>
                  </div>
                ))}
                {submissions.length === 0 && !loadingSubmissions && <div className="p-16 text-center text-zinc-500 text-xs italic">No pending submissions found.</div>}
                {loadingSubmissions && <div className="p-16 text-center text-zinc-500 text-xs animate-pulse">Synchronizing data...</div>}
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
            <div className="bg-[#0c0c0e] border border-zinc-800 rounded-none overflow-hidden">
              <div className="grid grid-cols-12 bg-zinc-900/30 border-b border-zinc-800 px-6 py-3 text-[11px] font-medium text-zinc-500">
                <div className="col-span-2">Slot ID</div>
                <div className="col-span-4">Title</div>
                <div className="col-span-2 text-center">Status</div>
                <div className="col-span-1 text-center">Qs</div>
                <div className="col-span-3 text-right">Action</div>
              </div>
              <div className="divide-y divide-zinc-800/50">
                {challenges.map((ch) => (
                  <div key={ch._id} className="grid grid-cols-12 px-6 py-4 items-center text-xs hover:bg-zinc-900/20 transition-colors">
                    <div className="col-span-2 text-zinc-400 font-mono">{ch.slot_id}</div>
                    <div className="col-span-4 text-zinc-200 truncate pr-4">{ch.title || 'Untitled'}</div>
                    <div className="col-span-2 flex justify-center text-[10px] text-zinc-400 italic capitalize">{ch.status}</div>
                    <div className="col-span-1 text-center text-zinc-500">{ch.questions?.length || 0}</div>
                    <div className="col-span-3 flex justify-end gap-2">
                      {ch.status === "draft" && (
                        <button
                          onClick={() => handleQuickPublish(ch.slot_id)}
                          className="px-2.5 py-1 text-[11px] text-zinc-300 hover:text-white hover:bg-zinc-800 cursor-pointer transition-all"
                        >
                          Publish
                        </button>
                      )}

                      <button
                        onClick={() => handleEdit(ch.slot_id)}
                        className="px-2.5 py-1 text-[11px] text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 cursor-pointer transition-all"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDelete(ch.slot_id)}
                        className="px-2.5 py-1 text-[11px] text-red-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer transition-all"
                      >
                        Delete
                      </button>

                    </div>
                  </div>
                ))}
                {challenges.length === 0 && !loadingChallenges && <div className="p-16 text-center text-zinc-500 text-xs italic">No challenges available.</div>}
                {loadingChallenges && <div className="p-16 text-center text-zinc-500 text-xs animate-pulse">Loading data...</div>}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}