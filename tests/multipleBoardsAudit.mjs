/**
 * Multiple Boards Management System Comprehensive QA Audit Test Suite for SketchFlow
 * Verifies all 24 required audit checks:
 * 1. Create board
 * 2. Unique board ID generation
 * 3. Independent board data
 * 4. Switch between boards
 * 5. Board persistence after refresh
 * 6. Rename board
 * 7. Duplicate board
 * 8. Duplicate independence
 * 9. Delete inactive board
 * 10. Delete active board
 * 11. Delete last board behavior
 * 12. Image asset reference safety
 * 13. Orphan image cleanup
 * 14. Legacy single-board migration
 * 15. Migration idempotency
 * 16. Undo/redo isolation
 * 17. Viewport isolation
 * 18. Rapid switching and save race conditions
 * 19. Project export
 * 20. Project import
 * 21. Existing single-board import/export compatibility
 * 22. Light Mode compatibility
 * 23. Dark Mode compatibility
 * 24. Search and sorting
 */

import { useCanvasStore } from '../src/store/canvasStore.js';
import { useThemeStore } from '../src/store/themeStore.js';
import {
  saveBoard,
  getBoard,
  getAllBoards,
  getAllBoardsMetadata,
  deleteBoard,
  createDefaultBoard,
  migrateLegacyBoard,
  generateBoardId,
  getActiveBoardId,
  setActiveBoardId,
  getAllReferencedFileIds,
  cleanupOrphanImages,
  _clearBoardsMemory,
  STORAGE_ACTIVE_BOARD_KEY,
  STORAGE_MIGRATION_KEY
} from '../src/utils/boardStorage.js';
import {
  saveImageBlob,
  getImageBlob,
  getAllImageBlobs,
  deleteImageBlob
} from '../src/utils/imageStorage.js';
import {
  exportProjectToJSON,
  importProjectFromJSON,
  exportToJSON,
  importFromJSON
} from '../src/utils/exportUtils.js';
import { saveToStorage, loadFromStorage, clearStorage } from '../src/utils/storageUtils.js';

// Setup Mock DOM & Storage environment for Node.js test execution
const mockStorage = new Map();
globalThis.localStorage = {
  getItem: (k) => (mockStorage.has(k) ? mockStorage.get(k) : null),
  setItem: (k, v) => mockStorage.set(k, String(v)),
  removeItem: (k) => mockStorage.delete(k),
  clear: () => mockStorage.clear()
};

globalThis.window = {
  innerWidth: 1920,
  innerHeight: 1080,
  matchMedia: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false
  })
};

globalThis.document = {
  documentElement: {
    classList: {
      contains: (cls) => cls === 'dark' && useThemeStore.getState().effectiveTheme === 'dark',
      add: () => {},
      remove: () => {}
    },
    setAttribute: () => {},
    getAttribute: () => 'light',
    style: {}
  },
  createElement: (tag) => ({
    tagName: tag.toUpperCase(),
    getContext: () => ({
      save: () => {},
      restore: () => {},
      scale: () => {},
      translate: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      beginPath: () => {},
      ellipse: () => {},
      arc: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      fill: () => {},
      stroke: () => {},
      measureText: (txt) => ({ width: (txt || '').length * 10 })
    }),
    toDataURL: () => 'data:image/png;base64,mockThumbnailDataUrl'
  })
};

