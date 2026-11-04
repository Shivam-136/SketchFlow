/**
 * Comprehensive Automated Functional QA Audit Test Suite for SketchFlow
 */

import { distance, normalizeRect, getElementBounds, getElementsBounds, getResizeHandles, getHandleUnderCursor, distanceToSegment, rectsIntersect } from '../src/utils/geometryUtils.js';
import { hitTestElement, getElementsInSelectionBox } from '../src/utils/hitTestUtils.js';
import { screenToCanvas, canvasToScreen, measureText, generateId } from '../src/utils/canvasUtils.js';
import { saveToStorage, loadFromStorage, clearStorage } from '../src/utils/storageUtils.js';
import { exportToSVG, exportToJSON, importFromJSON } from '../src/utils/exportUtils.js';
import { SelectionManager } from '../src/components/canvas/SelectionManager.js';

// Setup Mock LocalStorage for Node.js environment
const mockStorage = new Map();
globalThis.localStorage = {
  getItem: (k) => mockStorage.get(k) || null,
  setItem: (k, v) => mockStorage.set(k, String(v)),
  removeItem: (k) => mockStorage.delete(k),
  clear: () => mockStorage.clear()
};

// Test Runner Helper
let passedCount = 0;
let failedCount = 0;
const failures = [];

function assert(condition, testName, details = '') {
  if (condition) {
    passedCount++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failedCount++;
    failures.push({ testName, details });
    console.error(`  [FAIL] ${testName}: ${details}`);
  }
}

console.log('--- STARTING SKETCHFLOW COMPREHENSIVE QA AUDIT ---');

// 1. TEST GEOMETRY UTILITIES
console.log('\n[1] Testing Geometry Utilities...');
{
  assert(distance(0, 0, 3, 4) === 5, 'Distance calculation 3-4-5 triangle');
  
  const norm = normalizeRect(50, 50, -30, -20);
  assert(norm.x === 20 && norm.y === 30 && norm.width === 30 && norm.height === 20, 'Rect normalization with negative dimensions');

  const rectEl = { type: 'rectangle', x: 10, y: 20, width: 100, height: 50 };
  const bRect = getElementBounds(rectEl);
  assert(bRect.minX === 10 && bRect.maxX === 110 && bRect.minY === 20 && bRect.maxY === 70 && bRect.width === 100 && bRect.height === 50, 'Rectangle bounds calculation');

  const lineEl = { type: 'line', x: 10, y: 20, x2: 90, y2: 60 };
  const bLine = getElementBounds(lineEl);
  assert(bLine.minX === 10 && bLine.maxX === 90 && bLine.minY === 20 && bLine.maxY === 60, 'Line bounds calculation');

  const pencilEl = { type: 'pencil', x: 0, y: 0, points: [{ x: 5, y: 10 }, { x: 50, y: 80 }, { x: 25, y: 30 }] };
  const bPencil = getElementBounds(pencilEl);
  assert(bPencil.minX === 5 && bPencil.maxX === 50 && bPencil.minY === 10 && bPencil.maxY === 80, 'Pencil stroke bounds calculation');

  const groupBounds = getElementsBounds([rectEl, lineEl]);
  assert(groupBounds.minX === 10 && groupBounds.maxX === 110 && groupBounds.minY === 20 && groupBounds.maxY === 70, 'Group bounding box calculation');

  const handles = getResizeHandles(bRect, 1);
  assert(handles.nw.x === 6 && handles.nw.y === 16 && handles.se.x === 114 && handles.se.y === 74, '8 resize handles calculation with pad');

  const handleHit = getHandleUnderCursor(6, 16, bRect, 8, 1);
  assert(handleHit !== null && handleHit.handle === 'nw', 'Handle hit detection on NW corner');
}

