import { hitTestElement, getElementsInSelectionBox } from '../../utils/hitTestUtils.js';
import { getElementsBounds } from '../../utils/geometryUtils.js';
import { SelectionManager } from '../canvas/SelectionManager.js';

export class SelectionTool {
  constructor(store) {
    this.store = store;
    this.selectionManager = new SelectionManager(store);
    this.mode = 'idle'; // 'idle' | 'resizing' | 'dragging' | 'marquee'
    this.dragStart = null;
    this.initialElementsState = [];
    this.marqueeBox = null;
    this.hasMoved = false;
    this.clickedElement = null;
    this.isShift = false;
  }

  getCursor(point, zoom) {
    const { elements, selectedIds } = this.store.getState();
    const selectedElements = elements.filter((e) => selectedIds.includes(e.id));

    if (selectedElements.length > 0) {
      const bounds = getElementsBounds(selectedElements);
      const handleHit = this.selectionManager.getHandle(point, bounds, zoom);
      if (handleHit) {
        return handleHit.cursor;
      }

      // Check if hovering over any selected element
      for (const el of selectedElements) {
        if (hitTestElement(point.x, point.y, el, zoom)) {
          return 'move';
        }
      }
    }

    // Check if hovering over any unselected element
    for (let i = elements.length - 1; i >= 0; i--) {
      if (hitTestElement(point.x, point.y, elements[i], zoom)) {
        return 'pointer';
      }
    }

    return 'default';
  }

  onPointerDown(point, isShift, zoom, isTouch = false) {
    const { elements, selectedIds, setSelectedIds, toggleSelectedId, clearSelection } = this.store.getState();
    const selectedElements = elements.filter((e) => selectedIds.includes(e.id));
    this.dragStart = { ...point };
    this.hasMoved = false;
    this.clickedElement = null;
    this.isShift = isShift;

    // 1. Check if clicking on a resize handle of existing selection
    if (selectedElements.length > 0) {
      const bounds = getElementsBounds(selectedElements);
      const handleHit = this.selectionManager.getHandle(point, bounds, zoom, isTouch);
      if (handleHit) {
        this.mode = 'resizing';
        this.selectionManager.startResize(handleHit.handle, point, selectedElements);
        return { type: 'resize_start' };
      }
    }

    // 2. Hit-test elements (top-down, so topmost element is selected first)
    let hitEl = null;
    for (let i = elements.length - 1; i >= 0; i--) {
      if (hitTestElement(point.x, point.y, elements[i], zoom)) {
        hitEl = elements[i];
        break;
      }
    }

    if (hitEl) {
      this.clickedElement = hitEl;

      if (isShift) {
        toggleSelectedId(hitEl.id);
        this.mode = 'idle';
        return { type: 'select_toggle', element: hitEl };
      }

      // If clicked element was not in selection, select it immediately
      if (!selectedIds.includes(hitEl.id)) {
        setSelectedIds([hitEl.id]);
      }

      this.mode = 'dragging';
      const curSelected = this.store.getState().elements.filter((e) =>
        this.store.getState().selectedIds.includes(e.id)
      );
      this.initialElementsState = curSelected.map((el) => JSON.parse(JSON.stringify(el)));
      return { type: 'drag_start', element: hitEl };
    }

    // 3. Clicked empty canvas -> marquee selection or clear selection
    if (!isShift) {
      clearSelection();
    }
    this.mode = 'marquee';
    this.marqueeBox = { x: point.x, y: point.y, width: 0, height: 0 };
    return { type: 'marquee_start' };
  }

  onPointerMove(point) {
    if (this.mode === 'resizing') {
      this.hasMoved = true;
      const resizedElements = this.selectionManager.resize(point);
      if (resizedElements) {
        this.store.getState().updateElements(resizedElements, false);
      }
      return { type: 'resizing' };
    }

    if (this.mode === 'dragging' && this.dragStart) {
      const dx = point.x - this.dragStart.x;
      const dy = point.y - this.dragStart.y;
      if (Math.hypot(dx, dy) > 2) {
        this.hasMoved = true;
      }

      const updated = this.initialElementsState.map((el) => {
        const moved = { ...el, x: el.x + dx, y: el.y + dy };
        if (el.x2 !== undefined) moved.x2 = el.x2 + dx;
        if (el.y2 !== undefined) moved.y2 = el.y2 + dy;
        if (el.points) {
          moved.points = el.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
        }
        return moved;
      });

      this.store.getState().updateElements(updated, false);
      return { type: 'dragging' };
    }

    if (this.mode === 'marquee' && this.marqueeBox && this.dragStart) {
      this.hasMoved = true;
      this.marqueeBox = {
        x: this.dragStart.x,
        y: this.dragStart.y,
        width: point.x - this.dragStart.x,
        height: point.y - this.dragStart.y
      };

      const elements = this.store.getState().elements;
      const matched = getElementsInSelectionBox(elements, this.marqueeBox);
      this.store.getState().setSelectedIds(matched.map((e) => e.id));

      return { type: 'marquee', box: this.marqueeBox };
    }

    return null;
  }

  onPointerUp() {
    if (this.mode === 'resizing') {
      this.selectionManager.finishResize();
      if (this.hasMoved) {
        const { elements } = this.store.getState();
        this.store.getState().pushHistory(elements);
      }
    } else if (this.mode === 'dragging') {
      if (this.hasMoved) {
        const { elements } = this.store.getState();
        this.store.getState().pushHistory(elements);
      } else if (!this.isShift && this.clickedElement) {
        // If user clicked without dragging on an element in a multi-selection, select only that element
        const { selectedIds, setSelectedIds } = this.store.getState();
        if (selectedIds.length > 1) {
          setSelectedIds([this.clickedElement.id]);
        }
      }
    }

    const prevMode = this.mode;
    const box = this.marqueeBox;

    this.mode = 'idle';
    this.dragStart = null;
    this.initialElementsState = [];
    this.marqueeBox = null;
    this.hasMoved = false;
    this.clickedElement = null;
    this.isShift = false;

    return { type: 'pointer_up', prevMode, box };
  }
}
