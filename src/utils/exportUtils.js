import { getElementsBounds } from './geometryUtils.js';
import { renderElementOnContext } from '../components/canvas/CanvasRenderer.js';
import {
  loadImageAsset,
  getImageBase64Sync,
  getImageRecordSync,
  saveImageBlob,
  base64ToBlob
} from './imageStorage.js';

/**
 * Trigger file download in browser
 */
function downloadFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export drawing as PNG image with high DPI
 */
export async function exportToPNG(elements, options = {}) {
  const {
    scale = 2,
    backgroundColor = '#ffffff',
    padding = 40,
    filename = `sketchflow-${Date.now()}.png`
  } = options;

  if (!elements || elements.length === 0) {
    alert('Canvas is empty. Draw something before exporting!');
    return;
  }

  // Ensure fonts are loaded before rasterizing
  if (typeof document !== 'undefined' && document.fonts) {
    try {
      await document.fonts.ready;
    } catch (e) {
      // Ignore if document.fonts.ready fails
    }
  }

  // Ensure image assets are loaded before rasterizing
  const imageElements = elements.filter((e) => e.type === 'image');
  if (imageElements.length > 0) {
    try {
      await Promise.all(imageElements.map((el) => loadImageAsset(el.fileId)));
    } catch (e) {
      // Ignore image loading errors
    }
  }

  const bounds = getElementsBounds(elements);
  const width = Math.max(100, Math.ceil(bounds.width + padding * 2));
  const height = Math.max(100, Math.ceil(bounds.height + padding * 2));

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  // Background
  if (backgroundColor && backgroundColor !== 'transparent') {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
  }

  // Translate to encompass all elements with padding
  ctx.save();
  ctx.translate(padding - bounds.minX, padding - bounds.minY);

  for (const el of elements) {
    renderElementOnContext(ctx, el);
  }

  ctx.restore();

  canvas.toBlob((blob) => {
    if (blob) {
      downloadFile(blob, filename);
    }
  }, 'image/png');
}

/**
 * Export drawing as scalable vector graphics (SVG)
 */
