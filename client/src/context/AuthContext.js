import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { preloadRoute } from '../utils/routeLoaders';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('ns_token'));
  const [loading, setLoading] = useState(true);
  const verifiedToken = useRef(null);
  const workspaceCache = useRef(new Map());
  const [authError, setAuthError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const retryAuth = useCallback(() => setAttempt(value => value + 1), []);
  const [welcoming, setWelcoming] = useState(false);
  const finishWelcome = useCallback(() => setWelcoming(false), []);

  useEffect(() => {
    const controller = new AbortController();
    setAuthError(false);
    if (token && verifiedToken.current === token) {
      setLoading(false);
      return () => controller.abort();
    }
    if (token) {
      setLoading(true);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.get('/api/users/me', { timeout: 15000, signal: controller.signal })
        .then(r => { if (!controller.signal.aborted) { setUser(r.data); setLoading(false); } })
        .catch(error => {
          if (controller.signal.aborted) return;
          if (error.response?.status === 401) {
            localStorage.removeItem('ns_token');
            delete axios.defaults.headers.common['Authorization'];
            setToken(null);
            setUser(null);
            setLoading(false);
          } else {
            setAuthError(true);
          }
        });
    } else {
      setLoading(false);
    }
    return () => controller.abort();
  }, [token, attempt]);

  const login = (tok, userData) => {
    workspaceCache.current.clear();
    verifiedToken.current = tok;
    localStorage.setItem('ns_token', tok);
    axios.defaults.headers.common['Authorization'] = `Bearer ${tok}`;
    setToken(tok);
    setUser(userData);
    setLoading(false);
    setAuthError(false);
    setWelcoming(false);
    preloadRoute('/dashboard');
  };

  const logout = async ({ revoke = true } = {}) => {
    const active = localStorage.getItem('ns_token');
    const request = revoke && active ? axios.post('/api/auth/logout', null, {
      headers: { Authorization: `Bearer ${active}` }, timeout: 5000,
    }).then(() => true, error => error.response?.status === 401) : Promise.resolve(true);
    workspaceCache.current.clear();
    verifiedToken.current = null;
    localStorage.removeItem('ns_token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    setWelcoming(false);
    return request;
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, authError, retryAuth, setUser, welcoming, finishWelcome, workspaceCache }}>
      {children}
    </AuthContext.Provider>
  );
}
