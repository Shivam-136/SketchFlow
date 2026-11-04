/**
 * Automated QA Audit for SketchFlow Light Mode, Dark Mode, and System Theme System
 */

import assert from 'assert';

// Headless DOM and Browser API mocks
class MockDOMTokenList {
  constructor() {
    this.classes = new Set();
  }
  add(cls) {
    this.classes.add(cls);
  }
  remove(cls) {
    this.classes.delete(cls);
  }
  contains(cls) {
    return this.classes.has(cls);
  }
  toggle(cls, force) {
    if (force !== undefined) {
      if (force) this.add(cls);
      else this.remove(cls);
      return force;
    }
    if (this.contains(cls)) {
      this.remove(cls);
      return false;
    }
    this.add(cls);
    return true;
  }
}

class MockElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.classList = new MockDOMTokenList();
    this.attributes = new Map();
    this.style = {};
  }
  setAttribute(name, val) {
    this.attributes.set(name, String(val));
  }
  getAttribute(name) {
    return this.attributes.get(name) || null;
  }
  removeAttribute(name) {
    this.attributes.delete(name);
  }
}

const mockDocumentElement = new MockElement('HTML');
const mockBody = new MockElement('BODY');
mockBody.appendChild = () => {};
mockBody.removeChild = () => {};

global.document = {
  documentElement: mockDocumentElement,
  body: mockBody,
  createElement: (tag) => {
    const el = new MockElement(tag);
    el.click = () => {};
    return el;
  }
};

let capturedBlob = null;
global.Blob = class {
  constructor(chunks, opts) {
    this.content = chunks.join('');
    this.type = opts?.type;
    capturedBlob = this;
  }
};

global.URL = {
  createObjectURL: () => 'blob:mock',
  revokeObjectURL: () => {}
};

// Mock LocalStorage
const storageStore = new Map();
global.localStorage = {
  getItem: (key) => storageStore.get(key) || null,
  setItem: (key, val) => storageStore.set(key, String(val)),
  removeItem: (key) => storageStore.delete(key),
  clear: () => storageStore.clear()
};

// Mock matchMedia
let systemDark = false;
const mediaListeners = new Set();
global.window = {
  matchMedia: (query) => ({
    matches: query.includes('prefers-color-scheme: dark') ? systemDark : false,
    addEventListener: (type, cb) => mediaListeners.add(cb),
    removeEventListener: (type, cb) => mediaListeners.delete(cb),
    addListener: (cb) => mediaListeners.add(cb),
    removeListener: (cb) => mediaListeners.delete(cb)
  })
};

function triggerSystemThemeChange(isDark) {
  systemDark = isDark;
  for (const listener of mediaListeners) {
    listener({ matches: isDark });
  }
}

// Import Theme Store and Canvas Utilities
const {
  useThemeStore,
  THEME_STORAGE_KEY,
  resolveEffectiveTheme,
  getStoredPreference
} = await import('../src/store/themeStore.js');

const { useCanvasStore } = await import('../src/store/canvasStore.js');
const { drawGrid } = await import('../src/utils/canvasUtils.js');
const { exportToSVG, exportToJSON } = await import('../src/utils/exportUtils.js');

