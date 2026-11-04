import React, { useState } from 'react';

export function Tooltip({ text, shortcut, children, position = 'bottom' }) {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[position];

  return (
    <div
      className="relative flex items-center justify-center"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={`absolute ${positionClasses} z-50 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-white dark:text-zinc-100 bg-zinc-900 dark:bg-zinc-800 rounded-md shadow-lg border border-zinc-800 dark:border-zinc-700 whitespace-nowrap animate-in fade-in duration-100`}
        >
          <span>{text}</span>
          {shortcut && (
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-zinc-300 dark:text-zinc-300 bg-zinc-800 dark:bg-zinc-700 rounded border border-zinc-700 dark:border-zinc-600">
              {shortcut}
            </kbd>
          )}
        </div>
      )}
    </div>
  );
}

