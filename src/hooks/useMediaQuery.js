import { useState, useEffect } from 'react';

/**
 * Custom hook to monitor media query matching.
 * SSR and Node.js safe fallback.
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const media = window.matchMedia(query);
    const listener = (e) => setMatches(e.matches);

    setMatches(media.matches);

    if (media.addEventListener) {
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    } else {
      media.addListener(listener);
      return () => media.removeListener(listener);
    }
  }, [query]);

  return matches;
}

/**
 * Returns true if the viewport width is below 768px (standard mobile threshold).
 */
export function useIsMobile() {
  return useMediaQuery('(max-width: 767px)');
}

/**
 * Returns true if the viewport width is between 768px and 1024px (tablet).
 */
export function useIsTablet() {
  return useMediaQuery('(min-width: 768px) and (max-width: 1024px)');
}

