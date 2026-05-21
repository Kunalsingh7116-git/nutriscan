import React, { useEffect, useState } from 'react';
import { RadialBarChart, RadialBar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const LIMITS = { calories: 2000, sugar: 50, sodium: 2300, fat: 65, protein: 50 };

function NutrientBar({ label, value, limit, unit, color }) {
  const pct = Math.min((value / limit) * 100, 100);
  const cls = pct > 100 ? 'progress-danger' : pct > 80 ? 'progress-warn' : 'progress-green';
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="flex-between" style={{ marginBottom: 4 }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: '0.78rem', fontFamily: 'Space Mono', color: pct > 100 ? 'var(--danger)' : 'var(--text-muted)' }}>
          {Math.round(value)}/{limit}{unit}
        </span>
      </div>
      <div className="progress-bar">
        <div className={`progress-fill ${cls}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];
  const [intake, setIntake] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [weekIntake, setWeekIntake] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/daily-intake?date=${today}`),
      api.get('/alerts'),
      api.get('/daily-intake'),
      api.get(`/consumption?date=${today}`),
    ]).then(([intakeR, alertsR, weekR, logsR]) => {
      setIntake(intakeR.data[0] || null);
      setAlerts(alertsR.data.filter(a => a.status === 'Unread').slice(0, 3));
      const last7 = weekR.data.slice(0, 7).reverse().map(d => ({
        date: d.date?.slice(5),
        cal: d.total_calories,
      }));
      setWeekIntake(last7);
      setRecentLogs(logsR.data.slice(0, 5));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [today]);

  if (loading) return <div className="loading"><div className="spinner" />Loading dashboard...</div>;

  const todayIntake = intake || { total_calories: 0, total_sugar: 0, total_sodium: 0, total_fat: 0, total_protein: 0 };
  const calPct = Math.round((todayIntake.total_calories / LIMITS.calories) * 100);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.first} 👋</h2>
        <p className="mono">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Top stats */}
      <div className="card-grid card-grid-4" style={{ marginBottom: 20 }}>
        {[
          { label: 'Calories', value: Math.round(todayIntake.total_calories), limit: LIMITS.calories, unit: 'kcal', color: '#00e5a0' },
          { label: 'Sugar', value: Math.round(todayIntake.total_sugar), limit: LIMITS.sugar, unit: 'g', color: '#00b8d9' },
          { label: 'Sodium', value: Math.round(todayIntake.total_sodium), limit: LIMITS.sodium, unit: 'mg', color: '#ff6b35' },
          { label: 'Fat', value: Math.round(todayIntake.total_fat), limit: LIMITS.fat, unit: 'g', color: '#a855f7' },
        ].map(s => {
          const pct = Math.min(Math.round((s.value / s.limit) * 100), 100);
          const over = s.value > s.limit;
          return (
            <div key={s.label} className="stat-card">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ color: over ? 'var(--danger)' : s.color }}>{s.value}</div>
              <div className="stat-sub">{s.unit} · {pct}% of {s.limit}</div>
              <div className="progress-bar" style={{ marginTop: 8 }}>
                <div className="progress-fill" style={{ width: `${pct}%`, background: over ? 'var(--danger)' : s.color }} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Nutrient breakdown */}
        <div className="card">
          <h3 style={{ fontSize: '0.88rem', fontWeight: 800, marginBottom: 16, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Today's Nutrients</h3>
          <NutrientBar label="Calories" value={todayIntake.total_calories} limit={LIMITS.calories} unit="kcal" />
          <NutrientBar label="Sugar" value={todayIntake.total_sugar} limit={LIMITS.sugar} unit="g" />
          <NutrientBar label="Sodium" value={todayIntake.total_sodium} limit={LIMITS.sodium} unit="mg" />
          <NutrientBar label="Fat" value={todayIntake.total_fat} limit={LIMITS.fat} unit="g" />
          <NutrientBar label="Protein" value={todayIntake.total_protein} limit={LIMITS.protein} unit="g" />
        </div>

        {/* Weekly calorie chart */}
        <div className="card">
          <h3 style={{ fontSize: '0.88rem', fontWeight: 800, marginBottom: 16, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Weekly Calories</h3>
          {weekIntake.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weekIntake} barSize={20}>
                <XAxis dataKey="date" stroke="#5a7a72" tick={{ fontSize: 11, fontFamily: 'Space Mono' }} />
                <YAxis stroke="#5a7a72" tick={{ fontSize: 11, fontFamily: 'Space Mono' }} />
                <Tooltip contentStyle={{ background: '#111518', border: '1px solid #1f2b2e', borderRadius: 8, fontSize: '0.8rem' }} />
                <Bar dataKey="cal" fill="#00e5a0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state"><div className="empty-icon">📈</div><p>Log food to see trends</p></div>
          )}
        </div>
      </div>

      {/* Alerts + recent logs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <h3 style={{ fontSize: '0.88rem', fontWeight: 800, marginBottom: 16, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            🔔 Active Alerts
          </h3>
          {alerts.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">✅</div><p>No active alerts</p></div>
          ) : alerts.map(a => (
            <div key={a._id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div className="flex-between">
                <span className={`tag ${a.alert_type.includes('High') ? 'tag-danger' : 'tag-warn'}`}>{a.alert_type}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'Space Mono' }}>{a.date}</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginTop: 4 }}>{a.message}</p>
            </div>
          ))}
        </div>

        <div className="card">
          <h3 style={{ fontSize: '0.88rem', fontWeight: 800, marginBottom: 16, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            📋 Today's Logs
          </h3>
          {recentLogs.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">🍽️</div><p>No food logged today</p></div>
          ) : recentLogs.map(r => (
            <div key={r._id} className="flex-between" style={{ padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text)', fontFamily: 'Space Mono' }}>{r.product_id}</span>
              <div className="flex gap-8">
                <span className="tag tag-blue">×{r.quantity}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
