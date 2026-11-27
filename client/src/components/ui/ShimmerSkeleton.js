// Adapted from Unlumen UI's free Shimmer Skeleton. See docs/UI-SOURCES.md.
import useReducedMotion from '../../hooks/useReducedMotion';
export default function ShimmerSkeleton({ className = '', label = 'Loading' }) {
  const reduced = useReducedMotion();
  return <div className={`shimmer-skeleton ${className}`} role="status" aria-label={label}>
    {!reduced && <span aria-hidden="true" />}
  </div>;
}
