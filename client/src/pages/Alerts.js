import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import useReducedMotion from '../hooks/useReducedMotion';
import NumberTicker from '../components/ui/NumberTicker';
import { Activity, Bell, BellRing, CalendarDays, Check, CheckCheck, CircleAlert, Droplets, Flame, Leaf, ShieldCheck, Wheat } from 'lucide-react';
import api from '../utils/api';
import './Alerts.css';

const alertStyles = {
  'High Calories': { Icon: Flame, tone: 'coral' },
  'High Sugar': { Icon: Wheat, tone: 'rose' },
  'High Sodium': { Icon: Droplets, tone: 'blue' },
  'High Fat': { Icon: Droplets, tone: 'amber' },
  'Low Protein': { Icon: Activity, tone: 'violet' },
  Balanced: { Icon: Leaf, tone: 'green' },
};

function formatDate(value) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en', {
    month: 'short', day: 'numeric', year: 'numeric',
  }).format(date);
}

function AlertRow({ alert, onMarkRead, busy }) {
  const unread = alert.status === 'Unread';
  const { Icon, tone } = alertStyles[alert.alert_type] || { Icon: CircleAlert, tone: 'amber' };
  return (
    <li className={`health-alert-row${unread ? ' is-unread' : ''}`}>
      <span className={`health-alert-icon tone-${tone}`}><Icon size={21} strokeWidth={1.8} aria-hidden="true" /></span>
      <div className="health-alert-content">
        <div className="health-alert-title"><h3>{alert.alert_type}</h3>{unread && <span className="health-alert-new">New</span>}</div>
        <p>{alert.message}</p>
        <time dateTime={alert.date}><CalendarDays size={13} aria-hidden="true" />{formatDate(alert.date)}</time>
      </div>
      {unread ? (
        <button type="button" className="health-alert-read" disabled={busy} onClick={() => onMarkRead(alert.alert_id)}
          aria-label={`Mark ${alert.alert_type} alert from ${formatDate(alert.date)} as read`}>
          <Check size={16} aria-hidden="true" />{busy ? 'Updating…' : 'Mark read'}
        </button>
      ) : <span className="health-alert-read-status"><CheckCheck size={16} aria-hidden="true" />Read</span>}
    </li>
  );
}

