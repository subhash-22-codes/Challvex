/* eslint-disable no-unused-vars */
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { 
  createDailyChallenge, 
  getAllSubmissions, 
  getAllChallenges, 
  updateChallengeStatus, 
  runAdminDryRun, 
  getChallengeBySlot, 
  updateDailyChallenge, 
  deleteChallenge, 
  inviteMember, 
  createOrganization,
  getMyOrganizations,
  getPendingInvites,
  respondToInvite,
  getOrgMembers,
  removeOrgMember,
  leaveOrganization,
  checkUserOrgLimit
} from '../api/client';
import { useNavigate } from "react-router-dom";
import { useAuth } from '../context/AuthContext';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/themes/prism-tomorrow.css';

export default function AdminDashboard() {
  // Added setCurrentOrg to the destructuring to handle switching
  const { currentOrg, switchOrg, setCurrentOrg, organizations, refreshOrgs, user } = useAuth();
  const [activeTab, setActiveTab] = useState('create'); 
  const [submissions, setSubmissions] = useState([]);
  const [challenges, setChallenges] = useState([]); 
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [loadingChallenges, setLoadingChallenges] = useState(false); 
  const [isSaving, setIsSaving] = useState(false);
  const [dryRunResults, setDryRunResults] = useState({});
  const [isDryRunning, setIsDryRunning] = useState({});
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [newOrgName, setNewOrgName] = useState("");
  const [invites, setInvites] = useState([]);
  const [searchParams] = useSearchParams();
  const [orgMembers, setOrgMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showWorkspaceNote, setShowWorkspaceNote] = useState(false);
  const { refreshUser } = useAuth();
  // Add these with your other states
const [isCheckingLimit, setIsCheckingLimit] = useState(false);
const [targetLimitStatus, setTargetLimitStatus] = useState(null); // { exists, is_full, username }
const [showCustomMessage, setShowCustomMessage] = useState(false);
const [customMessage, setCustomMessage] = useState("");

  const [isCreatingOrg, setIsCreatingOrg] = useState(false); // Handles the loader and disabled states

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
    requires_code: false,
    access_code: "",
    is_published_globally: true,
    questions: [emptyQuestion()]
  });

  const handleVisitWorkspace = (orgId) => {
  if (!orgId) return;
  
  // find the organization object from your list
  const targetOrg = organizations?.find(o => o.id === orgId);
  
  if (targetOrg) {
    switchOrg(targetOrg); // update the active organization context
    navigate("/admin/dashboard"); // send the user to their workspace home
  }
};


    useEffect(() => {
      const tab = searchParams.get('tab');
      if (tab === 'organization') {
        setActiveTab('organization'); // Set the state that controls your tabs
      }
    }, [searchParams]);
  const refreshWorkspaceData = useCallback(async () => {
    try {
      // 2. Fetch invites for local state
      const invitesData = await getPendingInvites();
      setInvites(invitesData || []);

      await refreshOrgs();
    } catch (err) {
      console.error("Workspace sync failed:", err);
    }
  }, [refreshOrgs]); // refreshOrgs is stable, so this satisfies ESLint

  useEffect(() => {
    refreshWorkspaceData();
  }, [refreshWorkspaceData]);

// 3. The logic to Accept or Ignore
const handleInviteAction = async (orgId, action) => {
  try {
    await respondToInvite(orgId, action);
    
    if (typeof refreshWorkspaceData === 'function') await refreshWorkspaceData();

    setModal({
      isOpen: true,
      type: "success",
      title: action === "accept" ? "Join Successful" : "Invite Declined",
      message: action === "accept" 
        ? "You have successfully joined the workspace." 
        : "The invitation has been declined."
    });
  } catch (err) {
    setModal({
      isOpen: true,
      type: "error",
      title: "Action Failed",
      message: err.message || "Could not complete the request."
    });
  }
};


  const handleCreateOrg = async () => {
    if (!newOrgName.trim()) return;
    setIsCreatingOrg(true);
    try {
      await createOrganization(newOrgName);
      setModal({ isOpen: true, title: "Success", message: "Organization created successfully.", type: "success" });
      setNewOrgName("");
      refreshOrgs();
    } catch (err) {
      setModal({ isOpen: true, title: "Error", message: err.message, type: "error" });
    } finally {      setIsCreatingOrg(false); }
  };

  const handleInvite = async (type = 'standard') => {
  // 1. Basic Check
  if (!inviteEmail.trim() || !currentOrg) return;

  try {
    // 2. The Data Package
    const payload = {
      recipient_email: inviteEmail,
      invite_type: type, // 'standard', 'anyway', or 'with_message'
      personal_note: type === 'with_message' ? customMessage : null
    };

    const orgId = currentOrg._id || currentOrg.id;
    await inviteMember(orgId, payload);

    // 3. Human Success Feedback
    setModal({ 
      isOpen: true, 
      title: "Invite Sent", 
      message: type === 'with_message' 
        ? `We've sent your invite and personal note to ${inviteEmail}.` 
        : `Invitation successfully sent to ${inviteEmail}.`, 
      type: "success" 
    });

    // 4. Cleanup
    setInviteEmail("");
    setCustomMessage("");
    setShowCustomMessage(false);
    setTargetLimitStatus(null);
    
  } catch (err) {
    setModal({ 
      isOpen: true, 
      title: "Invite Failed", 
      message: err.message || "Something went wrong while sending the invite. Please try again.", 
      type: "error" 
    });
  }
};

  // --- NEW MEMBER HIERARCHY LOGIC ---
 const fetchTeamMembers = useCallback(async () => {
  if (!currentOrg) return;
  
  setLoadingMembers(true);
  try {
    const data = await getOrgMembers(currentOrg.id);
    setOrgMembers(data || []);
  } catch (err) {
    // 1. Check for the 403 Access Denied error
    // Note: Use err.status or err.response?.status depending on your API wrapper
    if (err.status === 403 || err.response?.status === 403) {
      console.warn(`[SECURITY] Access revoked for Org: ${currentOrg.id}`);
      
      // 2. Trigger a professional informative modal
      setModal({
        isOpen: true,
        type: "error",
        title: "Access revoked",
        message: "You are no longer an active member of this organization. To maintain system integrity, your workspace context has been reset to your personal profile."
      });

      // 3. Auto-Evict: Clear the organization state and switch to Personal Context
      setCurrentOrg(null);
      setOrgMembers([]);
      
      // 4. Force a refresh of the dashboard to clear stale data
      if (typeof refreshWorkspaceData === 'function') {
        refreshWorkspaceData();
      }
    } else {
      // Handle other types of errors (network issues, etc.)
      console.error("[DEBUG] Failed to load members", err);
    }
  } finally {
    setLoadingMembers(false);
  }
}, [currentOrg, setCurrentOrg, setModal, refreshWorkspaceData]);

