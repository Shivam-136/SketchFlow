import React, { useRef, useState } from 'react';
import {
  PenTool,
  Download,
  Upload,
  Trash2,
  HelpCircle,
  FileJson,
  FileImage,
  Code2,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import { exportToPNG, exportToSVG, exportToJSON, importFromJSON } from '../../utils/exportUtils';
import { Tooltip } from '../common/Tooltip';

export function Navbar() {
  const elements = useCanvasStore((s) => s.elements);
  const gridType = useCanvasStore((s) => s.gridType);
  const setShowClearModal = useCanvasStore((s) => s.setShowClearModal);
  const setShowShortcutsModal = useCanvasStore((s) => s.setShowShortcutsModal);
  const loadDrawing = useCanvasStore((s) => s.loadDrawing);

  const [isExportOpen, setIsExportOpen] = useState(false);
  const fileInputRef = useRef(null);

  const handleExportPNG = () => {
    setIsExportOpen(false);
    exportToPNG(elements, { backgroundColor: '#ffffff', scale: 2 });
  };

  const handleExportSVG = () => {
    setIsExportOpen(false);
    exportToSVG(elements, { backgroundColor: '#ffffff' });
  };

  const handleExportJSON = () => {
    setIsExportOpen(false);
    exportToJSON(elements, { gridType });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result;
        if (typeof content === 'string') {
          const { elements: loadedElements, appState } = importFromJSON(content);
          loadDrawing(loadedElements, appState);
        }
      } catch (err) {
        alert(err.message || 'Failed to import drawing.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  return (
    <header className="fixed top-3 left-4 right-4 z-40 flex items-center justify-between pointer-events-none">
      {/* Brand logo & title */}
      <div className="flex items-center gap-2.5 bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-sketch border border-zinc-200/80 pointer-events-auto">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-sm">
          <PenTool className="w-4 h-4 transform -rotate-45" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-zinc-900 tracking-tight text-sm">SketchFlow</span>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full border border-indigo-100">
              Whiteboard
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-zinc-400">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>Auto-saved locally</span>
          </div>
        </div>
      </div>

      {/* Top right actions: Import, Export, Clear, Shortcuts */}
      <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-sketch border border-zinc-200/80 pointer-events-auto">
        {/* Hidden file input for JSON import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.sketchflow"
          onChange={handleFileChange}
          className="hidden"
        />

        <Tooltip text="Import JSON (.sketchflow)" position="bottom">
          <button
            type="button"
            onClick={handleImportClick}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100/80 rounded-lg transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-zinc-500" />
            <span>Import</span>
          </button>
        </Tooltip>

        {/* Export dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsExportOpen(!isExportOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100/80 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-zinc-500" />
            <span>Export</span>
            <ChevronDown className="w-3 h-3 text-zinc-400" />
          </button>

          {isExportOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsExportOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-sketch-lg border border-zinc-200/80 py-1.5 z-50 animate-in fade-in zoom-in-95">
                <button
                  type="button"
                  onClick={handleExportPNG}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-zinc-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors text-left"
                >
                  <FileImage className="w-4 h-4 text-indigo-500" />
                  <div>
                    <div className="font-medium">Export as PNG</div>
                    <div className="text-[10px] text-zinc-400">High-resolution image</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={handleExportSVG}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-zinc-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors text-left"
                >
                  <Code2 className="w-4 h-4 text-emerald-500" />
                  <div>
                    <div className="font-medium">Export as SVG</div>
                    <div className="text-[10px] text-zinc-400">Scalable vector graphic</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-zinc-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors text-left"
                >
                  <FileJson className="w-4 h-4 text-amber-500" />
                  <div>
                    <div className="font-medium">Export as JSON</div>
                    <div className="text-[10px] text-zinc-400">SketchFlow project file</div>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>

        <div className="w-[1px] h-4 bg-zinc-200 my-auto" />

        <Tooltip text="Clear Canvas" position="bottom">
          <button
            type="button"
            onClick={() => setShowClearModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </Tooltip>

        <Tooltip text="Keyboard Shortcuts (?)" position="bottom">
          <button
            type="button"
            onClick={() => setShowShortcutsModal(true)}
            className="p-1.5 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100/80 rounded-lg transition-colors"
            aria-label="Help and shortcuts"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </Tooltip>
      </div>
    </header>
  );
}

