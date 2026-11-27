import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('ns_token'));
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const retryAuth = useCallback(() => setAttempt(value => value + 1), []);
  const [welcoming, setWelcoming] = useState(false);
  const finishWelcome = useCallback(() => setWelcoming(false), []);

  useEffect(() => {
    const controller = new AbortController();
    setAuthError(false);
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
    localStorage.setItem('ns_token', tok);
    axios.defaults.headers.common['Authorization'] = `Bearer ${tok}`;
    setToken(tok);
    setUser(userData);
    setWelcoming(true);
  };

  const logout = () => {
    localStorage.removeItem('ns_token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    setWelcoming(false);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, authError, retryAuth, setUser, welcoming, finishWelcome }}>
      {children}
    </AuthContext.Provider>
  );
}
