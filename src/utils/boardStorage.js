/**
 * IndexedDB and LocalStorage management for SketchFlow Multiple Boards System.
 * Stores board metadata, elements, viewports, and grid settings locally in IndexedDB ('boards' store),
 * with LocalStorage for active board tracking and memory fallback for test environments.
 */

import { generateId } from './canvasUtils.js';
import { loadFromStorage } from './storageUtils.js';
import { cleanupUnusedImages } from './imageStorage.js';

export const DB_NAME = 'sketchflow_db';
export const DB_VERSION = 2;
export const BOARDS_STORE = 'boards';
export const IMAGES_STORE = 'image_assets';

export const STORAGE_ACTIVE_BOARD_KEY = 'sketchflow_active_board_id';
export const STORAGE_MIGRATION_KEY = 'sketchflow_migration_v2_done';

// In-memory fallback for environments without IndexedDB (e.g. Node tests, SSR)
const boardsMemoryStorage = new Map();

/**
 * Open the SketchFlow IndexedDB database (version 2)
 */
export function openBoardsDB() {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(IMAGES_STORE)) {
          db.createObjectStore(IMAGES_STORE, { keyPath: 'fileId' });
        }
        if (!db.objectStoreNames.contains(BOARDS_STORE)) {
          db.createObjectStore(BOARDS_STORE, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn('IndexedDB open error in boardStorage, using memory fallback:', request.error);
        resolve(null);
      };
    } catch (err) {
      console.warn('Failed to open IndexedDB:', err);
      resolve(null);
    }
  });
}

/**
 * Generates a unique, collision-resistant board ID
 */
export function generateBoardId() {
  return 'board_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
}

/**
 * Get active board ID from LocalStorage
 */
export function getActiveBoardId() {
  if (typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_ACTIVE_BOARD_KEY) || null;
  } catch {
    return null;
  }
}

/**
 * Set active board ID in LocalStorage
 */
export function setActiveBoardId(boardId) {
  if (typeof localStorage === 'undefined' || !boardId) return;
  try {
    localStorage.setItem(STORAGE_ACTIVE_BOARD_KEY, boardId);
  } catch (err) {
    console.warn('Failed to set active board ID in localStorage:', err);
  }
}

/**
 * Save a complete board record to IndexedDB and memory cache
 */
export async function saveBoard(board) {
  if (!board || !board.id) return false;

  const record = {
    id: board.id,
    name: (board.name || 'Untitled Board').trim(),
    createdAt: board.createdAt || Date.now(),
    updatedAt: Date.now(),
    elements: Array.isArray(board.elements) ? board.elements : [],
    viewport: {
      zoom: Number(board.viewport?.zoom) || 1,
      panX: Number(board.viewport?.panX ?? board.viewport?.x ?? 0),
      panY: Number(board.viewport?.panY ?? board.viewport?.y ?? 0)
    },
    gridSettings: {
      gridType: board.gridSettings?.gridType || board.gridType || 'dots'
    },
    thumbnail: board.thumbnail !== undefined ? board.thumbnail : (generateBoardThumbnail(board.elements) || null),
    metadata: {
      elementCount: Array.isArray(board.elements) ? board.elements.length : 0,
      ...(board.metadata || {})
    }
  };

  // Always keep in fast memory cache
  boardsMemoryStorage.set(record.id, record);

  try {
    const db = await openBoardsDB();
    if (db) {
      return new Promise((resolve) => {
        const tx = db.transaction(BOARDS_STORE, 'readwrite');
        const store = tx.objectStore(BOARDS_STORE);
        store.put(record);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => {
          console.warn('Failed to put board in IndexedDB:', tx.error);
          resolve(false);
        };
      });
    }
    return true;
  } catch (err) {
    console.warn('Error saving board to IndexedDB:', err);
    return true; // Memory fallback succeeded
  }
}

/**
 * Get a single board by ID from IndexedDB or memory cache
 */
