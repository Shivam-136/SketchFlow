/**
 * Store, Tools, and Undo/Redo Multi-operation Audit Test Suite
 */

import { useCanvasStore } from '../src/store/canvasStore.js';
import { RectangleTool } from '../src/components/tools/RectangleTool.js';
import { CircleTool } from '../src/components/tools/CircleTool.js';
import { DiamondTool } from '../src/components/tools/DiamondTool.js';
import { ArrowTool } from '../src/components/tools/ArrowTool.js';
import { LineTool } from '../src/components/tools/LineTool.js';
import { PencilTool } from '../src/components/tools/PencilTool.js';
import { EraserTool } from '../src/components/tools/EraserTool.js';

// Setup Mock LocalStorage
const mockStorage = new Map();
globalThis.localStorage = {
  getItem: (k) => mockStorage.get(k) || null,
  setItem: (k, v) => mockStorage.set(k, String(v)),
  removeItem: (k) => mockStorage.delete(k),
  clear: () => mockStorage.clear()
};
globalThis.window = {
  innerWidth: 1920,
  innerHeight: 1080
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

console.log('--- STARTING STORE, ACTIONS & DRAWING TOOLS AUDIT ---');

// 1. TEST DRAWING TOOLS
console.log('\n[1] Testing Drawing Tools Interaction Lifecycle...');
{
  useCanvasStore.getState().clearCanvas();
  const store = useCanvasStore;

  // Rectangle Tool
  const rectTool = new RectangleTool(store);
  rectTool.onPointerDown({ x: 50, y: 50 });
  rectTool.onPointerMove({ x: 150, y: 150 });
  const rectFinal = rectTool.onPointerUp();
  assert(rectFinal !== null && rectFinal.type === 'rectangle' && rectFinal.width === 100 && rectFinal.height === 100, 'RectangleTool creates normalized shape');
  assert(store.getState().elements.length === 1, 'Rectangle added to store elements');

  // Circle Tool
  const circleTool = new CircleTool(store);
  circleTool.onPointerDown({ x: 200, y: 200 });
  circleTool.onPointerMove({ x: 300, y: 300 });
  const circleFinal = circleTool.onPointerUp();
  assert(circleFinal !== null && circleFinal.type === 'circle' && circleFinal.width === 100, 'CircleTool creates circle element');
  assert(store.getState().elements.length === 2, 'Circle added to store elements');

  // Diamond Tool
  const diamondTool = new DiamondTool(store);
  diamondTool.onPointerDown({ x: 400, y: 100 });
  diamondTool.onPointerMove({ x: 480, y: 180 });
  const diamondFinal = diamondTool.onPointerUp();
  assert(diamondFinal !== null && diamondFinal.type === 'diamond' && diamondFinal.width === 80, 'DiamondTool creates diamond element');

  // Arrow Tool
  const arrowTool = new ArrowTool(store);
  arrowTool.onPointerDown({ x: 10, y: 10 });
  arrowTool.onPointerMove({ x: 100, y: 10 });
  const arrowFinal = arrowTool.onPointerUp();
  assert(arrowFinal !== null && arrowFinal.type === 'arrow' && arrowFinal.x2 === 100, 'ArrowTool creates arrow element');

  // Line Tool
  const lineTool = new LineTool(store);
  lineTool.onPointerDown({ x: 10, y: 50 });
  lineTool.onPointerMove({ x: 100, y: 50 });
  const lineFinal = lineTool.onPointerUp();
  assert(lineFinal !== null && lineFinal.type === 'line' && lineFinal.x2 === 100, 'LineTool creates line element');

  // Pencil Tool
  const pencilTool = new PencilTool(store);
  pencilTool.onPointerDown({ x: 10, y: 20 });
  pencilTool.onPointerMove({ x: 15, y: 25 });
  pencilTool.onPointerMove({ x: 25, y: 35 });
  const pencilFinal = pencilTool.onPointerUp();
  assert(pencilFinal !== null && pencilFinal.type === 'pencil' && pencilFinal.points.length === 3, 'PencilTool records smooth points');
}

// 2. TEST UNDO / REDO INTEGRITY ACROSS 10 MUTATIONS
console.log('\n[2] Testing Undo / Redo Multi-step Chain...');
{
  const store = useCanvasStore;
  const initialCount = store.getState().elements.length; // 6 elements

  // Add 4 more elements
  for (let i = 0; i < 4; i++) {
    store.getState().addElement({
      id: `undo_test_${i}`,
      type: 'rectangle',
      x: i * 20,
      y: i * 20,
      width: 50,
      height: 50
    });
  }
  assert(store.getState().elements.length === initialCount + 4, 'Added 4 elements to history');

  // Undo 4 times
  store.getState().undo();
  store.getState().undo();
  store.getState().undo();
  store.getState().undo();
  assert(store.getState().elements.length === initialCount, 'Undo restores back to 6 elements');

  // Redo 4 times
  store.getState().redo();
  store.getState().redo();
  store.getState().redo();
  store.getState().redo();
  assert(store.getState().elements.length === initialCount + 4, 'Redo restores 4 elements');
}

// 3. TEST COPY, PASTE & DUPLICATE
console.log('\n[3] Testing Copy, Paste, and Duplicate...');
{
  const store = useCanvasStore;
  const countBefore = store.getState().elements.length;
  const firstId = store.getState().elements[0].id;

  store.getState().setSelectedIds([firstId]);
  store.getState().duplicateSelected();
  assert(store.getState().elements.length === countBefore + 1, 'Duplicate adds 1 new element');
  assert(store.getState().selectedIds[0] !== firstId, 'Duplicate selects new element');

  // Copy and Paste
  store.getState().copySelected();
  store.getState().paste();
  assert(store.getState().elements.length === countBefore + 2, 'Paste adds copied element');
}

// 4. TEST LAYER ORDERING & ALIGNMENT
console.log('\n[4] Testing Layer Ordering & Alignment...');
{
  const store = useCanvasStore;
  const elA = { id: 'el_A', type: 'rectangle', x: 10, y: 10, width: 50, height: 50 };
  const elB = { id: 'el_B', type: 'rectangle', x: 200, y: 100, width: 50, height: 50 };
  store.getState().clearCanvas();
  store.getState().addElement(elA);
  store.getState().addElement(elB);

  // elA is at index 0, elB at index 1
  store.getState().setSelectedIds(['el_A']);
  store.getState().bringToFront();
  assert(store.getState().elements[1].id === 'el_A', 'bringToFront moves elA to top layer');

  store.getState().sendToBack();
  assert(store.getState().elements[0].id === 'el_A', 'sendToBack moves elA to bottom layer');

  // Align elements
  store.getState().setSelectedIds(['el_A', 'el_B']);
  store.getState().alignSelected('left');
  const aligned = store.getState().elements;
  assert(aligned[0].x === aligned[1].x, 'alignSelected("left") aligns both elements to leftmost X');
}

// 5. TEST VIEWPORT ZOOM & PAN
console.log('\n[5] Testing Viewport Zoom & Pan...');
{
  const store = useCanvasStore;
  store.getState().setZoom(1.0);
  store.getState().setPanOffset({ x: 0, y: 0 });

  store.getState().zoomIn();
  assert(store.getState().zoom === 1.1, 'zoomIn increments zoom by 0.1');

  store.getState().zoomOut();
  assert(store.getState().zoom === 1.0, 'zoomOut decrements zoom by 0.1');

  store.getState().centerCanvas();
  assert(store.getState().zoom === 1.0, 'centerCanvas maintains proper zoom');
}

// 6. TEST CLEAR CANVAS AND UNDO CLEAR CANVAS
console.log('\n[6] Testing Clear Canvas & Undo Clear Canvas...');
{
  const store = useCanvasStore;
  const countBeforeClear = store.getState().elements.length;
  assert(countBeforeClear > 0, 'Canvas has elements before clear');

  store.getState().clearCanvas();
  assert(store.getState().elements.length === 0, 'Canvas is empty after clearCanvas');

  // Undo clear canvas
  store.getState().undo();
  assert(store.getState().elements.length === countBeforeClear, 'Undo successfully restores cleared elements');
}

// 7. TEST ERASER TOOL BATCH UNDO
console.log('\n[7] Testing Eraser Drag Batch Undo...');
{
  const store = useCanvasStore;
  store.getState().clearCanvas();
  store.getState().addElement({ id: 'e1', type: 'rectangle', x: 10, y: 10, width: 30, height: 30, backgroundColor: '#ef4444', fillStyle: 'solid' });
  store.getState().addElement({ id: 'e2', type: 'rectangle', x: 50, y: 10, width: 30, height: 30, backgroundColor: '#ef4444', fillStyle: 'solid' });
  assert(store.getState().elements.length === 2, '2 shapes created for eraser test');

  const eraser = new EraserTool(store);
  // Single eraser drag gesture across both shapes
  eraser.onPointerDown({ x: 20, y: 20 }, 1);
  eraser.onPointerMove({ x: 60, y: 20 }, 1);
  eraser.onPointerUp();

  assert(store.getState().elements.length === 0, 'Both shapes erased during drag');

  // A SINGLE undo should restore both shapes because they were erased in one stroke
  store.getState().undo();
  assert(store.getState().elements.length === 2, 'Single undo restores all elements erased in one stroke');
}

console.log('\n=============================================');
console.log(`STORE & TOOLS AUDIT SUMMARY: ${passedCount} PASSED | ${failedCount} FAILED`);
console.log('=============================================\n');

if (failedCount > 0) {
  process.exit(1);
}

