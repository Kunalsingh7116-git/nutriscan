// Adapted from Magic UI Number Ticker (MIT). See docs/UI-SOURCES.md.
import { useEffect, useRef } from 'react';
import { useInView, useMotionValue, useSpring } from 'motion/react';
import useReducedMotion from '../../hooks/useReducedMotion';

const format = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
export default function NumberTicker({ value, className = '' }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const visible = useInView(ref, { once: true });
  const target = useMotionValue(value);
  const spring = useSpring(target, { damping: 60, stiffness: 160 });
  useEffect(() => {
    if (reduced || !visible) { spring.jump(value); return; }
    target.set(value);
  }, [reduced, visible, target, spring, value]);
  useEffect(() => spring.on('change', latest => {
    if (ref.current) ref.current.textContent = format.format(latest);
  }), [spring]);
  return <span className={`number-ticker ${className}`} aria-label={format.format(value)}>
    <span ref={ref} aria-hidden="true">{format.format(value)}</span>
  </span>;
}
