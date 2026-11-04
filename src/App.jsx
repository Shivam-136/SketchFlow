import React, { useRef } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Toolbar } from './components/layout/Toolbar';
import { PropertiesPanel } from './components/layout/PropertiesPanel';
import { BottomBar } from './components/layout/BottomBar';
import { ShortcutsModal } from './components/layout/ShortcutsModal';
import { ConfirmModal } from './components/layout/ConfirmModal';
import { Whiteboard } from './components/canvas/Whiteboard';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

export default function App() {
  // Initialize global keyboard shortcuts (V, H, R, O, D, A, L, P, T, E, Ctrl+Z, Ctrl+C, etc.)
  useKeyboardShortcuts();

  const containerRef = useRef(null);

  return (
    <div ref={containerRef} className="relative w-screen h-screen overflow-hidden select-none bg-[#fbfbfa] dark:bg-[#121212] text-zinc-800 dark:text-zinc-100 transition-colors duration-200">
      {/* Top Navbar */}
      <Navbar />

      {/* Floating Center Toolbar */}
      <Toolbar />

      {/* Left Properties Panel */}
      <PropertiesPanel />

      {/* Main Interactive Canvas */}
      <main className="w-full h-full">
        <Whiteboard />
      </main>

      {/* Bottom Bar: Zoom, Undo/Redo, Grid Mode */}
      <BottomBar canvasContainerRef={containerRef} />

      {/* Modals */}
      <ShortcutsModal />
      <ConfirmModal />
    </div>
  );
}

