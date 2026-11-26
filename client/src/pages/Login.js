import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import Brand from '../components/Brand';
import AuthExperience from '../components/AuthExperience';
import GoogleSignIn from '../components/GoogleSignIn';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const r = await api.post('/auth/login', form);
      login(r.data.token, r.data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <AuthExperience>
      <div className="auth-card">
        <div className="auth-logo">
          <Brand />
          <h1 tabIndex={-1}>Welcome back</h1>
          <p>Sign in to see your nutrition and log meals.</p>
        </div>
        {error && <div className="alert-box alert-error" role="alert">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email</label>
            <input id="login-email" autoComplete="email" className="form-input" type="email" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Password</label>
            <input id="login-password" autoComplete="current-password" className="form-input" type="password" value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" required />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <GoogleSignIn disabled={loading} />
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          No account? <Link to="/register" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 700 }}>Register</Link>
        </p>
      </div>
    </AuthExperience>
  );
}
