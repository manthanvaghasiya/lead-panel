import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:5000/api', // TODO: Make this an env var for production
  headers: {
    'Content-Type': 'application/json'
  }
});

export const getLeads = () => apiClient.get('/leads');
export const getLead = (id) => apiClient.get(`/leads/${id}`);
export const createLead = (data) => apiClient.post('/leads', data);
export const updateLead = (id, data) => apiClient.patch(`/leads/${id}`, data);
export const addCallLog = (id, data) => apiClient.post(`/leads/${id}/call-logs`, data);
export const getLeadAiInsight = (id) => apiClient.get(`/leads/${id}/ai-insight`);
export const extractLeadFromText = (text, imageBase64, mimeType) => apiClient.post('/leads/ai-extract', { text, imageBase64, mimeType });
export const extractLogFromText = (text, imageBase64, mimeType) => apiClient.post('/leads/ai-extract-log', { text, imageBase64, mimeType });
export const deleteLead = (id) => apiClient.delete(`/leads/${id}`);

export default apiClient;
