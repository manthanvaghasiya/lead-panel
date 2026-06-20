import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.DEV ? 'http://localhost:5000/api' : '/_/backend/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
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
export const getLeadAiInsight = (id) => apiClient.get(`/leads/${id}/ai-insight`);
export const autoCleanLead = (id) => apiClient.post(`/leads/${id}/auto-clean`);
export const extractSocialProfiles = (id) => apiClient.post(`/leads/${id}/ai-social-extract`);
export const extractLeadFromText = (text, imageBase64, mimeType) => apiClient.post('/leads/ai-extract', { text, imageBase64, mimeType });
export const extractLogFromText = (text, imageBase64, mimeType) => apiClient.post('/leads/ai-extract-log', { text, imageBase64, mimeType });
export const deleteLead = (id) => apiClient.delete(`/leads/${id}`);

export default apiClient;