export function exportToSVG(elements, options = {}) {
  if (!elements || elements.length === 0) {
    alert('Canvas is empty. Draw something before exporting!');
    return;
  }

  const {
    padding = 40,
    backgroundColor = '#ffffff',
    filename = `sketchflow-${Date.now()}.svg`
  } = options;

  const bounds = getElementsBounds(elements);
  const width = Math.max(100, Math.ceil(bounds.width + padding * 2));
  const height = Math.max(100, Math.ceil(bounds.height + padding * 2));
  const minX = bounds.minX - padding;
  const minY = bounds.minY - padding;

  let defs = `  <defs>\n`;
  // Add common hachure pattern definitions
  defs += `    <pattern id="hachure-default" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">\n`;
  defs += `      <line x1="0" y1="0" x2="0" y2="8" stroke="currentColor" stroke-width="1.2" />\n`;
  defs += `    </pattern>\n`;
  defs += `  </defs>\n`;

  let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${width} ${height}" width="${width}" height="${height}">
  <style>
    text { font-family: 'Caveat', 'Comic Sans MS', cursive, sans-serif; }
  </style>
${defs}`;

  if (backgroundColor && backgroundColor !== 'transparent') {
    svgContent += `  <rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="${backgroundColor}" />\n`;
  }

  for (const el of elements) {
    const stroke = el.strokeColor || '#18181b';
    const strokeWidth = el.strokeWidth || 2;
    const isFilled = el.fillStyle !== 'none' && el.backgroundColor && el.backgroundColor !== 'transparent';
    const fill = isFilled ? el.backgroundColor : 'none';
    const fillOpacity = el.fillStyle === 'semi' ? 'fill-opacity="0.35"' : '';
    const opacity = (el.opacity !== undefined ? el.opacity : 100) / 100;
    const dash = el.strokeStyle === 'dashed' ? 'stroke-dasharray="8 6"' : (el.strokeStyle === 'dotted' ? 'stroke-dasharray="3 4"' : '');

    switch (el.type) {
      case 'rectangle': {
        const x = Math.min(el.x, el.x + el.width);
        const y = Math.min(el.y, el.y + el.height);
        const w = Math.abs(el.width);
        const h = Math.abs(el.height);
        const rx = el.edgeStyle === 'round' ? Math.min(12, w / 4, h / 4) : 0;
        svgContent += `  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${fillOpacity} stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" ${dash} />\n`;
        break;
      }
      case 'circle': {
        const bx = Math.min(el.x, el.x + el.width);
        const by = Math.min(el.y, el.y + el.height);
        const rx = Math.abs(el.width) / 2;
        const ry = Math.abs(el.height) / 2;
        const cx = bx + rx;
        const cy = by + ry;
        svgContent += `  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${fillOpacity} stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" ${dash} />\n`;
        break;
      }
      case 'diamond': {
        const bx = Math.min(el.x, el.x + el.width);
        const by = Math.min(el.y, el.y + el.height);
        const bw = Math.abs(el.width);
        const bh = Math.abs(el.height);
        const pts = `${bx + bw / 2},${by} ${bx + bw},${by + bh / 2} ${bx + bw / 2},${by + bh} ${bx},${by + bh / 2}`;
        svgContent += `  <polygon points="${pts}" fill="${fill}" ${fillOpacity} stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" ${dash} />\n`;
        break;
      }
      case 'line': {
        const x2 = el.x2 !== undefined ? el.x2 : el.x + el.width;
        const y2 = el.y2 !== undefined ? el.y2 : el.y + el.height;
        svgContent += `  <line x1="${el.x}" y1="${el.y}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" opacity="${opacity}" ${dash} />\n`;
        break;
      }
      case 'arrow': {
        const x2 = el.x2 !== undefined ? el.x2 : el.x + el.width;
        const y2 = el.y2 !== undefined ? el.y2 : el.y + el.height;
        const len = Math.hypot(x2 - el.x, y2 - el.y);
        const angle = Math.atan2(y2 - el.y, x2 - el.x);
        const headLen = Math.min(Math.max(len * 0.35, 6), Math.max(14, strokeWidth * 3.5));
        const a1x = x2 - headLen * Math.cos(angle - Math.PI / 6);
        const a1y = y2 - headLen * Math.sin(angle - Math.PI / 6);
        const a2x = x2 - headLen * Math.cos(angle + Math.PI / 6);
        const a2y = y2 - headLen * Math.sin(angle + Math.PI / 6);
        svgContent += `  <g opacity="${opacity}">
    <line x1="${el.x}" y1="${el.y}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" ${dash} />
    <path d="M ${a1x} ${a1y} L ${x2} ${y2} L ${a2x} ${a2y}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />
  </g>\n`;
        break;
      }
      case 'pencil': {
        if (!el.points || el.points.length < 2) break;
        let d = `M ${el.points[0].x} ${el.points[0].y}`;
        for (let i = 1; i < el.points.length; i++) {
          d += ` L ${el.points[i].x} ${el.points[i].y}`;
        }
        svgContent += `  <path d="${d}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}" />\n`;
        break;
      }
      case 'text': {
        const lines = (el.text || '').split('\n');
        const fontSize = el.fontSize || 20;
        const lineHeight = fontSize * 1.3;
        const fontFamily = el.fontFamily || 'Caveat, cursive';
        const textAlign = el.textAlign || 'left';
        const anchor = textAlign === 'center' ? 'middle' : (textAlign === 'right' ? 'end' : 'start');
        let textX = el.x;
        if (textAlign === 'center') textX = el.x + (el.width || 0) / 2;
        else if (textAlign === 'right') textX = el.x + (el.width || 0);

        svgContent += `  <text x="${textX}" y="${el.y}" fill="${stroke}" font-size="${fontSize}" font-family="${fontFamily}" opacity="${opacity}" text-anchor="${anchor}" dominant-baseline="hanging">\n`;
        lines.forEach((line, idx) => {
          svgContent += `    <tspan x="${textX}" dy="${idx === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>\n`;
        });
        svgContent += `  </text>\n`;
        break;
      }
      case 'image': {
        const base64 = getImageBase64Sync(el.fileId);
        if (base64) {
          const x = el.x;
          const y = el.y;
          const w = el.width;
          const h = el.height;
          const cx = x + w / 2;
          const cy = y + h / 2;
          const transform = el.angle ? `transform="rotate(${el.angle} ${cx} ${cy})"` : '';
          svgContent += `  <image href="${base64}" x="${x}" y="${y}" width="${w}" height="${h}" opacity="${opacity}" ${transform} preserveAspectRatio="none" />\n`;
        }
        break;
      }
      default:
        break;
    }
  }

  svgContent += `</svg>`;

  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  downloadFile(blob, filename);
}

