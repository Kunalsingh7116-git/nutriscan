import { useEffect, useLayoutEffect, useState } from 'react';
import { Outlet, NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, BookOpen, Camera, LayoutGrid, LogOut, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import Brand from './Brand';

const navItems = [
  { to: '/dashboard', Icon: LayoutGrid, label: 'Overview' },
  { to: '/log-food', Icon: Camera, label: 'Food log' },
  { to: '/food-products', Icon: BookOpen, label: 'Food library' },
  { to: '/alerts', Icon: Bell, label: 'Alerts' },
  { to: '/profile', Icon: UserRound, label: 'Profile' },
];

export default function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const activeTab = Math.max(0, navItems.findIndex(item => pathname === item.to || pathname.startsWith(item.to + '/')));

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  useEffect(() => {
    const refreshAlerts = () => api.get('/alerts')
      .then(({ data }) => setUnreadCount(data.filter(alert => alert.status === 'Unread').length))
      .catch(() => {});
    refreshAlerts();
    window.addEventListener('nutriscan:alerts-updated', refreshAlerts);
    const interval = setInterval(refreshAlerts, 30000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('nutriscan:alerts-updated', refreshAlerts);
    };
  }, [pathname]);

  return (
    <div className="app-layout">
      <main className="main-content">
        <header className="workspace-header">
          <div className="app-bar">
            <Link className="brand-link" to="/dashboard"><Brand /></Link>
            <button type="button" className="icon-button app-signout" aria-label="Sign out" title="Sign out"
              onClick={() => { logout(); navigate('/login'); }}><LogOut size={18} /></button>
          </div>
        </header>
        <div key={pathname} className="route-scene"><Outlet /></div>
      </main>
      <nav className="mobile-bottom-nav" aria-label="Main navigation">
        <div className="nav-track">
          <span className="nav-active-indicator" style={{ '--active-tab': activeTab }} aria-hidden="true" />
          {navItems.map(({ to, Icon, label }) => (
            <NavLink key={to} to={to} className="mobile-nav-item">
              <Icon size={19} aria-hidden="true" />
              <span>{label}</span>
              {to === '/alerts' && unreadCount > 0 && <span className="nav-count" aria-label={`${unreadCount} unread`}>{unreadCount}</span>}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
