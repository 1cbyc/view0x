import axios from "axios";

// Create a single, configured Axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api", // Use relative path for proxy
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to automatically add the JWT token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Add a response interceptor for centralized error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Return the more detailed error object from the backend if it exists
    if (error.response && error.response.data) {
      return Promise.reject(error.response.data);
    }
    // Otherwise, return a generic error
    return Promise.reject(error);
  },
);

// --- Authentication API Endpoints ---
export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    api.post("/auth/login", credentials),

  register: (userData: {
    name: string;
    email: string;
    password: string;
    company?: string;
  }) => api.post("/auth/register", userData),

  getCurrentUser: () => api.get("/auth/me"),

  updateProfile: (userData: { name?: string; company?: string; avatar?: string }) =>
    api.put("/users/profile", userData),

  resendVerification: (email: string) =>
    api.post("/auth/resend-verification", { email }),
};

// --- Analysis API Endpoints ---
export const analysisApi = {
  /**
   * Creates a new analysis job for an authenticated user.
   * This endpoint initiates the background job and returns the analysis ID.
   */
  createAnalysis: (data: { contractCode: string; options?: any }) =>
    api.post("/analysis", data),

  /**
   * Public analysis endpoint (no authentication required).
   * Returns synchronous results without WebSocket updates.
   */
  createPublicAnalysis: (data: { contractCode: string; options?: any }) =>
    api.post("/analysis/public", data),

  /**
   * Fetches the analysis history for the logged-in user.
   */
  getHistory: (page?: number, limit?: number) => 
    api.get("/analysis", { params: { page, limit } }),

  /**
   * Fetches the full details of a specific analysis by its ID.
   */
  getAnalysis: (analysisId: string) => api.get(`/analysis/${analysisId}`),

  /**
   * Generates a report for an analysis in the specified format.
   */
  generateReport: (analysisId: string, options: { format: string; includeCode?: boolean; includeRecommendations?: boolean; includeMetadata?: boolean }) => 
    api.post(`/analysis/${analysisId}/report`, options, { responseType: 'blob' }),

  /**
   * Generates a share token for an analysis (creates public link).
   */
  generateShareToken: (analysisId: string) =>
    api.post(`/analysis/${analysisId}/share`),

  /**
   * Revokes the share token for an analysis.
   */
  revokeShareToken: (analysisId: string) =>
    api.delete(`/analysis/${analysisId}/share`),

  /**
   * Gets a public analysis by share token (no auth required).
   */
  getPublicAnalysis: (token: string) =>
    api.get(`/analysis/public/${token}`),

  /**
   * Toggles favorite status for an analysis.
   */
  toggleFavorite: (analysisId: string) =>
    api.patch(`/analysis/${analysisId}/favorite`),
};

// --- Vulnerability Comments API Endpoints ---
export const vulnerabilityApi = {
  /**
   * Creates a comment on a vulnerability.
   */
  createComment: (vulnerabilityId: string, data: { comment: string; lineNumber?: number }) =>
    api.post(`/vulnerabilities/${vulnerabilityId}/comments`, data),

  /**
   * Gets all comments for a vulnerability.
   */
  getComments: (vulnerabilityId: string) =>
    api.get(`/vulnerabilities/${vulnerabilityId}/comments`),

  /**
   * Updates a comment.
   */
  updateComment: (commentId: string, data: { comment: string }) =>
    api.put(`/vulnerabilities/comments/${commentId}`, data),

  /**
   * Deletes a comment.
   */
  deleteComment: (commentId: string) =>
    api.delete(`/vulnerabilities/comments/${commentId}`),
};