function escapeXml(unsafe) {
  return String(unsafe).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

/**
 * Export drawing as JSON file with bundled image assets
 */
export function exportToJSON(elements, appState = {}, filename = `sketchflow-${Date.now()}.sketchflow`) {
  const assets = {};

  for (const el of elements) {
    if (el.type === 'image' && el.fileId) {
      const rec = getImageRecordSync(el.fileId);
      if (rec && rec.base64) {
        assets[el.fileId] = {
          mimeType: rec.mimeType || 'image/png',
          base64: rec.base64
        };
      }
    }
  }

  const data = {
    type: 'sketchflow',
    version: 1,
    source: 'https://sketchflow.app',
    exportedAt: new Date().toISOString(),
    elements,
    assets: Object.keys(assets).length > 0 ? assets : undefined,
    appState: {
      gridType: appState.gridType || 'dots',
      viewBackgroundColor: appState.viewBackgroundColor || '#fbfbfa'
    }
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadFile(blob, filename);
}

/**
 * Parse and validate imported JSON drawing, restoring image assets into storage
 */
export function importFromJSON(fileContent) {
  try {
    const data = JSON.parse(fileContent);
    if (!data || !Array.isArray(data.elements)) {
      throw new Error('Invalid file format: "elements" array is missing.');
    }

    // Restore bundled image assets into IndexedDB & memory cache
    if (data.assets && typeof data.assets === 'object') {
      for (const [fileId, asset] of Object.entries(data.assets)) {
        if (asset && asset.base64) {
          const mimeType = asset.mimeType || 'image/png';
          const blob = base64ToBlob(asset.base64, mimeType);
          if (blob) {
            saveImageBlob(fileId, blob, mimeType, asset.base64);
            loadImageAsset(fileId);
          }
        }
      }
    }

    // Sanitize elements
    const sanitized = data.elements.map((el, i) => {
      const baseEl = {
        ...el,
        id: el.id || `imported_${i}_${Date.now()}`,
        type: el.type || 'rectangle',
        x: Number(el.x) || 0,
        y: Number(el.y) || 0,
        width: Number(el.width) || 0,
        height: Number(el.height) || 0,
        strokeColor: el.strokeColor || '#1e1e1e',
        backgroundColor: el.backgroundColor || 'transparent',
        strokeWidth: Number(el.strokeWidth) || 2,
        strokeStyle: el.strokeStyle || 'solid',
        fillStyle: el.fillStyle || 'none',
        opacity: el.opacity !== undefined ? Number(el.opacity) : 100
      };

      if (el.type === 'image') {
        baseEl.fileId = el.fileId;
        baseEl.angle = Number(el.angle) || 0;
        baseEl.naturalWidth = Number(el.naturalWidth) || Number(el.width) || 300;
        baseEl.naturalHeight = Number(el.naturalHeight) || Number(el.height) || 200;
        baseEl.lockAspectRatio = el.lockAspectRatio !== false;
        baseEl.mimeType = el.mimeType || 'image/png';
      }

      return baseEl;
    });

    return {
      elements: sanitized,
      appState: data.appState || {}
    };
  } catch (err) {
    throw new Error('Failed to parse JSON file: ' + err.message);
  }
}
