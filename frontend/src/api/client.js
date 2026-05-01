const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:10000";

/* ----------------------------------
   LOCAL HELPERS
---------------------------------- */

const logoutUser = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");

  window.dispatchEvent(
    new Event("auth-logout")
  );
};

const getToken = () =>
  localStorage.getItem("token");

const getHeaders = (
  customHeaders = {},
  withAuth = true,
  body = null
) => {
  const token = getToken();

  return {
    ...(body ? { "Content-Type": "application/json" } : {}),
    ...(withAuth && token
      ? { Authorization: `Bearer ${token}` }
      : {}),
    ...customHeaders,
  };
};

const fetchWithTimeout = async (url, options, timeout = 10000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(
        "Server is taking longer than expected. Please try again."
      );
    }
    throw err;
  } finally {
    clearTimeout(id);
  }
};

const parseResponse = async (response) => {
  const contentType =
    response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return await response.json();
  }

  const text = await response.text();
  return text || null;
};

const request = async (
  endpoint,
  {
    method = "GET",
    body = null,
    auth = true,
    headers = {},
  } = {}
) => {
  let response;

  try {
    response = await fetchWithTimeout(
      `${API_BASE_URL}${endpoint}`,
      {
        method,
        headers: getHeaders(headers, auth, body),
        ...(body ? { body: JSON.stringify(body) } : {}),
      },
      10000
    );
  } catch (err) {
    console.error("Network error:", err);
    throw new Error(err.message || "Network error. Check your connection.");
  }

  const data = await parseResponse(response);

  if (response.status === 401 && auth === true) {
    logoutUser();
    throw new Error("Session expired. Please login again.");
  }

  if (!response.ok) {
    throw new Error(
      data?.detail || data || "Request failed"
    );
  }

  return data;
};
/* ----------------------------------
   AUTH
---------------------------------- */

export const loginUser = async (
  credentials
) =>
  request("/api/auth/login", {
    method: "POST",
    auth: false,
    body: credentials,
  });

export const signupUser = async (
  userData
) =>
  request("/api/auth/signup", {
    method: "POST",
    auth: false,
    body: userData,
  });

export const verifyUserOtp = async (
  email,
  otp
) =>
  request(
    "/api/auth/verify-otp",
    {
      method: "POST",
      auth: false,
      body: { email, otp },
    }
  );

export const forgotPassword =
  async (email) =>
    request(
      "/api/auth/forgot-password",
      {
        method: "POST",
        auth: false,
        body: { email },
      }
    );

export const resetPassword =
  async (
    token,
    newPassword
  ) =>
    request(
      "/api/auth/reset-password",
      {
        method: "POST",
        auth: false,
        body: {
          token,
          new_password:
            newPassword,
        },
      }
    );

/* ----------------------------------
   CHALLENGES
---------------------------------- */
// Create a new assessment
export const createDailyChallenge = async (challengeData) =>
  request("/api/challenges/", {
    method: "POST",
    body: challengeData,
  });

// Fetch assessments with optional filters
export const getAllChallenges = async (personal = false, orgId = null) => {
  const params = new URLSearchParams();
  
  // Only add parameters if they are active
  if (personal) params.append("personal", "true");
  if (orgId) params.append("org_id", orgId);

  const queryString = params.toString();
  // The trailing slash before the ? prevents the 307 redirect
  return request(`/api/challenges/${queryString ? `?${queryString}` : ""}`);
};

// Fetch a single assessment by its slot ID
export const getChallengeBySlot = async (slotId) =>
  request(`/api/challenges/${slotId}`);

// Fetch the most recent assessment
export const getLatestChallenge = async () =>
  request("/api/challenges/latest");

// Update the status (draft, live, etc.) of an assessment
export const updateChallengeStatus = async (slotId, status) =>
  request(`/api/challenges/${slotId}/status`, {
    method: "PATCH",
    body: { status },
  });

// Update the full content of an assessment
export const updateDailyChallenge = async (slotId, challengeData) =>
  request(`/api/challenges/${slotId}`, {
    method: "PUT",
    body: challengeData,
  });

// Permanently delete an assessment
export const deleteChallenge = async (slotId) =>
  request(`/api/challenges/${slotId}`, {
    method: "DELETE",
  });
/* ----------------------------------
   SUBMISSIONS
---------------------------------- */

export const getAllSubmissions =
  async (adminView = false) =>
    request(
      adminView
        ? "/api/submissions?admin_view=true"
        : "/api/submissions"
    );

export const saveSubmission =
  async (submissionData) =>
    request("/api/submissions", {
      method: "POST",
      body: submissionData,
    });

export const getSubmissionBySlot =
  async (slotId) => {
    try {
      return await request(
        `/api/submissions/${slotId}`
      );
    } catch {
      return null;
    }
  };

export const getSubmissionByStudent =
  async (
    slotId,
    studentId
  ) =>
    request(
      `/api/submissions/review/${slotId}/${studentId}`
    );

export const updateSubmissionStatus =
  async (
    slotId,
    studentId,
    reviewData
  ) =>
    request(
      `/api/submissions/review/${slotId}/${studentId}`,
      {
        method: "PUT",
        body: reviewData,
      }
    );

export const discardSubmission =
  async (slotId) =>
    request(
      `/api/submissions/${slotId}`,
      {
        method: "DELETE",
      }
    );

/* ----------------------------------
   JUDGE
---------------------------------- */

export const runCode = async (
  executionData
) =>
  request("/api/judge", {
    method: "POST",
    body: executionData,
  });

export const runAdminDryRun =
  async (payload) =>
    request("/api/judge", {
      method: "POST",
      body: payload,
    });

/* ----------------------------------
   ORGANIZATIONS
---------------------------------- */

export const createOrganization = async (name) =>
  request("/api/orgs/create", {
    method: "POST",
    body: { name }, // correct
  });

export const getMyOrganizations = async () => 
  request("/api/orgs/my-organizations");

export const inviteMember = async (orgId, payload) =>
  request(`/api/orgs/${orgId}/invite`, {
    method: "POST",
    body: payload, // This now carries the email, type, and note
  });

export const checkUserOrgLimit = async (email) =>
  request(`/api/orgs/check-limit/${email}`, {
    method: "GET",
  });
  
export const respondToInvite = async (orgId, action) =>
  request(`/api/orgs/invites/respond?org_id=${orgId}&action=${action}`, {
    method: "POST",
  });

export const getPendingInvites = async () => 
  request("/api/orgs/invites/pending");

export const getOrgMembers = async (orgId) => {
  console.log(`[DEBUG] API CALL: Fetching members for Org ID: ${orgId}`);
  
  try {
    // Calling the route we created in Step 1
    const response = await request(`/api/orgs/${orgId}/members`);
    
    console.log(`[DEBUG] API SUCCESS: Received ${response?.length || 0} members for Org: ${orgId}`);
    return response;
  } catch (error) {
    console.error(`[DEBUG] API ERROR in getOrgMembers:`, error);
    throw error; // Re-throw so the UI can handle the error state
  }
};

// Remove a member from an organization
export const removeOrgMember = async (orgId, userId) =>
  request(`/api/orgs/${orgId}/members/${userId}`, {
    method: "DELETE",
  });

  export const leaveOrganization = async (orgId) =>
  request(`/api/orgs/${orgId}/leave`, {
    method: "DELETE",
  });
/* ----------------------------------
   GATEKEEPER (Access Control)
---------------------------------- */

export const verifyChallengeAccess = async (slotId, accessCode) =>
  request(`/api/submissions/challenges/${slotId}/verify-access`, {
    method: "POST",
    body: { access_code: accessCode },
  });