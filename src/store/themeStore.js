import { create } from 'zustand';

export const THEME_STORAGE_KEY = 'sketchflow_theme_preference';

/**
 * Returns current OS system color-scheme preference ('dark' | 'light')
 */
export function getSystemPreference() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch (e) {
    return 'light';
  }
}

/**
 * Reads stored user preference from LocalStorage ('light' | 'dark' | 'system')
 */
export function getStoredPreference() {
  if (typeof window === 'undefined') return 'system';
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch (e) {
    // LocalStorage might be restricted
  }
  return 'system';
}

/**
 * Resolves effective theme ('light' | 'dark') given a user preference
 */
export function resolveEffectiveTheme(preference) {
  if (preference === 'dark') return 'dark';
  if (preference === 'light') return 'light';
  return getSystemPreference();
}

/**
 * Synchronizes HTML document classes and data attributes
 */
export function applyThemeToDOM(resolvedTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (resolvedTheme === 'dark') {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';
  }
}

/**
 * Centralized theme store powering SketchFlow theme preferences
 */
export const useThemeStore = create((set, get) => {
  const initialPref = getStoredPreference();
  const initialResolved = resolveEffectiveTheme(initialPref);

  // Apply immediately to DOM
  applyThemeToDOM(initialResolved);

  return {
    themePreference: initialPref, // 'light' | 'dark' | 'system'
    resolvedTheme: initialResolved, // 'light' | 'dark'

    setThemePreference: (preference) => {
      if (preference !== 'light' && preference !== 'dark' && preference !== 'system') {
        return;
      }
      try {
        localStorage.setItem(THEME_STORAGE_KEY, preference);
      } catch (e) {}

      const resolved = resolveEffectiveTheme(preference);
      applyThemeToDOM(resolved);
      set({ themePreference: preference, resolvedTheme: resolved });
    },

    cycleTheme: () => {
      const { themePreference, setThemePreference } = get();
      if (themePreference === 'light') setThemePreference('dark');
      else if (themePreference === 'dark') setThemePreference('system');
      else setThemePreference('light');
    },

    handleSystemChange: (systemIsDark) => {
      const { themePreference } = get();
      if (themePreference === 'system') {
        const resolved = systemIsDark ? 'dark' : 'light';
        applyThemeToDOM(resolved);
        set({ resolvedTheme: resolved });
      }
    }
  };
});

// Setup dynamic system preference listener
if (typeof window !== 'undefined' && window.matchMedia) {
  try {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e) => {
      useThemeStore.getState().handleSystemChange(e.matches);
    };
    if (mql.addEventListener) {
      mql.addEventListener('change', onChange);
    } else if (mql.addListener) {
      mql.addListener(onChange);
    }
  } catch (e) {}
}

