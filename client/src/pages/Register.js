import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import AuthExperience from '../components/AuthExperience';
import GoogleSignIn from '../components/GoogleSignIn';

export default function Register() {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '', phone_number: '', date_of_birth: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const r = await api.post('/auth/register', form);
      login(r.data.token, r.data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  const f = (field, val) => setForm(p => ({ ...p, [field]: val }));

  return (
    <AuthExperience>
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-form-eyebrow">Start with a little clarity</span>
          <h1 tabIndex={-1}>Make yourself at home.</h1>
          <p>Create your NutriScan account.</p>
        </div>
        {error && <div className="alert-box alert-error" role="alert">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="register-first">First name</label>
              <input id="register-first" autoComplete="given-name" className="form-input" value={form.first_name} onChange={e => f('first_name', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="register-last">Last name</label>
              <input id="register-last" autoComplete="family-name" className="form-input" value={form.last_name} onChange={e => f('last_name', e.target.value)} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="register-email">Email</label>
            <input id="register-email" autoComplete="email" className="form-input" type="email" value={form.email} onChange={e => f('email', e.target.value)} placeholder="you@example.com" required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="register-password">Password</label>
            <input id="register-password" autoComplete="new-password" className="form-input" type="password" value={form.password} onChange={e => f('password', e.target.value)} required minLength={6} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="register-phone">Phone number (optional)</label>
            <input id="register-phone" autoComplete="tel" type="tel" className="form-input" value={form.phone_number} onChange={e => f('phone_number', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="register-dob">Date of birth</label>
            <input id="register-dob" autoComplete="bday" className="form-input" type="date" value={form.date_of_birth} onChange={e => f('date_of_birth', e.target.value)} required />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <div className="auth-divider">or</div><GoogleSignIn disabled={loading} />
        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </AuthExperience>
  );
}
