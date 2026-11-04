/**
 * IndexedDB and in-memory cache management for SketchFlow image assets.
 * Keeps large image binary data in IndexedDB (not LocalStorage) to preserve performance.
 */

const DB_NAME = 'sketchflow_db';
const DB_VERSION = 1;
const STORE_NAME = 'image_assets';

// In-memory fallback for environments without IndexedDB (e.g. Node tests, strict private mode)
const memoryStorage = new Map();

// In-memory image element cache for flicker-free canvas rendering
// fileId -> { element: HTMLImageElement, url: string, status: 'loaded' | 'loading' | 'error' }
const imageCache = new Map();

// Redraw listeners to notify canvas when async images finish loading
const redrawListeners = new Set();

export function registerRedrawCallback(callback) {
  if (typeof callback === 'function') {
    redrawListeners.add(callback);
    return () => redrawListeners.delete(callback);
  }
  return () => {};
}

export function notifyRedraw() {
  for (const cb of redrawListeners) {
    try {
      cb();
    } catch (e) {
      // Ignore listener error
    }
  }
}

/**
 * Initializes and opens the IndexedDB database
 */
function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'fileId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      console.warn('IndexedDB open error, using memory fallback:', request.error);
      resolve(null);
    };
  });
}

/**
 * Save an image blob to IndexedDB
 */
export async function saveImageBlob(fileId, blob, mimeType = 'image/png', base64 = null) {
  if (!fileId || !blob) return false;

  const record = {
    fileId,
    blob,
    mimeType,
    base64,
    updatedAt: Date.now()
  };

  // Always keep in fast memory cache
  memoryStorage.set(fileId, record);

  // If base64 not provided, generate asynchronously
  if (!base64 && typeof FileReader !== 'undefined') {
    blobToBase64(blob).then((b64) => {
      if (record) record.base64 = b64;
    }).catch(() => {});
  }

  try {
    const db = await openDB();
    if (db) {
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(record);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(true);
      });
    }
    return true;
  } catch (err) {
    return true;
  }
}

/**
 * Get an image base64 data URL synchronously if available in memory cache
 */
export function getImageBase64Sync(fileId) {
  if (!fileId) return '';
  const rec = memoryStorage.get(fileId);
  return rec?.base64 || '';
}

/**
 * Get an image record synchronously from memory cache if available
 */
export function getImageRecordSync(fileId) {
  if (!fileId) return null;
  return memoryStorage.get(fileId) || null;
}

/**
 * Get an image blob from IndexedDB by fileId
 */
