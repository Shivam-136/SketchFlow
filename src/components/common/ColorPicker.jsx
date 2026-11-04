import React, { useRef } from 'react';
import { Ban, Pipette } from 'lucide-react';

const PRESET_COLORS = [
  '#1e1e1e', // Dark slate / Charcoal
  '#4b5563', // Slate gray
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber / Gold
  '#10b981', // Emerald / Green
  '#06b6d4', // Cyan
  '#3b82f6', // Indigo / Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#d97706', // Brownish
  '#ffffff', // White
];

export function ColorPicker({
  value,
  onChange,
  allowTransparent = false,
  label
}) {
  const customColorInputRef = useRef(null);

  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{label}</span>}
      <div className="flex items-center flex-wrap gap-1.5">
        {allowTransparent && (
          <button
            type="button"
            onClick={() => onChange('transparent')}
            title="Transparent"
            className={`
              w-6 h-6 rounded-md flex items-center justify-center border transition-transform
              ${value === 'transparent' ? 'ring-2 ring-indigo-500 ring-offset-1 border-transparent scale-105' : 'border-zinc-300 dark:border-zinc-700 hover:scale-105'}
              bg-white dark:bg-zinc-800 relative overflow-hidden
            `}
          >
            <Ban className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
          </button>
        )}

        {PRESET_COLORS.map((color) => {
          const isSelected = value.toLowerCase() === color.toLowerCase();
          const isWhite = color.toLowerCase() === '#ffffff';
          const isCharcoal = color.toLowerCase() === '#1e1e1e';
          return (
            <button
              key={color}
              type="button"
              onClick={() => onChange(color)}
              title={color}
              style={{ backgroundColor: color }}
              className={`
                w-6 h-6 rounded-md border transition-transform
                ${
                  isSelected
                    ? 'ring-2 ring-indigo-500 ring-offset-1 border-transparent scale-105 shadow-sm'
                    : isWhite
                    ? 'border-zinc-300 dark:border-zinc-600 hover:scale-105'
                    : isCharcoal
                    ? 'border-zinc-300 dark:border-zinc-700 hover:scale-105'
                    : 'border-zinc-200/80 dark:border-zinc-700/80 hover:scale-105'
                }
              `}
            />
          );
        })}

        {/* Custom Color Native Picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => customColorInputRef.current?.click()}
            title="Custom Color"
            className="w-6 h-6 rounded-md border border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <Pipette className="w-3 h-3" />
          </button>
          <input
            ref={customColorInputRef}
            type="color"
            value={value && value !== 'transparent' ? value : '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer pointer-events-none"
            tabIndex={-1}
          />
        </div>
      </div>
    </div>
  );
}

