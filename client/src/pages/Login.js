import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import GoogleSignIn from '../components/GoogleSignIn';
import AuthExperience from '../components/AuthExperience';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
          <span className="auth-form-eyebrow">Your everyday, a little clearer</span>
          <h1 tabIndex={-1}>Welcome back.</h1>
          <p>Sign in to pick up where you left off.</p>
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
            <div className="auth-password">
            <input id="login-password" autoComplete="current-password" className="form-input" type={showPassword ? 'text' : 'password'} value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" required />
              <button type="button" className="auth-password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <div className="auth-divider">or</div><GoogleSignIn disabled={loading} />
        <p className="auth-switch">
          New to NutriScan? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </AuthExperience>
  );
}
