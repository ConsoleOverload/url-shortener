import axios from 'axios';

// Create an Axios instance that defaults to the deployed Render backend
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://url-shortener-ce08.onrender.com',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
