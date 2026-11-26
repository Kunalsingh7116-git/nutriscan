import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import LogoWelcome from './LogoWelcome';
import useReducedMotion from '../hooks/useReducedMotion';
import './AuthExperience.css';

const welcomeKey = 'ns_auth_logo_welcome_seen';

export default function AuthExperience({ children }) {
  const reduced = useReducedMotion();
  const [playing, setPlaying] = useState(() => {
    if (reduced) return false;
    try { return !sessionStorage.getItem(welcomeKey); } catch { return true; }
  });
  const content = useRef(null);
  const finish = useCallback(() => {
    try { sessionStorage.setItem(welcomeKey, '1'); } catch { /* Continue when storage is unavailable. */ }
    setPlaying(false);
  }, []);

  useLayoutEffect(() => {
    if (!playing && content.current?.contains(document.activeElement)) return;
    if (!playing && document.activeElement === document.body) {
      content.current?.querySelector('h1')?.focus({ preventScroll: true });
    }
  }, [playing]);

  return <div className="auth-experience">
    <div className="auth-container auth-experience-content" ref={content} inert={playing ? '' : undefined} aria-hidden={playing || undefined}>
      {children}
    </div>
    {playing && <LogoWelcome onComplete={finish} />}
  </div>;
}
