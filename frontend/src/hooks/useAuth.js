/**
 * useAuth — Hook centralizado de autenticação JWT com RBAC.
 * Persiste o access_token no localStorage e gerencia o refresh automático.
 */
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';
const ACCESS_TOKEN_KEY = 'ft_access_token';
const REFRESH_TOKEN_KEY = 'ft_refresh_token';
const USER_KEY = 'ft_user';

// Configura o axios para enviar o JWT em todas as requisições
function setAxiosToken(token) {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
}

export function useAuth() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  // Recupera o token do localStorage e configura o axios na inicialização
  useEffect(() => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) setAxiosToken(token);
  }, []);

  const login = useCallback(async (numero_ordem, password) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/login`, { numero_ordem, cpf: password, password });
      const { access_token, refresh_token, user: userData } = res.data;

      localStorage.setItem(ACCESS_TOKEN_KEY, access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      setAxiosToken(access_token);
      setUser(userData);
      return { success: true, user: userData };
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.error || 'Credenciais inválidas.';
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (refreshToken) {
        await axios.post(`${API_URL}/auth/logout`, { refresh_token: refreshToken });
      }
    } catch (_) { /* silencioso */ } finally {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setAxiosToken(null);
      setUser(null);
    }
  }, []);

  const refreshToken = useCallback(async () => {
    const raw = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!raw) return false;
    try {
      const res = await axios.post(`${API_URL}/auth/refresh`, { refresh_token: raw });
      const { access_token } = res.data;
      localStorage.setItem(ACCESS_TOKEN_KEY, access_token);
      setAxiosToken(access_token);
      return true;
    } catch {
      logout();
      return false;
    }
  }, [logout]);

  /**
   * Verifica se o usuário tem TODAS as permissões solicitadas.
   * @param {...string} perms - códigos de permissão (ex: 'usuarios:admin', 'efetivo:read')
   */
  const hasPermission = useCallback((...perms) => {
    if (!user) return false;
    // Admin legado tem acesso total
    if (user.is_admin && (!user.permissions || user.permissions.length === 0)) return true;
    return perms.every(p => user.permissions?.includes(p));
  }, [user]);

  /**
   * Verifica se o usuário tem algum dos roles listados.
   * @param {...string} roles - ex: 'ADMIN', 'GERENTE'
   */
  const hasRole = useCallback((...roles) => {
    if (!user) return false;
    return roles.some(r => user.roles?.includes(r));
  }, [user]);

  return { user, loading, login, logout, refreshToken, hasPermission, hasRole, isAuthenticated: !!user };
}
