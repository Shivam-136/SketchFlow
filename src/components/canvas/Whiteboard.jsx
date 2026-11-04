import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useCanvasStore } from '../../store/canvasStore.js';
import { useThemeStore } from '../../store/themeStore.js';
import { DrawingEngine } from './DrawingEngine.js';
import { renderElementOnContext, renderSelectionBox, renderMarquee } from './CanvasRenderer.js';
import { screenToCanvas, canvasToScreen, drawGrid, measureText, generateId } from '../../utils/canvasUtils.js';
import { getElementsBounds } from '../../utils/geometryUtils.js';
import { hitTestElement } from '../../utils/hitTestUtils.js';
import { registerRedrawCallback } from '../../utils/imageStorage.js';
import { isSupportedImageFile, createImageElementFromFile } from '../../utils/imageUtils.js';

export function Whiteboard() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const textareaRef = useRef(null);

  // Store bindings
  const elements = useCanvasStore((s) => s.elements);
  const selectedIds = useCanvasStore((s) => s.selectedIds);
  const activeTool = useCanvasStore((s) => s.activeTool);
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);
  const toolProperties = useCanvasStore((s) => s.toolProperties);
  const panOffset = useCanvasStore((s) => s.panOffset);
  const setPanOffset = useCanvasStore((s) => s.setPanOffset);
  const zoom = useCanvasStore((s) => s.zoom);
  const setZoom = useCanvasStore((s) => s.setZoom);
  const gridType = useCanvasStore((s) => s.gridType);
  const isSpacePressed = useCanvasStore((s) => s.isSpacePressed);
  const addElement = useCanvasStore((s) => s.addElement);
  const updateElement = useCanvasStore((s) => s.updateElement);
  const deleteElement = useCanvasStore((s) => s.deleteElement);
  const setSelectedIds = useCanvasStore((s) => s.setSelectedIds);

  // Theme binding
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme);

  // Engine instance
  const engineRef = useRef(null);
  if (!engineRef.current) {
    engineRef.current = new DrawingEngine(useCanvasStore);
  }

  // Pointer & Touch State Refs (synchronous tracking to avoid React useState latency)
  const isPointerDownRef = useRef(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, initialPan: { x: 0, y: 0 } });
  const activePointersRef = useRef(new Map());
  const pinchStartRef = useRef(null);
  const textClickDownRef = useRef(null);
  const isCancelingRef = useRef(false);
  const isCommittingRef = useRef(false);
  const [cursorStyle, setCursorStyle] = useState('default');

  // Text inline editing overlay state
  const [editingText, setEditingText] = useState(null);

  // Canvas size state
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Update canvas sizing using ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Main Render Loop
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = dimensions;

    // Adjust canvas resolution for high-DPI
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // 1. Clear background according to active theme
    const isDark = resolvedTheme === 'dark';
    ctx.fillStyle = isDark ? '#121212' : '#fbfbfa';
    ctx.fillRect(0, 0, width, height);

    // 2. Draw subtle background grid
    drawGrid(ctx, width, height, panOffset, zoom, gridType, isDark);

    // 3. Viewport transform
    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoom, zoom);

    // 4. Render all persistent elements (skip currently edited text element from canvas draw)
    for (const el of elements) {
      if (editingText && editingText.id === el.id) continue;
      renderElementOnContext(ctx, el);
    }

    // 5. Render live preview element while drawing
    if (engineRef.current.previewElement) {
      renderElementOnContext(ctx, engineRef.current.previewElement);
    }

    // 6. Render selection box & handles
    const selectedElements = elements.filter((e) => selectedIds.includes(e.id));
    if (selectedElements.length > 0 && activeTool === 'selection') {
      const bounds = getElementsBounds(selectedElements);
      renderSelectionBox(ctx, bounds, zoom);
    }

    // 7. Render marquee selection box
    const selectionTool = engineRef.current.getTool('selection');
    if (selectionTool.mode === 'marquee' && selectionTool.marqueeBox) {
      renderMarquee(ctx, selectionTool.marqueeBox);
    }

    ctx.restore();
    ctx.restore();
  }, [dimensions, elements, selectedIds, activeTool, panOffset, zoom, gridType, editingText, resolvedTheme]);

  // Re-render whenever dependencies change
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Re-render whenever an image asset finishes loading asynchronously
  useEffect(() => {
    return registerRedrawCallback(() => {
      renderCanvas();
    });
  }, [renderCanvas]);

  // Handle image files pasted from clipboard (Ctrl + V)
  useEffect(() => {
    const handlePaste = async (e) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.isContentEditable)
      ) {
        return;
      }

      const items = Array.from(e.clipboardData?.items || []);
      const imageItems = items.filter((item) => item.type && item.type.startsWith('image/'));

      if (imageItems.length > 0) {
        e.preventDefault();
        e.stopPropagation();

        const centerScreen = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const centerCanvas = screenToCanvas(centerScreen.x, centerScreen.y, panOffset, zoom);

        for (let i = 0; i < imageItems.length; i++) {
          const file = imageItems[i].getAsFile();
          if (file) {
            try {
              const offsetPoint = {
                x: centerCanvas.x + i * 25,
                y: centerCanvas.y + i * 25
              };
              const newEl = await createImageElementFromFile(file, offsetPoint);
              addElement(newEl);
              setSelectedIds([newEl.id]);
              setActiveTool('selection');
            } catch (err) {
              alert(err.message || 'Failed to paste image.');
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [panOffset, zoom, addElement, setSelectedIds, setActiveTool]);

  // Transform client coordinates to canvas world coordinates
  const getCanvasPoint = (clientX, clientY) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;
    return screenToCanvas(screenX, screenY, panOffset, zoom);
  };

  // Open inline text editor at a given point
  const openTextEditor = (canvasPoint, existingElement = null) => {
    const toolProps = toolProperties;
    if (existingElement) {
      setEditingText({
        id: existingElement.id,
        x: existingElement.x,
        y: existingElement.y,
        text: existingElement.text || '',
        originalText: existingElement.text || '',
        fontSize: existingElement.fontSize || toolProps.fontSize,
        fontFamily: existingElement.fontFamily || toolProps.fontFamily,
        color: existingElement.strokeColor || toolProps.strokeColor,
        textAlign: existingElement.textAlign || toolProps.textAlign
      });
      setSelectedIds([existingElement.id]);
    } else {
      setEditingText({
        id: null,
        x: canvasPoint.x,
        y: canvasPoint.y,
        text: '',
        originalText: '',
        fontSize: toolProps.fontSize,
        fontFamily: toolProps.fontFamily,
        color: toolProps.strokeColor,
        textAlign: toolProps.textAlign
      });
    }
  };

  // Commit text editing (permanent canvas element)
  const commitTextEditor = () => {
    if (isCancelingRef.current || isCommittingRef.current || !editingText) return;
    isCommittingRef.current = true;

    const trimmed = (editingText.text || '').trim();

    if (editingText.id) {
      // Editing existing text element
      if (trimmed.length > 0) {
        const metrics = measureText(
          editingText.text,
          editingText.fontSize,
          editingText.fontFamily
        );
        updateElement(
          editingText.id,
          {
            text: editingText.text,
            width: metrics.width,
            height: metrics.height,
            fontSize: editingText.fontSize,
            fontFamily: editingText.fontFamily,
            strokeColor: editingText.color,
            textAlign: editingText.textAlign
          },
          true
        );
      } else {
        // Text cleared completely -> delete element
        deleteElement(editingText.id);
      }
    } else {
      // Creating new text element
      if (trimmed.length > 0) {
        const metrics = measureText(
          editingText.text,
          editingText.fontSize,
          editingText.fontFamily
        );
        const newEl = {
          id: generateId(),
          type: 'text',
          x: editingText.x,
          y: editingText.y,
          width: metrics.width,
          height: metrics.height,
          text: editingText.text,
          fontSize: editingText.fontSize,
          fontFamily: editingText.fontFamily,
          strokeColor: editingText.color,
          textAlign: editingText.textAlign,
          opacity: toolProperties.opacity
        };
        addElement(newEl);
        setSelectedIds([newEl.id]);
      }
    }

    setEditingText(null);
    if (activeTool === 'text') {
      setActiveTool('selection');
    }
    setTimeout(() => {
      isCommittingRef.current = false;
    }, 80);
  };

  // Cancel text editing (Escape key cancels)
  const cancelTextEditor = () => {
    isCancelingRef.current = true;
    setEditingText(null);
    if (activeTool === 'text') {
      setActiveTool('selection');
    }
    setTimeout(() => {
      isCancelingRef.current = false;
    }, 80);
  };

  // POINTER DOWN
  const handlePointerDown = (e) => {
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Multi-touch pinch-to-zoom detection
    if (activePointersRef.current.size === 2) {
      const pts = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      pinchStartRef.current = {
        distance: Math.max(10, dist),
        zoom,
        panOffset: { ...panOffset },
        midPoint: mid
      };
      // Cancel any accidental 1-finger stroke started when finger 1 hit before finger 2
      if (engineRef.current.previewElement) {
        engineRef.current.previewElement = null;
      }
      if (engineRef.current.getTool('selection').mode !== 'idle') {
        engineRef.current.getTool('selection').mode = 'idle';
      }
      isPointerDownRef.current = false;
      renderCanvas();
      return;
    }

    // If text editor is open and clicked canvas outside, commit text and stop
    if (editingText) {
      commitTextEditor();
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const canvasPoint = screenToCanvas(screenPoint.x, screenPoint.y, panOffset, zoom);

    // Pan canvas via Spacebar, Middle click, or Hand tool
    if (isSpacePressed || e.button === 1 || activeTool === 'hand') {
      isPanningRef.current = true;
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        initialPan: { ...panOffset }
      };
      setCursorStyle('grabbing');
      return;
    }

    // Only handle primary left click
    if (e.button !== 0) return;

    // For Text Tool: do not capture pointer, record start click position
    if (activeTool === 'text') {
      textClickDownRef.current = { x: e.clientX, y: e.clientY, canvasPoint };
      return;
    }

    // For drawing/selection tools: capture pointer to enable smooth dragging beyond boundaries
    try {
      e.target.setPointerCapture?.(e.pointerId);
    } catch (err) {
      // Ignore
    }

    isPointerDownRef.current = true;
    const isTouch = e.pointerType === 'touch';
    engineRef.current.onPointerDown(canvasPoint, e.shiftKey, zoom, isTouch);
    renderCanvas();
  };

  // POINTER MOVE
  const handlePointerMove = (e) => {
    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // 2-Finger Touch Pinch Zoom and Pan
    if (activePointersRef.current.size === 2 && pinchStartRef.current) {
      const pts = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      const start = pinchStartRef.current;

      const scale = dist / start.distance;
      const newZoom = Math.max(0.1, Math.min(5.0, start.zoom * scale));

      const rect = canvasRef.current.getBoundingClientRect();
      const origin = { x: mid.x - rect.left, y: mid.y - rect.top };
      const startOrigin = { x: start.midPoint.x - rect.left, y: start.midPoint.y - rect.top };

      const scaleFactor = newZoom / start.zoom;
      const newPanX = origin.x - (startOrigin.x - start.panOffset.x) * scaleFactor;
      const newPanY = origin.y - (startOrigin.y - start.panOffset.y) * scaleFactor;

      setZoom(newZoom);
      setPanOffset({ x: newPanX, y: newPanY });
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const canvasPoint = screenToCanvas(screenPoint.x, screenPoint.y, panOffset, zoom);

    // If panning
    if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setPanOffset({
        x: panStartRef.current.initialPan.x + dx,
        y: panStartRef.current.initialPan.y + dy
      });
      return;
    }

    // Update cursor when hovering
    if (!isPointerDownRef.current) {
      const cursor = engineRef.current.getCursor(canvasPoint, zoom);
      setCursorStyle(cursor);
      return;
    }

    // Active tool pointer move
    engineRef.current.onPointerMove(canvasPoint, zoom);
    renderCanvas();
  };

  // POINTER UP
  const handlePointerUp = (e) => {
    if (e?.pointerId) {
      activePointersRef.current.delete(e.pointerId);
    }
    if (activePointersRef.current.size < 2) {
      pinchStartRef.current = null;
    }

    try {
      e?.target?.releasePointerCapture?.(e.pointerId);
    } catch (err) {
      // Ignore
    }

    if (isPanningRef.current) {
      isPanningRef.current = false;
      setCursorStyle(isSpacePressed || activeTool === 'hand' ? 'grab' : 'default');
      return;
    }

    // Handle Text Tool click on mouse up
    if (activeTool === 'text' && textClickDownRef.current) {
      const dist = Math.hypot(e.clientX - textClickDownRef.current.x, e.clientY - textClickDownRef.current.y);
      const canvasPoint = textClickDownRef.current.canvasPoint;
      textClickDownRef.current = null;

      if (dist < 6) {
        openTextEditor(canvasPoint);
        return;
      }
    }

    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;

    engineRef.current.onPointerUp();
    renderCanvas();
  };

  // DOUBLE CLICK (to edit existing text on canvas)
  const handleDoubleClick = (e) => {
    const canvasPoint = getCanvasPoint(e.clientX, e.clientY);

    // Check if double-clicked a text element
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (el.type === 'text' && hitTestElement(canvasPoint.x, canvasPoint.y, el, zoom)) {
        isPointerDownRef.current = false;
        engineRef.current.getTool('selection').mode = 'idle';
        openTextEditor(canvasPoint, el);
        return;
      }
    }
  };

  // WHEEL (Zoom centered at cursor or 2-finger pan)
  const handleWheel = (e) => {
    e.preventDefault();

    const rect = canvasRef.current.getBoundingClientRect();
    const clientOrigin = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    if (e.ctrlKey || e.metaKey) {
      const zoomFactor = -e.deltaY * 0.002;
      const newZoom = zoom * (1 + zoomFactor);
      setZoom(newZoom, clientOrigin);
    } else {
      setPanOffset((prev) => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }));
    }
  };

  // Auto-focus textarea immediately when editingText becomes active
  useEffect(() => {
    if (editingText && textareaRef.current) {
      const timer = setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const len = textareaRef.current.value.length;
          textareaRef.current.setSelectionRange(len, len);
        }
      }, 20);
      return () => clearTimeout(timer);
    }
  }, [editingText]);

  // Calculate screen position and dimensions for inline text editor
  const textEditorScreenPos = editingText
    ? canvasToScreen(editingText.x, editingText.y, panOffset, zoom)
    : { x: 0, y: 0 };

  const measuredTextDimensions = editingText
    ? measureText(editingText.text || 'Type text...', editingText.fontSize, editingText.fontFamily)
    : { width: 120, height: 32 };

  // Handle dropping images onto the canvas
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer?.files || []);
    const imageFiles = files.filter(isSupportedImageFile);
    if (imageFiles.length === 0) return;

    const basePoint = getCanvasPoint(e.clientX, e.clientY);

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      try {
        const offsetPoint = {
          x: basePoint.x + i * 25,
          y: basePoint.y + i * 25
        };
        const newEl = await createImageElementFromFile(file, offsetPoint);
        addElement(newEl);
        setSelectedIds([newEl.id]);
        setActiveTool('selection');
      } catch (err) {
        alert(err.message || 'Failed to upload dropped image.');
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none bg-[#fbfbfa]"
      style={{ cursor: cursorStyle }}
      onWheel={handleWheel}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block w-full h-full touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      />

      {/* Inline Text Area for live editing on canvas */}
      {editingText && (
        <div
          className="absolute z-50 transform-gpu select-text"
          style={{
            left: `${textEditorScreenPos.x}px`,
            top: `${textEditorScreenPos.y}px`,
            transformOrigin: 'top left',
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <textarea
            ref={textareaRef}
            value={editingText.text}
            onChange={(e) => setEditingText({ ...editingText, text: e.target.value })}
            onBlur={(e) => {
              // Delay commit slightly so toolbar/property buttons can be clicked if needed
              if (!e.relatedTarget || !e.relatedTarget.closest('[data-text-control]')) {
                commitTextEditor();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                cancelTextEditor();
              } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                commitTextEditor();
              }
            }}
            placeholder="Type text..."
            className="outline-none border-2 border-indigo-500 bg-white/95 dark:bg-zinc-900/95 rounded-lg shadow-xl resize-none p-1.5 overflow-hidden whitespace-pre font-sans select-text"
            style={{
              fontSize: `${(editingText.fontSize || 24) * zoom}px`,
              fontFamily: editingText.fontFamily || 'Caveat, cursive',
              color: editingText.color || '#1e1e1e',
              textAlign: editingText.textAlign || 'left',
              lineHeight: 1.3,
              width: `${Math.max(140, measuredTextDimensions.width + 30) * zoom}px`,
              height: `${Math.max(44, measuredTextDimensions.height + 20) * zoom}px`
            }}
            rows={Math.max(1, (editingText.text.split('\n').length || 1))}
          />
          <div
            data-text-control="true"
            className="flex items-center justify-between gap-2 text-[10px] text-zinc-600 dark:text-zinc-300 bg-white/95 dark:bg-zinc-900/95 px-2.5 py-1 rounded-lg shadow-md mt-1 border border-zinc-200 dark:border-zinc-800 select-none pointer-events-auto"
          >
            <div className="hidden sm:flex items-center gap-1.5">
              <span><strong>Enter</strong>: new line</span>
              <span>•</span>
              <span><strong>Ctrl+Enter</strong>: commit</span>
              <span>•</span>
              <span><strong>Esc</strong>: cancel</span>
            </div>
            <div className="flex sm:hidden items-center text-[10px] text-zinc-400">
              Tap Done to commit
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                data-text-control="true"
                onPointerDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation();
                  cancelTextEditor();
                }}
                className="px-2 py-0.5 rounded text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                data-text-control="true"
                onPointerDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation();
                  commitTextEditor();
                }}
                className="px-2.5 py-0.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
