import axios from 'axios';

// Create an Axios instance that defaults to the deployed Render backend
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://url-shortener-ce08.onrender.com',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to inject Authorization JWT header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ziplink_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
