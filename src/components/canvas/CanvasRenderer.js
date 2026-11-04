/**
 * CanvasRenderer - High performance, Excalidraw-inspired HTML5 Canvas rendering engine.
 * Supports clean architectural lines, organic sketchy lines, solid/semi/hachure fills.
 */

// Helper: Pseudo-random generator with seed for consistent hand-drawn jitter
function pseudoRandom(seed) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

/**
 * Draws a slightly hand-drawn line between two points
 */
function drawSketchyLine(ctx, x1, y1, x2, y2, roughness = 1, seed = 1) {
  if (roughness === 0) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    return;
  }

  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 1) return;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const nx = -dy / len;
  const ny = dx / len;

  // Max jitter proportional to roughness
  const jitter = Math.min(3, (roughness * 1.5));
  const r1 = (pseudoRandom(seed + 1) - 0.5) * jitter;
  const r2 = (pseudoRandom(seed + 2) - 0.5) * jitter;
  const rMid = (pseudoRandom(seed + 3) - 0.5) * jitter * 1.5;

  // Primary curve
  const midX = (x1 + x2) / 2 + nx * rMid;
  const midY = (y1 + y2) / 2 + ny * rMid;

  ctx.beginPath();
  ctx.moveTo(x1 + nx * r1, y1 + ny * r1);
  ctx.quadraticCurveTo(midX, midY, x2 + nx * r2, y2 + ny * r2);
  ctx.stroke();

  // If cartoonist mode (roughness >= 2), draw a slight second stroke for that authentic sketch look
  if (roughness >= 2) {
    const r3 = (pseudoRandom(seed + 4) - 0.5) * jitter * 1.2;
    const r4 = (pseudoRandom(seed + 5) - 0.5) * jitter * 1.2;
    const midX2 = (x1 + x2) / 2 - nx * rMid * 0.8;
    const midY2 = (y1 + y2) / 2 - ny * rMid * 0.8;

    ctx.beginPath();
    ctx.moveTo(x1 + nx * r3, y1 + ny * r3);
    ctx.quadraticCurveTo(midX2, midY2, x2 + nx * r4, y2 + ny * r4);
    ctx.stroke();
  }
}

/**
 * Draws hachure (diagonal shading lines) inside a polygon
 */
