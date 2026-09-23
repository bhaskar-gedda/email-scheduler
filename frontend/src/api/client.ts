import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // If 401 and not already on /login, let caller handle or redirect
    return Promise.reject(error);
  }
);

