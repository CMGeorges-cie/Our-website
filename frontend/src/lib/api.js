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
  convertLeadToClient: (id) => api.post(`/admin/leads/${id}/convert-to-client`),
  
  // Quotes
  getQuotes: (params = {}) => api.get('/admin/quotes', { params }),
  getQuote: (id) => api.get(`/admin/quotes/${id}`),
  createQuote: (data) => api.post('/admin/quotes', data),
  getQuotePdf: (id) => api.get(`/admin/quotes/${id}/pdf`, { responseType: 'blob' }),
  
  // Clients
  getClients: (params = {}) => api.get('/admin/clients', { params }),
  getClient: (id) => api.get(`/admin/clients/${id}`),
  createClient: (data) => api.post('/admin/clients', data),
  updateClient: (id, data) => api.patch(`/admin/clients/${id}`, data),
  createPortalAccess: (id) => api.post(`/admin/clients/${id}/portal-access`),
  
  // Invoices
  getInvoices: (params = {}) => api.get('/admin/invoices', { params }),
  getInvoice: (id) => api.get(`/admin/invoices/${id}`),
  createInvoice: (data) => api.post('/admin/invoices', data),
  updateInvoice: (id, data) => api.patch(`/admin/invoices/${id}`, data),
  addPayment: (id, data) => api.post(`/admin/invoices/${id}/payments`, data),
  getInvoicePdf: (id) => api.get(`/admin/invoices/${id}/pdf`, { responseType: 'blob' }),
  
  // Projects
  getProjects: (params = {}) => api.get('/admin/projects', { params }),
  getProject: (id) => api.get(`/admin/projects/${id}`),
  createProject: (data) => api.post('/admin/projects', data),
  updateProject: (id, data) => api.patch(`/admin/projects/${id}`, data),
  
  // Blog
  getBlogPosts: (params = {}) => api.get('/admin/blog', { params }),
  createBlogPost: (data) => api.post('/admin/blog', data),
  updateBlogPost: (id, data) => api.patch(`/admin/blog/${id}`, data),
  deleteBlogPost: (id) => api.delete(`/admin/blog/${id}`),
  
  // Discount Codes
  getDiscountCodes: (params = {}) => api.get('/admin/discount-codes', { params }),
  createDiscountCode: (data) => api.post('/admin/discount-codes', data),
  updateDiscountCode: (id, data) => api.patch(`/admin/discount-codes/${id}`, data),
  deleteDiscountCode: (id) => api.delete(`/admin/discount-codes/${id}`),
  
  // Pricing
  getPricingItems: (params = {}) => api.get('/admin/pricing', { params }),
  createPricingItem: (data) => api.post('/admin/pricing', data),
  updatePricingItem: (id, data) => api.patch(`/admin/pricing/${id}`, data),
  deletePricingItem: (id) => api.delete(`/admin/pricing/${id}`),
  
  // Policies
  getPolicies: (params = {}) => api.get('/admin/policies', { params }),
  createPolicy: (data) => api.post('/admin/policies', data),
  updatePolicy: (id, data) => api.patch(`/admin/policies/${id}`, data),
  deletePolicy: (id) => api.delete(`/admin/policies/${id}`),
  
  // Delete operations
  deleteClient: (id) => api.delete(`/admin/clients/${id}`),
  deleteInvoice: (id) => api.delete(`/admin/invoices/${id}`),
  deleteProject: (id) => api.delete(`/admin/projects/${id}`),
  deleteLead: (id) => api.delete(`/admin/leads/${id}`),

  // Send by email
  sendInvoiceByEmail: (id) => api.post(`/admin/invoices/${id}/send-email`),
  sendQuoteByEmail: (id) => api.post(`/admin/quotes/${id}/send-email`),
  
  // Stats & Dashboard
  getStats: () => api.get('/admin/stats'),
  getCeoDashboard: () => api.get('/admin/ceo-dashboard'),
  getAuditLogs: (params = {}) => api.get('/admin/audit-logs', { params }),
};

// Blog Public API
export const blogApi = {
  getPosts: (params = {}) => api.get('/blog', { params }),
  getPost: (slug) => api.get(`/blog/${slug}`),
  getCategories: () => api.get('/blog-categories'),
};

// Client Portal API
export const portalApi = {
  getAccessByToken: (token) => api.get(`/portal/access?token=${token}`),
  getData: (clientId, token) => api.get(`/portal/data/${clientId}?token=${token}`),
};

// Seed API (dev)
export const seedDatabase = () => axios.post(`${BACKEND_URL}/api/seed`);

export default api;
