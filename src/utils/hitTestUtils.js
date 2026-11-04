import { distanceToSegment, getElementBounds } from './geometryUtils.js';

/**
 * Checks if a point (x, y) in canvas space hits a given element.
 * @param {number} x - x coordinate in world/canvas space
 * @param {number} y - y coordinate in world/canvas space
 * @param {object} el - the element
 * @param {number} zoom - current zoom factor
 * @returns {boolean}
 */
export function hitTestElement(x, y, el, zoom = 1) {
  if (!el) return false;

  const strokeWidth = el.strokeWidth || 2;
  const tol = Math.max(8 / zoom, strokeWidth);

  switch (el.type) {
    case 'rectangle': {
      const bx = Math.min(el.x, el.x + el.width);
      const by = Math.min(el.y, el.y + el.height);
      const bw = Math.abs(el.width);
      const bh = Math.abs(el.height);

      const inside = x >= bx - tol && x <= bx + bw + tol && y >= by - tol && y <= by + bh + tol;
      return inside;
    }

    case 'circle': {
      const bx = Math.min(el.x, el.x + el.width);
      const by = Math.min(el.y, el.y + el.height);
      const bw = Math.abs(el.width);
      const bh = Math.abs(el.height);
      const rx = bw / 2;
      const ry = bh / 2;
      if (rx <= 0 || ry <= 0) return false;

      const cx = bx + rx;
      const cy = by + ry;
      const dx = x - cx;
      const dy = y - cy;

      const normalizedDist = Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry));
      // Point inside circle or near edge
      return normalizedDist <= 1.05 || (Math.abs(normalizedDist - 1) * Math.min(rx, ry) <= tol);
    }

    case 'diamond': {
      const bx = Math.min(el.x, el.x + el.width);
      const by = Math.min(el.y, el.y + el.height);
      const bw = Math.abs(el.width);
      const bh = Math.abs(el.height);
      if (bw <= 0 || bh <= 0) return false;

      const cx = bx + bw / 2;
      const cy = by + bh / 2;
      const manhattan = Math.abs(x - cx) / (bw / 2) + Math.abs(y - cy) / (bh / 2);
      if (manhattan <= 1.05) return true;

      const top = { x: cx, y: by };
      const right = { x: bx + bw, y: cy };
      const bottom = { x: cx, y: by + bh };
      const left = { x: bx, y: cy };

      const d1 = distanceToSegment(x, y, top.x, top.y, right.x, right.y);
      const d2 = distanceToSegment(x, y, right.x, right.y, bottom.x, bottom.y);
      const d3 = distanceToSegment(x, y, bottom.x, bottom.y, left.x, left.y);
      const d4 = distanceToSegment(x, y, left.x, left.y, top.x, top.y);

      return Math.min(d1, d2, d3, d4) <= tol;
    }

    case 'line': {
      const x1 = el.x;
      const y1 = el.y;
      const x2 = el.x2 !== undefined ? el.x2 : el.x + el.width;
      const y2 = el.y2 !== undefined ? el.y2 : el.y + el.height;
      return distanceToSegment(x, y, x1, y1, x2, y2) <= tol;
    }

    case 'arrow': {
      const x1 = el.x;
      const y1 = el.y;
      const x2 = el.x2 !== undefined ? el.x2 : el.x + el.width;
      const y2 = el.y2 !== undefined ? el.y2 : el.y + el.height;
      if (distanceToSegment(x, y, x1, y1, x2, y2) <= tol) return true;

      // Also check near arrowhead
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const len = Math.hypot(x2 - x1, y2 - y1);
      const headLength = Math.min(Math.max(len * 0.35, 6), Math.max(14, strokeWidth * 3.5));
      const p1 = {
        x: x2 - headLength * Math.cos(angle - Math.PI / 6),
        y: y2 - headLength * Math.sin(angle - Math.PI / 6)
      };
      const p2 = {
        x: x2 - headLength * Math.cos(angle + Math.PI / 6),
        y: y2 - headLength * Math.sin(angle + Math.PI / 6)
      };
      return (
        distanceToSegment(x, y, x2, y2, p1.x, p1.y) <= tol ||
        distanceToSegment(x, y, x2, y2, p2.x, p2.y) <= tol
      );
    }

    case 'pencil': {
      if (!el.points || el.points.length === 0) return false;
      if (el.points.length === 1) {
        return Math.hypot(x - el.points[0].x, y - el.points[0].y) <= tol;
      }
      for (let i = 0; i < el.points.length - 1; i++) {
        const p1 = el.points[i];
        const p2 = el.points[i + 1];
        if (distanceToSegment(x, y, p1.x, p1.y, p2.x, p2.y) <= tol) {
          return true;
        }
      }
      return false;
    }

    case 'text': {
      const bounds = getElementBounds(el);
      return (
        x >= bounds.minX - tol &&
        x <= bounds.maxX + tol &&
        y >= bounds.minY - tol &&
        y <= bounds.maxY + tol
      );
    }

    case 'image': {
      if (el.angle) {
        const cx = el.x + (el.width || 0) / 2;
        const cy = el.y + (el.height || 0) / 2;
        const rad = -(el.angle * Math.PI) / 180;
        const dx = x - cx;
        const dy = y - cy;
        const rx = dx * Math.cos(rad) - dy * Math.sin(rad) + cx;
        const ry = dx * Math.sin(rad) + dy * Math.cos(rad) + cy;
        const bx = Math.min(el.x, el.x + el.width);
        const by = Math.min(el.y, el.y + el.height);
        const bw = Math.abs(el.width);
        const bh = Math.abs(el.height);
        return rx >= bx - tol && rx <= bx + bw + tol && ry >= by - tol && ry <= by + bh + tol;
      }
      const bx = Math.min(el.x, el.x + el.width);
      const by = Math.min(el.y, el.y + el.height);
      const bw = Math.abs(el.width);
      const bh = Math.abs(el.height);
      return x >= bx - tol && x <= bx + bw + tol && y >= by - tol && y <= by + bh + tol;
    }

    default:
      return false;
  }
}

/**
 * Returns elements that intersect with a selection box { x, y, width, height }
 */
export function getElementsInSelectionBox(elements, box) {
  const normBox = {
    x: Math.min(box.x, box.x + box.width),
    y: Math.min(box.y, box.y + box.height),
    width: Math.abs(box.width),
    height: Math.abs(box.height)
  };

  return elements.filter((el) => {
    const b = getElementBounds(el);
    const elBox = {
      x: b.minX,
      y: b.minY,
      width: b.width,
      height: b.height
    };

    return !(
      elBox.x > normBox.x + normBox.width ||
      elBox.x + elBox.width < normBox.x ||
      elBox.y > normBox.y + normBox.height ||
      elBox.y + elBox.height < normBox.y
    );
  });
}
