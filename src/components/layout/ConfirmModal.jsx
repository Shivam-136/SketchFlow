import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';

export function ConfirmModal() {
  const show = useCanvasStore((s) => s.showClearModal);
  const setShow = useCanvasStore((s) => s.setShowClearModal);
  const clearCanvas = useCanvasStore((s) => s.clearCanvas);

  if (!show) return null;

  const handleConfirm = () => {
    clearCanvas();
    setShow(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        className="fixed inset-0"
        onClick={() => setShow(false)}
      />
      <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-sketch-lg border border-zinc-200 dark:border-zinc-800 p-5 z-10 flex flex-col gap-4 animate-in zoom-in-95 text-zinc-800 dark:text-zinc-100 transition-colors duration-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-400 flex-shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Clear entire canvas?</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              This will remove all drawings and clear saved data from your browser storage. You can undo this action with Ctrl+Z if needed.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setShow(false)}
            className="px-3.5 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-1.5 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-sm"
          >
            Yes, Clear Canvas
          </button>
        </div>
      </div>
    </div>
  );
}

