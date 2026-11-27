// React 18 / plain-CSS adaptation of SmoothUI SmoothButton's loading treatment.
// See docs/UI-SOURCES.md. Motion follows NutriScan's explicit user preference.
import { AnimatePresence, motion } from 'motion/react';
import useReducedMotion from '../../hooks/useReducedMotion';
export default function SmoothButton({ children, loading, disabled, className = 'btn btn-primary', ...props }) {
  const reduced = useReducedMotion();
  return <button type="button" {...props} className={`smooth-button ${className}`}
    disabled={disabled || loading} aria-busy={loading || undefined}>
    <span className="smooth-button-label" style={{ opacity: loading ? 0 : 1 }}>{children}</span>
    <AnimatePresence initial={false}>{loading && <motion.span className="smooth-button-loader" aria-hidden="true"
      initial={{ opacity: reduced ? 1 : 0, scale: reduced ? 1 : .95 }} animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : .2 }}><span className="spinner" /></motion.span>}</AnimatePresence>
  </button>;
}
