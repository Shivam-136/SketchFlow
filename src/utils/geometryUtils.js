/**
 * Geometry and hit-testing helper functions for SketchFlow
 */

export function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

export function normalizeRect(x, y, width, height) {
  let nx = x;
  let ny = y;
  let nw = width;
  let nh = height;

  if (nw < 0) {
    nx += nw;
    nw = Math.abs(nw);
  }
  if (nh < 0) {
    ny += nh;
    nh = Math.abs(nh);
  }

  return { x: nx, y: ny, width: nw, height: nh };
}

/**
 * Returns the exact geometric bounding box of an element: { minX, minY, maxX, maxY, width, height }
 */
export function getElementBounds(el) {
  if (!el) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };

  if (el.type === 'pencil') {
    if (!el.points || el.points.length === 0) {
      return { minX: el.x, minY: el.y, maxX: el.x, maxY: el.y, width: 0, height: 0 };
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const pt of el.points) {
      if (pt.x < minX) minX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y > maxY) maxY = pt.y;
    }
    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  if (el.type === 'line' || el.type === 'arrow') {
    const x1 = el.x;
    const y1 = el.y;
    const x2 = el.x2 !== undefined ? el.x2 : el.x + el.width;
    const y2 = el.y2 !== undefined ? el.y2 : el.y + el.height;
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    const maxX = Math.max(x1, x2);
    const maxY = Math.max(y1, y2);
    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  if (el.type === 'image' && el.angle) {
    const cx = el.x + (el.width || 0) / 2;
    const cy = el.y + (el.height || 0) / 2;
    const rad = (el.angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const hw = (el.width || 0) / 2;
    const hh = (el.height || 0) / 2;

    const corners = [
      { x: -hw, y: -hh },
      { x: hw, y: -hh },
      { x: hw, y: hh },
      { x: -hw, y: hh }
    ].map((pt) => ({
      x: cx + pt.x * cos - pt.y * sin,
      y: cy + pt.x * sin + pt.y * cos
    }));

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const c of corners) {
      if (c.x < minX) minX = c.x;
      if (c.y < minY) minY = c.y;
      if (c.x > maxX) maxX = c.x;
      if (c.y > maxY) maxY = c.y;
    }

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  // Rectangle, circle, diamond, text, unrotated image
  const x = Math.min(el.x, el.x + (el.width || 0));
  const y = Math.min(el.y, el.y + (el.height || 0));
  const w = Math.abs(el.width || 0);
  const h = Math.abs(el.height || 0);

  return {
    minX: x,
    minY: y,
    maxX: x + w,
    maxY: y + h,
    width: w,
    height: h
  };
}

/**
 * Returns the collective bounding box of multiple elements
 */
export function getElementsBounds(elements) {
  if (!elements || elements.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const el of elements) {
    const b = getElementBounds(el);
    if (b.minX < minX) minX = b.minX;
    if (b.minY < minY) minY = b.minY;
    if (b.maxX > maxX) maxX = b.maxX;
    if (b.maxY > maxY) maxY = b.maxY;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Returns 8 resize handles for a bounding box, matching renderSelectionBox visual placement
 */
export function getResizeHandles(bounds, zoom = 1) {
  const pad = 4 / zoom;
  const minX = bounds.minX - pad;
  const minY = bounds.minY - pad;
  const maxX = bounds.maxX + pad;
  const maxY = bounds.maxY + pad;
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;

  return {
    nw: { x: minX, y: minY, cursor: 'nwse-resize' },
    n:  { x: midX, y: minY, cursor: 'ns-resize' },
    ne: { x: maxX, y: minY, cursor: 'nesw-resize' },
    e:  { x: maxX, y: midY, cursor: 'ew-resize' },
    se: { x: maxX, y: maxY, cursor: 'nwse-resize' },
    s:  { x: midX, y: maxY, cursor: 'ns-resize' },
    sw: { x: minX, y: maxY, cursor: 'nesw-resize' },
    w:  { x: minX, y: midY, cursor: 'ew-resize' }
  };
}

/**
 * Checks if a point hits any of the 8 resize handles
 */
export function getHandleUnderCursor(px, py, bounds, handleRadius = 8, zoom = 1) {
  const handles = getResizeHandles(bounds, zoom);
  const tol = handleRadius / zoom;

  for (const [handleKey, pos] of Object.entries(handles)) {
    if (Math.abs(px - pos.x) <= tol && Math.abs(py - pos.y) <= tol) {
      return { handle: handleKey, cursor: pos.cursor };
    }
  }
  return null;
}

/**
 * Distance from point to line segment
 */
export function distanceToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return distance(px, py, x1, y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return distance(px, py, x1 + t * (x2 - x1), y1 + t * (y2 - y1));
}

/**
 * Checks if rect A intersects rect B
 */
export function rectsIntersect(r1, r2) {
  return !(
    r2.x > r1.x + r1.width ||
    r2.x + r2.width < r1.x ||
    r2.y > r1.y + r1.height ||
    r2.y + r2.height < r1.y
  );
}
