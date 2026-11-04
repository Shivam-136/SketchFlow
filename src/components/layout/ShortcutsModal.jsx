import React from 'react';
import { X, Command, Sparkles } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';

const SHORTCUT_GROUPS = [
  {
    category: 'Drawing Tools',
    shortcuts: [
      { key: 'V', desc: 'Selection Tool' },
      { key: 'H', desc: 'Hand Tool (Pan Canvas)' },
      { key: 'R', desc: 'Rectangle' },
      { key: 'O', desc: 'Circle / Ellipse' },
      { key: 'D', desc: 'Diamond' },
      { key: 'A', desc: 'Arrow' },
      { key: 'L', desc: 'Line' },
      { key: 'P', desc: 'Pencil (Freehand)' },
      { key: 'T', desc: 'Text' },
      { key: '9', desc: 'Upload Image' },
      { key: 'E', desc: 'Eraser' },
    ]
  },
  {
    category: 'Editing & Actions',
    shortcuts: [
      { key: 'Del / Backspace', desc: 'Delete Selected' },
      { key: 'Ctrl + Z', desc: 'Undo' },
      { key: 'Ctrl + Shift + Z', desc: 'Redo' },
      { key: 'Ctrl + C', desc: 'Copy Elements' },
      { key: 'Ctrl + V', desc: 'Paste Elements' },
      { key: 'Ctrl + D', desc: 'Duplicate Elements' },
      { key: 'Ctrl + A', desc: 'Select All' },
      { key: 'Esc', desc: 'Deselect / Cancel' },
    ]
  },
  {
    category: 'Navigation & Canvas',
    shortcuts: [
      { key: 'Space + Drag', desc: 'Pan Canvas' },
      { key: 'Middle Click', desc: 'Pan Canvas' },
      { key: 'Mouse Wheel', desc: 'Zoom In / Out' },
      { key: 'Ctrl + (+ / -)', desc: 'Zoom In / Out' },
      { key: 'Ctrl + 0', desc: 'Reset Zoom (100%)' },
      { key: '?', desc: 'Show Shortcuts' },
    ]
  }
];

export function ShortcutsModal() {
  const show = useCanvasStore((s) => s.showShortcutsModal);
  const setShow = useCanvasStore((s) => s.setShowShortcutsModal);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        className="fixed inset-0"
        onClick={() => setShow(false)}
      />
      <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-sketch-lg border border-zinc-200 dark:border-zinc-800 p-6 z-10 max-h-[85vh] flex flex-col animate-in zoom-in-95 text-zinc-800 dark:text-zinc-100 transition-colors duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Keyboard Shortcuts</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Quickly navigate and draw using standard key commands</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShow(false)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4 overflow-y-auto">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.category} className="flex flex-col gap-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                {group.category}
              </h3>
              <div className="flex flex-col gap-2">
                {group.shortcuts.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between text-xs py-1 px-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                  >
                    <span className="text-zinc-600 dark:text-zinc-300 truncate pr-2">{item.desc}</span>
                    <kbd className="px-2 py-0.5 font-mono text-[11px] bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded border border-zinc-200/80 dark:border-zinc-700 shadow-2xs whitespace-nowrap">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
          <button
            type="button"
            onClick={() => setShow(false)}
            className="px-4 py-2 text-xs font-medium text-white bg-zinc-900 dark:bg-zinc-800 hover:bg-zinc-800 dark:hover:bg-zinc-700 rounded-xl transition-colors shadow-sm border border-transparent dark:border-zinc-700"
          >
            Got it, thanks
          </button>
        </div>
      </div>
    </div>
  );
}

