import React from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Undo2,
  Redo2,
  Maximize2,
  Grid,
  Crosshair,
  Hash
} from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import { Tooltip } from '../common/Tooltip';

export function BottomBar({ canvasContainerRef }) {
  const zoom = useCanvasStore((s) => s.zoom);
  const zoomIn = useCanvasStore((s) => s.zoomIn);
  const zoomOut = useCanvasStore((s) => s.zoomOut);
  const resetZoom = useCanvasStore((s) => s.resetZoom);
  const centerCanvas = useCanvasStore((s) => s.centerCanvas);
  const fitToScreen = useCanvasStore((s) => s.fitToScreen);

  const historyIndex = useCanvasStore((s) => s.historyIndex);
  const history = useCanvasStore((s) => s.history);
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);

  const gridType = useCanvasStore((s) => s.gridType);
  const setGridType = useCanvasStore((s) => s.setGridType);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleFitToScreen = () => {
    if (canvasContainerRef?.current) {
      const rect = canvasContainerRef.current.getBoundingClientRect();
      fitToScreen(rect.width, rect.height);
    }
  };

  const cycleGridType = () => {
    if (gridType === 'dots') setGridType('lines');
    else if (gridType === 'lines') setGridType('none');
    else setGridType('dots');
  };

  return (
    <footer className="fixed bottom-3 left-4 right-4 z-40 flex items-center justify-between pointer-events-none select-none">
      {/* Bottom Left: Zoom & View controls */}
      <div className="flex items-center gap-1 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md px-2 py-1.5 rounded-2xl shadow-sketch border border-zinc-200/80 dark:border-zinc-800 pointer-events-auto transition-colors duration-200">
        <Tooltip text="Zoom Out" shortcut="Ctrl -" position="top">
          <button
            type="button"
            onClick={zoomOut}
            aria-label="Zoom out"
            className="p-1.5 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </Tooltip>

        <Tooltip text="Reset Zoom" shortcut="Ctrl 0" position="top">
          <button
            type="button"
            onClick={resetZoom}
            aria-label="Reset zoom"
            className="px-2 py-1 text-xs font-mono font-medium text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors min-w-[3rem] text-center"
          >
            {Math.round(zoom * 100)}%
          </button>
        </Tooltip>

        <Tooltip text="Zoom In" shortcut="Ctrl +" position="top">
          <button
            type="button"
            onClick={zoomIn}
            aria-label="Zoom in"
            className="p-1.5 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </Tooltip>

        <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-1" />

        <Tooltip text="Center Canvas" position="top">
          <button
            type="button"
            onClick={centerCanvas}
            aria-label="Center canvas"
            className="p-1.5 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </Tooltip>

        <Tooltip text="Fit to Screen" position="top">
          <button
            type="button"
            onClick={handleFitToScreen}
            aria-label="Fit to screen"
            className="p-1.5 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </Tooltip>
      </div>

      {/* Bottom Center: Undo / Redo */}
      <div className="flex items-center gap-1 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md px-2 py-1.5 rounded-2xl shadow-sketch border border-zinc-200/80 dark:border-zinc-800 pointer-events-auto transition-colors duration-200">
        <Tooltip text="Undo" shortcut="Ctrl Z" position="top">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            aria-label="Undo"
            className={`p-1.5 rounded-lg transition-colors ${
              canUndo
                ? 'text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
                : 'text-zinc-300 dark:text-zinc-600 cursor-not-allowed'
            }`}
          >
            <Undo2 className="w-4 h-4" />
          </button>
        </Tooltip>

        <Tooltip text="Redo" shortcut="Ctrl Shift Z" position="top">
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            aria-label="Redo"
            className={`p-1.5 rounded-lg transition-colors ${
              canRedo
                ? 'text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
                : 'text-zinc-300 dark:text-zinc-600 cursor-not-allowed'
            }`}
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </Tooltip>
      </div>

      {/* Bottom Right: Grid mode */}
      <div className="flex items-center gap-1 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md px-2 py-1.5 rounded-2xl shadow-sketch border border-zinc-200/80 dark:border-zinc-800 pointer-events-auto transition-colors duration-200">
        <Tooltip
          text={`Grid: ${gridType.charAt(0).toUpperCase() + gridType.slice(1)} (Click to toggle)`}
          position="top"
        >
          <button
            type="button"
            onClick={cycleGridType}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <Grid className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
            <span className="capitalize">{gridType}</span>
          </button>
        </Tooltip>
      </div>
    </footer>
  );
}

