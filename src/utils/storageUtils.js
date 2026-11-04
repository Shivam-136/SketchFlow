/**
 * Local persistence management for SketchFlow using LocalStorage with fallback
 */

const STORAGE_KEY = 'sketchflow_canvas_data_v1';

export function saveToStorage(data) {
  if (typeof localStorage === 'undefined') return false;
  try {
    const payload = JSON.stringify({
      version: 1,
      savedAt: new Date().toISOString(),
      elements: data.elements || [],
      appState: {
        panOffset: data.panOffset || { x: 0, y: 0 },
        zoom: data.zoom || 1,
        gridType: data.gridType || 'dots',
        elementProperties: data.elementProperties || {}
      }
    });
    localStorage.setItem(STORAGE_KEY, payload);
    return true;
  } catch (err) {
    console.warn('Failed to save to localStorage:', err);
    return false;
  }
}

export function loadFromStorage() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const item = localStorage.getItem(STORAGE_KEY);
    if (!item) return null;
    const data = JSON.parse(item);
    return data;
  } catch (err) {
    console.warn('Failed to load from localStorage:', err);
    return null;
  }
}

export function clearStorage() {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (err) {
    console.warn('Failed to clear storage:', err);
    return false;
  }
}
