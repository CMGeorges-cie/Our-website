import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api/v1`;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cmgeorges_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('cmgeorges_token');
      localStorage.removeItem('cmgeorges_user');
      if (window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  getMe: () => api.get('/auth/me'),
};

// Public API
export const publicApi = {
  getServices: () => api.get('/services'),
  getPortfolio: () => api.get('/portfolio'),
  createLead: (data) => api.post('/leads', data),
};

// Admin API
export const adminApi = {
  // Leads
  getLeads: (params = {}) => api.get('/admin/leads', { params }),
  getLead: (id) => api.get(`/admin/leads/${id}`),
  updateLead: (id, data) => api.patch(`/admin/leads/${id}`, data),
  
  // Quotes
  getQuotes: (params = {}) => api.get('/admin/quotes', { params }),
  getQuote: (id) => api.get(`/admin/quotes/${id}`),
  createQuote: (data) => api.post('/admin/quotes', data),
  
  // Stats
  getStats: () => api.get('/admin/stats'),
};

// Seed API (dev)
export const seedDatabase = () => axios.post(`${BACKEND_URL}/api/seed`);

export default api;