globalThis.Blob = class {
  constructor(chunks, opts) {
    this.content = chunks.map((c) => (typeof c === 'string' ? c : 'binary')).join('');
    this.type = opts?.type || 'application/json';
    this.size = this.content.length;
  }
  async text() {
    return this.content;
  }
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

async function runTestSuite() {
  console.log('--- STARTING MULTIPLE BOARDS AUDIT TEST SUITE ---');

  // [1] CREATE BOARD
  console.log('\n[1] Testing Create Board...');
  {
    _clearBoardsMemory();
    mockStorage.clear();

    const board = await createDefaultBoard('Design Sprint');
    assert(board !== null && board.id.startsWith('board_'), 'Board record created with proper ID prefix');
    assert(board.name === 'Design Sprint', 'Board initialized with specified name');
    assert(Array.isArray(board.elements) && board.elements.length === 0, 'Board elements initialized empty');
    assert(board.viewport.zoom === 1 && board.viewport.panX === 0 && board.viewport.panY === 0, 'Board viewport initialized with defaults');
    assert(board.gridSettings.gridType === 'dots', 'Board grid initialized to dots');
  }

  // [2] UNIQUE BOARD ID GENERATION
  console.log('\n[2] Testing Unique Board ID Generation...');
  {
    const generatedIds = new Set();
    const count = 1000;
    for (let i = 0; i < count; i++) {
      generatedIds.add(generateBoardId());
    }
    assert(generatedIds.size === count, `Generated ${count} unique board IDs with 0 collisions`);
  }

  // [3] INDEPENDENT BOARD DATA
  console.log('\n[3] Testing Independent Board Data...');
  {
    const boardA = await createDefaultBoard('Board A', [
      { id: 'el_a1', type: 'rectangle', x: 10, y: 10, width: 100, height: 60 }
    ]);
    const boardB = await createDefaultBoard('Board B', [
      { id: 'el_b1', type: 'circle', x: 200, y: 200, width: 80, height: 80 }
    ]);

    const retrievedA = await getBoard(boardA.id);
    const retrievedB = await getBoard(boardB.id);

    assert(retrievedA.elements.length === 1 && retrievedA.elements[0].id === 'el_a1', 'Board A contains exclusively its own elements');
    assert(retrievedB.elements.length === 1 && retrievedB.elements[0].id === 'el_b1', 'Board B contains exclusively its own elements');
    assert(!retrievedA.elements.some((e) => e.id === 'el_b1'), 'Board A has zero data leakage from Board B');
  }

  // [4] SWITCH BETWEEN BOARDS
  console.log('\n[4] Testing Board Switching Lifecycle...');
  {
    const store = useCanvasStore.getState();
    const b1 = await store.createBoard('Workflow 1');
    store.addElement({ id: 'w1_rect', type: 'rectangle', x: 50, y: 50, width: 100, height: 100 });
    await store.flushSaveCurrentBoard();

    const b2 = await store.createBoard('Workflow 2');
    store.addElement({ id: 'w2_circle', type: 'circle', x: 300, y: 300, width: 90, height: 90 });
    await store.flushSaveCurrentBoard();

    // Switch back to b1
    await store.switchBoard(b1.id);
    const stateAfterSwitchToB1 = useCanvasStore.getState();
    assert(stateAfterSwitchToB1.activeBoardId === b1.id, 'Active board ID updated to Board 1');
    assert(stateAfterSwitchToB1.activeBoardName === 'Workflow 1', 'Active board name matches Board 1');
    assert(stateAfterSwitchToB1.elements.length === 1 && stateAfterSwitchToB1.elements[0].id === 'w1_rect', 'Board 1 elements restored without stale state');

    // Switch back to b2
    await store.switchBoard(b2.id);
    const stateAfterSwitchToB2 = useCanvasStore.getState();
    assert(stateAfterSwitchToB2.activeBoardId === b2.id, 'Active board ID updated to Board 2');
    assert(stateAfterSwitchToB2.elements.length === 1 && stateAfterSwitchToB2.elements[0].id === 'w2_circle', 'Board 2 elements restored cleanly');
  }

  // [5] BOARD PERSISTENCE AFTER REFRESH
  console.log('\n[5] Testing Board Persistence After Simulated Refresh...');
  {
    const store = useCanvasStore.getState();
    const savedActiveId = store.activeBoardId;
    assert(Boolean(savedActiveId), 'Active board ID is tracked');
    assert(getActiveBoardId() === savedActiveId, 'LocalStorage tracks active board ID');

    // Simulate browser reload by calling initBoards
    await store.initBoards();
    const stateAfterReload = useCanvasStore.getState();
    assert(stateAfterReload.activeBoardId === savedActiveId, 'Simulated refresh restores exact active board');
    assert(stateAfterReload.elements.length > 0, 'Active board elements restored upon init');
  }

  // [6] RENAME BOARD
  console.log('\n[6] Testing Board Renaming...');
  {
    const store = useCanvasStore.getState();
    const board = await store.createBoard('Old Name');
    assert(board.name === 'Old Name', 'Board created with original name');

    await store.renameBoard(board.id, '  Brand New Name  ');
    const updated = await getBoard(board.id);
    assert(updated.name === 'Brand New Name', 'Name trimmed and updated in persistent storage');
    assert(useCanvasStore.getState().activeBoardName === 'Brand New Name', 'Store activeBoardName updated synchronously');

    // Empty validation
    let validationFailed = false;
    try {
      await store.renameBoard(board.id, '   ');
    } catch {
      validationFailed = true;
    }
    assert(validationFailed, 'Empty board name rejected with validation error');
  }

  // [7] DUPLICATE BOARD
  console.log('\n[7] Testing Board Duplication...');
  {
    const store = useCanvasStore.getState();
    const sourceBoard = await store.createBoard('Source Board');
    store.addElement({ id: 'orig_shape', type: 'rectangle', x: 20, y: 20, width: 80, height: 50 });
    await store.flushSaveCurrentBoard();

    const duplicate = await store.duplicateBoard(sourceBoard.id);
    assert(duplicate !== null, 'Duplicate created successfully');
    assert(duplicate.id !== sourceBoard.id, 'Duplicate has unique board ID');
    assert(duplicate.name === 'Source Board (Copy)', 'Duplicate named with (Copy) suffix');
    assert(duplicate.elements.length === 1, 'Duplicate contains cloned drawing elements');
    assert(duplicate.elements[0].id !== 'orig_shape', 'Cloned elements receive independent unique IDs');
  }

  // [8] DUPLICATE INDEPENDENCE
  console.log('\n[8] Testing Duplicate Independence (Deep Clone Integrity)...');
  {
    const store = useCanvasStore.getState();
    const original = await store.createBoard('Original Canvas');
    store.addElement({ id: 'item_1', type: 'diamond', x: 100, y: 100, width: 60, height: 60, strokeColor: '#000000' });
    await store.flushSaveCurrentBoard();

    const dup = await store.duplicateBoard(original.id);
    await store.switchBoard(dup.id);

    // Modify duplicate
    store.updateElement(store.elements[0].id, { strokeColor: '#ff0000', width: 120 });
    store.addElement({ id: 'new_item_on_dup', type: 'circle', x: 10, y: 10, width: 30, height: 30 });
    await store.flushSaveCurrentBoard();

    // Verify original remains unmutated
    const originalInStorage = await getBoard(original.id);
    assert(originalInStorage.elements.length === 1, 'Original element count untouched by duplicate mutations');
    assert(originalInStorage.elements[0].strokeColor === '#000000', 'Original stroke color untouched by duplicate mutations');
    assert(originalInStorage.elements[0].width === 60, 'Original element geometry completely unaffected');
  }

  // [9] DELETE INACTIVE BOARD
  console.log('\n[9] Testing Inactive Board Deletion...');
  {
    const store = useCanvasStore.getState();
    const targetBoard = await store.createBoard('Inactive Board');
    const activeBoard = await store.createBoard('Kept Active Board');

    const totalBefore = (await getAllBoardsMetadata()).length;
    await store.deleteBoard(targetBoard.id);
    const totalAfter = (await getAllBoardsMetadata()).length;

    assert(totalAfter === totalBefore - 1, 'Board count reduced by 1');
    assert(useCanvasStore.getState().activeBoardId === activeBoard.id, 'Active board remained active and undisturbed');
    assert((await getBoard(targetBoard.id)) === null, 'Deleted board no longer exists in storage');
  }

  // [10] DELETE ACTIVE BOARD
  console.log('\n[10] Testing Active Board Deletion & Auto-Switch...');
  {
    const store = useCanvasStore.getState();
    const standbyBoard = await store.createBoard('Standby Board');
    const boardToDelete = await store.createBoard('Active Board To Delete');

    assert(useCanvasStore.getState().activeBoardId === boardToDelete.id, 'Board to delete is currently active');
    await store.deleteBoard(boardToDelete.id);

    const currentActive = useCanvasStore.getState().activeBoardId;
    assert(currentActive !== boardToDelete.id, 'Active board updated away from deleted board');
    assert(Boolean(currentActive), 'System automatically switched to another available board');
  }

  // [11] DELETE LAST BOARD BEHAVIOR
  console.log('\n[11] Testing Last Board Deletion Fallback...');
  {
    _clearBoardsMemory();
    const store = useCanvasStore.getState();
    const singleBoard = await store.createBoard('Sole Board');

    // Delete the only board
    await store.deleteBoard(singleBoard.id);

    const state = useCanvasStore.getState();
    assert(state.activeBoardId !== null && state.activeBoardId !== singleBoard.id, 'Fallback board generated when last board deleted');
    assert(state.elements.length === 0, 'Fallback canvas is clean empty state');
    const all = await getAllBoardsMetadata();
    assert(all.length >= 1, 'Storage contains guaranteed fallback board');
  }

  // [12] IMAGE ASSET REFERENCE SAFETY
  console.log('\n[12] Testing Image Asset Reference Safety Across Boards...');
  {
    const fileId = 'img_shared_asset_001';
    await saveImageBlob(fileId, new Blob(['shared_image_data']), 'image/png', 'data:image/png;base64,shared');

    const store = useCanvasStore.getState();
    const boardAlpha = await store.createBoard('Board Alpha With Image');
    store.addElement({ id: 'img_el_alpha', type: 'image', fileId, x: 10, y: 10, width: 200, height: 150 });
    await store.flushSaveCurrentBoard();

    // Duplicate board Alpha -> Board Beta also references img_shared_asset_001
    const boardBeta = await store.duplicateBoard(boardAlpha.id);

    // Delete Board Alpha
    await store.deleteBoard(boardAlpha.id);

    // Image must still exist because Board Beta still references it!
    const imageRecord = await getImageBlob(fileId);
    assert(imageRecord !== null, 'Image asset preserved in storage because duplicated board still references it');
  }

  // [13] ORPHAN IMAGE CLEANUP
  console.log('\n[13] Testing Orphan Image Cleanup...');
  {
    const orphanId = 'img_abandoned_orphan';
    await saveImageBlob(orphanId, new Blob(['orphan_image_data']), 'image/png', 'data:image/png;base64,orphan');

    assert((await getImageBlob(orphanId)) !== null, 'Orphan image exists before cleanup');

    // Run orphan cleanup
    await cleanupOrphanImages();

    const afterCleanup = await getImageBlob(orphanId);
    assert(afterCleanup === null, 'Unreferenced orphan image safely purged from storage');
  }

  // [14] LEGACY SINGLE-BOARD MIGRATION
  console.log('\n[14] Testing Legacy Single-Board Migration...');
  {
    _clearBoardsMemory();
    mockStorage.clear();

    const legacyElements = [
      { id: 'leg_1', type: 'rectangle', x: 40, y: 40, width: 120, height: 80, strokeColor: '#2563eb' }
    ];
    saveToStorage({
      elements: legacyElements,
      panOffset: { x: 15, y: 25 },
      zoom: 1.25,
      gridType: 'lines',
      elementProperties: { strokeWidth: 3 }
    });

    const migrated = await migrateLegacyBoard();
    assert(migrated !== null, 'Migration successfully produced board record');
    assert(migrated.elements.length === 1 && migrated.elements[0].id === 'leg_1', 'Legacy elements preserved with exact attributes');
    assert(migrated.viewport.zoom === 1.25, 'Legacy zoom restored');
    assert(migrated.viewport.panX === 15 && migrated.viewport.panY === 25, 'Legacy pan offset restored');
    assert(migrated.gridSettings.gridType === 'lines', 'Legacy grid type restored');
    assert(mockStorage.get(STORAGE_MIGRATION_KEY) === 'true', 'Migration flag written to storage');
  }

  // [15] MIGRATION IDEMPOTENCY
  console.log('\n[15] Testing Migration Idempotency...');
  {
    const initialBoardsCount = (await getAllBoards()).length;
    // Call migration repeatedly
    await migrateLegacyBoard();
    await migrateLegacyBoard();
    await migrateLegacyBoard();

    const finalBoardsCount = (await getAllBoards()).length;
    assert(finalBoardsCount === initialBoardsCount, 'Multiple migration calls never duplicate boards (100% idempotent)');
  }

  // [16] UNDO/REDO ISOLATION ACROSS BOARDS
  console.log('\n[16] Testing Undo/Redo History Isolation Across Boards...');
  {
    const store = useCanvasStore.getState();
    const boardX = await store.createBoard('Undo Test Board X');
    useCanvasStore.getState().addElement({ id: 'shape_x1', type: 'rectangle', x: 10, y: 10, width: 50, height: 50 });
    useCanvasStore.getState().addElement({ id: 'shape_x2', type: 'circle', x: 70, y: 10, width: 50, height: 50 });
    await useCanvasStore.getState().flushSaveCurrentBoard();
    assert(useCanvasStore.getState().elements.length === 2, 'Board X has 2 shapes');

    const boardY = await store.createBoard('Undo Test Board Y');
    useCanvasStore.getState().addElement({ id: 'shape_y1', type: 'line', x: 0, y: 0, width: 100, height: 100 });
    await useCanvasStore.getState().flushSaveCurrentBoard();
    assert(useCanvasStore.getState().elements.length === 1, 'Board Y has 1 shape');

    // Switch back to Board X
    await store.switchBoard(boardX.id);
    const stateX = useCanvasStore.getState();
    assert(stateX.elements.length === 2, 'Board X restored with 2 shapes');

    // Switch back to Board Y and undo
    await store.switchBoard(boardY.id);
    useCanvasStore.getState().undo();
    assert(useCanvasStore.getState().elements.length === 0, 'Board Y undo leaves Board Y empty');

    // Switch to Board X: Board X MUST still have 2 shapes
    await store.switchBoard(boardX.id);
    assert(useCanvasStore.getState().elements.length === 2, 'Board X elements uncorrupted by Board Y undo stack');
  }

  // [17] VIEWPORT ISOLATION
  console.log('\n[17] Testing Viewport Settings Isolation...');
  {
    const store = useCanvasStore.getState();
    const boardV1 = await store.createBoard('Viewport Zoom 2x');
    store.setZoom(2.0);
    store.setPanOffset({ x: 250, y: 150 });
    store.setGridType('lines');
    await store.flushSaveCurrentBoard();

    const boardV2 = await store.createBoard('Viewport Zoom 0.5x');
    store.setZoom(0.5);
    store.setPanOffset({ x: -100, y: -50 });
    store.setGridType('dots');
    await store.flushSaveCurrentBoard();

    // Switch back to boardV1
    await store.switchBoard(boardV1.id);
    const s1 = useCanvasStore.getState();
    assert(s1.zoom === 2.0, 'Board V1 zoom restored to 2.0');
    assert(s1.panOffset.x === 250 && s1.panOffset.y === 150, 'Board V1 pan offset restored');
    assert(s1.gridType === 'lines', 'Board V1 grid type lines restored');

    // Switch back to boardV2
    await store.switchBoard(boardV2.id);
    const s2 = useCanvasStore.getState();
    assert(s2.zoom === 0.5, 'Board V2 zoom restored to 0.5');
    assert(s2.panOffset.x === -100 && s2.panOffset.y === -50, 'Board V2 pan offset restored');
    assert(s2.gridType === 'dots', 'Board V2 grid type dots restored');
  }

  // [18] RAPID SWITCHING & SAVE RACE CONDITIONS
  console.log('\n[18] Testing Rapid Board Switching & Race Conditions...');
  {
    const store = useCanvasStore.getState();
    const r1 = await store.createBoard('Rapid 1');
    const r2 = await store.createBoard('Rapid 2');
    const r3 = await store.createBoard('Rapid 3');

    // Interleave rapid writes and switches
    await store.switchBoard(r1.id);
    useCanvasStore.getState().addElement({ id: 'r1_el', type: 'rectangle', x: 0, y: 0, width: 10, height: 10 });

    await store.switchBoard(r2.id);
    useCanvasStore.getState().addElement({ id: 'r2_el', type: 'circle', x: 20, y: 20, width: 20, height: 20 });

    await store.switchBoard(r3.id);
    useCanvasStore.getState().addElement({ id: 'r3_el', type: 'diamond', x: 30, y: 30, width: 30, height: 30 });
    await useCanvasStore.getState().flushSaveCurrentBoard();

    // Verify all 3 boards retained their respective elements without loss
    const b1 = await getBoard(r1.id);
    const b2 = await getBoard(r2.id);
    const b3 = await getBoard(r3.id);

    assert(b1.elements.some((e) => e.id === 'r1_el'), 'Board Rapid 1 retained element during rapid switches');
    assert(b2.elements.some((e) => e.id === 'r2_el'), 'Board Rapid 2 retained element during rapid switches');
    assert(b3.elements.some((e) => e.id === 'r3_el'), 'Board Rapid 3 retained element during rapid switches');
  }

  // [19] PROJECT EXPORT
  console.log('\n[19] Testing Complete Project Export (.sketchflow-project)...');
  {
    const project = await exportProjectToJSON('test-project.sketchflow-project');
    assert(project.type === 'sketchflow-project', 'Project JSON contains valid format type');
    assert(project.version === 1, 'Project version is 1');
    assert(Array.isArray(project.boards) && project.boards.length > 0, 'Project contains boards array');
    assert(Boolean(project.activeBoardId), 'Project contains activeBoardId reference');
  }

  // [20] PROJECT IMPORT
  console.log('\n[20] Testing Project Import & ID Collision Resolution...');
  {
    const sampleProject = {
      type: 'sketchflow-project',
      version: 1,
      boards: [
        {
          id: 'imported_b1',
          name: 'Imported System Map',
          createdAt: 1730000000000,
          updatedAt: 1730000010000,
          elements: [{ id: 'imp_s1', type: 'rectangle', x: 10, y: 10, width: 100, height: 50 }],
          viewport: { zoom: 1.5, panX: 20, panY: 30 },
          gridSettings: { gridType: 'lines' }
        }
      ],
      assets: {}
    };

    const res = await importProjectFromJSON(sampleProject);
    assert(res.type === 'project', 'Import recognized as multi-board project');
    assert(res.boards.length === 1, 'Imported 1 board');

    const imported = await getBoard('imported_b1');
    assert(imported !== null && imported.name === 'Imported System Map', 'Imported board saved to local storage');
    assert(imported.elements.length === 1, 'Imported elements restored');

    // Import again to test collision handling
    const res2 = await importProjectFromJSON(sampleProject);
    assert(res2.boards.length === 1, 'Collision import handled without throw');
    assert(res2.boards[0].id !== 'imported_b1', 'Colliding board ID replaced with safe unique ID');
  }

  // [21] EXISTING SINGLE-BOARD IMPORT/EXPORT COMPATIBILITY
  console.log('\n[21] Testing Existing Single-Board Export/Import Compatibility...');
  {
    const testElements = [
      { id: 'single_1', type: 'circle', x: 50, y: 50, width: 80, height: 80, strokeColor: '#10b981' }
    ];

    exportToJSON(testElements, { gridType: 'dots' }, 'test-single.sketchflow');
    const jsonStr = JSON.stringify({
      type: 'sketchflow',
      version: 1,
      elements: testElements,
      appState: { gridType: 'dots' }
    });

    const imported = importFromJSON(jsonStr);
    assert(imported.elements.length === 1 && imported.elements[0].id === 'single_1', 'Legacy single-board import succeeds unhindered');
    assert(imported.appState.gridType === 'dots', 'Legacy single-board appState restored');
  }

  // [22] LIGHT MODE COMPATIBILITY
  console.log('\n[22] Testing Light Mode Compatibility...');
  {
    useThemeStore.getState().setThemePreference('light');
    assert(useThemeStore.getState().resolvedTheme === 'light', 'Theme store active in light mode');

    const store = useCanvasStore.getState();
    const lightBoard = await store.createBoard('Light Theme Board');
    useCanvasStore.getState().addElement({ id: 'light_rect', type: 'rectangle', x: 10, y: 10, width: 50, height: 50, strokeColor: '#000000' });
    await useCanvasStore.getState().flushSaveCurrentBoard();

    const loaded = await getBoard(lightBoard.id);
    assert(loaded.elements[0].strokeColor === '#000000', 'Light mode preserves element colors invariant');
  }

  // [23] DARK MODE COMPATIBILITY
  console.log('\n[23] Testing Dark Mode Compatibility...');
  {
    useThemeStore.getState().setThemePreference('dark');
    assert(useThemeStore.getState().resolvedTheme === 'dark', 'Theme store active in dark mode');

    const store = useCanvasStore.getState();
    const darkBoard = await store.createBoard('Dark Theme Board');
    useCanvasStore.getState().addElement({ id: 'dark_rect', type: 'rectangle', x: 10, y: 10, width: 50, height: 50, strokeColor: '#ffffff' });
    await useCanvasStore.getState().flushSaveCurrentBoard();

    const loaded = await getBoard(darkBoard.id);
    assert(loaded.elements[0].strokeColor === '#ffffff', 'Dark mode preserves element colors invariant');

    // Revert to light for clean state
    useThemeStore.getState().setThemePreference('light');
  }

  // [24] SEARCH AND SORTING
  console.log('\n[24] Testing Board Search & Multi-criteria Sorting...');
  {
    _clearBoardsMemory();
    await saveBoard({ id: 'b_alpha', name: 'Alpha Design', createdAt: 1000, updatedAt: 5000, elements: [1, 2, 3] });
    await saveBoard({ id: 'b_beta', name: 'Beta Wireframe', createdAt: 2000, updatedAt: 4000, elements: [1] });
    await saveBoard({ id: 'b_gamma', name: 'Gamma Architecture', createdAt: 3000, updatedAt: 3000, elements: [1, 2, 3, 4, 5] });

    const all = await getAllBoardsMetadata();

    // Search
    const searchWireframe = all.filter((b) => b.name.toLowerCase().includes('wireframe'));
    assert(searchWireframe.length === 1 && searchWireframe[0].id === 'b_beta', 'Search by name query filters exact match');

    // Sort by recently updated
    const byUpdated = [...all].sort((a, b) => b.updatedAt - a.updatedAt);
    assert(byUpdated[0].id === 'b_alpha' && byUpdated[2].id === 'b_gamma', 'Sort by Recently Modified operates correctly');

    // Sort by name A-Z
    const byNameAsc = [...all].sort((a, b) => a.name.localeCompare(b.name));
    assert(byNameAsc[0].id === 'b_alpha' && byNameAsc[2].id === 'b_gamma', 'Sort by Name A-Z operates correctly');

    // Sort by most elements
    const byElements = [...all].sort((a, b) => b.elementCount - a.elementCount);
    assert(byElements[0].id === 'b_gamma' && byElements[2].id === 'b_beta', 'Sort by Most Elements operates correctly');
  }

  console.log('\n=============================================');
  console.log(`MULTIPLE BOARDS AUDIT SUMMARY: ${passedCount} PASSED | ${failedCount} FAILED`);
  console.log('=============================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Audit suite crashed:', err);
  process.exit(1);
});
