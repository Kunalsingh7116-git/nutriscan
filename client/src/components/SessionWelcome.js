import { useCallback, useEffect, useState } from 'react';
import useReducedMotion from '../hooks/useReducedMotion';
import LogoWelcome from './LogoWelcome';

export default function SessionWelcome({ children }) {
  const reduced = useReducedMotion();
  // A new document gets one welcome. Backgrounding and history restores keep it finished.
  const [opening, setOpening] = useState(() => !reduced);
  const finishOpening = useCallback(() => setOpening(false), []);
  useEffect(() => {
    if (!opening && document.activeElement === document.body) {
      document.querySelector('main h1, .auth-logo h1')?.focus({ preventScroll: true });
    }
  }, [opening]);
  return <>
    <div className="session-pages" inert={opening ? '' : undefined} aria-hidden={opening || undefined}>{children}</div>
    {opening && <LogoWelcome onComplete={finishOpening} />}
  </>;
}