let passCount = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  [FAIL] ${name}:`, err.message);
    process.exitCode = 1;
  }
}

console.log('--- STARTING SKETCHFLOW THEME SYSTEM AUDIT ---\n');

// Section 1: Initial Theme State & Resolution
console.log('[1] Testing Theme Preference Defaults & Resolution...');

test('1a. Default theme preference is system in fresh environment', () => {
  storageStore.clear();
  assert.strictEqual(getStoredPreference(), 'system');
});

test('1b. resolveEffectiveTheme resolves light when system is light', () => {
  systemDark = false;
  assert.strictEqual(resolveEffectiveTheme('system'), 'light');
});

test('1c. resolveEffectiveTheme resolves dark when system is dark', () => {
  systemDark = true;
  assert.strictEqual(resolveEffectiveTheme('system'), 'dark');
  systemDark = false; // Reset
});

test('1d. resolveEffectiveTheme explicitly respects dark preference', () => {
  assert.strictEqual(resolveEffectiveTheme('dark'), 'dark');
});

test('1e. resolveEffectiveTheme explicitly respects light preference', () => {
  assert.strictEqual(resolveEffectiveTheme('light'), 'light');
});

// Section 2: Manual Theme Switching & DOM Synchronization
console.log('\n[2] Testing Theme Switching & DOM Synchronization...');

test('2a. Setting dark theme updates preference and resolved theme to dark', () => {
  const store = useThemeStore.getState();
  store.setThemePreference('dark');
  assert.strictEqual(useThemeStore.getState().themePreference, 'dark');
  assert.strictEqual(useThemeStore.getState().resolvedTheme, 'dark');
});

test('2b. Setting dark theme adds dark class and data-theme to HTML root', () => {
  assert(mockDocumentElement.classList.contains('dark'), 'HTML root should have dark class');
  assert.strictEqual(mockDocumentElement.getAttribute('data-theme'), 'dark');
  assert.strictEqual(mockDocumentElement.style.colorScheme, 'dark');
});

test('2c. Setting light theme updates preference and resolved theme to light', () => {
  const store = useThemeStore.getState();
  store.setThemePreference('light');
  assert.strictEqual(useThemeStore.getState().themePreference, 'light');
  assert.strictEqual(useThemeStore.getState().resolvedTheme, 'light');
});

test('2d. Setting light theme removes dark class from HTML root', () => {
  assert(!mockDocumentElement.classList.contains('dark'), 'HTML root should not have dark class');
  assert.strictEqual(mockDocumentElement.getAttribute('data-theme'), 'light');
  assert.strictEqual(mockDocumentElement.style.colorScheme, 'light');
});

test('2e. cycleTheme cycles light -> dark -> system -> light', () => {
  const store = useThemeStore.getState();
  store.setThemePreference('light');

  store.cycleTheme();
  assert.strictEqual(useThemeStore.getState().themePreference, 'dark');

  store.cycleTheme();
  assert.strictEqual(useThemeStore.getState().themePreference, 'system');

  store.cycleTheme();
  assert.strictEqual(useThemeStore.getState().themePreference, 'light');
});

// Section 3: LocalStorage Persistence
console.log('\n[3] Testing LocalStorage Persistence & Restoration...');

test('3a. Setting dark mode persists to LocalStorage', () => {
  useThemeStore.getState().setThemePreference('dark');
  assert.strictEqual(localStorage.getItem(THEME_STORAGE_KEY), 'dark');
});

test('3b. Setting light mode persists to LocalStorage', () => {
  useThemeStore.getState().setThemePreference('light');
  assert.strictEqual(localStorage.getItem(THEME_STORAGE_KEY), 'light');
});

test('3c. Setting system mode persists to LocalStorage', () => {
  useThemeStore.getState().setThemePreference('system');
  assert.strictEqual(localStorage.getItem(THEME_STORAGE_KEY), 'system');
});

test('3d. Invalid preference in storage falls back safely to system', () => {
  localStorage.setItem(THEME_STORAGE_KEY, 'invalid_theme');
  assert.strictEqual(getStoredPreference(), 'system');
});

// Section 4: System Preference Listener
console.log('\n[4] Testing System Preference Changes & Listener...');

test('4a. When preference is system, OS change to dark activates dark theme', () => {
  useThemeStore.getState().setThemePreference('system');
  triggerSystemThemeChange(true);
  assert.strictEqual(useThemeStore.getState().resolvedTheme, 'dark');
  assert(mockDocumentElement.classList.contains('dark'));
});

test('4b. When preference is system, OS change to light activates light theme', () => {
  useThemeStore.getState().setThemePreference('system');
  triggerSystemThemeChange(false);
  assert.strictEqual(useThemeStore.getState().resolvedTheme, 'light');
  assert(!mockDocumentElement.classList.contains('dark'));
});

test('4c. When preference is manual (dark), OS change to light does NOT override user choice', () => {
  useThemeStore.getState().setThemePreference('dark');
  triggerSystemThemeChange(false);
  assert.strictEqual(useThemeStore.getState().themePreference, 'dark');
  assert.strictEqual(useThemeStore.getState().resolvedTheme, 'dark');
  assert(mockDocumentElement.classList.contains('dark'));
});

test('4d. When preference is manual (light), OS change to dark does NOT override user choice', () => {
  useThemeStore.getState().setThemePreference('light');
  triggerSystemThemeChange(true);
  assert.strictEqual(useThemeStore.getState().themePreference, 'light');
  assert.strictEqual(useThemeStore.getState().resolvedTheme, 'light');
  assert(!mockDocumentElement.classList.contains('dark'));
});

// Section 5: Canvas Protection & Drawing Element Invariance (CRITICAL)
console.log('\n[5] Testing Canvas Protection & Element Invariance...');

const mockElements = [
  {
    id: 'rect_1',
    type: 'rectangle',
    x: 100,
    y: 100,
    width: 200,
    height: 150,
    strokeColor: '#ef4444',
    backgroundColor: '#fef08a',
    strokeWidth: 4,
    opacity: 85
  },
  {
    id: 'circle_1',
    type: 'circle',
    x: 350,
    y: 100,
    width: 120,
    height: 120,
    strokeColor: '#1e1e1e',
    backgroundColor: 'transparent',
    strokeWidth: 2,
    opacity: 100
  },
  {
    id: 'text_1',
    type: 'text',
    x: 500,
    y: 120,
    width: 180,
    height: 40,
    text: 'Hello SketchFlow Dark Mode',
    color: '#3b82f6',
    fontSize: 24,
    fontFamily: 'Caveat, cursive'
  },
  {
    id: 'image_1',
    type: 'image',
    x: 200,
    y: 300,
    width: 300,
    height: 200,
    fileId: 'img_test_123',
    angle: 45,
    opacity: 90,
    lockAspectRatio: true
  }
];

test('5a. Loading test drawing elements into canvas store', () => {
  useCanvasStore.setState({
    elements: JSON.parse(JSON.stringify(mockElements)),
    history: [JSON.parse(JSON.stringify(mockElements))],
    historyIndex: 0
  });
  assert.strictEqual(useCanvasStore.getState().elements.length, 4);
});

test('5b. Switching to Dark Mode does NOT alter rectangle stroke or fill color', () => {
  useThemeStore.getState().setThemePreference('dark');
  const rect = useCanvasStore.getState().elements.find((e) => e.id === 'rect_1');
  assert.strictEqual(rect.strokeColor, '#ef4444');
  assert.strictEqual(rect.backgroundColor, '#fef08a');
  assert.strictEqual(rect.opacity, 85);
});

test('5c. Switching to Dark Mode does NOT alter transparent circle properties', () => {
  const circle = useCanvasStore.getState().elements.find((e) => e.id === 'circle_1');
  assert.strictEqual(circle.strokeColor, '#1e1e1e');
  assert.strictEqual(circle.backgroundColor, 'transparent');
});

test('5d. Switching to Dark Mode does NOT alter text element color or font', () => {
  const text = useCanvasStore.getState().elements.find((e) => e.id === 'text_1');
  assert.strictEqual(text.color, '#3b82f6');
  assert.strictEqual(text.text, 'Hello SketchFlow Dark Mode');
  assert.strictEqual(text.fontFamily, 'Caveat, cursive');
});

test('5e. Switching to Dark Mode does NOT alter image attributes or fileId', () => {
  const image = useCanvasStore.getState().elements.find((e) => e.id === 'image_1');
  assert.strictEqual(image.fileId, 'img_test_123');
  assert.strictEqual(image.angle, 45);
  assert.strictEqual(image.opacity, 90);
  assert.strictEqual(image.lockAspectRatio, true);
});

test('5f. Switching back to Light Mode keeps all drawing elements 100% invariant', () => {
  useThemeStore.getState().setThemePreference('light');
  const elements = useCanvasStore.getState().elements;
  assert.strictEqual(elements[0].strokeColor, '#ef4444');
  assert.strictEqual(elements[1].strokeColor, '#1e1e1e');
  assert.strictEqual(elements[2].color, '#3b82f6');
  assert.strictEqual(elements[3].fileId, 'img_test_123');
});

// Section 6: History & Undo/Redo Protection
console.log('\n[6] Testing History & Undo/Redo Protection...');

test('6a. Switching themes does NOT pollute or mutate undo history stack', () => {
  const beforeLength = useCanvasStore.getState().history.length;
  const beforeIndex = useCanvasStore.getState().historyIndex;

  useThemeStore.getState().setThemePreference('dark');
  useThemeStore.getState().setThemePreference('light');
  useThemeStore.getState().setThemePreference('system');

  const afterLength = useCanvasStore.getState().history.length;
  const afterIndex = useCanvasStore.getState().historyIndex;

  assert.strictEqual(afterLength, beforeLength, 'History stack length should not change');
  assert.strictEqual(afterIndex, beforeIndex, 'History index should not change');
});

test('6b. Undo and Redo operations continue to restore exact element states', () => {
  const store = useCanvasStore.getState();
  // Perform an element update
  store.updateElement('rect_1', { width: 250 }, true);
  assert.strictEqual(useCanvasStore.getState().elements[0].width, 250);

  // Switch theme during active session
  useThemeStore.getState().setThemePreference('dark');

  // Undo
  useCanvasStore.getState().undo();
  assert.strictEqual(useCanvasStore.getState().elements[0].width, 200, 'Undo should restore previous width');

  // Redo
  useCanvasStore.getState().redo();
  assert.strictEqual(useCanvasStore.getState().elements[0].width, 250, 'Redo should restore updated width');
});

// Section 7: Export Invariance
console.log('\n[7] Testing Export Invariance Across Themes...');

test('7a. SVG export retains identical vector stroke and fill in dark mode', () => {
  useThemeStore.getState().setThemePreference('dark');
  capturedBlob = null;
  exportToSVG(useCanvasStore.getState().elements, { filename: 'test-dark.svg' });
  assert(capturedBlob && capturedBlob.content.includes('<svg'), 'SVG export should produce valid svg');
  assert(capturedBlob.content.includes('#ef4444'), 'SVG export should retain red stroke');
  assert(capturedBlob.content.includes('#fef08a'), 'SVG export should retain yellow fill');
});

test('7b. JSON export bundles unmutated element properties in dark mode', () => {
  useThemeStore.getState().setThemePreference('dark');
  capturedBlob = null;
  const jsonString = exportToJSON(useCanvasStore.getState().elements, {}, 'test-dark.sketchflow');
  const parsed = JSON.parse(jsonString || capturedBlob.content);
  const rect = parsed.elements.find((e) => e.id === 'rect_1');
  assert.strictEqual(rect.strokeColor, '#ef4444');
  assert.strictEqual(rect.backgroundColor, '#fef08a');
});

// Section 8: Grid Rendering Invariance & Theme Adaptation
console.log('\n[8] Testing Grid Drawing Theme Colors...');

test('8a. drawGrid uses light dot color (#d4d4d8) when isDark is false', () => {
  let recordedFill = null;
  const mockCtx = {
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    arc: () => {},
    fill: () => {},
    set fillStyle(val) {
      recordedFill = val;
    }
  };
  drawGrid(mockCtx, 1000, 800, { x: 0, y: 0 }, 1, 'dots', false);
  assert.strictEqual(recordedFill, '#d4d4d8');
});

test('8b. drawGrid uses dark dot color (#3f3f46) when isDark is true', () => {
  let recordedFill = null;
  const mockCtx = {
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    arc: () => {},
    fill: () => {},
    set fillStyle(val) {
      recordedFill = val;
    }
  };
  drawGrid(mockCtx, 1000, 800, { x: 0, y: 0 }, 1, 'dots', true);
  assert.strictEqual(recordedFill, '#3f3f46');
});

test('8c. drawGrid uses light line color (#e4e4e7) when isDark is false', () => {
  let recordedStroke = null;
  const mockCtx = {
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    set strokeStyle(val) {
      recordedStroke = val;
    }
  };
  drawGrid(mockCtx, 1000, 800, { x: 0, y: 0 }, 1, 'lines', false);
  assert.strictEqual(recordedStroke, '#e4e4e7');
});

test('8d. drawGrid uses dark line color (#27272a) when isDark is true', () => {
  let recordedStroke = null;
  const mockCtx = {
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    set strokeStyle(val) {
      recordedStroke = val;
    }
  };
  drawGrid(mockCtx, 1000, 800, { x: 0, y: 0 }, 1, 'lines', true);
  assert.strictEqual(recordedStroke, '#27272a');
});

console.log(`\n=============================================`);
console.log(`THEME AUDIT COMPLETE: ${passCount} PASSED | ${process.exitCode ? 1 : 0} FAILED`);
console.log(`=============================================\n`);