function drawHachurePolygon(ctx, points, color, gap = 8) {
  if (points.length < 3) return;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();
  ctx.clip();

  // Get bounding box of points
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.beginPath();

  const span = (maxX - minX) + (maxY - minY);
  for (let d = -span; d <= span; d += gap) {
    ctx.moveTo(minX + d, minY);
    ctx.lineTo(minX + d + (maxY - minY), maxY);
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * Main element renderer
 */
export function renderElementOnContext(ctx, el) {
  if (!el) return;

  ctx.save();

  const opacity = (el.opacity !== undefined ? el.opacity : 100) / 100;
  ctx.globalAlpha = opacity;

  const strokeColor = el.strokeColor || '#1e1e1e';
  const strokeWidth = el.strokeWidth || 2;
  const strokeStyle = el.strokeStyle || 'solid';
  const fillStyle = el.fillStyle || 'none';
  const backgroundColor = el.backgroundColor || 'transparent';
  const roughness = el.roughness !== undefined ? el.roughness : 1; // 0: architect, 1: artist, 2: cartoonist
  const seed = (el.id ? el.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) : 42);

  // Set line stroke dash
  if (strokeStyle === 'dashed') {
    ctx.setLineDash([8, 6]);
  } else if (strokeStyle === 'dotted') {
    ctx.setLineDash([3, 5]);
  } else {
    ctx.setLineDash([]);
  }

  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = backgroundColor;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (el.type) {
    case 'rectangle': {
      const bx = Math.min(el.x, el.x + el.width);
      const by = Math.min(el.y, el.y + el.height);
      const bw = Math.abs(el.width);
      const bh = Math.abs(el.height);
      const isRound = el.edgeStyle === 'round';
      const radius = isRound ? Math.min(12, bw / 4, bh / 4) : 0;

      // Fill pass
      if (fillStyle !== 'none' && backgroundColor !== 'transparent') {
        if (fillStyle === 'hachure') {
          const poly = [
            { x: bx, y: by },
            { x: bx + bw, y: by },
            { x: bx + bw, y: by + bh },
            { x: bx, y: by + bh }
          ];
          drawHachurePolygon(ctx, poly, backgroundColor, 8);
        } else {
          ctx.save();
          if (fillStyle === 'semi') ctx.globalAlpha = opacity * 0.35;
          ctx.beginPath();
          if (radius > 0) {
            ctx.roundRect(bx, by, bw, bh, radius);
          } else {
            ctx.rect(bx, by, bw, bh);
          }
          ctx.fill();
          ctx.restore();
        }
      }

      // Stroke pass
      if (roughness === 0 || radius > 0) {
        ctx.beginPath();
        if (radius > 0) {
          ctx.roundRect(bx, by, bw, bh, radius);
        } else {
          ctx.rect(bx, by, bw, bh);
        }
        ctx.stroke();
      } else {
        // Hand-drawn sketchy edges
        drawSketchyLine(ctx, bx, by, bx + bw, by, roughness, seed);
        drawSketchyLine(ctx, bx + bw, by, bx + bw, by + bh, roughness, seed + 10);
        drawSketchyLine(ctx, bx + bw, by + bh, bx, by + bh, roughness, seed + 20);
        drawSketchyLine(ctx, bx, by + bh, bx, by, roughness, seed + 30);
      }
      break;
    }

    case 'circle': {
      const bx = Math.min(el.x, el.x + el.width);
      const by = Math.min(el.y, el.y + el.height);
      const bw = Math.abs(el.width);
      const bh = Math.abs(el.height);
      const rx = bw / 2;
      const ry = bh / 2;
      const cx = bx + rx;
      const cy = by + ry;

      if (rx <= 0 || ry <= 0) break;

      // Fill pass
      if (fillStyle !== 'none' && backgroundColor !== 'transparent') {
        if (fillStyle === 'hachure') {
          const poly = [];
          const steps = 32;
          for (let i = 0; i < steps; i++) {
            const angle = (i / steps) * Math.PI * 2;
            poly.push({ x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) });
          }
          drawHachurePolygon(ctx, poly, backgroundColor, 8);
        } else {
          ctx.save();
          if (fillStyle === 'semi') ctx.globalAlpha = opacity * 0.35;
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // Stroke pass
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      if (roughness >= 1) {
        // Second subtle stroke for sketch feel
        ctx.beginPath();
        ctx.ellipse(
          cx + (pseudoRandom(seed) - 0.5) * 1.5,
          cy + (pseudoRandom(seed + 1) - 0.5) * 1.5,
          rx * 0.99,
          ry * 0.99,
          0.02,
          0,
          Math.PI * 2
        );
        ctx.stroke();
      }
      break;
    }

    case 'diamond': {
      const bx = Math.min(el.x, el.x + el.width);
      const by = Math.min(el.y, el.y + el.height);
      const bw = Math.abs(el.width);
      const bh = Math.abs(el.height);

      const top = { x: bx + bw / 2, y: by };
      const right = { x: bx + bw, y: by + bh / 2 };
      const bottom = { x: bx + bw / 2, y: by + bh };
      const left = { x: bx, y: by + bh / 2 };

      // Fill pass
      if (fillStyle !== 'none' && backgroundColor !== 'transparent') {
        if (fillStyle === 'hachure') {
          drawHachurePolygon(ctx, [top, right, bottom, left], backgroundColor, 8);
        } else {
          ctx.save();
          if (fillStyle === 'semi') ctx.globalAlpha = opacity * 0.35;
          ctx.beginPath();
          ctx.moveTo(top.x, top.y);
          ctx.lineTo(right.x, right.y);
          ctx.lineTo(bottom.x, bottom.y);
          ctx.lineTo(left.x, left.y);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }

      // Stroke pass
      if (roughness === 0) {
        ctx.beginPath();
        ctx.moveTo(top.x, top.y);
        ctx.lineTo(right.x, right.y);
        ctx.lineTo(bottom.x, bottom.y);
        ctx.lineTo(left.x, left.y);
        ctx.closePath();
        ctx.stroke();
      } else {
        drawSketchyLine(ctx, top.x, top.y, right.x, right.y, roughness, seed);
        drawSketchyLine(ctx, right.x, right.y, bottom.x, bottom.y, roughness, seed + 10);
        drawSketchyLine(ctx, bottom.x, bottom.y, left.x, left.y, roughness, seed + 20);
        drawSketchyLine(ctx, left.x, left.y, top.x, top.y, roughness, seed + 30);
      }
      break;
    }

    case 'line': {
      const x2 = el.x2 !== undefined ? el.x2 : el.x + el.width;
      const y2 = el.y2 !== undefined ? el.y2 : el.y + el.height;
      drawSketchyLine(ctx, el.x, el.y, x2, y2, roughness, seed);
      break;
    }

    case 'arrow': {
      const x2 = el.x2 !== undefined ? el.x2 : el.x + el.width;
      const y2 = el.y2 !== undefined ? el.y2 : el.y + el.height;

      // Shaft
      drawSketchyLine(ctx, el.x, el.y, x2, y2, roughness, seed);

      // Arrowhead
      const len = Math.hypot(x2 - el.x, y2 - el.y);
      const angle = Math.atan2(y2 - el.y, x2 - el.x);
      const headLength = Math.min(Math.max(len * 0.35, 6), Math.max(14, strokeWidth * 3.5));
      const a1x = x2 - headLength * Math.cos(angle - Math.PI / 6);
      const a1y = y2 - headLength * Math.sin(angle - Math.PI / 6);
      const a2x = x2 - headLength * Math.cos(angle + Math.PI / 6);
      const a2y = y2 - headLength * Math.sin(angle + Math.PI / 6);

      ctx.beginPath();
      ctx.moveTo(a1x, a1y);
      ctx.lineTo(x2, y2);
      ctx.lineTo(a2x, a2y);
      ctx.stroke();
      break;
    }

    case 'pencil': {
      if (!el.points || el.points.length === 0) break;
      if (el.points.length === 1) {
        ctx.fillStyle = strokeColor;
        ctx.beginPath();
        ctx.arc(el.points[0].x, el.points[0].y, Math.max(1.5, strokeWidth / 2), 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      ctx.beginPath();
      ctx.moveTo(el.points[0].x, el.points[0].y);

      for (let i = 1; i < el.points.length - 1; i++) {
        const xc = (el.points[i].x + el.points[i + 1].x) / 2;
        const yc = (el.points[i].y + el.points[i + 1].y) / 2;
        ctx.quadraticCurveTo(el.points[i].x, el.points[i].y, xc, yc);
      }
      const last = el.points[el.points.length - 1];
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
      break;
    }

    case 'text': {
      if (!el.text) break;
      const fontSize = el.fontSize || 20;
      const fontFamily = el.fontFamily || 'Caveat, cursive';
      const lineHeight = fontSize * 1.3;

      ctx.font = `${fontSize}px ${fontFamily}`;
      ctx.fillStyle = strokeColor;
      ctx.textBaseline = 'top';
      ctx.textAlign = el.textAlign || 'left';

      const lines = el.text.split('\n');
      let startX = el.x;
      if (el.textAlign === 'center') startX = el.x + (el.width || 0) / 2;
      else if (el.textAlign === 'right') startX = el.x + (el.width || 0);

      lines.forEach((line, index) => {
        ctx.fillText(line, startX, el.y + index * lineHeight);
      });
      break;
    }

    default:
      break;
  }

  ctx.restore();
}

/**
 * Draws selection bounding box and 8 handles around selected elements
 */
export function renderSelectionBox(ctx, bounds, zoom = 1) {
  if (!bounds || bounds.width <= 0 && bounds.height <= 0) return;

  ctx.save();
  ctx.strokeStyle = '#4f46e5';
  ctx.lineWidth = 1.5 / zoom;
  ctx.setLineDash([4 / zoom, 4 / zoom]);

  const pad = 4 / zoom;
  const x = bounds.minX - pad;
  const y = bounds.minY - pad;
  const w = bounds.width + pad * 2;
  const h = bounds.height + pad * 2;

  ctx.strokeRect(x, y, w, h);

  // Draw 8 handle nodes
  const handleSize = 8 / zoom;
  const half = handleSize / 2;

  const points = [
    { x: bounds.minX - pad, y: bounds.minY - pad }, // NW
    { x: bounds.minX + bounds.width / 2, y: bounds.minY - pad }, // N
    { x: bounds.maxX + pad, y: bounds.minY - pad }, // NE
    { x: bounds.maxX + pad, y: bounds.minY + bounds.height / 2 }, // E
    { x: bounds.maxX + pad, y: bounds.maxY + pad }, // SE
    { x: bounds.minX + bounds.width / 2, y: bounds.maxY + pad }, // S
    { x: bounds.minX - pad, y: bounds.maxY + pad }, // SW
    { x: bounds.minX - pad, y: bounds.minY + bounds.height / 2 }, // W
  ];

  ctx.setLineDash([]);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#4f46e5';
  ctx.lineWidth = 1.5 / zoom;

  for (const pt of points) {
    ctx.fillRect(pt.x - half, pt.y - half, handleSize, handleSize);
    ctx.strokeRect(pt.x - half, pt.y - half, handleSize, handleSize);
  }

  ctx.restore();
}

/**
 * Draws the active marquee drag selection box
 */
export function renderMarquee(ctx, box) {
  if (!box || Math.abs(box.width) < 2 && Math.abs(box.height) < 2) return;

  const x = Math.min(box.x, box.x + box.width);
  const y = Math.min(box.y, box.y + box.height);
  const w = Math.abs(box.width);
  const h = Math.abs(box.height);

  ctx.save();
  ctx.fillStyle = 'rgba(79, 70, 229, 0.08)';
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = 'rgba(79, 70, 229, 0.7)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

