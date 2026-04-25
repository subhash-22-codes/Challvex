const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:10000";

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };
};

// --- AUTH ---
export const loginUser = async (credentials) => {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Authentication failed");
  }
  return await response.json();
};

export const signupUser = async (userData) => {
  const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Registration failed");
  }
  return await response.json();
};

// NEW: Forgot Password Request
export const forgotPassword = async (email) => {
  const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to send reset link");
  }
  return await response.json();
};

// NEW: Reset Password Actual Update
export const resetPassword = async (token, newPassword) => {
  const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password: newPassword }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to reset password");
  }
  return await response.json();
};

// --- CHALLENGES ---
export const createDailyChallenge = async (challengeData) => {
  const response = await fetch(`${API_BASE_URL}/api/challenges`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(challengeData),
  });
  if (!response.ok) throw new Error("Failed to save challenge");
  return await response.json();
};

export const getAllChallenges = async (personal = false) => {
  const url = personal 
    ? `${API_BASE_URL}/api/challenges?personal=true` 
    : `${API_BASE_URL}/api/challenges`;

  const response = await fetch(url, {
    headers: getHeaders()
  });
  if (!response.ok) throw new Error("Failed to fetch challenges");
  return await response.json();
};

export const getChallengeBySlot = async (slotId) => {
  const response = await fetch(`${API_BASE_URL}/api/challenges/${slotId}`, {
    headers: getHeaders()
  });
  if (!response.ok) throw new Error("Challenge not found");
  return await response.json();
};

export const getLatestChallenge = async () => {
  const response = await fetch(`${API_BASE_URL}/api/challenges/latest`, {
    headers: getHeaders()
  });
  if (!response.ok) throw new Error("No challenges found");
  return await response.json();
};

export const updateChallengeStatus = async (slotId, status) => {
  const response = await fetch(`${API_BASE_URL}/api/challenges/${slotId}/status`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error("Failed to update status");
  return await response.json();
};

// --- SUBMISSIONS ---
export const getAllSubmissions = async (adminView = false) => {
  const url = adminView 
    ? `${API_BASE_URL}/api/submissions?admin_view=true` 
    : `${API_BASE_URL}/api/submissions`;

  const response = await fetch(url, {
    headers: getHeaders()
  });
  if (!response.ok) throw new Error("Failed to fetch submissions");
  return await response.json();
};

export const saveSubmission = async (submissionData) => {
  const response = await fetch(`${API_BASE_URL}/api/submissions`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(submissionData),
  });
  if (!response.ok) throw new Error("Failed to save submission");
  return await response.json();
};

export const getSubmissionBySlot = async (slotId) => {
  const response = await fetch(`${API_BASE_URL}/api/submissions/${slotId}`, {
    headers: getHeaders()
  });
  if (!response.ok) return null; 
  return await response.json();
};

export const getSubmissionByStudent = async (slotId, studentId) => {
  const response = await fetch(`${API_BASE_URL}/api/submissions/review/${slotId}/${studentId}`, {
    headers: getHeaders()
  });
  if (!response.ok) throw new Error("Failed to fetch submission for review");
  return await response.json();
};

export const updateSubmissionStatus = async (slotId, studentId, reviewData) => {
  const response = await fetch(`${API_BASE_URL}/api/submissions/review/${slotId}/${studentId}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(reviewData),
  });
  if (!response.ok) throw new Error("Failed to update review");
  return await response.json();
};

// --- JUDGE ---
export const runCode = async (executionData) => {
  const response = await fetch(`${API_BASE_URL}/api/judge`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(executionData),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Execution failed");
  }
  return await response.json();
};

export const discardSubmission = async (slotId) => {
  const response = await fetch(`${API_BASE_URL}/api/submissions/${slotId}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error("Failed to discard draft");
  return await response.json();
};

export const runAdminDryRun = async (payload) => {
  const response = await fetch(`${API_BASE_URL}/api/judge`, {
    method: "POST",
    headers: getHeaders(), 
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Judge execution failed");
  }
  return await response.json();
};

// Add this to your api/client.js
export const verifyUserOtp = async (email, otp) => {
  const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Verification failed");
  }
  return await response.json();
};