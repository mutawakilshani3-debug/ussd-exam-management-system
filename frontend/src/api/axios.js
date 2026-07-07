import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let refreshSubscribers = [];

function onRefreshed(newToken) {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
}

function logoutAndRedirect() {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    if (err.response?.status === 401 && !originalRequest._retry) {
      // Don't try to refresh if the failed request WAS the refresh call itself
      if (originalRequest.url?.includes('/auth/refresh')) {
        logoutAndRedirect();
        return Promise.reject(err);
      }

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        logoutAndRedirect();
        return Promise.reject(err);
      }

      originalRequest._retry = true;

      if (isRefreshing) {
        // Wait for the in-flight refresh to finish, then retry this request
        return new Promise((resolve) => {
          refreshSubscribers.push((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true;
      try {
        const { data } = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          { refreshToken }
        );
        localStorage.setItem('token', data.token);
        isRefreshing = false;
        onRefreshed(data.token);
        originalRequest.headers.Authorization = `Bearer ${data.token}`;
        return api(originalRequest);
      } catch (refreshErr) {
        isRefreshing = false;
        refreshSubscribers = [];
        logoutAndRedirect();
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(err);
  }
);

export default api;
