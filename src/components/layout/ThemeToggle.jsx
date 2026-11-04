import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';
import { Tooltip } from '../common/Tooltip';

export function ThemeToggle() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const themePreference = useThemeStore((s) => s.themePreference);
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme);
  const setThemePreference = useThemeStore((s) => s.setThemePreference);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('pointerdown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const themeOptions = [
    {
      id: 'light',
      label: 'Light',
      description: 'Clean light theme',
      icon: Sun,
      iconClass: 'text-amber-500'
    },
    {
      id: 'dark',
      label: 'Dark',
      description: 'Contrast dark theme',
      icon: Moon,
      iconClass: 'text-indigo-400'
    },
    {
      id: 'system',
      label: 'System',
      description: 'Follows OS preference',
      icon: Monitor,
      iconClass: 'text-zinc-500 dark:text-zinc-400'
    }
  ];

  // Active Icon to show on the button
  const ActiveIcon =
    themePreference === 'light'
      ? Sun
      : themePreference === 'dark'
      ? Moon
      : Monitor;

  const tooltipLabel =
    themePreference === 'light'
      ? 'Theme: Light'
      : themePreference === 'dark'
      ? 'Theme: Dark'
      : `Theme: System (${resolvedTheme === 'dark' ? 'Dark' : 'Light'})`;

  return (
    <div className="relative" ref={dropdownRef}>
      <Tooltip text={tooltipLabel} position="bottom">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={tooltipLabel}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          className="p-1.5 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80 rounded-lg transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        >
          <ActiveIcon
            className={`w-4 h-4 transition-transform duration-200 ${
              themePreference === 'light'
                ? 'text-amber-500'
                : themePreference === 'dark'
                ? 'text-indigo-400'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          />
        </button>
      </Tooltip>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Select theme"
          className="absolute right-0 mt-2 w-44 bg-white dark:bg-zinc-900 rounded-xl shadow-sketch-lg border border-zinc-200/80 dark:border-zinc-800 py-1.5 z-50 animate-in fade-in zoom-in-95"
        >
          <div className="px-3 py-1 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
            Theme
          </div>
          {themeOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = themePreference === opt.id;
            return (
              <button
                key={opt.id}
                role="option"
                aria-selected={isSelected}
                type="button"
                onClick={() => {
                  setThemePreference(opt.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors text-left ${
                  isSelected
                    ? 'bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-medium'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${opt.iconClass}`} />
                  <div>
                    <div>{opt.label}</div>
                    <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-normal">
                      {opt.description}
                    </div>
                  </div>
                </div>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