export async function getBoard(boardId) {
  if (!boardId) return null;

  if (boardsMemoryStorage.has(boardId)) {
    return boardsMemoryStorage.get(boardId);
  }

  try {
    const db = await openBoardsDB();
    if (!db) return null;

    return new Promise((resolve) => {
      const tx = db.transaction(BOARDS_STORE, 'readonly');
      const store = tx.objectStore(BOARDS_STORE);
      const req = store.get(boardId);
      req.onsuccess = () => {
        const result = req.result;
        if (result) {
          boardsMemoryStorage.set(boardId, result);
          resolve(result);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    return null;
  }
}

/**
 * Get all boards from IndexedDB
 */
export async function getAllBoards() {
  try {
    const db = await openBoardsDB();
    if (!db) {
      return Array.from(boardsMemoryStorage.values());
    }

    return new Promise((resolve) => {
      const tx = db.transaction(BOARDS_STORE, 'readonly');
      const store = tx.objectStore(BOARDS_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const results = req.result || [];
        // Update memory cache strictly in sync with IndexedDB
        boardsMemoryStorage.clear();
        for (const b of results) {
          boardsMemoryStorage.set(b.id, b);
        }
        resolve(results);
      };
      req.onerror = () => resolve(Array.from(boardsMemoryStorage.values()));
    });
  } catch (err) {
    return Array.from(boardsMemoryStorage.values());
  }
}

/**
 * Get lightweight metadata for all boards (for listings without loading all elements)
 */
export async function getAllBoardsMetadata() {
  const all = await getAllBoards();
  return all.map((b) => ({
    id: b.id,
    name: b.name || 'Untitled Board',
    createdAt: b.createdAt || Date.now(),
    updatedAt: b.updatedAt || Date.now(),
    elementCount: b.elements?.length || b.metadata?.elementCount || 0,
    thumbnail: b.thumbnail || null,
    viewport: b.viewport || { zoom: 1, panX: 0, panY: 0 },
    gridSettings: b.gridSettings || { gridType: 'dots' }
  }));
}

/**
 * Collect all referenced image fileIds across all boards in storage
 */
export async function getAllReferencedFileIds() {
  const allBoards = await getAllBoards();
  const fileIds = new Set();
  for (const board of allBoards) {
    if (Array.isArray(board.elements)) {
      for (const el of board.elements) {
        if (el.type === 'image' && el.fileId) {
          fileIds.add(el.fileId);
        }
      }
    }
  }
  return Array.from(fileIds);
}

/**
 * Clean up orphan image assets not referenced by any board
 */
export async function cleanupOrphanImages() {
  try {
    const usedIds = await getAllReferencedFileIds();
    await cleanupUnusedImages(usedIds);
  } catch (err) {
    console.warn('Error during orphan image cleanup:', err);
  }
}

/**
 * Delete a board from storage and safely trigger orphan image cleanup
 */
export async function deleteBoard(boardId) {
  if (!boardId) return false;

  let idbSuccess = true;
  try {
    const db = await openBoardsDB();
    if (db) {
      idbSuccess = await new Promise((resolve) => {
        const tx = db.transaction(BOARDS_STORE, 'readwrite');
        const store = tx.objectStore(BOARDS_STORE);
        const req = store.delete(boardId);
        tx.oncomplete = () => resolve(true);
        tx.onerror = (e) => {
          console.error('IndexedDB transaction error deleting board:', tx.error || e);
          resolve(false);
        };
        req.onerror = (e) => {
          console.error('IndexedDB request error deleting board:', req.error || e);
          resolve(false);
        };
      });
    }
  } catch (err) {
    console.error('Error deleting board from IndexedDB:', err);
    idbSuccess = false;
  }

  if (!idbSuccess) {
    return false;
  }

  // Only remove from memory cache if persistence succeeded
  boardsMemoryStorage.delete(boardId);

  // Safe orphan image cleanup: only removes assets no longer referenced by ANY board
  await cleanupOrphanImages();
  return true;
}

/**
 * Create a new default board record and persist it
 */
export async function createDefaultBoard(name = 'Untitled Board', initialElements = [], initialViewport = {}, initialGrid = 'dots') {
  const newBoard = {
    id: generateBoardId(),
    name: name.trim() || 'Untitled Board',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    elements: initialElements,
    viewport: {
      zoom: initialViewport.zoom || 1,
      panX: initialViewport.panX || initialViewport.x || 0,
      panY: initialViewport.panY || initialViewport.y || 0
    },
    gridSettings: {
      gridType: initialGrid || 'dots'
    },
    thumbnail: null,
    metadata: {
      elementCount: initialElements.length
    }
  };

  await saveBoard(newBoard);
  return newBoard;
}

/**
 * Idempotent migration of legacy single-board LocalStorage data into IndexedDB
 */
export async function migrateLegacyBoard() {
  const isMigrated = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_MIGRATION_KEY) === 'true';
  const existingBoards = await getAllBoards();

  // If already migrated and boards exist, resolve current active board or first board
  if (isMigrated && existingBoards.length > 0) {
    const activeId = getActiveBoardId();
    const activeBoard = existingBoards.find((b) => b.id === activeId) || existingBoards[0];
    if (activeBoard) {
      setActiveBoardId(activeBoard.id);
      return activeBoard;
    }
  }

  // If boards already exist in storage, mark migration and select active
  if (existingBoards.length > 0) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_MIGRATION_KEY, 'true');
    }
    const activeId = getActiveBoardId();
    const activeBoard = existingBoards.find((b) => b.id === activeId) || existingBoards[0];
    setActiveBoardId(activeBoard.id);
    return activeBoard;
  }

  // Detect existing legacy board data
  const legacyData = loadFromStorage();
  if (legacyData && Array.isArray(legacyData.elements) && legacyData.elements.length > 0) {
    const migratedBoard = {
      id: generateBoardId(),
      name: 'My Whiteboard',
      createdAt: legacyData.savedAt ? new Date(legacyData.savedAt).getTime() : Date.now(),
      updatedAt: Date.now(),
      elements: legacyData.elements,
      viewport: {
        zoom: legacyData.appState?.zoom || 1,
        panX: legacyData.appState?.panOffset?.x || 0,
        panY: legacyData.appState?.panOffset?.y || 0
      },
      gridSettings: {
        gridType: legacyData.appState?.gridType || 'dots'
      },
      thumbnail: generateBoardThumbnail(legacyData.elements) || null,
      metadata: {
        elementCount: legacyData.elements.length
      }
    };

    await saveBoard(migratedBoard);
    setActiveBoardId(migratedBoard.id);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_MIGRATION_KEY, 'true');
    }
    return migratedBoard;
  }

  // No existing data found: create initial default board
  const initialBoard = await createDefaultBoard('Untitled Board');
  setActiveBoardId(initialBoard.id);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_MIGRATION_KEY, 'true');
  }
  return initialBoard;
}

