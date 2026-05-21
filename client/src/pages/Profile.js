import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ weight: '', height: '', lifestyle_type: 'Active', medical_conditions: '', allergies: '' });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/health-profiles').then(r => {
      if (r.data) {
        setProfile(r.data);
        setForm({
          weight: r.data.weight,
          height: r.data.height,
          lifestyle_type: r.data.lifestyle_type,
          medical_conditions: r.data.medical_conditions?.join(', ') || '',
          allergies: r.data.allergies?.join(', ') || '',
        });
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      const payload = {
        weight: Number(form.weight),
        height: Number(form.height),
        lifestyle_type: form.lifestyle_type,
        medical_conditions: form.medical_conditions ? form.medical_conditions.split(',').map(s => s.trim()).filter(Boolean) : [],
        allergies: form.allergies ? form.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
      };
      const r = await api.put('/health-profiles', payload);
      setProfile(r.data);
      setSuccess('Health profile updated!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError(err.response?.data?.message || 'Error saving'); }
    finally { setSaving(false); }
  };

  const bmi = profile ? (profile.weight / Math.pow(profile.height / 100, 2)).toFixed(1) : null;
  const bmiStatus = bmi ? (bmi < 18.5 ? ['Underweight', 'tag-warn'] : bmi < 25 ? ['Normal', 'tag-green'] : bmi < 30 ? ['Overweight', 'tag-warn'] : ['Obese', 'tag-danger']) : null;

  if (loading) return <div className="loading"><div className="spinner" />Loading profile...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2>My Profile</h2>
        <p>Manage your health profile and personal settings</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
        {/* User info card */}
        <div>
          <div className="card" style={{ marginBottom: 16, textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '2rem' }}>
              {user?.name?.first?.[0]}{user?.name?.last?.[0]}
            </div>
            <h3 style={{ fontWeight: 800 }}>{user?.name?.first} {user?.name?.last}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 4 }}>{user?.email}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontFamily: 'Space Mono', marginTop: 4 }}>{user?.user_id}</p>
            {user?.date_of_birth && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 8 }}>
                Age: <strong style={{ color: 'var(--accent)' }}>{user?.age}</strong> years
              </p>
            )}
          </div>

          {profile && bmi && (
            <div className="card">
              <h3 style={{ fontSize: '0.78rem', fontWeight: 800, marginBottom: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Health Stats</h3>
              <div className="nutrient-row">
                <span style={{ fontSize: '0.85rem' }}>Weight</span>
                <span style={{ fontFamily: 'Space Mono', color: 'var(--accent)' }}>{profile.weight} kg</span>
              </div>
              <div className="nutrient-row">
                <span style={{ fontSize: '0.85rem' }}>Height</span>
                <span style={{ fontFamily: 'Space Mono', color: 'var(--accent)' }}>{profile.height} cm</span>
              </div>
              <div className="nutrient-row">
                <span style={{ fontSize: '0.85rem' }}>BMI</span>
                <div className="flex-center gap-8">
                  <span style={{ fontFamily: 'Space Mono', color: 'var(--accent)' }}>{bmi}</span>
                  <span className={`tag ${bmiStatus[1]}`}>{bmiStatus[0]}</span>
                </div>
              </div>
              <div className="nutrient-row">
                <span style={{ fontSize: '0.85rem' }}>Lifestyle</span>
                <span className="tag tag-blue">{profile.lifestyle_type}</span>
              </div>
              {profile.medical_conditions?.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6, fontFamily: 'Space Mono' }}>CONDITIONS</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {profile.medical_conditions.map(c => <span key={c} className="tag tag-warn">{c}</span>)}
                  </div>
                </div>
              )}
              {profile.allergies?.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6, fontFamily: 'Space Mono' }}>ALLERGIES</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {profile.allergies.map(a => <span key={a} className="tag tag-danger">{a}</span>)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Edit form */}
        <div className="card">
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: 20, color: 'var(--text-dim)' }}>
            {profile ? 'UPDATE' : 'CREATE'} HEALTH PROFILE
          </h3>
          {success && <div className="alert-box alert-success">{success}</div>}
          {error && <div className="alert-box alert-error">{error}</div>}
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Weight (kg)</label>
                <input className="form-input" type="number" min="1" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} placeholder="55" required />
              </div>
              <div className="form-group">
                <label className="form-label">Height (cm)</label>
                <input className="form-input" type="number" min="1" value={form.height} onChange={e => setForm(f => ({ ...f, height: e.target.value }))} placeholder="165" required />
              </div>
              <div className="form-group">
                <label className="form-label">Lifestyle</label>
                <select className="form-input" value={form.lifestyle_type} onChange={e => setForm(f => ({ ...f, lifestyle_type: e.target.value }))}>
                  <option>Active</option>
                  <option>Sedentary</option>
                  <option>Moderate</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Medical Conditions (comma-separated)</label>
              <input className="form-input" value={form.medical_conditions} onChange={e => setForm(f => ({ ...f, medical_conditions: e.target.value }))} placeholder="Diabetes, Hypertension" />
            </div>
            <div className="form-group">
              <label className="form-label">Allergies (comma-separated)</label>
              <input className="form-input" value={form.allergies} onChange={e => setForm(f => ({ ...f, allergies: e.target.value }))} placeholder="Peanuts, Gluten, Dust" />
            </div>
            <button className="btn btn-primary" style={{ marginTop: 8 }} disabled={saving}>
              {saving ? 'Saving...' : '✓ Save Health Profile'}
            </button>
          </form>

          <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '0.82rem', fontWeight: 800, marginBottom: 12, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Daily Intake Limits</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
              {[['Calories', '2000 kcal'], ['Sugar', '50 g'], ['Sodium', '2300 mg'], ['Fat', '65 g'], ['Protein', '50 g']].map(([k, v]) => (
                <div key={k} style={{ background: 'var(--surface2)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'Space Mono', marginBottom: 4 }}>{k}</div>
                  <div style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '0.9rem', fontFamily: 'Space Mono' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
