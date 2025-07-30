import axios from 'axios';
import { toast } from 'react-toastify';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
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

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const message = error.response?.data?.message || error.message || 'An error occurred';
    
    // Don't show toast for certain errors (like 404s for optional data)
    const shouldShowToast = !error.config?.skipErrorToast;
    
    if (shouldShowToast) {
      if (error.response?.status === 401) {
        toast.error('Unauthorized access');
        // Handle logout if needed
      } else if (error.response?.status >= 500) {
        toast.error('Server error occurred');
      } else {
        toast.error(message);
      }
    }
    
    return Promise.reject(error);
  }
);

// Client API functions
export const clientApi = {
  // Get all clients with filtering
  getClients: (params = {}) => 
    api.get('/clients', { params }),
  
  // Get single client by ID
  getClient: (id) => 
    api.get(`/clients/${id}`),
  
  // Create new client
  createClient: (data) => 
    api.post('/clients', data),
  
  // Update client
  updateClient: (id, data) => 
    api.put(`/clients/${id}`, data),
  
  // Delete client
  deleteClient: (id) => 
    api.delete(`/clients/${id}`),
  
  // Get high-risk clients
  getHighRiskClients: (threshold = 70) => 
    api.get('/clients/high-risk', { params: { threshold } }),
  
  // Update client risk score
  updateRiskScore: (id) => 
    api.put(`/clients/${id}/risk-score`),
  
  // Get client statistics
  getClientStats: () => 
    api.get('/clients/stats'),
};

// Message API functions
export const messageApi = {
  // Generate message content
  generateMessage: (data) => 
    api.post('/messages/generate', data),
  
  // Send message to client
  sendMessage: (data) => 
    api.post('/messages/send', data),
  
  // Send bulk messages
  bulkSendMessages: (data) => 
    api.post('/messages/bulk-send', data),
  
  // Get all messages
  getMessages: (params = {}) => 
    api.get('/messages', { params }),
  
  // Get client messages
  getClientMessages: (clientId, params = {}) => 
    api.get(`/messages/client/${clientId}`, { params }),
  
  // Update message status
  updateMessageStatus: (id, data) => 
    api.put(`/messages/${id}/status`, data),
  
  // Send automated reminder
  sendAutomatedReminder: (clientId) => 
    api.post(`/messages/client/${clientId}/reminder`),
  
  // Get message statistics
  getMessageStats: (params = {}) => 
    api.get('/messages/stats', { params }),
};

// Payment API functions
export const paymentApi = {
  // Get all payments
  getPayments: (params = {}) => 
    api.get('/payments', { params }),
  
  // Get single payment
  getPayment: (id) => 
    api.get(`/payments/${id}`),
  
  // Create new payment
  createPayment: (data) => 
    api.post('/payments', data),
  
  // Update payment
  updatePayment: (id, data) => 
    api.put(`/payments/${id}`, data),
  
  // Mark payment as paid
  markPaymentAsPaid: (id, data) => 
    api.put(`/payments/${id}/mark-paid`, data),
  
  // Delete payment
  deletePayment: (id) => 
    api.delete(`/payments/${id}`),
  
  // Get overdue payments
  getOverduePayments: (clientId = null) => 
    api.get('/payments/overdue', { params: clientId ? { clientId } : {} }),
  
  // Get client payments
  getClientPayments: (clientId, params = {}) => 
    api.get(`/payments/client/${clientId}`, { params }),
  
  // Get payment statistics
  getPaymentStats: () => 
    api.get('/payments/stats/summary'),
};

// Dashboard API functions
export const dashboardApi = {
  // Get dashboard statistics
  getDashboardStats: () => 
    api.get('/dashboard/stats'),
  
  // Update all risk scores
  updateAllRiskScores: () => 
    api.post('/risk/update-all'),
};

// LLM API functions
export const llmApi = {
  // Generate message using direct endpoint
  generateMessage: (data) => 
    api.post('/generate-message', data),
};

// Utility function to handle API errors
export const handleApiError = (error, defaultMessage = 'An error occurred') => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.response?.data?.errors) {
    return error.response.data.errors.join(', ');
  }
  return error.message || defaultMessage;
};

// Utility function to format API response
export const formatApiResponse = (response) => {
  return {
    success: response.data.success,
    data: response.data.data,
    message: response.data.message,
    pagination: response.data.pagination,
  };
};

// Export the axios instance for direct use if needed
export default api;