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
   * Fetches the analysis history for the logged-in user.
   */
  getHistory: () => api.get("/analysis"),

  /**
   * Fetches the full details of a specific analysis by its ID.
   */
  getAnalysis: (analysisId: string) => api.get(`/analysis/${analysisId}`),
};
