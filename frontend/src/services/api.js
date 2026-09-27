import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    } else if (error.response?.status === 403) {
      toast.error('You do not have permission to perform this action.');
    } else if (error.response?.status === 503) {
      toast.error(error.response?.data?.detail || 'Service temporarily unavailable.');
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  getMe: () => api.get('/auth/me'),
  register: data => api.post('/auth/register', data),
};

export const participantsAPI = {
  list: params => api.get('/participants', { params }),
  get: id => api.get(`/participants/${id}`),
  create: data => api.post('/participants', data),
  update: (id,data) => api.put(`/participants/${id}`, data),
  getNotes: id => api.get(`/participants/${id}/notes`),
  addNote: (id,data) => api.post(`/participants/${id}/notes`, data),
};

export const assessmentsAPI = {
  create: data => api.post('/assessments', data),
  predict: id => api.post(`/assessments/${id}/predict`),
  get: id => api.get(`/assessments/${id}`),
  getForParticipant: id => api.get(`/assessments/participant/${id}`),
  getSHAP: id => api.get(`/assessments/${id}/shap`),
  submitReview: (id,data) => api.post(`/assessments/${id}/review`, data),
};

export const interventionsAPI = {
  getForParticipant: id => api.get(`/participants/${id}/interventions`),
  create: (id,data) => api.post(`/participants/${id}/interventions`, data),
  update: (id,data) => api.put(`/interventions/${id}`, data),
};

export const modelAPI = {
  getPerformance: () => api.get('/model/performance'),
  getGlobalExplanations: () => api.get('/model/global-explanations'),
  getFairness: () => api.get('/model/fairness'),
  getVersion: () => api.get('/model/version'),
};

export const usersAPI = {
  list: () => api.get('/users'),
  get: id => api.get(`/users/${id}`),
  update: (id,data) => api.put(`/users/${id}`,data),
  getDashboardStats: () => api.get('/users/dashboard/stats'),
};

export const auditAPI = { list: params => api.get('/audit-logs', { params }) };

export const reportsAPI = {
  downloadPDF: assessmentId => api.get(`/reports/${assessmentId}/pdf`, { responseType:'blob' }),
  summary: () => api.get('/reports/summary'),
};

export default api;