export default function Alerts() {
  const reduced = useReducedMotion();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState('All');
  const [pending, setPending] = useState([]);
  const [markingAll, setMarkingAll] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(false);
    api.get('/alerts', { signal: controller.signal })
      .then(({ data }) => setAlerts(data))
      .catch(() => { if (!controller.signal.aborted) setLoadError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [loadAttempt]);

  async function markRead(id) {
    setError('');
    setPending(prev => [...prev, id]);
    try {
      await api.patch(`/alerts/${id}/read`);
      setAlerts(prev => prev.map(alert => alert.alert_id === id ? { ...alert, status: 'Read' } : alert));
      setNotice('Alert marked as read.');
      window.dispatchEvent(new Event('nutriscan:alerts-updated'));
    } catch { setError('Couldn’t update this alert. Please try again.'); }
    finally { setPending(prev => prev.filter(value => value !== id)); }
  }

  async function markAllRead() {
    setError('');
    setMarkingAll(true);
    try {
      await api.patch('/alerts/read-all');
      setAlerts(prev => prev.map(alert => ({ ...alert, status: 'Read' })));
      setNotice('All alerts marked as read.');
      window.dispatchEvent(new Event('nutriscan:alerts-updated'));
    } catch { setError('Couldn’t mark all alerts as read. Please try again.'); }
    finally { setMarkingAll(false); }
  }

  const unread = alerts.filter(alert => alert.status === 'Unread');
  const readCount = alerts.length - unread.length;
  const filtered = filter === 'All' ? alerts : alerts.filter(alert => alert.status === filter);

  return (
    <div className="page health-alerts-page">
      <header className="health-alerts-heading">
        <div>
          <p className="health-alerts-eyebrow"><Activity size={15} aria-hidden="true" />Nutrition insights</p>
          <h1>Health alerts</h1>
          <p className="health-alerts-description">Stay in the know about your daily nutrition.</p>
        </div>
        {!loading && !loadError && unread.length > 0 && <button type="button" className="btn btn-outline health-mark-all"
          onClick={markAllRead} disabled={markingAll || pending.length > 0}>
          <CheckCheck size={17} aria-hidden="true" />{markingAll ? 'Updating alerts…' : 'Mark all as read'}
        </button>}
      </header>
      <span className="health-alerts-live" role="status">{notice}</span>
      {error && <p className="alert-box alert-error" role="alert">{error}</p>}
      {loading ? <div className="health-alerts-loading" role="status"><div className="spinner" />Loading your alerts…</div>
        : loadError ? <div className="health-alerts-empty" role="alert">
          <CircleAlert size={28} aria-hidden="true" /><h2>Alerts couldn’t be loaded</h2><p>Please try again in a moment.</p>
          <button type="button" className="btn btn-outline" onClick={() => setLoadAttempt(value => value + 1)}>Try again</button>
        </div> : <>
          <section className="health-alerts-summary" aria-label="Alert status">
            <span className="health-summary-icon">{unread.length ? <BellRing size={23} aria-hidden="true" /> : <ShieldCheck size={25} aria-hidden="true" />}</span>
            <div><h2>{unread.length ? `${unread.length} ${unread.length === 1 ? 'alert needs' : 'alerts need'} your attention` : 'You’re all caught up'}</h2>
              <p>{unread.length ? 'A few updates from your recent food logs are ready to review.' : 'New updates from your food logs will appear here.'}</p></div>
            <span className="health-summary-status"><span />{unread.length ? 'New updates' : 'Up to date'}</span>
          </section>
          <div className="health-alerts-layout">
            <section className="health-alerts-inbox" aria-label="Nutrition notifications">
              <div className="health-alerts-toolbar">
                <div className="health-alerts-filters" role="group" aria-label="Filter alerts">
                  {[['All', alerts.length, Bell], ['Unread', unread.length, BellRing], ['Read', readCount, CheckCheck]].map(([label, count, Icon]) => (
                    <button key={label} type="button" aria-pressed={filter === label} className={filter === label ? 'is-active' : ''}
                      aria-label={`${label === 'All' ? 'All updates' : label}, ${count}`}
                      onClick={() => setFilter(label)}>
                      {filter === label && <motion.span className="health-filter-indicator" layoutId="alert-filter-selection" aria-hidden="true"
                        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 430, damping: 34 }} />}
                      <Icon size={16} aria-hidden="true" />{label === 'All' ? 'All updates' : label}
                      <span className="health-filter-count" aria-hidden="true"><NumberTicker value={count} /></span>
                    </button>
                  ))}
                </div><span className="health-alerts-sort">Newest first</span>
              </div>
              <motion.div key={filter} className="health-alerts-results" aria-live="polite"
                initial={reduced ? false : { opacity: .65, y: 6 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduced ? 0 : .24, ease: [.16, 1, .3, 1] }}>
                {filtered.length > 0 ? <ul className="health-alerts-list">
                  {filtered.map(alert => <AlertRow key={alert._id || alert.alert_id} alert={alert} onMarkRead={markRead}
                    busy={markingAll || pending.includes(alert.alert_id)} />)}
                </ul> : <div className="health-alerts-empty">
                  <span className="health-empty-icon"><Bell size={25} aria-hidden="true" /></span>
                  <h2>{filter === 'Unread' ? 'No unread alerts' : filter === 'Read' ? 'No read alerts yet' : 'No alerts yet'}</h2>
                  <p>{filter === 'Unread' ? 'You’ve read all your latest nutrition updates.' : 'Keep logging your meals to see your nutrition updates here.'}</p>
                  {filter !== 'All' && <button type="button" className="text-button" onClick={() => setFilter('All')}>View all updates</button>}
                </div>}
              </motion.div>
              <footer className="health-alerts-inbox-footer"><ShieldCheck size={14} aria-hidden="true" />Based on your logged meals and daily reference values.</footer>
            </section>
            <aside className="health-alerts-aside" aria-label="Alerts overview">
              <section className="health-alerts-glance">
                <span className="health-aside-kicker">Your activity</span><h2>At a glance</h2>
                <dl>
                  <div><dt><span className="health-glance-dot" />Unread alerts</dt><dd>{unread.length}</dd></div>
                  <div><dt><CheckCheck size={15} aria-hidden="true" />Read alerts</dt><dd>{readCount}</dd></div>
                  <div><dt><Bell size={15} aria-hidden="true" />Total updates</dt><dd>{alerts.length}</dd></div>
                </dl>
              </section>
              <section className="health-alerts-context">
                <span className="health-context-icon"><Leaf size={21} aria-hidden="true" /></span><h2>The full picture</h2>
                <p>See how your meals add up throughout the day with your nutrition overview.</p><Link to="/dashboard">View overview</Link>
              </section>
            </aside>
          </div>
        </>}
    </div>
  );
}