export async function getImageBlob(fileId) {
  if (!fileId) return null;

  if (memoryStorage.has(fileId)) {
    return memoryStorage.get(fileId);
  }

  try {
    const db = await openDB();
    if (!db) return null;

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(fileId);
      req.onsuccess = () => {
        const result = req.result;
        if (result) {
          memoryStorage.set(fileId, result);
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
 * Delete an image blob from IndexedDB
 */
export async function deleteImageBlob(fileId) {
  if (!fileId) return;

  memoryStorage.delete(fileId);

  // Revoke object URL from cache to avoid memory leaks
  if (imageCache.has(fileId)) {
    const cached = imageCache.get(fileId);
    if (cached.url && typeof URL !== 'undefined' && URL.revokeObjectURL) {
      URL.revokeObjectURL(cached.url);
    }
    imageCache.delete(fileId);
  }

  try {
    const db = await openDB();
    if (!db) return;

    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(fileId);
  } catch (err) {
    // Ignore error
  }
}

/**
 * Get all image blobs (for portable project export)
 */
export async function getAllImageBlobs() {
  try {
    const db = await openDB();
    if (!db) {
      return Array.from(memoryStorage.values());
    }

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve(Array.from(memoryStorage.values()));
    });
  } catch (err) {
    return Array.from(memoryStorage.values());
  }
}

/**
 * Clean up unreferenced image blobs from storage
 */
export async function cleanupUnusedImages(usedFileIds = []) {
  const usedSet = new Set(usedFileIds);

  try {
    const all = await getAllImageBlobs();
    for (const record of all) {
      if (!usedSet.has(record.fileId)) {
        await deleteImageBlob(record.fileId);
      }
    }
  } catch (e) {
    // Ignore cleanup error
  }
}

/**
 * Retrieves the cached HTMLImageElement synchronously if available.
 * If not cached, triggers async load and notifies redraw when ready.
 */
export function getImageFromCache(fileId) {
  if (!fileId) return null;

  if (imageCache.has(fileId)) {
    return imageCache.get(fileId);
  }

  // Not in cache, start background loading
  loadImageAsset(fileId);
  return null;
}

/**
 * Preloads or loads an image asset into memory cache and dispatches redraw
 */
export async function loadImageAsset(fileId) {
  if (!fileId) return null;

  if (imageCache.has(fileId)) {
    const cached = imageCache.get(fileId);
    if (cached.status === 'loaded') return cached.element;
    if (cached.status === 'loading') return null;
  }

  imageCache.set(fileId, { element: null, url: null, status: 'loading' });

  try {
    const record = await getImageBlob(fileId);
    if (!record || !record.blob) {
      imageCache.set(fileId, { element: null, url: null, status: 'error' });
      return null;
    }

    if (typeof window === 'undefined' || typeof Image === 'undefined') {
      // Mock environment (Node.js)
      const mockImg = {
        complete: true,
        naturalWidth: 400,
        naturalHeight: 300,
        width: 400,
        height: 300
      };
      imageCache.set(fileId, { element: mockImg, url: 'blob:mock', status: 'loaded' });
      return mockImg;
    }

    const objectUrl = URL.createObjectURL(record.blob);
    const img = new Image();

    return new Promise((resolve) => {
      img.onload = () => {
        imageCache.set(fileId, { element: img, url: objectUrl, status: 'loaded' });
        notifyRedraw();
        resolve(img);
      };

      img.onerror = () => {
        if (URL.revokeObjectURL) URL.revokeObjectURL(objectUrl);
        imageCache.set(fileId, { element: null, url: null, status: 'error' });
        notifyRedraw();
        resolve(null);
      };

      img.src = objectUrl;
    });
  } catch (err) {
    imageCache.set(fileId, { element: null, url: null, status: 'error' });
    return null;
  }
}

/**
 * Converts a Blob to a Base64 data URL string (for SVG / JSON export)
 */
export async function blobToBase64(blob) {
  if (!blob) return '';
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  if (typeof blob.arrayBuffer === 'function') {
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const b64 = typeof btoa !== 'undefined' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
    return `data:${blob.type || 'image/png'};base64,${b64}`;
  }
  if (typeof blob.text === 'function') {
    const txt = await blob.text();
    const b64 = typeof btoa !== 'undefined' ? btoa(txt) : Buffer.from(txt).toString('base64');
    return `data:${blob.type || 'image/png'};base64,${b64}`;
  }
  if (blob.content) {
    const txt = String(blob.content);
    const b64 = typeof btoa !== 'undefined' ? btoa(txt) : Buffer.from(txt).toString('base64');
    return `data:${blob.type || 'image/png'};base64,${b64}`;
  }
  return '';
}

/**
 * Converts a Base64 data URL string to a Blob (for JSON import)
 */
export function base64ToBlob(base64Data, mimeType = 'image/png') {
  if (!base64Data) return null;

  try {
    const parts = base64Data.split(';base64,');
    const contentType = parts.length > 1 ? parts[0].replace('data:', '') : mimeType;
    const raw = atob(parts.length > 1 ? parts[1] : parts[0]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);

    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }

    return new Blob([uInt8Array], { type: contentType });
  } catch (err) {
    console.warn('Failed to parse base64 to blob:', err);
    return null;
  }
}
