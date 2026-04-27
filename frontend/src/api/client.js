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
  withAuth = true
) => {
  const token = getToken();

  return {
    "Content-Type": "application/json",
    ...(withAuth && token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
    ...customHeaders,
  };
};

const parseResponse = async (response) => {
  const contentType =
    response.headers.get("content-type") || "";

  if (
    contentType.includes(
      "application/json"
    )
  ) {
    return await response.json();
  }

  const text = await response.text();
  return text || null;
};

/* ----------------------------------
   CORE REQUEST WRAPPER
---------------------------------- */

const request = async (
  endpoint,
  {
    method = "GET",
    body = null,
    auth = true,
    headers = {},
  } = {}
) => {
  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      method,
      headers: getHeaders(
        headers,
        auth
      ),
      ...(body
        ? {
            body: JSON.stringify(
              body
            ),
          }
        : {}),
    }
  );

  const data =
    await parseResponse(response);

  /* ----------------------------
     ONLY Protected Routes:
     Expired / Invalid Session
  ---------------------------- */
  if (
    response.status === 401 &&
    auth === true
  ) {
    logoutUser();

    throw new Error(
      "Session expired. Please login again."
    );
  }

  /* ----------------------------
     Other API Errors
  ---------------------------- */
  if (!response.ok) {
    throw new Error(
      data?.detail ||
        data ||
        "Request failed"
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

export const createDailyChallenge =
  async (challengeData) =>
    request("/api/challenges", {
      method: "POST",
      body: challengeData,
    });

export const getAllChallenges =
  async (personal = false) =>
    request(
      personal
        ? "/api/challenges?personal=true"
        : "/api/challenges"
    );

export const getChallengeBySlot =
  async (slotId) =>
    request(
      `/api/challenges/${slotId}`
    );

export const getLatestChallenge =
  async () =>
    request(
      "/api/challenges/latest"
    );

export const updateChallengeStatus =
  async (
    slotId,
    status
  ) =>
    request(
      `/api/challenges/${slotId}/status`,
      {
        method: "PATCH",
        body: { status },
      }
    );

export const updateDailyChallenge = async (
  slotId,
  challengeData
) =>
  request(
    `/api/challenges/${slotId}`,
    {
      method: "PUT",
      body: challengeData,
    }
  );

export const deleteChallenge = async (
  slotId
) =>
  request(
    `/api/challenges/${slotId}`,
    {
      method: "DELETE",
    }
  );
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