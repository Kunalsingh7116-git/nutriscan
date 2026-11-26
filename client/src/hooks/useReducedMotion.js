import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';

const MotionContext = createContext(null);
const storageKey = 'ns_motion';

export function MotionProvider({ children }) {
  const [preference, setPreference] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return ['full', 'reduced'].includes(saved) ? saved : 'system';
    } catch { return 'system'; }
  });
  const [systemReduced, setSystemReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const reduced = preference === 'reduced' || (preference === 'system' && systemReduced);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setSystemReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useLayoutEffect(() => {
    document.documentElement.dataset.motion = reduced ? 'reduced' : 'full';
  }, [reduced]);

  const changePreference = useCallback(value => {
    if (!['full', 'reduced', 'system'].includes(value)) return;
    setPreference(value);
    try { localStorage.setItem(storageKey, value); } catch { /* Keep the choice for this session. */ }
  }, []);
  const value = useMemo(() => ({ reduced, preference, changePreference }), [reduced, preference, changePreference]);
  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

export function useMotionPreference() { return useContext(MotionContext); }
export default function useReducedMotion() { return useMotionPreference().reduced; }
