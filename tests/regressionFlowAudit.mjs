/**
 * End-to-End Combination Workflows & Multi-Zoom Regression Test Suite
 */

import { useCanvasStore } from '../src/store/canvasStore.js';
import { RectangleTool } from '../src/components/tools/RectangleTool.js';
import { CircleTool } from '../src/components/tools/CircleTool.js';
import { ArrowTool } from '../src/components/tools/ArrowTool.js';
import { PencilTool } from '../src/components/tools/PencilTool.js';
import { SelectionTool } from '../src/components/tools/SelectionTool.js';
import { screenToCanvas, canvasToScreen, measureText } from '../src/utils/canvasUtils.js';
import { getElementBounds, getElementsBounds, getHandleUnderCursor } from '../src/utils/geometryUtils.js';
import { hitTestElement } from '../src/utils/hitTestUtils.js';
import { saveToStorage, loadFromStorage, clearStorage } from '../src/utils/storageUtils.js';
import { exportToPNG, exportToSVG, exportToJSON, importFromJSON } from '../src/utils/exportUtils.js';

// Setup Mock Environment
const mockStorage = new Map();
globalThis.localStorage = {
  getItem: (k) => mockStorage.get(k) || null,
  setItem: (k, v) => mockStorage.set(k, String(v)),
  removeItem: (k) => mockStorage.delete(k),
  clear: () => mockStorage.clear()
};
globalThis.window = {
  innerWidth: 1920,
  innerHeight: 1080,
  devicePixelRatio: 2
};
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
  createElement: () => ({
    setAttribute: () => {},
    click: () => {},
    getContext: () => ({
      scale: () => {},
      fillRect: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      beginPath: () => {},
      stroke: () => {},
      fill: () => {},
      moveTo: () => {},
      lineTo: () => {},
      rect: () => {},
      roundRect: () => {},
      ellipse: () => {},
      closePath: () => {},
      quadraticCurveTo: () => {},
      strokeRect: () => {},
      fillText: () => {},
      clip: () => {},
      arc: () => {},
      setLineDash: () => {},
      measureText: (txt) => ({ width: (txt || '').length * 10 })
    }),
    toBlob: (cb) => cb(new Blob(['png_bytes'], { type: 'image/png' }))
  })
};

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    passedCount++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failedCount++;
    console.error(`  [FAIL] ${testName}: ${details}`);
  }
}

console.log('--- STARTING COMBINATIONS & MULTI-ZOOM REGRESSION AUDIT ---');

const store = useCanvasStore;

// WORKFLOW 1: Draw rectangle -> select -> move -> resize
console.log('\n[Workflow 1] Draw rectangle -> select -> move -> resize...');
{
  store.getState().clearCanvas();
  const rectTool = new RectangleTool(store);
  const selectionTool = new SelectionTool(store);

  // 1. Draw rectangle
  rectTool.onPointerDown({ x: 100, y: 100 });
  rectTool.onPointerMove({ x: 200, y: 180 });
  const rect = rectTool.onPointerUp();
  assert(rect !== null && rect.width === 100 && rect.height === 80, '1a. Rectangle created at (100, 100, 100, 80)');

  // 2. Select rectangle
  selectionTool.onPointerDown({ x: 150, y: 140 }, false, 1.0);
  selectionTool.onPointerUp();
  assert(store.getState().selectedIds.includes(rect.id), '1b. Rectangle selected by click');

  // 3. Move rectangle by dx = 50, dy = 30
  selectionTool.onPointerDown({ x: 150, y: 140 }, false, 1.0);
  selectionTool.onPointerMove({ x: 200, y: 170 });
  selectionTool.onPointerUp();
  const moved = store.getState().elements.find(e => e.id === rect.id);
  assert(moved.x === 150 && moved.y === 130, '1c. Rectangle moved to (150, 130)');

  // 4. Resize via SE handle
  const bounds = getElementBounds(moved);
  const seHandle = getHandleUnderCursor(bounds.maxX, bounds.maxY, bounds, 10, 1.0);
  assert(seHandle !== null && seHandle.handle === 'se', '1d. SE handle detected on moved shape');

  selectionTool.onPointerDown({ x: bounds.maxX, y: bounds.maxY }, false, 1.0);
  selectionTool.onPointerMove({ x: bounds.maxX + 40, y: bounds.maxY + 20 });
  selectionTool.onPointerUp();
  const resized = store.getState().elements.find(e => e.id === rect.id);
  assert(resized.width === 140 && resized.height === 100, '1e. Rectangle resized to (140, 100)');
}