/**
 * Generate a miniature visual preview of board elements
 */
export function generateBoardThumbnail(elements) {
  if (!elements || elements.length === 0) return null;

  try {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Draw background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 240, 150);

    // Compute bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const el of elements) {
      const x = el.x || 0;
      const y = el.y || 0;
      const w = Math.abs(el.width || 0);
      const h = Math.abs(el.height || 0);
      const x2 = el.x2 !== undefined ? el.x2 : x + w;
      const y2 = el.y2 !== undefined ? el.y2 : y + h;

      minX = Math.min(minX, x, x2);
      minY = Math.min(minY, y, y2);
      maxX = Math.max(maxX, x, x2, x + w);
      maxY = Math.max(maxY, y, y2, y + h);

      if (el.points && Array.isArray(el.points)) {
        for (const pt of el.points) {
          minX = Math.min(minX, pt.x);
          minY = Math.min(minY, pt.y);
          maxX = Math.max(maxX, pt.x);
          maxY = Math.max(maxY, pt.y);
        }
      }
    }

    const contentW = Math.max(20, maxX - minX);
    const contentH = Math.max(20, maxY - minY);
    const padding = 20;
    const targetW = 240 - padding * 2;
    const targetH = 150 - padding * 2;
    const scale = Math.min(targetW / contentW, targetH / contentH, 1);

    ctx.save();
    ctx.translate(
      padding + (targetW - contentW * scale) / 2 - minX * scale,
      padding + (targetH - contentH * scale) / 2 - minY * scale
    );
    ctx.scale(scale, scale);

    // Render simplified shapes for quick preview
    for (const el of elements) {
      ctx.strokeStyle = el.strokeColor || '#3f3f46';
      ctx.lineWidth = Math.max(1, (el.strokeWidth || 2) * 0.8);
      ctx.fillStyle = el.backgroundColor && el.backgroundColor !== 'transparent' ? el.backgroundColor : 'transparent';

      if (el.type === 'rectangle') {
        const x = Math.min(el.x, el.x + el.width);
        const y = Math.min(el.y, el.y + el.height);
        const w = Math.abs(el.width);
        const h = Math.abs(el.height);
        if (ctx.fillStyle !== 'transparent') ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
      } else if (el.type === 'circle') {
        const rx = Math.abs(el.width) / 2;
        const ry = Math.abs(el.height) / 2;
        const cx = Math.min(el.x, el.x + el.width) + rx;
        const cy = Math.min(el.y, el.y + el.height) + ry;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        if (ctx.fillStyle !== 'transparent') ctx.fill();
        ctx.stroke();
      } else if (el.type === 'line' || el.type === 'arrow') {
        const x2 = el.x2 !== undefined ? el.x2 : el.x + el.width;
        const y2 = el.y2 !== undefined ? el.y2 : el.y + el.height;
        ctx.beginPath();
        ctx.moveTo(el.x, el.y);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      } else if (el.type === 'pencil' && el.points && el.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(el.points[0].x, el.points[0].y);
        for (let i = 1; i < el.points.length; i++) {
          ctx.lineTo(el.points[i].x, el.points[i].y);
        }
        ctx.stroke();
      } else if (el.type === 'diamond') {
        const bx = Math.min(el.x, el.x + el.width);
        const by = Math.min(el.y, el.y + el.height);
        const bw = Math.abs(el.width);
        const bh = Math.abs(el.height);
        ctx.beginPath();
        ctx.moveTo(bx + bw / 2, by);
        ctx.lineTo(bx + bw, by + bh / 2);
        ctx.lineTo(bx + bw / 2, by + bh);
        ctx.lineTo(bx, by + bh / 2);
        ctx.closePath();
        if (ctx.fillStyle !== 'transparent') ctx.fill();
        ctx.stroke();
      }
    }

    ctx.restore();
    return canvas.toDataURL('image/png');
  } catch (err) {
    return null;
  }
}

/**
 * Test helper to clear in-memory boards storage
 */
export function _clearBoardsMemory() {
  boardsMemoryStorage.clear();
}