// Listen for tab and organization changes
useEffect(() => {
  if (activeTab === 'organization' && currentOrg) {
    fetchTeamMembers();
  }
}, [activeTab, currentOrg, fetchTeamMembers]);

  // Stub for Step 4
   const handleRemoveMember = (memberId) => {
  if (!currentOrg) return;

  setModal({
    isOpen: true,
    title: "Remove Creator?",
    message: "This user will lose all administrative access to this organization immediately.",
    type: "confirm",
    onConfirm: async () => {
      try {
        await removeOrgMember(currentOrg.id, memberId);
        // Refresh the list immediately after removal
        await fetchTeamMembers();
        setModal({ 
          isOpen: true, 
          title: "Success", 
          message: "Member removed from the community.", 
          type: "success" 
        });
      } catch (err) {
        setModal({ 
          isOpen: true, 
          title: "Action Failed", 
          message: err.response?.data?.detail || "Could not remove member.", 
          type: "error" 
        });
      }
    },
  });
};

 
    const fetchChallenges = useCallback(async () => {
      setLoadingChallenges(true);
      try {
        // API Call: pass 'true' for personal if no org is selected
        const response = await getAllChallenges(!currentOrg, currentOrg?.id);
        
        // Access the 'challenges' array from the paginated response object
        // Fallback to empty array if response.challenges is missing
        const challengeList = response.challenges || [];

        if (Array.isArray(challengeList)) {
          // Create a shallow copy before sorting to avoid mutating state directly
          const sortedData = [...challengeList].sort((a, b) => {
            const idA = String(a.slot_id || "");
            const idB = String(b.slot_id || "");
            return idB.localeCompare(idA);
          });
          
          setChallenges(sortedData);
        } else {
          setChallenges([]);
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setChallenges([]); // Prevent stale data on failure
      } finally {
        setLoadingChallenges(false);
      }
    }, [currentOrg]);

    /**
     * Trigger the fetch whenever the workspace (currentOrg) changes
     * or the dashboard initially mounts.
     */
    useEffect(() => {
      // We only fire this once the auth loading is finished
      fetchChallenges();
    }, [fetchChallenges]);

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
  }, [activeTab, fetchChallenges]);

  const validateForm = () => {
    if (!formData.slot_id.trim()) return "Challenge ID is required.";
    if (!formData.title.trim()) return "Challenge title is required.";
    
    for (let i = 0; i < formData.questions.length; i++) {
      const q = formData.questions[i];
      const qNum = i + 1;
      if (!q.title.trim()) return `Question ${qNum} is missing a title.`;
      if (!q.storyline.trim()) return `Question ${qNum} is missing a description.`;
      if (!q.solution_code.trim()) return `Question ${qNum} is missing a reference solution.`;
      
      if (!q.samples[0].input_data.trim() || !q.samples[0].output_data.trim()) {
        return `Question ${qNum} must have at least one valid public test case.`;
      }
      if (formData.requires_code) {
        if (!formData.access_code || formData.access_code.length !== 6) {
          return "Gated challenges require a 6-digit numeric access code.";
        }
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
    const validationError = validateForm();
    if (validationError) {
      setModal({ isOpen: true, title: "Validation error", message: validationError, type: "error" });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        status: statusType,
        org_id: currentOrg?.id || null,
        // If it belongs to an org, ensure it isn't leaked to global feed by accident
        is_published_globally: currentOrg ? false : formData.is_published_globally,
      };

      if (editingSlotId) {
        await updateDailyChallenge(editingSlotId, payload);
      } else {
        await createDailyChallenge(payload);
      }

      setModal({
        isOpen: true,
        title: editingSlotId ? "Challenge updated" : "Challenge saved",
        message: statusType === 'live' ? "Challenge is now live for users." : "Challenge draft has been saved.",
        type: "success",
      });
      setEditingSlotId(null);
    } catch (err) {
      setModal({ isOpen: true, title: "Save failed", message: err?.response?.data?.detail || err.message, type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickPublish = async (slotId) => {
    setModal({
      isOpen: true,
      title: "Publish challenge?",
      message: "Make this challenge live for users? This will move it from draft to active status.",
      type: "confirm",
      onConfirm: async () => {
        try {
          await updateChallengeStatus(slotId, "live");
          fetchChallenges();
          setModal({ isOpen: true, title: "Challenge live", message: "The challenge is now visible.", type: "success" });
        } catch {
          setModal({ isOpen: true, title: "Update failed", message: "Could not make the challenge live.", type: "error" });
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
        requires_code: challenge.requires_code || false,
        access_code: challenge.access_code || "",
        is_published_globally: challenge.is_published_globally ?? true,
      });
      setEditingSlotId(slotId);
      setActiveTab("create");
    } catch {
      setModal({ isOpen: true, title: "Unable to open", message: "Could not load challenge details.", type: "error" });
    }
  };

  const handleDelete = async (slotId) => {
    setModal({
      isOpen: true,
      title: "Delete challenge?",
      message: "This action cannot be undone.",
      type: "confirm",
      onConfirm: async () => {
        try {
          await deleteChallenge(slotId);
          fetchChallenges();
          setModal({ isOpen: true, title: "Deleted", message: "Challenge removed successfully.", type: "success" });
        } catch (err) {
          setModal({ isOpen: true, title: "Delete failed", message: err.message, type: "error" });
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
    if (modal.type === 'success' && !modal.onConfirm) {
      setModal({ isOpen: false, title: '', message: '', type: 'success' });
      setActiveTab('archive');
      setFormData({ 
        title: "", slot_id: "", total_time: 30, questions: [emptyQuestion()], 
        requires_code: false, access_code: "", is_published_globally: true 
      });
    } else {
      setModal({ ...modal, isOpen: false });
    }
  };

const handleLeaveOrg = (orgId) => {
  // Ensure we are getting a real ID
  const targetId = orgId || currentOrg?._id || currentOrg?.id;

  setModal({
    isOpen: true,
    type: "confirm",
    title: "Relinquish Membership",
    message: "Are you sure? You will lose access to this organization's private logic arenas instantly.",
    onConfirm: async () => {
      try {
        await leaveOrganization(targetId);

        // FIX: Use the correct setter name from your useState
        if (typeof setCurrentOrg === 'function') {
           setCurrentOrg(null); 
        }
        
        if (typeof refreshOrgs === 'function') refreshOrgs();

        setModal({
          isOpen: true,
          type: "success",
          title: "Exit Successful",
          message: "You have successfully left the organization."
        });
      } catch (err) {
        setModal({
          isOpen: true,
          type: "error",
          title: "Action Failed",
          message: err.message || "Membership record not found on server."
        });
      }
    }
  });
};

const checkLimit = async (email) => {
  // Only check if it's a valid-looking email to save server resources
  if (!email.includes('@') || !email.includes('.')) return;

  setIsCheckingLimit(true);
  try {
    const data = await checkUserOrgLimit(email); // This hits your new /check-limit endpoint
    setTargetLimitStatus(data);
  } catch (err) {
    console.error("Limit check failed", err);
  } finally {
    setIsCheckingLimit(false);
  }
};


const displayOrgName = currentOrg?.name || organizations?.[0]?.name || "Active organization";
const ownedOrg = organizations?.find(org => String(org.owner_id) === String(user?.id));

// This specifically tracks if the 'Founder Slot' (1/1) is filled
const hasOwnedOrg = !!ownedOrg;
const isViewingOthersOrg = currentOrg && currentOrg.owner_id !== user?.id;
// Add this right at the start of the currentOrg block
const isActualOwner = String(user?.id || "") === String(currentOrg?.owner_id || "");



  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-300 font-sans pb-20 antialiased">
      
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
        <div className="max-w-[1440px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <span className="text-zinc-100 font-medium text-[13px] tracking-tight">
              {currentOrg ? currentOrg.name : "Global admin"}
            </span>
            <div className="flex gap-8">
              {[
                { id: 'create', label: 'New challenge' },
                { id: 'review', label: 'Review work' },
                { id: 'archive', label: 'All challenges' },
                { id: 'organization', label: 'Organization' }
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

      <main className="max-w-[1440px] mx-auto p-6 lg:p-10">

              {activeTab === 'organization' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
                
                {hasOwnedOrg ? (
                

                    <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                      <header className="border-b border-zinc-800 pb-4 mb-6">
                        <h2 className="text-sm font-medium text-white tracking-tight">Your organization</h2>
                        <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                          You are currently managing one active organization.
                        </p>
                      </header>

                      <div className="bg-zinc-900/20 border border-zinc-800 p-5 rounded-sm flex items-center gap-5">
                        <div className="w-12 h-12 bg-zinc-900 flex items-center justify-center rounded-sm border border-zinc-800 shrink-0">
                          <svg className="w-6 h-6 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-white tracking-tight">
                              {displayOrgName}
                            </h3>
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800/50 border border-zinc-700/50">
                              <StarIcon active />
                              <span className="text-[10px] font-medium text-zinc-400">Level 1 entity</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[11px] text-zinc-500 font-medium tracking-tight">Verified and active</span>
                          </div>
                        </div>
                      </div>
                    </section>
                ) : (
                <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                  <header className="border-b border-zinc-800 pb-6">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-base font-medium text-white tracking-tight">Create your organization</h2>
                      <div className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 flex items-center gap-1.5">
                        <StarIcon active />
                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tight">Level 1</span>
                      </div>
                      
                      <button 
                        onClick={() => setShowWorkspaceNote(!showWorkspaceNote)}
                        className="text-zinc-500 hover:text-zinc-300 transition-colors"
                        title="View workspace info"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    </div>

                {showWorkspaceNote && (
                  <div className="mb-6 p-4 bg-zinc-900/40 border border-zinc-800 rounded-sm animate-in fade-in zoom-in-95 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      <div className="flex gap-3">
                        <div className="mt-1">
                          <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[12px] font-semibold text-zinc-200">Personal workspace</p>
                          <p className="text-[11px] text-zinc-500 leading-relaxed">
                            This is your default environment for sharing puzzles globally. Every challenge you post here is tied directly to your username and visible to the entire community.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="mt-1">
                          <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[12px] font-semibold text-zinc-200">Organization workspace</p>
                          <p className="text-[11px] text-zinc-500 leading-relaxed">
                            Use this secure hub for professional team assessments. Organizations allow you to create gated tests with <span className="text-zinc-300">6-digit access codes</span> to ensure only invited candidates can enter.
                          </p>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                    <p className="text-xs text-zinc-500 max-w-2xl leading-relaxed">
                      Your organization is a shared space where you can build your brand. Once created, you can invite your team of developers to collaborate on puzzles and start earning your community reputation.
                    </p>
                  </header>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-zinc-900/20 border border-zinc-800 p-5 space-y-4 rounded-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center">
                          <StarIcon active />
                        </div>
                        <h3 className="text-xs font-bold text-zinc-200 tracking-widest">Growth and stars</h3>
                      </div>
                      
                      <p className="text-[11px] text-zinc-500 leading-relaxed">
                        Every new community starts with 1 star. As you post active challenges and get great feedback from solvers, your rating grows. A <span className="text-amber-500 font-semibold">5-star rating</span> signals you as a top-tier industry leader.
                      </p>

                      <div className="border border-zinc-800/50 rounded-sm overflow-hidden">
                        <table className="w-full text-[10px] text-left">
                          <thead className="bg-zinc-800/30 text-zinc-500 font-medium">
                            <tr>
                              <th className="px-3 py-2">Milestone</th>
                              <th className="px-3 py-2">Rating</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/50 text-zinc-400">
                            <tr>
                              <td className="px-3 py-2 italic text-zinc-500">Just starting out</td>
                              <td className="px-3 py-2 flex gap-0.5"><StarIcon active /></td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 italic text-zinc-500">Trusted community</td>
                              <td className="px-3 py-2 flex gap-0.5"><StarIcon active /><StarIcon active /><StarIcon active /></td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 text-zinc-200 font-medium">Famous leader</td>
                              <td className="px-3 py-2 flex gap-0.5 text-amber-500">
                                <StarIcon active /><StarIcon active /><StarIcon active /><StarIcon active /><StarIcon active />
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="bg-zinc-900/20 border border-zinc-800 p-5 space-y-5 rounded-sm flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center">
                        <svg className="w-3 h-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                      <h3 className="text-[11px] font-bold text-zinc-200 tracking-widest uppercase">Better together</h3>
                    </div>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      Don't build alone! You can invite other developers to join your organization as members. Together, you can create harder puzzles, review submissions, and manage your community tests.
                    </p>

                    <div className="space-y-2 pt-2">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Naming best practices</p>
                      <div className="grid gap-1.5">
                        <div className="flex items-center gap-2 text-[10px]">
                          <svg className="w-3 h-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-zinc-500 font-medium">Build Your Logic (BYL)</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px]">
                          <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span className="text-zinc-500 italic">test_group_v1_123</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-amber-500/5 border border-amber-500/10 p-3 rounded-sm mt-4">
                    <p className="text-[10px] text-amber-600/80 italic leading-snug">
                      <strong>Important:</strong> Choose your name carefully. To keep the marketplace clean, you can only create one organization, and the name cannot be changed once it is set.
                    </p>
                  </div>
                </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 relative group">
                        <input 
                          type="text" 
                          value={newOrgName} 
                          disabled={isCreatingOrg}
                          onChange={(e) => setNewOrgName(e.target.value)}
                          placeholder="Give your organization a unique name..."
                          className={`w-full bg-[#09090b] border border-zinc-800 px-4 py-2.5 text-xs outline-none focus:border-zinc-600 placeholder:text-zinc-800 transition-all ${
                            isCreatingOrg ? "opacity-50 cursor-not-allowed" : "cursor-text"
                          }`}
                        />
                      </div>
                      
                      <button 
                        onClick={handleCreateOrg} 
                        disabled={isCreatingOrg || !newOrgName.trim()}
                        className={`relative px-8 py-2.5 bg-white text-black text-[11px] font-bold transition-all flex items-center justify-center gap-2 rounded-sm ${
                          isCreatingOrg || !newOrgName.trim()
                            ? "opacity-20 cursor-not-allowed bg-zinc-400" 
                            : "hover:bg-zinc-200 cursor-pointer active:scale-[0.98]"
                        }`}
                      >
                        {isCreatingOrg ? (
                          <>
                            <svg className="animate-spin h-3.5 w-3.5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="tracking-tight">Setting up...</span>
                          </>
                        ) : (
                          <>
                            <span className="tracking-tight">Create organization</span>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                          </>
                        )}
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2 text-[10px] text-zinc-600">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p>Double check the name. This is a permanent action and cannot be undone.</p>
                    </div>
                  </div>
                </section>
              )}


                {!isViewingOthersOrg && invites && invites.length > 0 && (
                  <section className="space-y-6 animate-in zoom-in-95 duration-500">
                    <header className="border-b border-zinc-800 pb-4 flex justify-between items-end">
                      <div>
                        <h2 className="text-sm font-medium text-amber-500">Pending Invitations</h2>
                        <p className="text-[11px] text-zinc-500 mt-1">Teams that want you to join their environment.</p>
                      </div>
                      <span className="text-[9px] font-mono text-amber-500/50 uppercase tracking-widest pb-1">{invites.length} Request(s)</span>
                    </header>

                    <div className="grid grid-cols-1 gap-2">
                      {invites.map((invite) => (
                        <div 
                          key={invite.org_id}
                          className="flex items-center justify-between p-5 border border-zinc-800 bg-[#0c0c0e] hover:border-amber-500/30 transition-all"
                        >
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-zinc-300">
                              {invite.org_name}
                            </p>
                            <p className="text-[10px] text-zinc-600 font-mono italic">
                              invited as <span className="text-amber-500/70">{invite.role}</span>
                            </p>
                          </div>
                          <div className="flex gap-3">
                            <button 
                              onClick={() => handleInviteAction(invite.org_id, 'accept')}
                              className="px-4 py-1.5 bg-zinc-100 text-black text-[10px] font-bold hover:bg-white transition-all"
                            >
                              Accept
                            </button>
                            <button 
                              onClick={() => handleInviteAction(invite.org_id, 'decline')}
                              className="px-4 py-1.5 border border-zinc-800 text-zinc-500 text-[10px] font-bold hover:text-zinc-300 hover:border-zinc-700 transition-all"
                            >
                              Ignore
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

               <section className="space-y-6 animate-in fade-in duration-700">
                  <header className="border-b border-zinc-800 pb-4">
                    <h2 className="text-sm font-medium text-white tracking-tight">Switch environment</h2>
                    <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                      Select your active workspace context to manage different challenge types.
                    </p>
                  </header>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      onClick={() => switchOrg(null)} 
                      className={`flex items-start justify-between p-4 border transition-all text-left rounded-sm group ${
                        !currentOrg 
                          ? 'bg-emerald-500/[0.03] border-emerald-500/30' 
                          : 'bg-zinc-900/10 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="space-y-1">
                        <p className={`text-xs font-medium ${!currentOrg ? 'text-emerald-400' : 'text-zinc-300'}`}>
                          Personal context
                        </p>
                        <p className="text-[10px] text-zinc-600 leading-snug max-w-[180px]">
                          Create public challenges tied to your individual profile.
                        </p>
                      </div>
                      
                      {!currentOrg && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                          <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-tighter">Selected</span>
                        </div>
                      )}
                    </button>

                    {organizations.map((org) => (
                      <button
                        key={org.id}
                        onClick={() => switchOrg(org)}
                        className={`flex items-start justify-between p-4 border transition-all text-left rounded-sm group ${
                          currentOrg?.id === org.id 
                            ? 'bg-emerald-500/[0.03] border-emerald-500/30' 
                            : 'bg-zinc-900/10 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="space-y-1">
                          <p className={`text-xs font-medium ${currentOrg?.id === org.id ? 'text-emerald-400' : 'text-zinc-300'}`}>
                            {org.name}
                          </p>
                          <p className="text-[10px] text-zinc-600 leading-snug max-w-[180px]">
                            Manage professional, gated assessments for this community.
                          </p>
                        </div>
                        
                        {currentOrg?.id === org.id && (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-tighter">Selected</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </section>

                {currentOrg && (
                  <div className="space-y-12 animate-in fade-in duration-500">
                    {isActualOwner && (
                      <section className="space-y-6">
                        <header className="border-b border-zinc-800 pb-4 flex justify-between items-end">
                          <div>
                            <h2 className="text-sm font-medium text-white">Manage {currentOrg.name}</h2>
                            <p className="text-[11px] text-zinc-500 mt-1">Invite creators and manage access levels for this community.</p>
                          </div>
                          {isCheckingLimit && (
                            <span className="text-[9px] font-mono text-zinc-500 animate-pulse pb-1">Verifying capacity...</span>
                          )}
                        </header>

                        <div className="space-y-4">
                          <div className="flex gap-4">
                            <input 
                              type="email" 
                              value={inviteEmail}
                              onChange={(e) => {
                                const email = e.target.value;
                                setInviteEmail(email);
                                if (!email) {
                                  setTargetLimitStatus(null);
                                  setShowCustomMessage(false);
                                  return;
                                }
                                checkLimit(email); // Trigger the peek
                              }}
                              placeholder="teammate@college.edu"
                              className="flex-1 bg-zinc-900/50 border border-zinc-700 px-4 py-2 text-xs outline-none focus:border-zinc-400 placeholder:text-zinc-700 transition-all"
                            />
                            
                            {!targetLimitStatus?.is_full && (
                              <button 
                                onClick={() => handleInvite('standard')} 
                                disabled={isCheckingLimit || !inviteEmail}
                                className="px-6 py-2 border border-zinc-600 text-[11px] font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
                              >
                                Invite admin
                              </button>
                            )}
                          </div>

                                              {targetLimitStatus?.is_full && (
                                                <div className="animate-in fade-in slide-in-from-top-2 duration-300 p-5 border border-amber-500/20 bg-amber-500/5 space-y-4 rounded-sm">
                                                  <div className="flex items-start gap-3">
                                                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                                                    <div className="space-y-1">
                                                      <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">
                                                        Membership conflict detected
                                                      </p>
                                                      <p className="text-[12px] text-zinc-400 leading-relaxed">
                                                        <span className="text-zinc-200 font-medium">{targetLimitStatus.username}</span> is already an active member of another organization. While they can receive your invite, they must leave their current workspace before they can join yours.
                                                      </p>
                                                    </div>
                                                  </div>

                                                  <div className="flex gap-3">
                                                    <button 
                                                      onClick={() => handleInvite('anyway')}
                                                      className="flex-1 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] font-bold hover:text-white hover:border-zinc-700 transition-all"
                                                    >
                                                      Send invitation anyway
                                                    </button>
                                                    <button 
                                                      onClick={() => setShowCustomMessage(!showCustomMessage)}
                                                      className={`flex-1 py-2 text-[10px] font-bold transition-all border ${
                                                        showCustomMessage 
                                                          ? 'bg-white text-black border-white' 
                                                          : 'bg-zinc-100/5 text-white border-zinc-800 hover:bg-zinc-100/10'
                                                      }`}
                                                    >
                                                      {showCustomMessage ? "Discard note" : "Add personal note"}
                                                    </button>
                                                  </div>

                                                  {showCustomMessage && (
                                                    <div className="animate-in zoom-in-95 duration-200 pt-2 space-y-3">
                                                      <div className="relative">
                                                        <textarea 
                                                          value={customMessage}
                                                          onChange={(e) => setCustomMessage(e.target.value)}
                                                          placeholder="Explain why they should join your logic arena..."
                                                          className="w-full bg-black border border-zinc-800 p-4 text-[11px] text-zinc-300 outline-none focus:border-zinc-600 min-h-[100px] resize-none leading-relaxed"
                                                        />
                                                        <div className="absolute top-0 right-0 p-2">
                                                          <span className="text-[9px] text-zinc-600 font-mono uppercase">Priority Note</span>
                                                        </div>
                                                      </div>
                                                      
                                                      <p className="text-[10px] text-zinc-500 italic px-1">
                                                        Direct messages increase the likelihood of a creator switching organizations.
                                                      </p>

                                                      <button 
                                                        onClick={() => handleInvite('with_message')}
                                                        className="w-full py-2.5 bg-white text-black text-[10px] font-bold hover:bg-zinc-200 transition-colors shadow-lg shadow-white/5"
                                                      >
                                                        Send priority invitation
                                                      </button>
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                        </div>
                      </section>
                    )}

                    <section className="space-y-6">
                      <header className="border-b border-zinc-800 pb-4 flex justify-between items-end">
                        <div>
                          <h2 className="text-sm font-medium text-white">Creator Directory</h2>
                          <p className="text-[11px] text-zinc-500 mt-1">Active and pending members within this environment.</p>
                        </div>
                        {loadingMembers && (
                          <span className="text-[9px] font-mono text-zinc-600 animate-pulse pb-1">Syncing...</span>
                        )}
                      </header>

                      <div className="border border-zinc-800 bg-[#0c0c0e] divide-y divide-zinc-800/50">
                        {orgMembers.map((member) => {
                          const orgOwnerId = String(currentOrg?.owner_id || "");
                          const loggedInUserId = String(user?.id || ""); 
                          const memberUserId = String(member?.user_id || "");

                          const isOwnerOfOrg = orgOwnerId !== "" && loggedInUserId !== "" && orgOwnerId === loggedInUserId;
                          const isSelf = loggedInUserId !== "" && memberUserId !== "" && memberUserId === loggedInUserId;
                          const isMemberTheOwner = orgOwnerId !== "" && memberUserId !== "" && memberUserId === orgOwnerId;

                          const statusLabel = member.status.charAt(0).toUpperCase() + member.status.slice(1);

                          return (
                            <div key={memberUserId} className="p-5 flex items-center justify-between group border-b border-zinc-800/50 last:border-0">
                              <div className="flex items-center gap-4">
                                <div className="w-8 h-8 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[10px] text-zinc-500 font-bold">
                                  {member.username?.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-zinc-200">{member.username}</span>
                                    {isMemberTheOwner && (
                                      <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold tracking-tighter">
                                        Owner
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-zinc-600 font-mono">{member.email}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-8">
                                <div className="text-right">
                                  <p className={`text-[9px] font-bold uppercase tracking-widest ${member.status === 'active' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                    {statusLabel}
                                  </p>
                                  {isSelf && !isOwnerOfOrg && (
                                    <p className="text-[9px] text-zinc-700 italic mt-0.5">Joined via invite</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-4">
                                  {isOwnerOfOrg && !isSelf && (
                                    <button 
                                      onClick={() => handleRemoveMember(memberUserId)}
                                      className="opacity-0 group-hover:opacity-100 text-[10px] text-zinc-500 hover:text-red-500 font-bold tracking-tighter transition-all"
                                    >
                                      Remove
                                    </button>
                                  )}

                                  {isSelf && !isOwnerOfOrg && (
                                    <button 
                                      onClick={() => handleLeaveOrg(currentOrg.id)}
                                      className="text-[10px] text-zinc-500 hover:text-red-500 font-bold tracking-tighter transition-all"
                                    >
                                      Leave Organization
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  </div>
                )}
              </div>
            )}

        
        {activeTab === 'create' && (
          <form className="max-w-[1440px] mx-auto space-y-16 animate-in fade-in slide-in-from-bottom-2 duration-500">
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
                    className="w-full bg-zinc-900/50 border border-zinc-700 rounded-none px-4 py-2.5 text-xs text-zinc-100 outline-none focus:border-zinc-400 transition-all placeholder:text-zinc-700" 
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
                    onChange={(e) => setFormData({...formData, total_time: parseInt(e.target.value) || 0})} 
                    className="w-24 bg-zinc-900/50 border border-zinc-700 rounded-none px-3 py-2.5 text-xs text-center text-zinc-100 outline-none focus:border-zinc-400 transition-all" 
                  />
                </div>
              </div>

             <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 bg-zinc-900/20 p-6 border border-zinc-800/50 items-center">
  
                {currentOrg ? (
                  <>
                    <div className="space-y-2 animate-in slide-in-from-left-2 duration-300">
                      <label className="text-[11px] font-medium text-zinc-300">Access pin</label>
                      <input 
                        type="text" 
                        maxLength={6}
                        value={formData.access_code}
                        onChange={(e) => setFormData({...formData, access_code: e.target.value.replace(/\D/g,'')})}
                        placeholder="000000"
                        className="w-full bg-zinc-950 border border-zinc-700 px-3 py-2 text-xs font-mono text-emerald-400 outline-none focus:border-zinc-500 transition-all placeholder:text-zinc-800"
                      />
                    </div>

                    <div className="lg:col-span-2 flex flex-col justify-center items-end text-right space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-zinc-200">
                          Part of {currentOrg.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 italic">
                        This assessment is managed by your community.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="col-span-full flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-zinc-300">
                          Personal lab
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500">This will be visible on the global hallway.</p>
                    </div>
                    
                    <div className="h-px flex-1 mx-12 bg-zinc-800/40 hidden md:block" />
                    
                    <div className="text-right">
                      <span className="text-[11px] text-zinc-500 italic">
                        Access: Open
                      </span>
                    </div>
                  </div>
                )}
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
                        className="w-full bg-transparent border-b border-zinc-800 rounded-none pb-2 text-sm text-zinc-100 outline-none focus:border-zinc-400 transition-all placeholder:text-zinc-800" 
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
                        className="w-full bg-[#0c0c0e] border border-zinc-700 rounded-none px-4 py-4 text-xs text-zinc-200 outline-none focus:border-zinc-500 transition-all custom-scrollbar resize-y min-h-[240px] whitespace-pre-wrap leading-relaxed placeholder:text-zinc-800/50" 
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
                                <span className="text-[9px] text-zinc-600 font-mono italic">Case 0{sIndex + 1}</span>
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
                                <textarea rows="4" value={s.explanation} onChange={(e) => handleTestCaseChange(qIndex, sIndex, 'samples', 'explanation', e.target.value)} placeholder="Describe logic..." className="w-full bg-[#0c0c0e] border border-zinc-700 rounded-none p-3 text-[11px] text-zinc-300 outline-none focus:border-zinc-500 transition-all custom-scrollbar whitespace-pre-wrap italic leading-relaxed placeholder:text-zinc-800" />
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
                                <span className="text-[9px] text-zinc-600 font-mono italic">Hidden 0{sIndex + 1}</span>
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

                      <div className="border border-zinc-800 bg-zinc-950/50">
                        <Editor
                          value={q.solution_code}
                          onValueChange={code => handleQuestionChange(qIndex, 'solution_code', code)}
                          highlight={code => highlight(code, languages.python)}
                          padding={20}
                          className="font-mono text-[13px] min-h-[300px] outline-none"
                          style={{ fontFamily: '"Fira Code", monospace', backgroundColor: 'transparent' }}
                        />
                      </div>

                      {dryRunResults[qIndex] && (() => {
                        const results = dryRunResults[qIndex].results || dryRunResults[qIndex].test_results || [];
                        const systemError = dryRunResults[qIndex].error || dryRunResults[qIndex].message;
                        const allPassed = results.length > 0 && results.every(res => res.passed);
                        const isCrash = !!systemError || results.some(res => res.status === "RUNTIME_ERROR");
                        const failedCases = results.filter(r => !r.passed);

                        return (
                          <div className="bg-[#09090b] border border-zinc-800 rounded-none animate-in fade-in slide-in-from-top-1 duration-400">
                            <div className="px-4 py-2 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
                              <span className="text-[11px] font-medium text-zinc-400">Verification log</span>
                              <span className={`text-[10px] font-mono px-2 py-0.5 border ${
                                allPassed ? 'text-emerald-500 border-emerald-900/30 bg-emerald-500/5' : 'text-red-500 border-red-900/30 bg-red-500/5'
                              }`}>
                                {allPassed ? 'All cases passed' : isCrash ? 'Execution error' : `${failedCases.length} errors found`}
                              </span>
                            </div>
                            <div className="divide-y divide-zinc-800/50 max-h-[500px] overflow-y-auto custom-scrollbar bg-black/10">
                              {systemError && (
                                <div className="p-4 bg-red-950/5">
                                  <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest block mb-2">Traceback</span>
                                  <pre className="text-[11px] font-mono text-zinc-400 whitespace-pre-wrap bg-black/40 p-4 border border-red-900/20">{systemError}</pre>
                                </div>
                              )}
                              {failedCases.map((res, idx) => (
                                <div key={idx} className="p-5 space-y-4">
                                  <span className="text-[10px] font-mono text-zinc-500 italic block">
                                    {res.is_public ? 'public' : 'hidden'} case {res.case || idx + 1} • Failed
                                  </span>
                                  <div className="bg-zinc-950 p-4 border-l border-red-900/40 space-y-3">
                                    <pre className="text-[11px] font-mono text-zinc-400"><span className="text-zinc-600">Input:</span> {res.input || 'N/A'}</pre>
                                    <div className="grid grid-cols-2 gap-4">
                                      <pre className="text-[11px] font-mono text-zinc-500"><span className="text-zinc-700">Expected:</span> {res.expected}</pre>
                                      <pre className="text-[11px] font-mono text-red-400"><span className="text-red-900">Actual:</span> {res.actual || "no output"}</pre>
                                    </div>
                                  </div>
                                </div>
                              ))}
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
                  className="flex-1 md:flex-none px-8 py-3 border border-zinc-600 text-[11px] font-medium text-zinc-200 hover:bg-zinc-800 transition-all disabled:opacity-30"
                >
                  {isSaving ? 'Saving...' : 'Save draft'}
                </button>
                <button 
                  type="button" 
                  disabled={isSaving}
                  onClick={(e) => handleSubmit(e, 'live')} 
                  className="flex-1 md:flex-none px-10 py-3 bg-white text-black text-[11px] font-bold hover:bg-zinc-200 transition-all disabled:opacity-30"
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
            <div className="bg-[#0c0c0e] border border-zinc-800 overflow-hidden">
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
                    <div className="col-span-3 text-zinc-500">{new Date(sub.submitted_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</div>
                    <div className="col-span-2 text-center text-[10px] text-zinc-400 italic capitalize">{sub.status}</div>
                    <div className="col-span-2 text-right">
                      <Link to={`/admin/review/${sub.slot_id}/${sub.student_id}`} className={`text-[11px] font-medium px-3 py-1 border transition-all ${sub.status === 'reviewed' ? 'text-zinc-500 border-zinc-800' : 'text-emerald-400 border-emerald-900/30 bg-emerald-500/5 hover:bg-emerald-500/10'}`}>
                        {sub.status === 'reviewed' ? 'Edit grade' : 'Review now'}
                      </Link>
                    </div>
                  </div>
                ))}
                {submissions.length === 0 && !loadingSubmissions && <div className="p-16 text-center text-zinc-500 text-xs italic">No pending submissions found.</div>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'archive' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <header>
              <h1 className="text-base font-medium text-zinc-100">
                {currentOrg ? `${currentOrg.name} archive` : "Global archive"}
              </h1>
              <p className="text-xs text-zinc-500 mt-1">Manage your active and draft assessment content.</p>
            </header>
            <div className="bg-[#0c0c0e] border border-zinc-800 overflow-hidden">
              <div className="grid grid-cols-12 bg-zinc-900/30 border-b border-zinc-800 px-6 py-3 text-[11px] font-medium text-zinc-500">
                <div className="col-span-2">Slot ID</div>
                <div className="col-span-4">Title</div>
                <div className="col-span-2 text-center">Status</div>
                <div className="col-span-1 text-center">Qs</div>
                <div className="col-span-3 text-right">Action</div>
              </div>
              <div className="divide-y divide-zinc-800/50">
                {challenges.map((ch) => (
                  <div key={ch.slot_id} className="grid grid-cols-12 px-6 py-4 items-center text-xs hover:bg-zinc-900/20 transition-colors">
                    <div className="col-span-2 text-zinc-400 font-mono">{ch.slot_id}</div>
                    <div className="col-span-4 text-zinc-200 truncate pr-4">{ch.title || 'Untitled'}</div>
                    <div className="col-span-2 text-center text-[10px] text-zinc-400 italic capitalize">{ch.status}</div>
                    <div className="col-span-1 text-center text-zinc-500">{ch.questions?.length || 0}</div>
                    <div className="col-span-3 flex justify-end gap-2">
                      {ch.status === "draft" && (
                        <button onClick={() => handleQuickPublish(ch.slot_id)} className="px-2.5 py-1 text-[11px] text-zinc-300 hover:text-white transition-all">Publish</button>
                      )}
                      <button onClick={() => handleEdit(ch.slot_id)} className="px-2.5 py-1 text-[11px] text-zinc-500 hover:text-zinc-200 transition-all">Edit</button>
                      <button onClick={() => handleDelete(ch.slot_id)} className="px-2.5 py-1 text-[11px] text-red-500 hover:text-red-400 transition-all">Delete</button>
                    </div>
                  </div>
                ))}
                {challenges.length === 0 && !loadingChallenges && <div className="p-16 text-center text-zinc-500 text-xs italic">Archive is empty.</div>}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const StarIcon = ({ active }) => (
    <svg 
      className={`w-2.5 h-2.5 ${active ? "text-amber-500" : "text-zinc-700"}`} 
      viewBox="0 0 24 24" 
      fill="currentColor"
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );

  StarIcon.propTypes = {
  active: PropTypes.bool // Explicitly declare that 'active' must be a boolean
};

// Set a default value for safety
StarIcon.defaultProps = {
  active: false
};