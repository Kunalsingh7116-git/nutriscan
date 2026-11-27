import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import Brand from '../components/Brand';
import AuthExperience from '../components/AuthExperience';
import GoogleSignIn from '../components/GoogleSignIn';
import SmoothButton from '../components/ui/SmoothButton';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [resetStep, setResetStep] = useState(0);
  const [code, setCode] = useState('');
  const [notice, setNotice] = useState('');
  const changeStep = step => {
    setResetStep(step);
    setCode('');
    setError('');
    setNotice('');
    setForm(previous => ({ ...previous, password: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setNotice(''); setLoading(true);
    try {
      if (resetStep === 1) {
        await api.post('/auth/password-reset/code', { email: form.email });
        setResetStep(2);
        return;
      }
      if (resetStep === 2) {
        await api.post('/auth/password-reset', { ...form, code });
        changeStep(0);
        setNotice('Your password was changed. Sign in with your new password.');
        return;
      }
      const r = await api.post('/auth/login', form);
      login(r.data.token, r.data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || (resetStep ? 'Password recovery couldn’t continue.' : 'Login failed'));
    } finally { setLoading(false); }
  };

  return (
    <AuthExperience>
      <div className="auth-card">
        <div className="auth-logo">
          <Brand />
          <h1 tabIndex={-1}>{resetStep ? "Reset your password" : "Welcome back"}</h1>
          <p>{resetStep === 2 ? 'If the address is eligible, a code will arrive shortly.' : resetStep ? 'Enter your account email.' : 'Sign in to see your nutrition and log meals.'}</p>
        </div>
        {error && <div className="alert-box alert-error" role="alert">{error}</div>}
        {notice && <p role="status">{notice}</p>}
        {!notice && state?.logoutFailed && <p role="alert">Signed out on this device. The server could not end this session.</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email</label>
            <input id="login-email" autoComplete="email" className="form-input" type="email" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })} readOnly={resetStep === 2} placeholder="you@example.com" required />
          </div>
          {resetStep === 2 && <div className="form-group">
            <label className="form-label" htmlFor="reset-code">Verification code</label>
            <input id="reset-code" autoComplete="one-time-code" inputMode="numeric" className="form-input"
              pattern="[0-9]{8}" maxLength={8} value={code} onChange={e => setCode(e.target.value)} required />
          </div>}
          {resetStep !== 1 && <div className="form-group">
            <label className="form-label" htmlFor="login-password">{resetStep ? 'New password' : 'Password'}</label>
            <input id="login-password" autoComplete={resetStep ? 'new-password' : 'current-password'} className="form-input"
              type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              minLength={resetStep ? 12 : undefined} required />
          </div>}
          <SmoothButton type="submit" loading={loading} className="btn btn-primary auth-submit">
            {['Sign In', 'Send recovery code', 'Change password'][resetStep]}
          </SmoothButton>
          <button type="button" className="btn btn-outline" disabled={loading} onClick={() => changeStep(resetStep ? 0 : 1)}>
            {resetStep ? 'Back to sign in' : 'Forgot password?'}
          </button>
        </form>
        {resetStep === 0 && <GoogleSignIn disabled={loading} />}
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          No account? <Link to="/register" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 700 }}>Register</Link>
        </p>
      </div>
    </AuthExperience>
  );
}
