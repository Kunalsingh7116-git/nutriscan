import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import googleLogo from '../assets/google-logo.svg';

const storageKey = 'ns_google_claim';
const android = navigator.userAgent.includes('NutriScanAndroid');
const nativeGoogle = navigator.userAgent.includes('NutriScanNativeGoogle');

export default function GoogleSignIn({ disabled }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [available, setAvailable] = useState(null);
  const [starting, setStarting] = useState(false);
  const nativeNonce = useRef(null);
  const [claim, setClaim] = useState(() => (android && !nativeGoogle) || pathname === '/auth/google'
    ? sessionStorage.getItem(storageKey) : null);
  const [error, setError] = useState(() => pathname === '/auth/google' && !claim
    ? 'This Google sign-in has expired. Start again.' : '');

  useEffect(() => {
    const controller = new AbortController();
    api.get('/auth/google/config', { signal: controller.signal })
      .then(({ data }) => setAvailable(data.origin === window.location.origin))
      .catch(() => { if (!controller.signal.aborted) setAvailable(false); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!claim) return;
    let stopped = false;
    let timer;
    async function finish() {
      try {
        const { status, data } = await api.post('/auth/google/claim', { claim });
        if (stopped) return;
        if (status === 202) {
          timer = setTimeout(finish, 2000);
          return;
        }
        sessionStorage.removeItem(storageKey);
        login(data.token, data.user);
        navigate('/dashboard', { replace: true });
      } catch (err) {
        if (stopped) return;
        sessionStorage.removeItem(storageKey);
        setClaim(null);
        setError(err.response?.data?.message || 'Couldn’t finish Google sign-in. Try again.');
      }
    }
    timer = setTimeout(finish, 250);
    return () => { stopped = true; clearTimeout(timer); };
  }, [claim, login, navigate]);

  useEffect(() => {
    if (!nativeGoogle) return;
    const controller = new AbortController();
    async function complete(event) {
      const { nonce, token, error } = event.detail || {};
      if (!nativeNonce.current || nonce !== nativeNonce.current) return;
      nativeNonce.current = null;
      try {
        if (error) { setError(error); return; }
        const { data } = await api.post('/auth/google/native/finish', { nonce, idToken: token }, { signal: controller.signal });
        login(data.token, data.user);
        navigate('/dashboard', { replace: true });
      } catch (err) {
        if (!controller.signal.aborted) setError(err.response?.data?.message || 'Couldn’t finish Google sign-in. Try again.');
      } finally {
        if (!controller.signal.aborted) setStarting(false);
      }
    }
    window.addEventListener('nutriscan:google', complete);
    return () => { controller.abort(); window.removeEventListener('nutriscan:google', complete); };
  }, [login, navigate]);

  async function start() {
    setStarting(true);
    setError('');
    try {
      if (nativeGoogle) {
        const { data } = await api.post('/auth/google/native/start');
        nativeNonce.current = data.nonce;
        const query = new URLSearchParams({ nonce: data.nonce, client_id: data.clientId });
        window.location.assign('/android/google-sign-in?' + query);
        return;
      }
      const { data } = await api.post('/auth/google/start', { android });
      sessionStorage.setItem(storageKey, data.claim);
      if (android) setClaim(data.claim);
      window.location.assign(data.url);
    } catch (err) {
      setError(err.response?.data?.message || 'Couldn’t start Google sign-in. Try again.');
    } finally {
      if (!nativeNonce.current) setStarting(false);
    }
  }

  return (
    <div className="google-sign-in">
      {error && <p className="alert-box alert-error" role="alert">{error}</p>}
      {claim ? <>
        <p role="status">{android ? 'Complete sign-in in your browser, then return to NutriScan.' : 'Finishing Google sign-in…'}</p>
        <button className="btn btn-outline" type="button" onClick={() => {
          sessionStorage.removeItem(storageKey);
          setClaim(null);
          if (pathname === '/auth/google') navigate('/login', { replace: true });
        }}>Cancel Google sign-in</button>
      </> : <>
        <button className="btn btn-outline" type="button" disabled={disabled || !available || starting} onClick={start}>
          <img src={googleLogo} alt="" width="18" height="18" />
          {starting ? 'Opening Google…' : 'Continue with Google'}
        </button>
        {available === false && <p>Google sign-in is unavailable on this server address.</p>}
      </>}
    </div>
  );
}
