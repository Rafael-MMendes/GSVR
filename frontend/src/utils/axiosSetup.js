/**
 * axiosSetup.js
 * Configuração centralizada do Axios para interceptar requisições e respostas.
 * Implementa renovação automática e transparente de token JWT (Refresh Token) com fila de requisições.
 */
import axios from 'axios';
import { getApiUrl } from './apiConfig';

let isConfigured = false;
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export function setupAxios() {
  if (isConfigured) return;
  isConfigured = true;

  // Restaura token inicial se presente no localStorage
  const existingToken = localStorage.getItem('ft_access_token');
  if (existingToken) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${existingToken}`;
  }

  // Request Interceptor: anexa o token atual a qualquer chamada caso não esteja definido
  axios.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('ft_access_token');
      if (token && !config.headers['Authorization']) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response Interceptor: renovação transparente ao receber 401
  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      if (!error.response || !originalRequest) {
        return Promise.reject(error);
      }

      // Se for 401 e a requisição ainda não foi reprocessada
      if (error.response.status === 401 && !originalRequest._retry) {
        const url = originalRequest.url || '';

        // Não tenta refresh para rotas de autenticação
        if (
          url.includes('/login') ||
          url.includes('/auth/refresh') ||
          url.includes('/auth/logout') ||
          url.includes('/first-access')
        ) {
          return Promise.reject(error);
        }

        // Se uma renovação já estiver em andamento, enfileira
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
              return axios(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        const refreshToken = localStorage.getItem('ft_refresh_token');
        if (!refreshToken) {
          isRefreshing = false;
          localStorage.removeItem('ft_access_token');
          localStorage.removeItem('ft_refresh_token');
          localStorage.removeItem('ft_user');
          delete axios.defaults.headers.common['Authorization'];
          window.dispatchEvent(new CustomEvent('auth:logout'));
          return Promise.reject(error);
        }

        try {
          // Chama o endpoint de refresh utilizando uma nova instância ou config direta
          const res = await axios.post(
            `${getApiUrl()}/auth/refresh`,
            { refresh_token: refreshToken },
            { _retry: true }
          );

          const newAccessToken = res.data?.access_token;
          if (!newAccessToken) {
            throw new Error('Novo token não retornado pelo servidor.');
          }

          localStorage.setItem('ft_access_token', newAccessToken);
          axios.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

          processQueue(null, newAccessToken);
          return axios(originalRequest);
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          localStorage.removeItem('ft_access_token');
          localStorage.removeItem('ft_refresh_token');
          localStorage.removeItem('ft_user');
          delete axios.defaults.headers.common['Authorization'];
          window.dispatchEvent(new CustomEvent('auth:logout'));
          return Promise.reject(refreshErr);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    }
  );
}

// Inicializa automaticamente no momento da importação
setupAxios();

