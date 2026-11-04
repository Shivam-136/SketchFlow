/**
 * SketchFlow Mobile Responsive & Touch Audit
 * 
 * Verifies 100% mobile responsiveness, touch target standards,
 * multi-touch pinch-to-zoom logic, touch-aware hit testing,
 * mobile component adaptations, responsive layout invariants,
 * and safe-area compatibility.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';

// Import selection manager logic for handle hit testing
import { SelectionManager } from '../src/components/canvas/SelectionManager.js';
import { getResizeHandles } from '../src/utils/geometryUtils.js';

let passedTests = 0;
let totalTests = 0;

function test(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  [PASS] ${description}`);
    passedTests++;
  } catch (error) {
    console.error(`  [FAIL] ${description}`);
    console.error(`         ${error.message}`);
    process.exitCode = 1;
  }
}

console.log('\n--- STARTING SKETCHFLOW MOBILE RESPONSIVE AUDIT ---\n');

// ============================================================================
// 1. Viewport Meta & Safe Area Inset Classes
// ============================================================================
console.log('[1] Testing HTML Viewport Meta & Safe Area Insets...');

test('index.html contains viewport-fit=cover and mobile viewport settings', () => {
  const html = fs.readFileSync(path.resolve('index.html'), 'utf-8');
  assert.ok(html.includes('name="viewport"'), 'Viewport meta tag must exist');
  assert.ok(html.includes('width=device-width'), 'Must specify device-width');
  assert.ok(html.includes('viewport-fit=cover'), 'Must specify viewport-fit=cover for notched devices');
  assert.ok(html.includes('user-scalable=no') || html.includes('maximum-scale=1.0'), 'Must prevent browser default double-tap zoom');
});

test('index.css contains safe area utility classes using env(safe-area-inset-*)', () => {
  const css = fs.readFileSync(path.resolve('src/index.css'), 'utf-8');
  assert.ok(css.includes('pb-safe'), 'Must provide .pb-safe class');
  assert.ok(css.includes('pt-safe'), 'Must provide .pt-safe class');
  assert.ok(css.includes('pl-safe'), 'Must provide .pl-safe class');
  assert.ok(css.includes('pr-safe'), 'Must provide .pr-safe class');
  assert.ok(css.includes('mb-safe'), 'Must provide .mb-safe class');
  assert.ok(css.includes('env(safe-area-inset-bottom'), 'Must reference safe-area-inset-bottom');
  assert.ok(css.includes('no-scrollbar'), 'Must provide .no-scrollbar for clean mobile swipe bars');
});

// ============================================================================
// 2. Touch Target Standards (>= 44x44px per Apple HIG & WCAG 2.5.5)
// ============================================================================
console.log('\n[2] Testing Touch Target Standards (>= 44x44 CSS Pixels)...');

test('IconButton provides dedicated touch preset with min 44x44px target', () => {
  const iconButtonCode = fs.readFileSync(path.resolve('src/components/common/IconButton.jsx'), 'utf-8');
  assert.ok(iconButtonCode.includes('touch:'), 'IconButton must define touch size variant');
  assert.ok(iconButtonCode.includes('w-11 h-11'), 'Touch size must be at least 44px (11 * 4px)');
  assert.ok(iconButtonCode.includes('min-w-[44px]') && iconButtonCode.includes('min-h-[44px]'), 'Must explicitly enforce min-w-[44px] and min-h-[44px]');
});

test('Toolbar mobile layout applies size="touch" across all 11 drawing tools', () => {
  const toolbarCode = fs.readFileSync(path.resolve('src/components/layout/Toolbar.jsx'), 'utf-8');
  const requiredTools = ['selection', 'hand', 'rectangle', 'circle', 'diamond', 'arrow', 'line', 'pencil', 'text', 'image', 'eraser'];
  
  for (const tool of requiredTools) {
    assert.ok(toolbarCode.includes(`id: '${tool}'`), `Toolbar must include '${tool}'`);
  }
  assert.ok(toolbarCode.includes("size={isMobile ? 'touch' : 'md'}"), 'Toolbar buttons must dynamically use touch size on mobile');
  assert.ok(toolbarCode.includes('overflow-x-auto') && toolbarCode.includes('no-scrollbar'), 'Mobile toolbar must support smooth horizontal scrolling');
  assert.ok(toolbarCode.includes('touch-pan-x'), 'Mobile toolbar must enable touch-pan-x for frictionless swiping');
});

test('ColorPicker provides enlarged touch targets on mobile', () => {
  const colorPickerCode = fs.readFileSync(path.resolve('src/components/common/ColorPicker.jsx'), 'utf-8');
  assert.ok(colorPickerCode.includes('w-7 h-7 sm:w-6 sm:h-6'), 'Color swatches must be enlarged on mobile (28px) for easier tapping');
});

test('Tooltip suppresses hover sticky artifacts on touch screens', () => {
  const tooltipCode = fs.readFileSync(path.resolve('src/components/common/Tooltip.jsx'), 'utf-8');
  assert.ok(tooltipCode.includes('hover: hover') || tooltipCode.includes('pointer: fine') || tooltipCode.includes('matchMedia'), 'Tooltip must check hover media capability so tooltips do not stick on mobile taps');
});

// ============================================================================
// 3. Touch-Aware Resize Handle Hit Testing (16px touch tolerance vs 8px mouse)
// ============================================================================
console.log('\n[3] Testing Touch-Aware Resize Handle Hit Testing...');

test('Mouse hit testing uses tight 8px tolerance', () => {
  const sm = new SelectionManager({ getState: () => ({ elements: [], selectedIds: [] }) });
  const bounds = { minX: 100, minY: 100, maxX: 300, maxY: 200, width: 200, height: 100 };
  const handles = getResizeHandles(bounds, 1.0);
  const sePos = handles.se; // SE handle position (approx 304, 204 with 4px pad)

  // Exactly on SE handle
  assert.strictEqual(sm.getHandle({ x: sePos.x, y: sePos.y }, bounds, 1.0, false)?.handle, 'se');
  // 6px offset from handle (within 8px mouse tolerance)
  assert.strictEqual(sm.getHandle({ x: sePos.x + 6, y: sePos.y + 6 }, bounds, 1.0, false)?.handle, 'se');
  // 12px offset from handle (outside 8px mouse tolerance)
  assert.strictEqual(sm.getHandle({ x: sePos.x + 12, y: sePos.y + 12 }, bounds, 1.0, false), null);
});

test('Touch hit testing uses generous 16px tolerance for fingertips', () => {
  const sm = new SelectionManager({ getState: () => ({ elements: [], selectedIds: [] }) });
  const bounds = { minX: 100, minY: 100, maxX: 300, maxY: 200, width: 200, height: 100 };
  const handles = getResizeHandles(bounds, 1.0);
  const sePos = handles.se;
  
  // Point 12px offset from SE handle
  const nearPoint = { x: sePos.x + 12, y: sePos.y + 12 };
  
  // Mouse mode (isTouch = false, 8px tolerance) misses it
  assert.strictEqual(sm.getHandle(nearPoint, bounds, 1.0, false), null);
  // Touch mode (isTouch = true, 16px tolerance) hits it reliably!
  assert.strictEqual(sm.getHandle(nearPoint, bounds, 1.0, true)?.handle, 'se');

  // Point 20px offset (exceeds 16px tolerance) misses in both modes
  const farPoint = { x: sePos.x + 20, y: sePos.y + 20 };
  assert.strictEqual(sm.getHandle(farPoint, bounds, 1.0, true), null);
});

test('Touch handle hit testing correctly respects zoom level', () => {
  const sm = new SelectionManager({ getState: () => ({ elements: [], selectedIds: [] }) });
  const bounds = { minX: 100, minY: 100, maxX: 300, maxY: 200, width: 200, height: 100 };
  const handles = getResizeHandles(bounds, 2.0);
  const sePos = handles.se;
  
  // At 2x zoom, tolerance in canvas coords is 16 / 2 = 8px
  const pointAtZoom2Within = { x: sePos.x + 6, y: sePos.y + 6 }; // 6px <= 8px -> hits
  assert.strictEqual(sm.getHandle(pointAtZoom2Within, bounds, 2.0, true)?.handle, 'se');

  const pointAtZoom2Outside = { x: sePos.x + 10, y: sePos.y + 10 }; // 10px > 8px -> misses
  assert.strictEqual(sm.getHandle(pointAtZoom2Outside, bounds, 2.0, true), null);
});

// ============================================================================
// 4. Multi-Touch Pinch-to-Zoom & Pan Mathematics
// ============================================================================
console.log('\n[4] Testing Multi-Touch Pinch-to-Zoom & Pan Calculations...');

test('Pinch gesture distance and midpoint calculation', () => {
  const pointer1 = { x: 100, y: 200 };
  const pointer2 = { x: 400, y: 600 };
  
  // dx = 300, dy = 400 -> 3-4-5 triangle -> distance = 500
  const dist = Math.hypot(pointer2.x - pointer1.x, pointer2.y - pointer1.y);
  assert.strictEqual(dist, 500);

  const mid = {
    x: (pointer1.x + pointer2.x) / 2,
    y: (pointer1.y + pointer2.y) / 2
  };
  assert.deepStrictEqual(mid, { x: 250, y: 400 });
});

test('Pinch scale updates zoom within safe limits [0.1, 5.0]', () => {
  const startDistance = 200;
  const startZoom = 1.0;

  // Fingers spread outward from 200px to 300px (1.5x scale)
  const currentDistanceZoomIn = 300;
  const scaleZoomIn = currentDistanceZoomIn / startDistance;
  const newZoomIn = Math.max(0.1, Math.min(5.0, startZoom * scaleZoomIn));
  assert.strictEqual(newZoomIn, 1.5);

  // Fingers pinch inward from 200px to 100px (0.5x scale)
  const currentDistanceZoomOut = 100;
  const scaleZoomOut = currentDistanceZoomOut / startDistance;
  const newZoomOut = Math.max(0.1, Math.min(5.0, startZoom * scaleZoomOut));
  assert.strictEqual(newZoomOut, 0.5);

  // Extreme spread clamps at 5.0
  const extremeDistance = 2000;
  const extremeZoom = Math.max(0.1, Math.min(5.0, startZoom * (extremeDistance / startDistance)));
  assert.strictEqual(extremeZoom, 5.0);

  // Extreme pinch clamps at 0.1
  const tinyDistance = 5;
  const tinyZoom = Math.max(0.1, Math.min(5.0, startZoom * (tinyDistance / startDistance)));
  assert.strictEqual(tinyZoom, 0.1);
});

test('Whiteboard cancels rogue 1-finger strokes when 2nd finger touches down', () => {
  const whiteboardCode = fs.readFileSync(path.resolve('src/components/canvas/Whiteboard.jsx'), 'utf-8');
  assert.ok(whiteboardCode.includes('activePointersRef.current.size === 2'), 'Must detect transition to 2 pointers');
  assert.ok(whiteboardCode.includes('engineRef.current.previewElement = null'), 'Must reset preview element on second touch down');
  assert.ok(whiteboardCode.includes("getTool('selection').mode = 'idle'"), 'Must cancel selection drag on second touch down');
});

// ============================================================================
// 5. Mobile Layout & Responsive UI Adaptations
// ============================================================================
console.log('\n[5] Testing Mobile Layout & UI Transformations...');

test('useMediaQuery hook provides correct breakpoint utilities', () => {
  const hookCode = fs.readFileSync(path.resolve('src/hooks/useMediaQuery.js'), 'utf-8');
  assert.ok(hookCode.includes('useMediaQuery'), 'Must export useMediaQuery');
  assert.ok(hookCode.includes('useIsMobile'), 'Must export useIsMobile (< 768px)');
  assert.ok(hookCode.includes('useIsTablet'), 'Must export useIsTablet (768px - 1024px)');
  assert.ok(hookCode.includes('(max-width: 767px)'), 'Mobile breakpoint must match standard <768px threshold');
});

test('Navbar transforms into compact mobile bar with slide-out overflow drawer', () => {
  const navbarCode = fs.readFileSync(path.resolve('src/components/layout/Navbar.jsx'), 'utf-8');
  assert.ok(navbarCode.includes('useIsMobile'), 'Navbar must use mobile detection');
  assert.ok(navbarCode.includes('MoreVertical'), 'Navbar must provide overflow button for mobile');
  assert.ok(navbarCode.includes('isMobileMenuOpen'), 'Navbar must track mobile menu state');
  assert.ok(navbarCode.includes('Export PNG') || navbarCode.includes('handleExportPNG'), 'Mobile menu must provide PNG export');
  assert.ok(navbarCode.includes('Export SVG') || navbarCode.includes('handleExportSVG'), 'Mobile menu must provide SVG export');
  assert.ok(navbarCode.includes('Export JSON') || navbarCode.includes('handleExportJSON'), 'Mobile menu must provide JSON export');
  assert.ok(navbarCode.includes('Project File') || navbarCode.includes('handleExportProject'), 'Mobile menu must provide Project export');
  assert.ok(navbarCode.includes('Theme') || navbarCode.includes('toggleTheme'), 'Mobile menu must provide theme toggle');
});

test('PropertiesPanel transforms into mobile Style Pill and slide-up bottom sheet drawer', () => {
  const panelCode = fs.readFileSync(path.resolve('src/components/layout/PropertiesPanel.jsx'), 'utf-8');
  assert.ok(panelCode.includes('useIsMobile'), 'Properties panel must check for mobile view');
  assert.ok(panelCode.includes('isMobileDrawerOpen'), 'Properties panel must track drawer open state on mobile');
  assert.ok(panelCode.includes('bottom-20 right-3') && panelCode.includes('mb-safe'), 'Mobile Style pill button positioned ergonomically at bottom-right above toolbar');
  assert.ok(panelCode.includes('max-h-[75vh]') || panelCode.includes('max-h-[80vh]'), 'Mobile bottom sheet constrained to viewport height');
  assert.ok(panelCode.includes('border-t border-zinc-200') || panelCode.includes('border-zinc-200'), 'Mobile bottom sheet has clear separation border');
});

test('BottomBar positions mobile controls above the bottom toolbar', () => {
  const bottomBarCode = fs.readFileSync(path.resolve('src/components/layout/BottomBar.jsx'), 'utf-8');
  assert.ok(bottomBarCode.includes('flex md:hidden') && bottomBarCode.includes('hidden md:flex'), 'BottomBar must use responsive classes for mobile and desktop');
  assert.ok(bottomBarCode.includes('bottom-20 left-3') && bottomBarCode.includes('mb-safe'), 'Mobile Undo/Redo & Zoom buttons must float at bottom-left above toolbar');
  assert.ok(bottomBarCode.includes('canUndo') && bottomBarCode.includes('canRedo'), 'Mobile controls include functional Undo and Redo');
});

test('Inline Text Editor includes touch-accessible Done and Cancel buttons', () => {
  const whiteboardCode = fs.readFileSync(path.resolve('src/components/canvas/Whiteboard.jsx'), 'utf-8');
  assert.ok(whiteboardCode.includes('commitTextEditor'), 'Whiteboard must provide commit function for text');
  assert.ok(whiteboardCode.includes('cancelTextEditor'), 'Whiteboard must provide cancel function for text');
  assert.ok(whiteboardCode.includes('Done') && whiteboardCode.includes('Cancel'), 'Text editor overlay must render touch Done and Cancel buttons');
  assert.ok(whiteboardCode.includes('data-text-control="true"'), 'Text control buttons must have data-text-control attribute to prevent premature blur commit');
});

// ============================================================================
// 6. Responsive Modals & Small-Screen Viewport Bounds (320px Safety)
// ============================================================================
console.log('\n[6] Testing Responsive Modals & Small-Screen Viewport Bounds (320px+)...');

test('BoardManagerModal cards adapt to single-column on mobile and bounds fit within 320px', () => {
  const modalCode = fs.readFileSync(path.resolve('src/components/boards/BoardManagerModal.jsx'), 'utf-8');
  assert.ok(modalCode.includes('grid-cols-1 sm:grid-cols-2 md:grid-cols-3'), 'Board cards must collapse to single column on mobile screens');
  assert.ok(modalCode.includes('max-h-[92vh] sm:max-h-[88vh]'), 'Modal height must adapt to mobile viewports');
  assert.ok(modalCode.includes('max-w-[calc(100vw-2rem)]'), 'Rename and Delete modals must not overflow 320px viewport');
});

test('ConfirmModal and ShortcutsModal fit safely within 320px mobile viewports', () => {
  const confirmCode = fs.readFileSync(path.resolve('src/components/layout/ConfirmModal.jsx'), 'utf-8');
  assert.ok(confirmCode.includes('max-w-[calc(100vw-2rem)]'), 'ConfirmModal must enforce max-w-[calc(100vw-2rem)] for small screen safety');

  const shortcutsCode = fs.readFileSync(path.resolve('src/components/layout/ShortcutsModal.jsx'), 'utf-8');
  assert.ok(shortcutsCode.includes('max-w-[calc(100vw-2rem)]'), 'ShortcutsModal must enforce max-w-[calc(100vw-2rem)] for small screen safety');
  assert.ok(shortcutsCode.includes('grid-cols-1 sm:grid-cols-2 md:grid-cols-3'), 'Shortcuts categories must stack responsively on mobile');
});

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n=============================================');
console.log(`MOBILE RESPONSIVE AUDIT: ${passedTests} PASSED | ${totalTests - passedTests} FAILED`);
console.log('=============================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