// 2. TEST HIT TESTING ENGINE
console.log('\n[2] Testing Hit Testing Engine...');
{
  const rectFilled = { type: 'rectangle', x: 100, y: 100, width: 200, height: 100, backgroundColor: '#ef4444', fillStyle: 'solid' };
  assert(hitTestElement(150, 150, rectFilled, 1) === true, 'Filled rectangle interior hit test');
  assert(hitTestElement(50, 50, rectFilled, 1) === false, 'Point outside rectangle test');

  const rectTransparent = { type: 'rectangle', x: 100, y: 100, width: 200, height: 100, backgroundColor: 'transparent', fillStyle: 'none' };
  assert(hitTestElement(150, 150, rectTransparent, 1) === true, 'Transparent rectangle interior selects rectangle');
  assert(hitTestElement(100, 150, rectTransparent, 1) === true, 'Transparent rectangle left border hit test');

  const circleFilled = { type: 'circle', x: 200, y: 200, width: 100, height: 100, backgroundColor: '#3b82f6', fillStyle: 'solid' };
  assert(hitTestElement(250, 250, circleFilled, 1) === true, 'Filled circle center hit test');
  assert(hitTestElement(202, 202, circleFilled, 1) === false, 'Point outside circle diagonal corner');

  const diamond = { type: 'diamond', x: 300, y: 300, width: 100, height: 100, backgroundColor: '#10b981', fillStyle: 'solid' };
  assert(hitTestElement(350, 350, diamond, 1) === true, 'Diamond center hit test');

  const line = { type: 'line', x: 50, y: 50, x2: 150, y2: 150, strokeWidth: 2 };
  assert(hitTestElement(100, 100, line, 1) === true, 'Point on line segment hit test');
  assert(hitTestElement(100, 150, line, 1) === false, 'Point off line segment');

  const arrow = { type: 'arrow', x: 50, y: 50, x2: 150, y2: 50, strokeWidth: 2 };
  assert(hitTestElement(100, 50, arrow, 1) === true, 'Arrow shaft hit test');

  const textEl = { type: 'text', x: 100, y: 100, width: 80, height: 30, text: 'Hello' };
  assert(hitTestElement(120, 115, textEl, 1) === true, 'Text element bounding box hit test');

  // Zoomed hit test
  assert(hitTestElement(100, 100, line, 0.5) === true, 'Hit test at 50% zoom');
  assert(hitTestElement(100, 100, line, 2.0) === true, 'Hit test at 200% zoom');
}

// 3. TEST SELECTION MARQUEE INTERSECTION
console.log('\n[3] Testing Marquee Multi-selection...');
{
  const el1 = { id: '1', type: 'rectangle', x: 10, y: 10, width: 50, height: 50 };
  const el2 = { id: '2', type: 'rectangle', x: 100, y: 100, width: 50, height: 50 };
  const el3 = { id: '3', type: 'rectangle', x: 300, y: 300, width: 50, height: 50 };
  const elements = [el1, el2, el3];

  const marqueeBox = { x: 0, y: 0, width: 180, height: 180 };
  const matched = getElementsInSelectionBox(elements, marqueeBox);
  assert(matched.length === 2 && matched.some(e => e.id === '1') && matched.some(e => e.id === '2'), 'Marquee selects intersecting elements (el1 & el2)');
  assert(!matched.some(e => e.id === '3'), 'Marquee excludes non-intersecting element (el3)');
}

// 4. TEST SELECTION MANAGER RESIZING
console.log('\n[4] Testing Selection Manager Resizing...');
{
  const mockStore = {
    getState: () => ({ elements: [], selectedIds: [] }),
    updateElements: () => {}
  };
  const sm = new SelectionManager(mockStore);

  const rect = { id: 'r1', type: 'rectangle', x: 100, y: 100, width: 100, height: 80 };
  sm.startResize('se', { x: 200, y: 180 }, [rect]);
  const resizedSE = sm.resize({ x: 250, y: 220 });
  assert(resizedSE !== null && resizedSE[0].width === 150 && resizedSE[0].height === 120, 'Resize SE handle scales width & height');

  sm.finishResize();

  // Test anchor clamping (dragging W handle past E edge)
  sm.startResize('w', { x: 100, y: 100 }, [rect]);
  const clampedW = sm.resize({ x: 300, y: 100 });
  assert(clampedW !== null && clampedW[0].width >= 10 && clampedW[0].x <= rect.x + rect.width - 10, 'W handle clamps without inverting coordinates');
  sm.finishResize();

  // Test Line Resizing
  const line = { id: 'l1', type: 'line', x: 100, y: 100, x2: 200, y2: 200, width: 100, height: 100 };
  sm.startResize('e', { x: 200, y: 150 }, [line]);
  const resizedLine = sm.resize({ x: 300, y: 150 });
  assert(resizedLine !== null && resizedLine[0].x2 === 300 && resizedLine[0].width === 200, 'Resize line scales endpoint coordinates');
  sm.finishResize();
}

// 5. TEST CANVAS COORDINATE TRANSFORMS
console.log('\n[5] Testing Canvas Coordinate Transforms...');
{
  const panOffset = { x: 100, y: 50 };
  const zoom = 2;

  const canvasPt = screenToCanvas(300, 250, panOffset, zoom);
  assert(canvasPt.x === (300 - 100) / 2 && canvasPt.y === (250 - 50) / 2, 'Screen to Canvas transformation with pan & 2x zoom');

  const screenPt = canvasToScreen(canvasPt.x, canvasPt.y, panOffset, zoom);
  assert(screenPt.x === 300 && screenPt.y === 250, 'Canvas to Screen inverse transformation roundtrip');
}

