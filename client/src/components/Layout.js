import { Suspense, useEffect, useLayoutEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Outlet, NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, BookOpen, Camera, ChevronRight, LayoutGrid, Leaf, LogOut, Plus, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import Brand from './Brand';
import RouteLoading from './RouteLoading';
import { preloadRoute } from '../utils/routeLoaders';
import useReducedMotion from '../hooks/useReducedMotion';

const navItems = [
  { to: '/dashboard', Icon: LayoutGrid, label: 'Overview' },
  { to: '/log-food', Icon: Camera, label: 'Food log' },
  { to: '/food-products', Icon: BookOpen, label: 'Food library' },
  { to: '/alerts', Icon: Bell, label: 'Alerts' },
  { to: '/profile', Icon: UserRound, label: 'Profile' },
];

export default function Layout() {
  const { logout, user } = useAuth();
  const reduced = useReducedMotion();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const activeTab = Math.max(0, navItems.findIndex(item => pathname === item.to || pathname.startsWith(item.to + '/')));

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  useEffect(() => {
    let pending;
    function refreshAlerts() {
      if (document.hidden || pending) return;
      const controller = new AbortController();
      pending = controller;
      api.get('/alerts/meta/unread', { signal: controller.signal })
        .then(({ data }) => { if (!controller.signal.aborted) setUnreadCount(data.count ?? 0); })
        .catch(() => {})
        .finally(() => { if (pending === controller) pending = undefined; });
    }
    refreshAlerts();
    document.addEventListener('visibilitychange', refreshAlerts);
    window.addEventListener('nutriscan:alerts-updated', refreshAlerts);
    const interval = setInterval(refreshAlerts, 30000);
    return () => {
      pending?.abort();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshAlerts);
      window.removeEventListener('nutriscan:alerts-updated', refreshAlerts);
    };
  }, []);

  return (
    <div className="app-layout">
      <a className="skip-content" href="#page-content">Skip to content</a>
      <aside className="desktop-sidebar" aria-label="Workspace">
        <Link className="brand-link sidebar-brand" to="/dashboard"><Brand /></Link>
        <span className="sidebar-label">YOUR NUTRITION SPACE</span>
        <nav className="sidebar-nav" aria-label="Desktop navigation">
          {navItems.map(({ to, Icon, label }) => <NavLink key={to} to={to}
            onPointerEnter={() => preloadRoute(to)} onFocus={() => preloadRoute(to)} onPointerDown={() => preloadRoute(to)}>
            {({ isActive }) => <>
            {isActive && <motion.span className="sidebar-active-indicator" layoutId="sidebar-selection" aria-hidden="true"
              transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 440, damping: 38 }} />}
            <Icon size={19} aria-hidden="true" /><span>{label}</span>
            {to === '/alerts' && unreadCount > 0 && <span className="nav-count" aria-label={`${unreadCount} unread`}>{unreadCount}</span>}
            </>}
          </NavLink>)}
        </nav>
        <div className="sidebar-note"><span className="sidebar-note-icon"><Leaf size={21} /></span>
          <h2>A little more mindful.</h2><p>One meal at a time. Keep your food story in one place.</p>
          <Link className="btn btn-primary" to="/log-food"><Plus size={16} aria-hidden="true" />Log a meal</Link>
        </div>
        <Link className="sidebar-account" to="/profile"><span className="account-avatar">{user?.name?.first?.[0] || 'N'}</span>
          <span><strong>{user?.name?.first || 'My account'}</strong><small>Personal workspace</small></span><ChevronRight size={15} aria-hidden="true" /></Link>
      </aside>
      <div className="main-content">
        <header className="workspace-header">
          <div className="app-bar">
            <Link className="brand-link" to="/dashboard"><Brand /></Link>
            <div className="workspace-breadcrumb"><span>My workspace</span><ChevronRight size={14} aria-hidden="true" /><strong>{navItems[activeTab].label}</strong></div>
            <div className="workspace-actions"><Link className="icon-button" to="/alerts" aria-label={unreadCount ? `Alerts, ${unreadCount} unread` : 'Alerts'}><Bell size={19} /></Link>
              <span className="header-separator" />
              <button type="button" className="icon-button app-signout" aria-label="Sign out" title="Sign out"
                onClick={async () => { const ended = await logout(); navigate('/login', { replace: true, state: { logoutFailed: !ended } }); }}><LogOut size={18} /></button></div>
          </div>
        </header>
        <main id="page-content" tabIndex={-1} key={pathname} className="route-scene"><Suspense fallback={<RouteLoading />}><Outlet /></Suspense></main>
      </div>
      <nav className="mobile-bottom-nav" aria-label="Main navigation">
        <div className="nav-track">
          <span className="nav-active-indicator" style={{ '--active-tab': activeTab }} aria-hidden="true" />
          {navItems.map(({ to, Icon, label }) => (
            <NavLink key={to} to={to} className="mobile-nav-item"
              onPointerEnter={() => preloadRoute(to)} onFocus={() => preloadRoute(to)} onPointerDown={() => preloadRoute(to)}>
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
