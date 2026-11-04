import { create } from 'zustand';
import { generateId, measureText } from '../utils/canvasUtils.js';
import { getElementBounds, getElementsBounds } from '../utils/geometryUtils.js';
import { saveToStorage, loadFromStorage, clearStorage } from '../utils/storageUtils.js';

const DEFAULT_PROPERTIES = {
  strokeColor: '#1e1e1e',
  backgroundColor: 'transparent',
  strokeWidth: 2,
  strokeStyle: 'solid', // 'solid', 'dashed', 'dotted'
  fillStyle: 'none',     // 'none', 'solid', 'semi', 'hachure'
  roughness: 1,         // 0: clean, 1: artist, 2: cartoonist
  edgeStyle: 'round',    // 'sharp', 'round'
  opacity: 100,
  fontFamily: 'Caveat, cursive',
  fontSize: 24,
  textAlign: 'left'
};

const MAX_HISTORY = 50;
let saveDebounceTimer = null;

function debouncedSave(state) {
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(() => {
    saveToStorage({
      elements: state.elements,
      panOffset: state.panOffset,
      zoom: state.zoom,
      gridType: state.gridType,
      elementProperties: state.toolProperties
    });
  }, 400);
}

// Initial state from storage if present
const savedData = loadFromStorage();

export const useCanvasStore = create((set, get) => ({
  // Core state
  elements: savedData?.elements || [],
  selectedIds: [],
  activeTool: 'selection',
  toolProperties: {
    ...DEFAULT_PROPERTIES,
    ...(savedData?.appState?.elementProperties || {})
  },

  // Canvas Viewport State
  panOffset: savedData?.appState?.panOffset || { x: 0, y: 0 },
  zoom: savedData?.appState?.zoom || 1,
  gridType: savedData?.appState?.gridType || 'dots',
  isSpacePressed: false,

  // Clipboard
  clipboard: [],

  // Undo / Redo History (initialized with immutable clone)
  history: [JSON.parse(JSON.stringify(savedData?.elements || []))],
  historyIndex: 0,

  // Modals & UI state
  showShortcutsModal: false,
  showClearModal: false,
  showExportModal: false,

  setShowShortcutsModal: (show) => set({ showShortcutsModal: show }),
  setShowClearModal: (show) => set({ showClearModal: show }),
  setShowExportModal: (show) => set({ showExportModal: show }),

  // Tool change
  setActiveTool: (tool) => {
    set({ activeTool: tool });
    if (tool !== 'selection') {
      set({ selectedIds: [] });
    }
  },

  setIsSpacePressed: (isSpace) => set({ isSpacePressed: isSpace }),

  // Set tool property & update selected elements
  updateToolProperties: (props, commitHistory = true) => {
    const { toolProperties, elements, selectedIds } = get();
    const updatedProps = { ...toolProperties, ...props };

    let updatedElements = elements;
    if (selectedIds.length > 0) {
      updatedElements = elements.map((el) => {
        if (selectedIds.includes(el.id)) {
          const updated = { ...el, ...props };
          if (el.type === 'text' && (props.fontSize || props.fontFamily)) {
            const m = measureText(el.text, updated.fontSize, updated.fontFamily);
            updated.width = m.width;
            updated.height = m.height;
          }
          return updated;
        }
        return el;
      });

      if (commitHistory) {
        get().pushHistory(updatedElements);
      }
    }

    set({ toolProperties: updatedProps, elements: updatedElements });
    debouncedSave(get());
  },

  // Selection Actions
  setSelectedIds: (ids) => {
    const selected = Array.isArray(ids) ? ids : [ids];
    set({ selectedIds: selected });

    if (selected.length === 1) {
      const el = get().elements.find((e) => e.id === selected[0]);
      if (el) {
        set((state) => ({
          toolProperties: {
            ...state.toolProperties,
            strokeColor: el.strokeColor || state.toolProperties.strokeColor,
            backgroundColor: el.backgroundColor || state.toolProperties.backgroundColor,
            strokeWidth: el.strokeWidth || state.toolProperties.strokeWidth,
            strokeStyle: el.strokeStyle || state.toolProperties.strokeStyle,
            fillStyle: el.fillStyle || state.toolProperties.fillStyle,
            roughness: el.roughness !== undefined ? el.roughness : state.toolProperties.roughness,
            edgeStyle: el.edgeStyle || state.toolProperties.edgeStyle,
            opacity: el.opacity !== undefined ? el.opacity : state.toolProperties.opacity,
            fontSize: el.fontSize || state.toolProperties.fontSize,
            fontFamily: el.fontFamily || state.toolProperties.fontFamily,
            textAlign: el.textAlign || state.toolProperties.textAlign,
          }
        }));
      }
    }
  },

  toggleSelectedId: (id) => {
    const { selectedIds } = get();
    if (selectedIds.includes(id)) {
      set({ selectedIds: selectedIds.filter((i) => i !== id) });
    } else {
      set({ selectedIds: [...selectedIds, id] });
    }
  },

  selectAll: () => {
    const { elements } = get();
    set({ selectedIds: elements.map((e) => e.id), activeTool: 'selection' });
  },

  clearSelection: () => {
    set({ selectedIds: [] });
  },

  // History / Undo / Redo
  pushHistory: (newElements) => {
    const { history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    const snapshot = JSON.parse(JSON.stringify(newElements));
    newHistory.push(snapshot);
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
    }
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1
    });
    debouncedSave(get());
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      const prevElements = JSON.parse(JSON.stringify(history[nextIndex]));
      set({
        elements: prevElements,
        historyIndex: nextIndex,
        selectedIds: []
      });
      debouncedSave(get());
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const nextElements = JSON.parse(JSON.stringify(history[nextIndex]));
      set({
        elements: nextElements,
        historyIndex: nextIndex,
        selectedIds: []
      });
      debouncedSave(get());
    }
  },

  // Add / Edit / Delete Elements
  addElement: (el) => {
    const { elements } = get();
    const newElements = [...elements, el];
    set({ elements: newElements });
    get().pushHistory(newElements);
  },

  updateElement: (id, updates, commitHistory = false) => {
    const { elements } = get();
    const newElements = elements.map((el) => {
      if (el.id === id) {
        return { ...el, ...updates };
      }
      return el;
    });

    set({ elements: newElements });
    if (commitHistory) {
      get().pushHistory(newElements);
    } else {
      debouncedSave(get());
    }
  },

  updateElements: (updatedElementsList, commitHistory = false) => {
    const idMap = new Map(updatedElementsList.map((e) => [e.id, e]));
    const { elements } = get();
    const newElements = elements.map((el) => idMap.get(el.id) || el);

    set({ elements: newElements });
    if (commitHistory) {
      get().pushHistory(newElements);
    } else {
      debouncedSave(get());
    }
  },

  deleteSelected: () => {
    const { elements, selectedIds } = get();
    if (selectedIds.length === 0) return;

    const remaining = elements.filter((el) => !selectedIds.includes(el.id));
    set({ elements: remaining, selectedIds: [] });
    get().pushHistory(remaining);
  },

  deleteElement: (id) => {
    const { elements, selectedIds } = get();
    const remaining = elements.filter((el) => el.id !== id);
    set({
      elements: remaining,
      selectedIds: selectedIds.filter((i) => i !== id)
    });
    get().pushHistory(remaining);
  },

  deleteElementBatch: (id) => {
    const { elements, selectedIds } = get();
    const remaining = elements.filter((el) => el.id !== id);
    set({
      elements: remaining,
      selectedIds: selectedIds.filter((i) => i !== id)
    });
    debouncedSave(get());
  },

  duplicateSelected: () => {
    const { elements, selectedIds } = get();
    if (selectedIds.length === 0) return;

    const selectedElements = elements.filter((el) => selectedIds.includes(el.id));
    const offset = 20;

    const duplicates = selectedElements.map((el) => {
      const newId = generateId();
      const dup = {
        ...el,
        id: newId,
        x: el.x + offset,
        y: el.y + offset
      };
      if (el.x2 !== undefined) dup.x2 = el.x2 + offset;
      if (el.y2 !== undefined) dup.y2 = el.y2 + offset;
      if (el.points) {
        dup.points = el.points.map((p) => ({ x: p.x + offset, y: p.y + offset }));
      }
      return dup;
    });

    const newElements = [...elements, ...duplicates];
    set({
      elements: newElements,
      selectedIds: duplicates.map((d) => d.id)
    });
    get().pushHistory(newElements);
  },

  copySelected: () => {
    const { elements, selectedIds } = get();
    if (selectedIds.length === 0) return;

    const selectedElements = elements
      .filter((el) => selectedIds.includes(el.id))
      .map((el) => JSON.parse(JSON.stringify(el)));

    set({ clipboard: selectedElements });
  },

  paste: () => {
    const { clipboard, elements } = get();
    if (!clipboard || clipboard.length === 0) return;

    const offset = 25;
    const pasted = clipboard.map((el) => {
      const newId = generateId();
      const dup = {
        ...el,
        id: newId,
        x: el.x + offset,
        y: el.y + offset
      };
      if (el.x2 !== undefined) dup.x2 = el.x2 + offset;
      if (el.y2 !== undefined) dup.y2 = el.y2 + offset;
      if (el.points) {
        dup.points = el.points.map((p) => ({ x: p.x + offset, y: p.y + offset }));
      }
      return dup;
    });

    const nextClipboard = pasted.map((el) => JSON.parse(JSON.stringify(el)));

    const newElements = [...elements, ...pasted];
    set({
      elements: newElements,
      selectedIds: pasted.map((p) => p.id),
      clipboard: nextClipboard
    });
    get().pushHistory(newElements);
  },

  // Layer ordering
  bringToFront: () => {
    const { elements, selectedIds } = get();
    if (selectedIds.length === 0) return;
    const selected = elements.filter((e) => selectedIds.includes(e.id));
    const unselected = elements.filter((e) => !selectedIds.includes(e.id));
    const newElements = [...unselected, ...selected];
    set({ elements: newElements });
    get().pushHistory(newElements);
  },

  sendToBack: () => {
    const { elements, selectedIds } = get();
    if (selectedIds.length === 0) return;
    const selected = elements.filter((e) => selectedIds.includes(e.id));
    const unselected = elements.filter((e) => !selectedIds.includes(e.id));
    const newElements = [...selected, ...unselected];
    set({ elements: newElements });
    get().pushHistory(newElements);
  },

  bringForward: () => {
    const { elements, selectedIds } = get();
    if (selectedIds.length === 0) return;
    const newElements = [...elements];
    for (let i = newElements.length - 2; i >= 0; i--) {
      if (selectedIds.includes(newElements[i].id) && !selectedIds.includes(newElements[i + 1].id)) {
        const temp = newElements[i];
        newElements[i] = newElements[i + 1];
        newElements[i + 1] = temp;
      }
    }
    set({ elements: newElements });
    get().pushHistory(newElements);
  },

  sendBackward: () => {
    const { elements, selectedIds } = get();
    if (selectedIds.length === 0) return;
    const newElements = [...elements];
    for (let i = 1; i < newElements.length; i++) {
      if (selectedIds.includes(newElements[i].id) && !selectedIds.includes(newElements[i - 1].id)) {
        const temp = newElements[i];
        newElements[i] = newElements[i - 1];
        newElements[i - 1] = temp;
      }
    }
    set({ elements: newElements });
    get().pushHistory(newElements);
  },

  // Alignment
  alignSelected: (alignment) => {
    const { elements, selectedIds } = get();
    if (selectedIds.length < 2) return;

    const selected = elements.filter((e) => selectedIds.includes(e.id));
    const groupBounds = getElementsBounds(selected);

    const updated = elements.map((el) => {
      if (!selectedIds.includes(el.id)) return el;
      const b = getElementBounds(el);
      const newEl = { ...el };

      switch (alignment) {
        case 'left':
          newEl.x = groupBounds.minX;
          break;
        case 'center':
          newEl.x = groupBounds.minX + (groupBounds.width - b.width) / 2;
          break;
        case 'right':
          newEl.x = groupBounds.maxX - b.width;
          break;
        case 'top':
          newEl.y = groupBounds.minY;
          break;
        case 'middle':
          newEl.y = groupBounds.minY + (groupBounds.height - b.height) / 2;
          break;
        case 'bottom':
          newEl.y = groupBounds.maxY - b.height;
          break;
        default:
          break;
      }
      return newEl;
    });

    set({ elements: updated });
    get().pushHistory(updated);
  },

  // Canvas Viewport Transforms
  setPanOffset: (offsetOrFn) => {
    set((state) => {
      const nextOffset = typeof offsetOrFn === 'function' ? offsetOrFn(state.panOffset) : offsetOrFn;
      return { panOffset: nextOffset };
    });
    debouncedSave(get());
  },

  setZoom: (newZoom, clientOrigin) => {
    const clampedZoom = Math.max(0.1, Math.min(5.0, Number(newZoom.toFixed(2))));
    const { zoom, panOffset } = get();

    if (clientOrigin) {
      const scaleFactor = clampedZoom / zoom;
      const newPanX = clientOrigin.x - (clientOrigin.x - panOffset.x) * scaleFactor;
      const newPanY = clientOrigin.y - (clientOrigin.y - panOffset.y) * scaleFactor;
      set({ zoom: clampedZoom, panOffset: { x: newPanX, y: newPanY } });
    } else {
      set({ zoom: clampedZoom });
    }
    debouncedSave(get());
  },

  zoomIn: () => {
    const { zoom } = get();
    const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    get().setZoom(zoom + 0.1, center);
  },

  zoomOut: () => {
    const { zoom } = get();
    const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    get().setZoom(zoom - 0.1, center);
  },

  resetZoom: () => {
    const { zoom, panOffset } = get();
    const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const scaleFactor = 1 / zoom;
    const newPanX = center.x - (center.x - panOffset.x) * scaleFactor;
    const newPanY = center.y - (center.y - panOffset.y) * scaleFactor;
    set({ zoom: 1, panOffset: { x: newPanX, y: newPanY } });
    debouncedSave(get());
  },

  centerCanvas: () => {
    const { elements, zoom } = get();
    if (elements.length > 0) {
      const bounds = getElementsBounds(elements);
      const contentCenterX = bounds.minX + bounds.width / 2;
      const contentCenterY = bounds.minY + bounds.height / 2;
      const panX = window.innerWidth / 2 - contentCenterX * zoom;
      const panY = window.innerHeight / 2 - contentCenterY * zoom;
      set({ panOffset: { x: panX, y: panY } });
    } else {
      set({ panOffset: { x: 0, y: 0 }, zoom: 1 });
    }
    debouncedSave(get());
  },

  fitToScreen: (viewportWidth, viewportHeight) => {
    const { elements } = get();
    if (elements.length === 0) {
      get().centerCanvas();
      return;
    }

    const bounds = getElementsBounds(elements);
    const padding = 80;
    const availW = Math.max(100, viewportWidth - padding * 2);
    const availH = Math.max(100, viewportHeight - padding * 2);

    const scaleX = availW / Math.max(bounds.width, 100);
    const scaleY = availH / Math.max(bounds.height, 100);
    const fitScale = Math.max(0.2, Math.min(2.0, Math.min(scaleX, scaleY)));

    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;
    const contentCenterX = bounds.minX + bounds.width / 2;
    const contentCenterY = bounds.minY + bounds.height / 2;

    const panX = centerX - contentCenterX * fitScale;
    const panY = centerY - contentCenterY * fitScale;

    set({ zoom: Number(fitScale.toFixed(2)), panOffset: { x: panX, y: panY } });
    debouncedSave(get());
  },

  setGridType: (type) => {
    set({ gridType: type });
    debouncedSave(get());
  },

  clearCanvas: () => {
    const emptyElements = [];
    get().pushHistory(emptyElements);
    set({
      elements: emptyElements,
      selectedIds: []
    });
    clearStorage();
  },

  loadDrawing: (elements, appState = {}) => {
    const validElements = Array.isArray(elements) ? elements : [];
    set({
      elements: validElements,
      selectedIds: [],
      history: [JSON.parse(JSON.stringify(validElements))],
      historyIndex: 0,
      gridType: appState.gridType || get().gridType
    });
    debouncedSave(get());
  }
}));
