// src/pages/jobseeker/services/api.js
import axios from 'axios';

const API_URL = (process.env.REACT_APP_API_URL || 'https://phinmaau-job-portal-atlas.onrender.com/api').replace(/\/$/, '');

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000,
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const authBlockCodes = [
      'ACCOUNT_UNAVAILABLE',
      'JOBSEEKER_PENDING_APPROVAL',
      'PENDING_ADMIN_APPROVAL',
    ];

    if (error?.code === 'ECONNABORTED') {
      error.userMessage = "The request took too long. Please try again.";
    } else if (!error?.response) {
      error.userMessage = "We couldn't connect to the server. Please try again.";
    } else if (error.response?.status >= 500) {
      error.userMessage = "Something went wrong on the server. Please try again.";
    }

    const requestHeaders = error.config?.headers || {};
    const hasAdminPasswordHeader = Boolean(
      requestHeaders['x-admin-password'] || requestHeaders['X-Admin-Password'],
    );
    const responseMessage = String(error.response?.data?.message || '').toLowerCase();
    const isAdminPasswordError =
      hasAdminPasswordHeader ||
      responseMessage.includes('incorrect admin password') ||
      responseMessage === 'incorrect password.' ||
      responseMessage === 'incorrect password';

    if (
      (error.response?.status === 401 && !isAdminPasswordError) ||
      (error.response?.status === 403 && authBlockCodes.includes(error.response?.data?.code))
    ) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // ✅ One login page for all roles
      window.location.href = '/login';
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);

export default api;
