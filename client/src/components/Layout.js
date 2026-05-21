import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    api.get('/alerts').then(r => {
      setUnreadCount(r.data.filter(a => a.status === 'Unread').length);
    }).catch(() => {});
    const iv = setInterval(() => {
      api.get('/alerts').then(r => setUnreadCount(r.data.filter(a => a.status === 'Unread').length)).catch(() => {});
    }, 30000);
    return () => clearInterval(iv);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>🥗 NutriScan</h1>
          <span>Smart Nutrition Tracking</span>
        </div>
        <nav style={{ flex: 1 }}>
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <span className="nav-icon">📊</span> Dashboard
          </NavLink>
          <NavLink to="/food-products" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <span className="nav-icon">🍱</span> Food Products
          </NavLink>
          <NavLink to="/log-food" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <span className="nav-icon">✏️</span> Log Food
          </NavLink>
          <NavLink to="/alerts" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <span className="nav-icon">🔔</span> Alerts
            {unreadCount > 0 && <span className="alert-badge">{unreadCount}</span>}
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <span className="nav-icon">👤</span> Profile
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 10 }}>
            <div style={{ fontWeight: 700, color: 'var(--text-dim)' }}>
              {user?.name?.first} {user?.name?.last}
            </div>
            <div style={{ fontFamily: 'Space Mono', fontSize: '0.72rem' }}>{user?.email}</div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={handleLogout} style={{ width: '100%', justifyContent: 'center' }}>
            Sign Out
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
