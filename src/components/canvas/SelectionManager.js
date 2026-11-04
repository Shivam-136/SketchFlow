import { getElementsBounds, getHandleUnderCursor } from '../../utils/geometryUtils.js';
import { measureText } from '../../utils/canvasUtils.js';

/**
 * SelectionManager handles hit-testing handles, resizing single/group elements,
 * and dragging elements accurately.
 */
export class SelectionManager {
  constructor(store) {
    this.store = store;
    this.activeHandle = null;
    this.initialBounds = null;
    this.initialElements = [];
    this.initialMousePos = { x: 0, y: 0 };
  }

  /**
   * Check if mouse is hovering over one of the 8 resize handles
   */
  getHandle(point, bounds, zoom) {
    if (!bounds || (bounds.width <= 0 && bounds.height <= 0)) return null;
    return getHandleUnderCursor(point.x, point.y, bounds, 8, zoom);
  }

  /**
   * Start resizing selected elements
   */
  startResize(handle, mousePoint, selectedElements) {
    this.activeHandle = handle;
    this.initialMousePos = { ...mousePoint };
    this.initialBounds = getElementsBounds(selectedElements);
    this.initialElements = selectedElements.map((el) => JSON.parse(JSON.stringify(el)));
  }

  /**
   * Compute new element positions and sizes during resize drag
   */
  resize(currentMousePoint) {
    if (!this.activeHandle || !this.initialBounds || this.initialElements.length === 0) {
      return null;
    }

    const orig = this.initialBounds;
    const dx = currentMousePoint.x - this.initialMousePos.x;
    const dy = currentMousePoint.y - this.initialMousePos.y;

    let minX = orig.minX;
    let minY = orig.minY;
    let maxX = orig.maxX;
    let maxY = orig.maxY;

    // Anchor-clamped resize edge calculations
    switch (this.activeHandle) {
      case 'nw':
        minX = Math.min(orig.maxX - 10, orig.minX + dx);
        minY = Math.min(orig.maxY - 10, orig.minY + dy);
        break;
      case 'n':
        minY = Math.min(orig.maxY - 10, orig.minY + dy);
        break;
      case 'ne':
        maxX = Math.max(orig.minX + 10, orig.maxX + dx);
        minY = Math.min(orig.maxY - 10, orig.minY + dy);
        break;
      case 'e':
        maxX = Math.max(orig.minX + 10, orig.maxX + dx);
        break;
      case 'se':
        maxX = Math.max(orig.minX + 10, orig.maxX + dx);
        maxY = Math.max(orig.minY + 10, orig.maxY + dy);
        break;
      case 's':
        maxY = Math.max(orig.minY + 10, orig.maxY + dy);
        break;
      case 'sw':
        minX = Math.min(orig.maxX - 10, orig.minX + dx);
        maxY = Math.max(orig.minY + 10, orig.maxY + dy);
        break;
      case 'w':
        minX = Math.min(orig.maxX - 10, orig.minX + dx);
        break;
      default:
        break;
    }

    const newWidth = Math.max(10, maxX - minX);
    const newHeight = Math.max(10, maxY - minY);
    const scaleX = orig.width > 0 ? newWidth / orig.width : 1;
    const scaleY = orig.height > 0 ? newHeight / orig.height : 1;

    // Scale each element
    const updated = this.initialElements.map((origEl) => {
      const cloned = JSON.parse(JSON.stringify(origEl));

      if (cloned.type === 'rectangle' || cloned.type === 'circle' || cloned.type === 'diamond') {
        if (this.initialElements.length === 1) {
          cloned.x = minX;
          cloned.y = minY;
          cloned.width = newWidth;
          cloned.height = newHeight;
        } else {
          cloned.x = minX + (orig.width > 0 ? (origEl.x - orig.minX) * scaleX : 0);
          cloned.y = minY + (orig.height > 0 ? (origEl.y - orig.minY) * scaleY : 0);
          cloned.width = Math.max(10, origEl.width * scaleX);
          cloned.height = Math.max(10, origEl.height * scaleY);
        }
      } else if (cloned.type === 'line' || cloned.type === 'arrow') {
        const origX2 = origEl.x2 !== undefined ? origEl.x2 : origEl.x + origEl.width;
        const origY2 = origEl.y2 !== undefined ? origEl.y2 : origEl.y + origEl.height;

        cloned.x = minX + (orig.width > 0 ? (origEl.x - orig.minX) * scaleX : 0);
        cloned.y = minY + (orig.height > 0 ? (origEl.y - orig.minY) * scaleY : 0);
        cloned.x2 = minX + (orig.width > 0 ? (origX2 - orig.minX) * scaleX : 0);
        cloned.y2 = minY + (orig.height > 0 ? (origY2 - orig.minY) * scaleY : 0);
        cloned.width = cloned.x2 - cloned.x;
        cloned.height = cloned.y2 - cloned.y;
      } else if (cloned.type === 'pencil') {
        if (origEl.points && origEl.points.length > 0) {
          cloned.points = origEl.points.map((p) => ({
            x: minX + (orig.width > 0 ? (p.x - orig.minX) * scaleX : 0),
            y: minY + (orig.height > 0 ? (p.y - orig.minY) * scaleY : 0)
          }));
        }
      } else if (cloned.type === 'text') {
        cloned.x = minX + (orig.width > 0 ? (origEl.x - orig.minX) * scaleX : 0);
        cloned.y = minY + (orig.height > 0 ? (origEl.y - orig.minY) * scaleY : 0);
        if (scaleY !== 1) {
          cloned.fontSize = Math.max(12, Math.round((origEl.fontSize || 20) * scaleY));
          const metrics = measureText(cloned.text, cloned.fontSize, cloned.fontFamily);
          cloned.width = metrics.width;
          cloned.height = metrics.height;
        }
      }

      return cloned;
    });

    return updated;
  }

  finishResize() {
    this.activeHandle = null;
    this.initialBounds = null;
    this.initialElements = [];
  }
}