// 6. TEST LOCALSTORAGE PERSISTENCE
console.log('\n[6] Testing LocalStorage Persistence...');
{
  clearStorage();
  assert(loadFromStorage() === null, 'Storage begins empty');

  const testData = {
    elements: [{ id: '1', type: 'rectangle', x: 50, y: 50, width: 100, height: 60 }],
    panOffset: { x: 20, y: 30 },
    zoom: 1.5,
    gridType: 'dots',
    elementProperties: { strokeColor: '#ef4444' }
  };

  saveToStorage(testData);
  const loaded = loadFromStorage();
  assert(loaded !== null && loaded.elements.length === 1 && loaded.elements[0].id === '1', 'Save & Load drawing from localStorage');
  assert(loaded.appState.zoom === 1.5 && loaded.appState.gridType === 'dots', 'Save & Load app state');

  clearStorage();
  assert(loadFromStorage() === null, 'Storage cleared successfully');
}

// 7. TEST EXPORT / IMPORT FORMATS
console.log('\n[7] Testing Export & Import Utilities...');
{
  const testElements = [
    { id: '1', type: 'rectangle', x: 10, y: 10, width: 100, height: 80, strokeColor: '#000000', backgroundColor: '#3b82f6', fillStyle: 'solid' },
    { id: '2', type: 'circle', x: 150, y: 50, width: 60, height: 60, strokeColor: '#ef4444' },
    { id: '3', type: 'diamond', x: 250, y: 50, width: 60, height: 60, strokeColor: '#10b981' },
    { id: '4', type: 'arrow', x: 50, y: 200, x2: 150, y2: 200, strokeWidth: 2 },
    { id: '5', type: 'text', x: 50, y: 250, width: 100, height: 30, text: 'Test Whiteboard', fontSize: 24, textAlign: 'left' }
  ];

  // Test SVG Export Output
  let capturedBlob = null;
  globalThis.Blob = class {
    constructor(chunks, opts) {
      this.content = chunks.join('');
      this.type = opts?.type;
      capturedBlob = this;
    }
  };
  globalThis.URL = {
    createObjectURL: () => 'blob:mock',
    revokeObjectURL: () => {}
  };
  globalThis.document = {
    body: { appendChild: () => {}, removeChild: () => {} },
    createElement: () => ({ setAttribute: () => {}, click: () => {} })
  };

  exportToSVG(testElements, { filename: 'test.svg' });
  assert(capturedBlob !== null && capturedBlob.content.includes('<svg') && capturedBlob.content.includes('</svg>'), 'SVG Export produces valid root <svg> tags');
  assert(capturedBlob.content.includes('<rect') && capturedBlob.content.includes('<ellipse') && capturedBlob.content.includes('<polygon') && capturedBlob.content.includes('<text'), 'SVG Export contains all drawn shape elements');

  // Test JSON Export & Import
  let capturedJson = null;
  exportToJSON(testElements, { gridType: 'dots' }, 'test.sketchflow');
  assert(capturedBlob !== null && capturedBlob.content.includes('sketchflow'), 'JSON Export contains sketchflow format metadata');

  const parsed = importFromJSON(capturedBlob.content);
  assert(parsed.elements.length === testElements.length, 'JSON Import restores exact element count');
  assert(parsed.elements[0].type === 'rectangle' && parsed.elements[4].text === 'Test Whiteboard', 'JSON Import restores element contents and attributes');
}

// 8. STRESS TEST / PERFORMANCE AUDIT
console.log('\n[8] Performance Stress Test (2,000 Elements)...');
{
  const largeElementSet = [];
  for (let i = 0; i < 2000; i++) {
    largeElementSet.push({
      id: `el_${i}`,
      type: i % 2 === 0 ? 'rectangle' : 'circle',
      x: (i * 20) % 2000,
      y: Math.floor(i / 100) * 50,
      width: 40,
      height: 40,
      strokeColor: '#1e1e1e',
      backgroundColor: 'transparent'
    });
  }

  const startT = performance.now();
  const bounds = getElementsBounds(largeElementSet);
  const boundsTime = performance.now() - startT;
  assert(boundsTime < 50, `Bounding box for 2,000 elements calculated in ${boundsTime.toFixed(2)}ms (< 50ms)`);

  const hitStartT = performance.now();
  for (let i = 0; i < 500; i++) {
    hitTestElement(500, 200, largeElementSet[i], 1);
  }
  const hitTime = performance.now() - hitStartT;
  assert(hitTime < 50, `500 hit test iterations executed in ${hitTime.toFixed(2)}ms (< 50ms)`);
}

console.log('\n=============================================');
console.log(`QA AUDIT SUMMARY: ${passedCount} PASSED | ${failedCount} FAILED`);
console.log('=============================================\n');

if (failedCount > 0) {
  process.exit(1);
}

