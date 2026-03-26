import axios from 'axios';

// Asegúrate de definir NEXT_PUBLIC_API_URL en tu .env.local
const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('LC_AUTH_TOKEN');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

