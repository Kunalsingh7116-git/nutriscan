import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const navItems = [
  { to: '/dashboard', icon: '📊', label: 'Home' },
  { to: '/food-products', icon: '🍱', label: 'Foods' },
  { to: '/log-food', icon: '✏️', label: 'Log' },
  { to: '/alerts', icon: '🔔', label: 'Alerts' },
  { to: '/profile', icon: '👤', label: 'Profile' },
];

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
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>🥗 NutriScan</h1>
          <span>Smart Nutrition Tracking</span>
        </div>
        <nav style={{ flex: 1 }}>
          {navItems.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <span className="nav-icon">{icon}</span> {label === 'Home' ? 'Dashboard' : label === 'Foods' ? 'Food Products' : label}
              {to === '/alerts' && unreadCount > 0 && <span className="alert-badge">{unreadCount}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 10 }}>
            <div style={{ fontWeight: 700, color: 'var(--text-dim)' }}>{user?.name?.first} {user?.name?.last}</div>
            <div style={{ fontFamily: 'Space Mono', fontSize: '0.72rem' }}>{user?.email}</div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={handleLogout} style={{ width: '100%', justifyContent: 'center' }}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content" style={{ paddingBottom: 72 }}>
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        {navItems.map(({ to, icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}>
            <span className="mobile-nav-icon">
              {icon}
              {to === '/alerts' && unreadCount > 0 && (
                <span className="mobile-alert-dot">{unreadCount}</span>
              )}
            </span>
            <span className="mobile-nav-label">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
