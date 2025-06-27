import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://secure-audit-backend.onrender.com/api', // Backend API URL
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Log request for debugging
    console.log('API Request:', {
      url: config.url,
      method: config.method,
      data: config.data,
      headers: config.headers,
    });
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    // Log successful response for debugging
    console.log('API Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data,
    });
    return response;
  },
  (error) => {
    // Log error response for debugging
    console.error('API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      return Promise.reject(error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      return Promise.reject({ 
        message: 'Network error. Please check if the backend server is running at http://localhost:3001' 
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      return Promise.reject({ 
        message: 'An unexpected error occurred. Please try again.' 
      });
    }
  }
);

// Auth API endpoints
export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    api.post('/auth/login', credentials),

  register: (userData: { name: string; email: string; password: string }) =>
    api.post('/auth/register', userData),

  requestPasswordReset: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (data: { token: string; password: string }) =>
    api.post('/auth/reset-password', data),

  getCurrentUser: () =>
    api.get('/auth/me'),
};

// Contract Analysis API endpoints
export const contractApi = {
  analyzeContract: (data: { contractCode: string; options: any }) =>
    api.post('/contracts/analyze', data),

  getAnalysisResults: (analysisId: string) =>
    api.get(`/contracts/analysis/${analysisId}`),

  getAnalysisHistory: () =>
    api.get('/contracts/analysis/history'),
};

export default api; 