import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const alertColors = {
  'High Calories': 'tag-danger',
  'High Sugar': 'tag-danger',
  'High Sodium': 'tag-warn',
  'High Fat': 'tag-warn',
  'Low Protein': 'tag-blue',
  'Balanced': 'tag-green',
};

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    const r = await api.get('/alerts');
    setAlerts(r.data);
    setLoading(false);
  };

  useEffect(() => { fetchAlerts(); }, []);

  const markRead = async (id) => {
    await api.patch(`/alerts/${id}/read`);
    setAlerts(prev => prev.map(a => a.alert_id === id ? { ...a, status: 'Read' } : a));
  };

  const markAllRead = async () => {
    await api.patch('/alerts/read-all');
    setAlerts(prev => prev.map(a => ({ ...a, status: 'Read' })));
  };

  const unread = alerts.filter(a => a.status === 'Unread');
  const read = alerts.filter(a => a.status === 'Read');

  if (loading) return <div className="loading"><div className="spinner" />Loading alerts...</div>;

  return (
    <div className="page">
      <div className="page-header flex-between">
        <div>
          <h2>Health Alerts</h2>
          <p>{unread.length} unread · {alerts.length} total</p>
        </div>
        {unread.length > 0 && (
          <button className="btn btn-outline" onClick={markAllRead}>Mark All Read</button>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="card">
          <div className="empty-state"><div className="empty-icon">✅</div><p>All clear! No health alerts generated yet.</p></div>
        </div>
      ) : (
        <>
          {unread.length > 0 && (
            <div className="mb-16">
              <h3 style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', fontFamily: 'Space Mono', marginBottom: 10 }}>
                Unread ({unread.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {unread.map(a => (
                  <div key={a._id} className="card" style={{ borderLeft: '3px solid var(--danger)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div className="flex-center gap-8 mb-8" style={{ marginBottom: 6 }}>
                        <span className={`tag ${alertColors[a.alert_type] || 'tag-warn'}`}>{a.alert_type}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'Space Mono' }}>{a.date}</span>
                        <span className="tag tag-danger" style={{ fontSize: '0.6rem' }}>UNREAD</span>
                      </div>
                      <p style={{ fontSize: '0.88rem', color: 'var(--text)' }}>{a.message}</p>
                    </div>
                    <button className="btn btn-outline btn-sm" onClick={() => markRead(a.alert_id)}>Mark Read</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {read.length > 0 && (
            <div>
              <h3 style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', fontFamily: 'Space Mono', marginBottom: 10 }}>
                Read ({read.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {read.map(a => (
                  <div key={a._id} className="card" style={{ opacity: 0.6 }}>
                    <div className="flex-center gap-8" style={{ marginBottom: 4 }}>
                      <span className={`tag ${alertColors[a.alert_type] || 'tag-warn'}`}>{a.alert_type}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'Space Mono' }}>{a.date}</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>{a.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
