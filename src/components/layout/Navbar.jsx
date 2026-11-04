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
  ChevronDown,
  LayoutGrid,
  Loader2,
  AlertCircle,
  FolderArchive
} from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import {
  exportToPNG,
  exportToSVG,
  exportToJSON,
  exportProjectToJSON,
  importFromJSON,
  importProjectFromJSON
} from '../../utils/exportUtils';
import { Tooltip } from '../common/Tooltip';
import { ThemeToggle } from './ThemeToggle';

export function Navbar() {
  const elements = useCanvasStore((s) => s.elements);
  const gridType = useCanvasStore((s) => s.gridType);
  const setShowClearModal = useCanvasStore((s) => s.setShowClearModal);
  const setShowShortcutsModal = useCanvasStore((s) => s.setShowShortcutsModal);
  const loadDrawing = useCanvasStore((s) => s.loadDrawing);
  const activeBoardName = useCanvasStore((s) => s.activeBoardName);
  const saveStatus = useCanvasStore((s) => s.saveStatus);
  const setShowBoardManager = useCanvasStore((s) => s.setShowBoardManager);
  const switchBoard = useCanvasStore((s) => s.switchBoard);
  const refreshBoardsList = useCanvasStore((s) => s.refreshBoardsList);

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

  const handleExportProject = async () => {
    setIsExportOpen(false);
    await exportProjectToJSON();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result;
        if (typeof content === 'string') {
          const parsed = JSON.parse(content);
          if (parsed && (parsed.type === 'sketchflow-project' || Array.isArray(parsed.boards))) {
            const projectResult = await importProjectFromJSON(content);
            await refreshBoardsList();
            if (projectResult.activeBoardId) {
              await switchBoard(projectResult.activeBoardId);
            }
          } else {
            const { elements: loadedElements, appState } = importFromJSON(content);
            loadDrawing(loadedElements, appState);
          }
        }
      } catch (err) {
        alert(err.message || 'Failed to import file.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  return (
    <header className="fixed top-3 left-4 right-4 z-40 flex items-center justify-between pointer-events-none">
      {/* Brand logo & board navigation */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2.5 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-sketch border border-zinc-200/80 dark:border-zinc-800 pointer-events-auto transition-colors duration-200">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-sm">
            <PenTool className="w-4 h-4 transform -rotate-45" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-zinc-900 dark:text-zinc-100 tracking-tight text-sm">SketchFlow</span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900/60">
                Whiteboard
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-zinc-400 dark:text-zinc-500">
              {saveStatus === 'saving' ? (
                <>
                  <Loader2 className="w-3 h-3 text-amber-500 animate-spin" />
                  <span className="text-amber-600 dark:text-amber-400 font-medium">Saving...</span>
                </>
              ) : saveStatus === 'error' ? (
                <>
                  <AlertCircle className="w-3 h-3 text-rose-500" />
                  <span className="text-rose-600 dark:text-rose-400 font-medium">Save failed</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>Auto-saved locally</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Board switcher pill button */}
        <Tooltip text="Manage all whiteboards" position="bottom">
          <button
            type="button"
            onClick={() => setShowBoardManager(true)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-2xl shadow-sketch border border-zinc-200/80 dark:border-zinc-800 pointer-events-auto hover:border-indigo-300 dark:hover:border-indigo-800 transition-all group active:scale-95"
            aria-label="Manage boards"
          >
            <div className="w-5 h-5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
              <LayoutGrid className="w-3.5 h-3.5" />
            </div>
            <span className="max-w-[120px] sm:max-w-[170px] truncate font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {activeBoardName || 'Untitled Board'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 group-hover:text-indigo-500 transition-colors" />
          </button>
        </Tooltip>
      </div>

      {/* Top right actions: Import, Export, Clear, Theme, Shortcuts */}
      <div className="flex items-center gap-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-sketch border border-zinc-200/80 dark:border-zinc-800 pointer-events-auto transition-colors duration-200">
        {/* Hidden file input for JSON / Project import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.sketchflow,.sketchflow-project"
          onChange={handleFileChange}
          className="hidden"
        />

        <Tooltip text="Import Board or Project (.sketchflow, .sketchflow-project)" position="bottom">
          <button
            type="button"
            onClick={handleImportClick}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80 rounded-lg transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
            <span>Import</span>
          </button>
        </Tooltip>

        {/* Export dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsExportOpen(!isExportOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
            <span>Export</span>
            <ChevronDown className="w-3 h-3 text-zinc-400" />
          </button>

          {isExportOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsExportOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-900 rounded-xl shadow-sketch-lg border border-zinc-200/80 dark:border-zinc-800 py-1.5 z-50 animate-in fade-in zoom-in-95">
                <button
                  type="button"
                  onClick={handleExportPNG}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-zinc-700 dark:text-zinc-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors text-left"
                >
                  <FileImage className="w-4 h-4 text-indigo-500" />
                  <div>
                    <div className="font-medium">Export as PNG</div>
                    <div className="text-[10px] text-zinc-400 dark:text-zinc-500">Current board high-res image</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={handleExportSVG}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-zinc-700 dark:text-zinc-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors text-left"
                >
                  <Code2 className="w-4 h-4 text-emerald-500" />
                  <div>
                    <div className="font-medium">Export as SVG</div>
                    <div className="text-[10px] text-zinc-400 dark:text-zinc-500">Current board vector graphic</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-zinc-700 dark:text-zinc-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors text-left"
                >
                  <FileJson className="w-4 h-4 text-amber-500" />
                  <div>
                    <div className="font-medium">Export Single Board (.sketchflow)</div>
                    <div className="text-[10px] text-zinc-400 dark:text-zinc-500">Active board drawings & assets</div>
                  </div>
                </button>
                <div className="h-[1px] bg-zinc-100 dark:bg-zinc-800 my-1" />
                <button
                  type="button"
                  onClick={handleExportProject}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors text-left"
                >
                  <FolderArchive className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <div className="font-semibold">Export Complete Project</div>
                    <div className="text-[10px] text-zinc-400 dark:text-zinc-500">All boards (.sketchflow-project)</div>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>

        <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 my-auto" />

        <Tooltip text="Clear Canvas" position="bottom">
          <button
            type="button"
            onClick={() => setShowClearModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </Tooltip>

        <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 my-auto" />

        {/* Theme Switching Toggle */}
        <ThemeToggle />

        <Tooltip text="Keyboard Shortcuts (?)" position="bottom">
          <button
            type="button"
            onClick={() => setShowShortcutsModal(true)}
            className="p-1.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80 rounded-lg transition-colors"
            aria-label="Help and shortcuts"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </Tooltip>
      </div>
    </header>
  );
}

