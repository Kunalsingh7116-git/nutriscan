import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 20000 });

api.interceptors.request.use(cfg => {
  // Photo analysis can legitimately take longer than ordinary data requests.
  if (cfg.url?.startsWith('/meal-scan')) cfg.timeout = 90000;
  return cfg;
});

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('ns_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export default api;
