import React, { useState, useEffect } from 'react';
import api from '../utils/api';

export default function LogFood() {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toTimeString().slice(0, 5);

  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ product_id: '', quantity: 1, date: today, time: now });
  const [logs, setLogs] = useState([]);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get('/food-products').then(r => setProducts(r.data)).catch(() => {});
    fetchLogs(today);
  }, [today]);

  const fetchLogs = async (date) => {
    const r = await api.get(`/consumption?date=${date}`);
    const enriched = await Promise.all(r.data.map(async (log) => {
      const p = await api.get(`/food-products/${log.product_id}`).catch(() => null);
      return { ...log, product: p?.data };
    }));
    setLogs(enriched);
  };

  const handleProductChange = (pid) => {
    setForm(f => ({ ...f, product_id: pid }));
    const p = products.find(p => p.product_id === pid);
    setSelected(p || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      await api.post('/consumption', form);
      setSuccess('Food logged successfully!');
      fetchLogs(form.date);
      setForm(f => ({ ...f, product_id: '', quantity: 1 }));
      setSelected(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError(err.response?.data?.message || 'Error logging food'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (recordId, date) => {
    if (!window.confirm('Remove this log?')) return;
    await api.delete(`/consumption/${recordId}`);
    fetchLogs(date);
  };

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="page">
      <div className="page-header">
        <h2>Log Food</h2>
        <p>Track your consumption and monitor daily intake</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 20 }}>
        {/* Log form */}
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: 16, color: 'var(--text-dim)' }}>LOG A PRODUCT</h3>
            {success && <div className="alert-box alert-success">{success}</div>}
            {error && <div className="alert-box alert-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Food Product</label>
                <select className="form-input" value={form.product_id} onChange={e => handleProductChange(e.target.value)} required>
                  <option value="">Select a product...</option>
                  {products.map(p => <option key={p._id} value={p.product_id}>{p.product_name} ({p.brand})</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input className="form-input" type="number" min="0.5" step="0.5" value={form.quantity} onChange={e => f('quantity', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input className="form-input" type="date" value={form.date} onChange={e => { f('date', e.target.value); fetchLogs(e.target.value); }} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Time</label>
                  <input className="form-input" type="time" value={form.time} onChange={e => f('time', e.target.value)} required />
                </div>
              </div>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                {loading ? 'Logging...' : '✓ Log Food'}
              </button>
            </form>
          </div>

          {/* Selected product nutrition preview */}
          {selected?.nutrition && (
            <div className="card">
              <h3 style={{ fontSize: '0.82rem', fontWeight: 800, marginBottom: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Nutrition Preview · ×{form.quantity}
              </h3>
              {[['🔥 Calories', selected.nutrition.calories * form.quantity, 'kcal'],
                ['🍬 Sugar', selected.nutrition.sugar * form.quantity, 'g'],
                ['🧂 Sodium', selected.nutrition.sodium * form.quantity, 'mg'],
                ['🧈 Fat', selected.nutrition.fat * form.quantity, 'g'],
                ['💪 Protein', selected.nutrition.protein * form.quantity, 'g'],
              ].map(([label, value, unit]) => (
                <div key={label} className="nutrient-row">
                  <span style={{ fontSize: '0.85rem' }}>{label}</span>
                  <span style={{ fontFamily: 'Space Mono', fontSize: '0.85rem', color: 'var(--accent)' }}>{Math.round(value * 10) / 10} {unit}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Logs for selected date */}
        <div className="card">
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: 16, color: 'var(--text-dim)' }}>
            CONSUMPTION RECORDS · {form.date}
          </h3>
          {logs.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📋</div><p>No food logged for this date</p></div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Brand</th>
                  <th>Qty</th>
                  <th>Time</th>
                  <th>Cal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log._id}>
                    <td style={{ color: 'var(--text)', fontWeight: 600 }}>{log.product?.product_name || log.product_id}</td>
                    <td>{log.product?.brand || '—'}</td>
                    <td><span className="tag tag-blue">×{log.quantity}</span></td>
                    <td style={{ fontFamily: 'Space Mono', fontSize: '0.8rem' }}>{log.time}</td>
                    <td style={{ color: 'var(--accent)', fontFamily: 'Space Mono' }}>
                      {log.product?.nutrition ? Math.round(log.product.nutrition.calories * log.quantity) : '—'}
                    </td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(log.record_id, log.date)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
