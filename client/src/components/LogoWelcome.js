import { useLayoutEffect, useRef } from 'react';
import Brand from './Brand';
import useReducedMotion from '../hooks/useReducedMotion';
import './LogoWelcome.css';

export default function LogoWelcome({ onComplete, signedIn = false }) {
  const reduced = useReducedMotion();
  const overlay = useRef(null);

  useLayoutEffect(() => {
    const element = overlay.current;
    if (reduced || !element?.animate) { onComplete(); return; }
    let active = true;
    let completed = false;
    const finish = () => {
      if (active && !completed) { completed = true; onComplete(); }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element.focus({ preventScroll: true });
    const hold = 2250;
    const easing = 'cubic-bezier(.22,1,.36,1)';
    const animations = [
      element.querySelector('.logo-welcome-brand').animate([
        { opacity: 0, transform: 'translateY(12px) scale(.94)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' },
      ], { duration: 560, fill: 'both', easing }),
      element.querySelector('.logo-welcome-message').animate([
        { opacity: 0, transform: 'translateY(6px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ], { duration: 380, delay: 160, fill: 'both', easing }),
    ];
    const exit = element.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 250, delay: hold, fill: 'both', easing,
    });
    animations.push(exit);
    // Never make access depend on an animation finishing successfully.
    const timeout = setTimeout(finish, hold + 450);
    exit.finished.then(finish, finish);
    return () => {
      active = false;
      clearTimeout(timeout);
      animations.forEach(animation => animation.cancel());
      document.body.style.overflow = previousOverflow;
    };
  }, [onComplete, reduced, signedIn]);

  return <div className="logo-welcome" ref={overlay} tabIndex={-1} role="status"
    aria-label={signedIn ? 'Opening your dashboard' : 'Welcome to NutriScan'}>
    <div className="logo-welcome-center">
      <div className="logo-welcome-brand"><Brand /></div>
      <p className="logo-welcome-message">{signedIn ? 'Welcome back. Your food log is ready.' : 'Your meals. Your nutrition.'}</p>
      <span className="logo-welcome-accent" aria-hidden="true" />
    </div>
  </div>;
}
