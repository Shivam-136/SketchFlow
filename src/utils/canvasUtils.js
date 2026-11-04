/**
 * Canvas utility functions for coordinate transforms, grid drawing, and text measurement
 */

export function screenToCanvas(screenX, screenY, panOffset, zoom) {
  return {
    x: (screenX - panOffset.x) / zoom,
    y: (screenY - panOffset.y) / zoom
  };
}

export function canvasToScreen(canvasX, canvasY, panOffset, zoom) {
  return {
    x: canvasX * zoom + panOffset.x,
    y: canvasY * zoom + panOffset.y
  };
}

/**
 * Draws the canvas background grid (dots or lines)
 */
export function drawGrid(ctx, width, height, panOffset, zoom, gridType = 'dots', isDark = false) {
  if (gridType === 'none') return;

  const baseGridSize = 24;
  let gridSize = baseGridSize * zoom;

  // Keep grid visual density pleasant when zooming out or in
  while (gridSize < 14) gridSize *= 2;
  while (gridSize > 56) gridSize /= 2;

  const startX = (panOffset.x % gridSize);
  const startY = (panOffset.y % gridSize);

  ctx.save();

  if (gridType === 'dots') {
    ctx.fillStyle = isDark ? '#3f3f46' : '#d4d4d8';
    const dotRadius = Math.max(1, Math.min(1.5, 1.2 * (zoom >= 1 ? 1 : zoom)));

    for (let x = startX - gridSize; x < width + gridSize; x += gridSize) {
      for (let y = startY - gridSize; y < height + gridSize; y += gridSize) {
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (gridType === 'lines') {
    ctx.strokeStyle = isDark ? '#27272a' : '#e4e4e7';
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let x = startX - gridSize; x < width + gridSize; x += gridSize) {
      const snapX = Math.floor(x) + 0.5;
      ctx.moveTo(snapX, 0);
      ctx.lineTo(snapX, height);
    }
    for (let y = startY - gridSize; y < height + gridSize; y += gridSize) {
      const snapY = Math.floor(y) + 0.5;
      ctx.moveTo(0, snapY);
      ctx.lineTo(width, snapY);
    }
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Accurately measures multiline text dimensions
 */
export function measureText(text, fontSize = 20, fontFamily = 'Caveat, cursive', lineHeight = 1.3) {
  if (!text) {
    return { width: 40, height: fontSize * lineHeight, lines: [''] };
  }

  const lines = text.split('\n');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `${fontSize}px ${fontFamily}`;

  let maxWidth = 0;
  for (const line of lines) {
    const width = ctx.measureText(line || ' ').width;
    if (width > maxWidth) maxWidth = width;
  }

  const height = lines.length * (fontSize * lineHeight);

  return {
    width: Math.max(30, Math.ceil(maxWidth)),
    height: Math.max(fontSize * lineHeight, Math.ceil(height)),
    lines
  };
}

/**
 * Generates unique ID for canvas elements
 */
export function generateId() {
  return 'sf_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
}