// WORKFLOW 2: Draw circle -> change color -> undo
console.log('\n[Workflow 2] Draw circle -> change color -> undo...');
{
  store.getState().clearCanvas();
  const circleTool = new CircleTool(store);
  const initialColor = store.getState().toolProperties.strokeColor;

  circleTool.onPointerDown({ x: 100, y: 100 });
  circleTool.onPointerMove({ x: 180, y: 180 });
  const circle = circleTool.onPointerUp();
  assert(circle !== null, '2a. Circle drawn');

  store.getState().setSelectedIds([circle.id]);
  store.getState().updateToolProperties({ strokeColor: '#ef4444' });
  const updatedCircle = store.getState().elements.find(e => e.id === circle.id);
  assert(updatedCircle.strokeColor === '#ef4444', '2b. Stroke color updated to #ef4444');

  store.getState().undo();
  const undoneCircle = store.getState().elements.find(e => e.id === circle.id);
  assert(undoneCircle.strokeColor === initialColor, '2c. Undo successfully restored original color');
}

// WORKFLOW 3: Draw multiple shapes -> multi-select -> delete
console.log('\n[Workflow 3] Draw multiple shapes -> multi-select -> delete...');
{
  store.getState().clearCanvas();
  store.getState().addElement({ id: 's1', type: 'rectangle', x: 50, y: 50, width: 40, height: 40 });
  store.getState().addElement({ id: 's2', type: 'rectangle', x: 110, y: 50, width: 40, height: 40 });
  store.getState().addElement({ id: 's3', type: 'rectangle', x: 400, y: 400, width: 40, height: 40 });
  assert(store.getState().elements.length === 3, '3a. 3 shapes created');

  const selectionTool = new SelectionTool(store);
  // Drag marquee over s1 and s2 only
  selectionTool.onPointerDown({ x: 30, y: 30 }, false, 1.0);
  selectionTool.onPointerMove({ x: 170, y: 110 });
  selectionTool.onPointerUp();
  const selected = store.getState().selectedIds;
  assert(selected.length === 2 && selected.includes('s1') && selected.includes('s2'), '3b. Marquee selected s1 and s2');

  store.getState().deleteSelected();
  assert(store.getState().elements.length === 1 && store.getState().elements[0].id === 's3', '3c. Deleted s1 and s2, leaving s3 intact');

  store.getState().undo();
  assert(store.getState().elements.length === 3, '3d. Undo restores deleted shapes');
}

// WORKFLOW 4: Draw arrow -> zoom -> pan -> select
console.log('\n[Workflow 4] Draw arrow -> zoom -> pan -> select...');
{
  store.getState().clearCanvas();
  const arrowTool = new ArrowTool(store);
  arrowTool.onPointerDown({ x: 200, y: 200 });
  arrowTool.onPointerMove({ x: 350, y: 250 });
  const arrow = arrowTool.onPointerUp();
  assert(arrow !== null, '4a. Arrow drawn from (200, 200) to (350, 250)');

  // Apply 1.5x zoom and pan (100, 50)
  store.getState().setZoom(1.5);
  store.getState().setPanOffset({ x: 100, y: 50 });

  // Compute screen coordinates for arrow midpoint
  const midWorld = { x: 275, y: 225 };
  const screenPt = canvasToScreen(midWorld.x, midWorld.y, store.getState().panOffset, store.getState().zoom);
  const reconverted = screenToCanvas(screenPt.x, screenPt.y, store.getState().panOffset, store.getState().zoom);
  assert(Math.abs(reconverted.x - midWorld.x) < 0.001 && Math.abs(reconverted.y - midWorld.y) < 0.001, '4b. Exact screen-to-world roundtrip at 150% zoom and pan');

  // Hit test arrow through converted point
  const hit = hitTestElement(reconverted.x, reconverted.y, arrow, 1.5);
  assert(hit === true, '4c. Arrow hit tested and selected at 150% zoom and pan');
}

// WORKFLOW 5: Add text -> edit -> save -> refresh
console.log('\n[Workflow 5] Add text -> edit -> save -> refresh...');
{
  clearStorage();
  store.getState().clearCanvas();

  // Add text
  const textEl = {
    id: 'txt_1',
    type: 'text',
    x: 100,
    y: 100,
    width: 120,
    height: 30,
    text: 'Hello World',
    fontSize: 24,
    fontFamily: 'Caveat, cursive',
    strokeColor: '#1e1e1e',
    opacity: 100
  };
  store.getState().addElement(textEl);

  // Edit text
  store.getState().updateElement('txt_1', { text: 'Hello SketchFlow!\nLine 2' }, true);
  const edited = store.getState().elements.find(e => e.id === 'txt_1');
  assert(edited.text === 'Hello SketchFlow!\nLine 2', '5a. Multiline text updated');

  // Save to storage
  saveToStorage({
    elements: store.getState().elements,
    panOffset: store.getState().panOffset,
    zoom: store.getState().zoom,
    gridType: store.getState().gridType
  });

  // Refresh (load from storage)
  const reloaded = loadFromStorage();
  assert(reloaded !== null && reloaded.elements.length === 1 && reloaded.elements[0].text === 'Hello SketchFlow!\nLine 2', '5b. Persisted drawing matches after refresh');
}

