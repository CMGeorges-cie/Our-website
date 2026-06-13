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
  // 2FA-aware login flow
  loginChallenge: (email, password) => api.post('/auth/login/challenge', { email, password }),
  loginVerify2FA: (challenge_token, code) => api.post('/auth/login/verify-2fa', { challenge_token, code }),
  // Password management
  changePassword: (current_password, new_password) => api.post('/auth/change-password', { current_password, new_password }),
  changeEmail: (current_password, new_email) => api.post('/auth/change-email', { current_password, new_email }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, new_password) => api.post('/auth/reset-password', { token, new_password }),
  // 2FA management
  get2FAStatus: () => api.get('/auth/2fa/status'),
  setup2FATotp: () => api.post('/auth/2fa/totp/setup'),
  activate2FATotp: (code) => api.post('/auth/2fa/totp/activate', { code }),
  activate2FAEmail: () => api.post('/auth/2fa/email/activate'),
  disable2FA: (current_password, code) => api.post('/auth/2fa/disable', { current_password, code }),
};

// Public API
export const publicApi = {
  getServices: () => api.get('/services'),
  getPortfolio: () => api.get('/portfolio'),
  getSocialPosts: () => api.get('/social-posts'),
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
  deleteProject: (id) => api.delete(`/admin/projects/${id}`),
  
  // Project Tasks
  createProjectTask: (projectId, data) => api.post(`/admin/projects/${projectId}/tasks`, data),
  updateProjectTask: (projectId, taskId, status) => api.patch(`/admin/projects/${projectId}/tasks/${taskId}`, null, { params: { status } }),
  deleteProjectTask: (projectId, taskId) => api.delete(`/admin/projects/${projectId}/tasks/${taskId}`),
  
  // Project Timeline
  addProjectTimeline: (projectId, eventType, description) => api.post(`/admin/projects/${projectId}/timeline`, null, { params: { event_type: eventType, description } }),
  
  // Project Report
  getProjectReport: (projectId) => api.get(`/admin/projects/${projectId}/report`, { responseType: 'blob' }),
  
  // Project Messaging
  getProjectMessages: (projectId) => api.get(`/admin/projects/${projectId}/messages`),
  sendProjectMessage: (projectId, content) => api.post(`/admin/projects/${projectId}/messages`, { content }),
  markProjectMessagesRead: (projectId) => api.patch(`/admin/projects/${projectId}/messages/mark-read`),
  getUnreadMessagesCount: () => api.get('/admin/messages/unread-count'),
  
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
  deleteLead: (id) => api.delete(`/admin/leads/${id}`),

  // Portfolio
  getPortfolio: (params = {}) => api.get('/admin/portfolio', { params }),
  createPortfolio: (data) => api.post('/admin/portfolio', data),
  updatePortfolio: (id, data) => api.patch(`/admin/portfolio/${id}`, data),
  deletePortfolio: (id) => api.delete(`/admin/portfolio/${id}`),

  // Social Media Posts
  getSocialPosts: (params = {}) => api.get('/admin/social-posts', { params }),
  createSocialPost: (data) => api.post('/admin/social-posts', data),
  updateSocialPost: (id, data) => api.patch(`/admin/social-posts/${id}`, data),
  deleteSocialPost: (id) => api.delete(`/admin/social-posts/${id}`),

  // Send by email
  sendInvoiceByEmail: (id) => api.post(`/admin/invoices/${id}/send-email`),
  sendQuoteByEmail: (id) => api.post(`/admin/quotes/${id}/send-email`),
  
  // Record payment
  recordPayment: (invoiceId, data) => api.post(`/admin/invoices/${invoiceId}/payments`, data),
  
  // Signatures
  addInvoiceSignature: (invoiceId, data) => api.post(`/admin/invoices/${invoiceId}/signature`, data),
  removeInvoiceSignature: (invoiceId) => api.delete(`/admin/invoices/${invoiceId}/signature`),
  addQuoteSignature: (quoteId, data) => api.post(`/admin/quotes/${quoteId}/signature`, data),
  
  // Send signature link by email (DocuSign style)
  sendInvoiceSignatureLink: (invoiceId) => api.post(`/admin/invoices/${invoiceId}/send-signature-link`),
  sendQuoteSignatureLink: (quoteId) => api.post(`/admin/quotes/${quoteId}/send-signature-link`),
  
  // Stats & Dashboard
  getStats: () => api.get('/admin/stats'),
  getCeoDashboard: () => api.get('/admin/ceo-dashboard'),
  getAuditLogs: (params = {}) => api.get('/admin/audit-logs', { params }),

  // Admin users management
  listUsers: () => api.get('/admin/users-list'),
  createUser: (data) => api.post('/admin/users-create', data),
  updateUser: (id, data) => api.patch(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),

  // Notifications
  getNotifications: (params = {}) => api.get('/admin/notifications', { params }),
  getUnreadCount: () => api.get('/admin/notifications/unread-count'),
  markNotificationRead: (id) => api.patch(`/admin/notifications/${id}/read`),
  markAllNotificationsRead: () => api.patch('/admin/notifications/mark-all-read'),
  deleteNotification: (id) => api.delete(`/admin/notifications/${id}`),
};

// Blog Public API
export const blogApi = {
  getPosts: (params = {}) => api.get('/blog', { params }),
  getPost: (slug) => api.get(`/blog/${slug}`),
  getCategories: () => api.get('/blog-categories'),
};

// Client Portal API
export const clientPortalApi = {
  register: (data) => api.post('/client/register', data),
  login: (email, password) => api.post('/client/login', { email, password }),
  getDashboard: () => api.get('/client/dashboard'),
  getProjects: () => api.get('/client/projects'),
  getInvoices: () => api.get('/client/invoices'),
  getProfile: () => api.get('/client/profile'),
  updateProfile: (data) => api.patch('/client/profile', data),
  payInvoice: (invoice_id) => api.post(`/pay/invoice/${invoice_id}`, { origin_url: window.location.origin }),
  getPaymentStatus: (session_id) => api.get(`/pay/status/${session_id}`),
};

// SaaS Plans API
export const saasApi = {
  getPlans: () => api.get('/saas/plans'),
  subscribe: (plan_id) => api.post('/saas/subscribe', { plan_id, origin_url: window.location.origin }),
  getCheckoutStatus: (session_id) => api.get(`/saas/checkout-status/${session_id}`),
  getMySubscription: () => api.get('/saas/subscription'),
};

// Seed API (dev)
export const seedDatabase = () => axios.post(`${BACKEND_URL}/api/seed`);

// AI drafting (Claude Sonnet 4.5) — admin only
export const aiApi = {
  draftQuote: (data) => api.post('/ai/draft-quote', data),
  draftInvoice: (data) => api.post('/ai/draft-invoice', data),
};

// V2 API instance (mobile-ready endpoints)
const apiV2 = axios.create({
  baseURL: `${BACKEND_URL}/api/v2`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to v2 requests
apiV2.interceptors.request.use((config) => {
  const token = localStorage.getItem('cmgeorges_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors for v2
apiV2.interceptors.response.use(
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

export { apiV2 };

export default api;
