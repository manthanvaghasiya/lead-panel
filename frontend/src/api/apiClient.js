import axios from 'axios';

const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }
  return import.meta.env.DEV ? 'http://localhost:5000/api' : '/api';
};

const apiClient = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true, // Sends HttpOnly SameSite=Strict session cookies securely
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    // If an API route fell back to SPA index.html, reject instead of returning raw HTML
    const contentType = response.headers?.['content-type'] || '';
    if (
      typeof response.data === 'string' &&
      (contentType.includes('text/html') || response.data.trim().startsWith('<!doctype html') || response.data.trim().startsWith('<html'))
    ) {
      const err = new Error(`API endpoint ${response.config.url} returned HTML instead of JSON. Check API baseURL or deployment routing.`);
      err.response = response;
      return Promise.reject(err);
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Optional: Handle token expiration globally
      // localStorage.removeItem('token');
      // window.location.href = '/login';
    }
    console.error('API Client Error Response Data:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);


export const getLeads = () => apiClient.get('/leads');
export const getLead = (id) => apiClient.get(`/leads/${id}`);
export const createLead = (data) => apiClient.post('/leads', data);
export const bulkImportLeads = (data) => apiClient.post('/leads/bulk-import', data);
export const updateLead = (id, data) => apiClient.patch(`/leads/${id}`, data);
export const addCallLog = (id, data) => apiClient.post(`/leads/${id}/call-logs`, data);
export const updateCallLog = (id, logId, data) => apiClient.put(`/leads/${id}/call-logs/${logId}`, data);
export const deleteCallLog = (id, logId) => apiClient.delete(`/leads/${id}/call-logs/${logId}`);
export const getLeadAiInsight = (id) => apiClient.get(`/leads/${id}/ai-insight`);
export const autoCleanLead = (id) => apiClient.post(`/leads/${id}/auto-clean`);
export const extractSocialProfiles = (id) => apiClient.post(`/leads/${id}/ai-social-extract`);
export const extractLeadFromText = (text, imageBase64, mimeType) => apiClient.post('/leads/ai-extract', { text, imageBase64, mimeType });
export const extractLogFromText = (text, imageBase64, mimeType) => apiClient.post('/leads/ai-extract-log', { text, imageBase64, mimeType });
export const deleteLead = (id) => apiClient.delete(`/leads/${id}`);

export const getSettings = () => apiClient.get('/settings');
export const updateSettings = (data) => apiClient.put('/settings', data);

// LinkedIn Endpoints
export const getLinkedInContacts = (params) => apiClient.get('/linkedin', { params });
export const getLinkedInStats = () => apiClient.get('/linkedin/stats');
export const getLinkedInContact = (id) => apiClient.get(`/linkedin/${id}`);
export const createLinkedInContact = (data) => apiClient.post('/linkedin', data);
export const updateLinkedInContact = (id, data) => apiClient.patch(`/linkedin/${id}`, data);
export const deleteLinkedInContact = (id) => apiClient.delete(`/linkedin/${id}`);
export const extractLinkedInData = (text) => apiClient.post('/linkedin/extract', { text });
export const convertLinkedInToLead = (id) => apiClient.post(`/linkedin/${id}/convert-to-lead`);
export const smartUpdateLinkedInContact = (id, prompt) => apiClient.post(`/linkedin/${id}/smart-update`, { prompt });
export const getLinkedInBackup = () => apiClient.get('/linkedin/backup');
export const restoreLinkedInBackup = (data) => apiClient.post('/linkedin/restore', data);

export default apiClient;
