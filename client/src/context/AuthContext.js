import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('ns_token'));
  const [loading, setLoading] = useState(true);
  const [welcoming, setWelcoming] = useState(false);
  const finishWelcome = useCallback(() => setWelcoming(false), []);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.get('/api/users/me')
        .then(r => setUser(r.data))
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

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
    <AuthContext.Provider value={{ user, token, login, logout, loading, setUser, welcoming, finishWelcome }}>
      {children}
    </AuthContext.Provider>
  );
}
