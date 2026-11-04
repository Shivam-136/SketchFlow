import React from 'react';
import { Tooltip } from './Tooltip';

export function IconButton({
  icon: Icon,
  label,
  shortcut,
  isActive = false,
  onClick,
  disabled = false,
  className = '',
  size = 'md',
  position = 'bottom'
}) {
  const sizeClasses = {
    sm: 'w-8 h-8 p-1.5',
    md: 'w-9 h-9 p-2',
    lg: 'w-10 h-10 p-2.5',
  }[size];

  const buttonContent = (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`
        relative flex items-center justify-center rounded-lg transition-all duration-150 select-none
        ${sizeClasses}
        ${
          isActive
            ? 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 shadow-sm border border-indigo-200 dark:border-indigo-800 font-medium'
            : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80 active:bg-zinc-200/80 dark:active:bg-zinc-700/80'
        }
        ${disabled ? 'opacity-40 cursor-not-allowed hover:bg-transparent text-zinc-400 dark:text-zinc-600' : 'cursor-pointer'}
        ${className}
      `}
    >
      <Icon className="w-full h-full" strokeWidth={isActive ? 2.2 : 1.8} />
      {shortcut && (
        <span className="absolute bottom-0.5 right-1 text-[9px] font-mono text-zinc-400 dark:text-zinc-500 pointer-events-none opacity-80">
          {shortcut}
        </span>
      )}
    </button>
  );

  if (label || shortcut) {
    return (
      <Tooltip text={label} shortcut={shortcut} position={position}>
        {buttonContent}
      </Tooltip>
    );
  }

  return buttonContent;
}

