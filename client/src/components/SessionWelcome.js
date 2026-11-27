import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import useReducedMotion from '../hooks/useReducedMotion';
import LogoWelcome from './LogoWelcome';

export default function SessionWelcome({ children }) {
  const { welcoming, finishWelcome } = useAuth();
  const reduced = useReducedMotion();
  const [opening, setOpening] = useState(() => !reduced);
  const previousFocus = useRef(null);
  const finishOpening = useCallback(() => setOpening(false), []);
  const playing = opening || welcoming;
  useEffect(() => {
    let wasHidden = document.hidden;
    const resume = () => {
      if (document.hidden) { wasHidden = true; return; }
      if (wasHidden && !reduced) { previousFocus.current = document.activeElement; setOpening(true); }
      wasHidden = false;
    };
    const restore = event => { if (event.persisted && !reduced) setOpening(true); };
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('pageshow', restore);
    return () => { document.removeEventListener('visibilitychange', resume); window.removeEventListener('pageshow', restore); };
  }, [reduced]);
  useEffect(() => {
    if (!playing && document.activeElement === document.body) {
      const target = previousFocus.current?.isConnected ? previousFocus.current : document.querySelector('main h1, .auth-logo h1');
      target?.focus({ preventScroll: true });
      previousFocus.current = null;
    }
  }, [playing]);
  return <>
    <div className="session-pages" inert={playing ? '' : undefined} aria-hidden={playing || undefined}>{children}</div>
    {playing && <LogoWelcome key={welcoming ? 'signed-in' : 'opening'} signedIn={welcoming} onComplete={welcoming ? finishWelcome : finishOpening} />}
  </>;
}
