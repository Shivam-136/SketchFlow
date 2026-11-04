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
  FolderArchive,
  MoreVertical,
  X,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import { useThemeStore } from '../../store/themeStore';
import { useIsMobile } from '../../hooks/useMediaQuery';
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
  const isMobile = useIsMobile();
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

  const themePreference = useThemeStore((s) => s.themePreference);
  const setThemePreference = useThemeStore((s) => s.setThemePreference);

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const fileInputRef = useRef(null);

  const handleExportPNG = () => {
    setIsExportOpen(false);
    setIsMobileMenuOpen(false);
    exportToPNG(elements, { backgroundColor: '#ffffff', scale: 2 });
  };

  const handleExportSVG = () => {
    setIsExportOpen(false);
    setIsMobileMenuOpen(false);
    exportToSVG(elements, { backgroundColor: '#ffffff' });
  };

  const handleExportJSON = () => {
    setIsExportOpen(false);
    setIsMobileMenuOpen(false);
    exportToJSON(elements, { gridType });
  };

  const handleExportProject = async () => {
    setIsExportOpen(false);
    setIsMobileMenuOpen(false);
    await exportProjectToJSON();
  };

  const handleImportClick = () => {
    setIsMobileMenuOpen(false);
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
    <header className="fixed top-2 sm:top-3 left-2 sm:left-4 right-2 sm:right-4 z-40 flex items-center justify-between pointer-events-none">
      {/* Hidden file input for JSON / Project import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.sketchflow,.sketchflow-project"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Brand logo & board navigation */}
      <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
        <div className="flex items-center gap-2 sm:gap-2.5 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl shadow-sketch border border-zinc-200/80 dark:border-zinc-800 transition-colors duration-200">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <PenTool className="w-3.5 h-3.5 sm:w-4 sm:h-4 transform -rotate-45" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-zinc-900 dark:text-zinc-100 tracking-tight text-xs sm:text-sm">SketchFlow</span>
              <span className="hidden sm:inline-block text-[10px] uppercase font-semibold tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900/60">
                Whiteboard
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-[11px] text-zinc-400 dark:text-zinc-500">
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
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-2xl shadow-sketch border border-zinc-200/80 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all group active:scale-95"
            aria-label="Manage boards"
          >
            <div className="w-5 h-5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform flex-shrink-0">
              <LayoutGrid className="w-3.5 h-3.5" />
            </div>
            <span className="max-w-[85px] sm:max-w-[150px] truncate font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {activeBoardName || 'Untitled Board'}
            </span>
            <ChevronDown className="w-3 h-3 text-zinc-400 group-hover:text-indigo-500 transition-colors flex-shrink-0" />
          </button>
        </Tooltip>
      </div>

      {/* Desktop Top-right actions: Import, Export, Clear, Theme, Shortcuts */}
      <div className="hidden md:flex items-center gap-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-sketch border border-zinc-200/80 dark:border-zinc-800 pointer-events-auto transition-colors duration-200">
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
            <span>Clear</span>
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

      {/* Mobile Right: Menu button (min 44x44 touch target) */}
      <div className="flex md:hidden items-center pointer-events-auto">
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md shadow-sketch border border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 active:scale-95 transition-all"
          aria-label="Open mobile menu"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile Actions Drawer / Sheet */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 pointer-events-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-zinc-900/40 dark:bg-black/60 backdrop-blur-xs animate-in fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Slide-out Panel */}
          <aside
            aria-label="Mobile Navigation Menu"
            className="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-white dark:bg-zinc-900 shadow-sketch-lg border-l border-zinc-200 dark:border-zinc-800 flex flex-col p-5 animate-in slide-in-from-right duration-200 overflow-y-auto text-zinc-800 dark:text-zinc-100"
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-sm">
                  <PenTool className="w-4 h-4 transform -rotate-45" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">SketchFlow</h3>
                  <div className="flex items-center gap-1 text-[11px] text-zinc-400 dark:text-zinc-500">
                    {saveStatus === 'saving' ? (
                      <span className="text-amber-500 font-medium">Saving...</span>
                    ) : saveStatus === 'error' ? (
                      <span className="text-rose-500 font-medium">Save failed</span>
                    ) : (
                      <span className="text-emerald-500 font-medium">Auto-saved</span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-xl"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu Sections */}
            <div className="flex flex-col gap-4 py-4">
              {/* Board Management */}
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider mb-1.5 block">
                  Current Whiteboard
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setShowBoardManager(true);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <LayoutGrid className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate max-w-[150px]">
                      {activeBoardName || 'Untitled Board'}
                    </span>
                  </div>
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">Manage</span>
                </button>
              </div>

              {/* Export Actions */}
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider mb-1.5 block">
                  Export
                </span>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={handleExportPNG}
                    className="flex items-center gap-2.5 p-2.5 text-xs rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 font-medium text-left transition-colors"
                  >
                    <FileImage className="w-4 h-4 text-indigo-500" />
                    <span>Export as PNG</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportSVG}
                    className="flex items-center gap-2.5 p-2.5 text-xs rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 font-medium text-left transition-colors"
                  >
                    <Code2 className="w-4 h-4 text-emerald-500" />
                    <span>Export as SVG</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportJSON}
                    className="flex items-center gap-2.5 p-2.5 text-xs rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 font-medium text-left transition-colors"
                  >
                    <FileJson className="w-4 h-4 text-amber-500" />
                    <span>Export Single Board (.sketchflow)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportProject}
                    className="flex items-center gap-2.5 p-2.5 text-xs rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-indigo-600 dark:text-indigo-400 font-medium text-left transition-colors"
                  >
                    <FolderArchive className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Export Complete Project</span>
                  </button>
                </div>
              </div>

              {/* Import & Clear */}
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider mb-1.5 block">
                  File Actions
                </span>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={handleImportClick}
                    className="flex items-center gap-2.5 p-2.5 text-xs rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 font-medium text-left transition-colors"
                  >
                    <Upload className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                    <span>Import Board or Project</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setShowClearModal(true);
                    }}
                    className="flex items-center gap-2.5 p-2.5 text-xs rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-medium text-left transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-rose-500" />
                    <span>Clear Canvas</span>
                  </button>
                </div>
              </div>

              {/* Theme Preference */}
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider mb-1.5 block">
                  Theme
                </span>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                  {[
                    { id: 'light', label: 'Light', icon: Sun },
                    { id: 'dark', label: 'Dark', icon: Moon },
                    { id: 'system', label: 'System', icon: Monitor }
                  ].map((t) => {
                    const Icon = t.icon;
                    const isActive = themePreference === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setThemePreference(t.id)}
                        className={`flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-all ${
                          isActive
                            ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                            : 'text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Help & Shortcuts */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setShowShortcutsModal(true);
                  }}
                  className="w-full flex items-center gap-2.5 p-2.5 text-xs rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium text-left transition-colors"
                >
                  <HelpCircle className="w-4 h-4 text-zinc-400" />
                  <span>Keyboard Shortcuts & Help</span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}

