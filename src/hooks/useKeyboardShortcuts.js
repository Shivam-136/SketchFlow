import { useEffect } from 'react';
import { useCanvasStore } from '../store/canvasStore';

export function useKeyboardShortcuts() {
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const deleteSelected = useCanvasStore((s) => s.deleteSelected);
  const copySelected = useCanvasStore((s) => s.copySelected);
  const paste = useCanvasStore((s) => s.paste);
  const duplicateSelected = useCanvasStore((s) => s.duplicateSelected);
  const selectAll = useCanvasStore((s) => s.selectAll);
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const zoomIn = useCanvasStore((s) => s.zoomIn);
  const zoomOut = useCanvasStore((s) => s.zoomOut);
  const resetZoom = useCanvasStore((s) => s.resetZoom);
  const setIsSpacePressed = useCanvasStore((s) => s.setIsSpacePressed);
  const setShowShortcutsModal = useCanvasStore((s) => s.setShowShortcutsModal);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore shortcuts if focused on input or textarea
      const target = e.target;
      const isInputFocused =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (isInputFocused) {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Spacebar for hand tool panning
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
        return;
      }

      // Modifier combinations
      if (cmdOrCtrl) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
          return;
        }

        if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          redo();
          return;
        }

        if (e.key === 'c' || e.key === 'C') {
          e.preventDefault();
          copySelected();
          return;
        }

        if (e.key === 'v' || e.key === 'V') {
          e.preventDefault();
          paste();
          return;
        }

        if (e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          duplicateSelected();
          return;
        }

        if (e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          selectAll();
          return;
        }

        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          zoomIn();
          return;
        }

        if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          zoomOut();
          return;
        }

        if (e.key === '0') {
          e.preventDefault();
          resetZoom();
          return;
        }
      }

      // Single Key Tool Shortcuts
      switch (e.key.toLowerCase()) {
        case 'v':
        case '1':
          e.preventDefault();
          setActiveTool('selection');
          break;
        case 'h':
          e.preventDefault();
          setActiveTool('hand');
          break;
        case 'r':
        case '2':
          e.preventDefault();
          setActiveTool('rectangle');
          break;
        case 'o':
        case '3':
          e.preventDefault();
          setActiveTool('circle');
          break;
        case 'd':
        case '4':
          e.preventDefault();
          setActiveTool('diamond');
          break;
        case 'a':
        case '5':
          e.preventDefault();
          setActiveTool('arrow');
          break;
        case 'l':
        case '6':
          e.preventDefault();
          setActiveTool('line');
          break;
        case 'p':
        case '7':
          e.preventDefault();
          setActiveTool('pencil');
          break;
        case 't':
        case '8':
          e.preventDefault();
          setActiveTool('text');
          break;
        case 'e':
        case '9':
          e.preventDefault();
          setActiveTool('eraser');
          break;
        case 'delete':
        case 'backspace':
          e.preventDefault();
          deleteSelected();
          break;
        case 'escape':
          e.preventDefault();
          clearSelection();
          setActiveTool('selection');
          break;
        case '?':
          e.preventDefault();
          setShowShortcutsModal(true);
          break;
        default:
          break;
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    const handleBlur = () => {
      setIsSpacePressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [
    setActiveTool,
    undo,
    redo,
    deleteSelected,
    copySelected,
    paste,
    duplicateSelected,
    selectAll,
    clearSelection,
    zoomIn,
    zoomOut,
    resetZoom,
    setIsSpacePressed,
    setShowShortcutsModal
  ]);
}