// WORKFLOW 6: Draw multiple shapes -> export PNG & SVG
console.log('\n[Workflow 6] Draw multiple shapes -> export PNG & SVG...');
{
  const shapes = [
    { id: '1', type: 'rectangle', x: 20, y: 20, width: 80, height: 60, strokeColor: '#1e1e1e', backgroundColor: '#fef08a', fillStyle: 'solid' },
    { id: '2', type: 'circle', x: 120, y: 20, width: 60, height: 60, strokeColor: '#3b82f6', fillStyle: 'semi', backgroundColor: '#93c5fd' },
    { id: '3', type: 'diamond', x: 200, y: 20, width: 60, height: 60, strokeColor: '#10b981', fillStyle: 'hachure', backgroundColor: '#a7f3d0' }
  ];

  exportToSVG(shapes, { filename: 'shapes.svg' });
  assert(capturedBlob !== null && capturedBlob.content.includes('<svg'), '6a. SVG successfully generated');

  await exportToPNG(shapes, { filename: 'shapes.png' });
  assert(capturedBlob !== null && capturedBlob.type === 'image/png', '6b. PNG successfully exported');
}

// WORKFLOW 7: Import JSON -> modify -> export again
console.log('\n[Workflow 7] Import JSON -> modify -> export again...');
{
  const jsonString = JSON.stringify({
    type: 'sketchflow',
    version: 1,
    elements: [
      { id: 'imp_1', type: 'rectangle', x: 50, y: 50, width: 100, height: 80, strokeColor: '#18181b' }
    ]
  });

  const imported = importFromJSON(jsonString);
  assert(imported.elements.length === 1 && imported.elements[0].id === 'imp_1', '7a. JSON correctly parsed');

  store.getState().loadDrawing(imported.elements);
  store.getState().updateElement('imp_1', { width: 180 }, true);

  exportToJSON(store.getState().elements, {}, 'reexported.sketchflow');
  assert(capturedBlob !== null && capturedBlob.content.includes('"width": 180'), '7b. Modified imported drawing re-exported with updated width');
}

// WORKFLOW 8: Multi-zoom coordinate accuracy (50%, 75%, 100%, 150%, 200%)
console.log('\n[Workflow 8] Testing Coordinate Math across Zoom Levels...');
{
  const zoomLevels = [0.5, 0.75, 1.0, 1.5, 2.0];
  const pan = { x: 80, y: -40 };

  for (const z of zoomLevels) {
    const screenCoord = { x: 500, y: 350 };
    const worldCoord = screenToCanvas(screenCoord.x, screenCoord.y, pan, z);
    const roundtrip = canvasToScreen(worldCoord.x, worldCoord.y, pan, z);
    const diff = Math.hypot(roundtrip.x - screenCoord.x, roundtrip.y - screenCoord.y);
    assert(diff < 0.0001, `8. Precision verified at ${Math.round(z * 100)}% zoom (delta = ${diff})`);
  }
}

// WORKFLOW 9: High-Volume Performance (100, 500, 1000 shapes)
console.log('\n[Workflow 9] High-Volume Shape Performance...');
{
  for (const count of [100, 500, 1000]) {
    const set = [];
    for (let i = 0; i < count; i++) {
      set.push({
        id: `shape_${i}`,
        type: 'rectangle',
        x: (i * 15) % 1500,
        y: Math.floor(i / 100) * 60,
        width: 30,
        height: 30
      });
    }

    const t0 = performance.now();
    const bounds = getElementsBounds(set);
    const duration = performance.now() - t0;
    assert(duration < 20, `9. Bounding box computation for ${count} shapes completed in ${duration.toFixed(2)}ms (< 20ms)`);
  }
}

// WORKFLOW 10: Continuous Freehand Drawing Smoothness
console.log('\n[Workflow 10] Continuous Freehand Drawing Smoothness...');
{
  const pencil = new PencilTool(store);
  pencil.onPointerDown({ x: 0, y: 0 });
  for (let i = 1; i <= 200; i++) {
    pencil.onPointerMove({ x: i * 2, y: Math.sin(i / 10) * 50 });
  }
  const stroke = pencil.onPointerUp();
  assert(stroke !== null && stroke.points.length === 201, '10a. Continuous freehand stroke recorded 201 points without gaps');
}

console.log('\n=============================================');
console.log(`REGRESSION AUDIT SUMMARY: ${passedCount} PASSED | ${failedCount} FAILED`);
console.log('=============================================\n');

if (failedCount > 0) {
  process.exit(1);
}
