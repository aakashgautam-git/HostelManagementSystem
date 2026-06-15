import axios from 'axios';

// One axios instance for the whole app. Base URL points at the Django API.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
});

// Attach the JWT (saved at login) to every outgoing request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Helper that turns an axios error into a readable message for the UI.
export function apiError(err) {
  return err?.response?.data?.error || err?.message || 'Something went wrong';
}

export default api;
