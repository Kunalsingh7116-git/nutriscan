import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Camera, Leaf, Play } from 'lucide-react';
import Brand from './Brand';
import useReducedMotion from '../hooks/useReducedMotion';
import './AuthExperience.css';

const welcomeKey = 'ns_auth_welcome_seen';

function BotanicalMark({ className = '' }) {
  return <svg className={className} viewBox="0 0 400 400" fill="none" aria-hidden="true">
    {Array.from({ length: 12 }, (_, index) => <ellipse key={index} cx="200" cy="116" rx="27" ry="83"
      transform={`rotate(${index * 30} 200 200)`} fill="currentColor" />)}
    <circle cx="200" cy="200" r="25" fill="currentColor" />
  </svg>;
}

export default function AuthExperience({ children }) {
  const reduced = useReducedMotion();
  const [playing, setPlaying] = useState(() => {
    if (reduced) return false;
    try { return !sessionStorage.getItem(welcomeKey); } catch { return true; }
  });
  const intro = useRef(null);
  const content = useRef(null);
  const skip = useRef(null);
  const replaying = useRef(false);

  const finish = useCallback(() => {
    try { sessionStorage.setItem(welcomeKey, '1'); } catch { /* Intro remains optional without storage. */ }
    replaying.current = false;
    setPlaying(false);
  }, []);

  useLayoutEffect(() => {
    if (!playing) {
      return;
    }
    if (reduced && !replaying.current) { finish(); return; }
    const element = intro.current;
    if (!element?.animate) { finish(); return; }
    let active = true;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const easing = 'cubic-bezier(.22,1,.36,1)';
    const animations = [
      element.querySelector('.auth-intro-motif').animate([
        { opacity: 0, transform: 'scale(.3) rotate(-22deg)' },
        { opacity: .2, transform: 'scale(1) rotate(0deg)', offset: .7 },
        { opacity: .15, transform: 'scale(1.12) rotate(5deg)' },
      ], { duration: 1200, fill: 'both', easing }),
      element.querySelector('.auth-intro-wordmark').animate([
        { opacity: 0, transform: 'translateY(16px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ], { duration: 650, delay: 130, fill: 'both', easing }),
      element.querySelector('.auth-intro-wash').animate([
        { transform: 'translateY(105%)' }, { transform: 'translateY(0)' },
      ], { duration: 850, delay: 570, fill: 'both', easing }),
      element.querySelector('.auth-intro-center').animate([
        { opacity: 1 }, { opacity: 0 },
      ], { duration: 300, delay: 1080, fill: 'both' }),
    ];
    const exit = element.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 330, delay: 1370, fill: 'both', easing,
    });
    animations.push(exit);
    exit.finished.then(() => { if (active) finish(); }).catch(() => {});
    skip.current?.focus({ preventScroll: true });
    return () => {
      active = false;
      animations.forEach(animation => animation.cancel());
      document.body.style.overflow = previousOverflow;
    };
  }, [playing, finish, reduced]);

  useLayoutEffect(() => {
    if (!playing && content.current?.contains(document.activeElement)) return;
    if (!playing && document.activeElement === document.body) {
      content.current?.querySelector('h1')?.focus({ preventScroll: true });
    }
  }, [playing]);

  return <div className="auth-experience">
    <div className="auth-experience-content" ref={content} inert={playing ? '' : undefined} aria-hidden={playing || undefined}>
      <aside className="auth-story" aria-label="Welcome to NutriScan">
        <div className="auth-story-brand"><Brand /></div>
        <div className="auth-story-copy">
          <span className="auth-story-kicker"><Leaf size={15} aria-hidden="true" /> A little more everyday clarity</span>
          <h2>Good food.<br />A clearer picture.</h2>
          <p>A photo of your meal.<br />A little insight into your day.</p>
        </div>
        <div className="auth-botanical-scene" aria-hidden="true"><BotanicalMark className="auth-story-flower" /><div className="auth-story-orbit" /></div>
        <div className="auth-story-caption"><Camera size={17} aria-hidden="true" /><span>Snap. Review. Make it a habit.</span></div>
      </aside>
      <main className="auth-form-side">
        <div className="auth-form-wrap">{children}</div>
        <footer className="auth-experience-footer"><span>One meal at a time.</span>
          <button type="button" onClick={() => { replaying.current = true; setPlaying(true); }}><Play size={12} aria-hidden="true" />Play welcome animation</button>
        </footer>
      </main>
    </div>
    {playing && <div ref={intro} className="auth-intro" role="dialog" aria-modal="true" aria-label="Welcome to NutriScan">
      <div className="auth-intro-wash" />
      <div className="auth-intro-center">
        <BotanicalMark className="auth-intro-motif" />
        <div className="auth-intro-wordmark"><span>NutriScan<span className="auth-intro-dot">.</span></span><p>A little clarity. Every meal.</p></div>
      </div>
      <button type="button" className="auth-intro-skip" ref={skip} onClick={finish}>Skip intro</button>
    </div>}
  </div>;
}
