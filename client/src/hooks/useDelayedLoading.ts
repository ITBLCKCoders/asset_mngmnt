import { useState, useEffect } from 'react';

/**
 * Returns a loading state that stays true for at least minDelayMs after
 * the actual loading becomes false. Use for shimmer/skeleton UIs to avoid flicker.
 */
export function useDelayedLoading(
  loading: boolean,
  minDelayMs = 2000
): boolean {
  const [show, setShow] = useState(loading);
  useEffect(() => {
    if (loading) {
      setShow(true);
    } else {
      const t = setTimeout(() => setShow(false), minDelayMs);
      return () => clearTimeout(t);
    }
  }, [loading, minDelayMs]);
  return loading || show;
}
