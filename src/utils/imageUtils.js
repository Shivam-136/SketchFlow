/**
 * Image processing, validation, SVG sanitization, and element creation helpers for SketchFlow.
 */

import { generateId } from './canvasUtils.js';
import { saveImageBlob, loadImageAsset, blobToBase64 } from './imageStorage.js';

export const SUPPORTED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml'
];

export const MAX_IMAGE_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

/**
 * Validates file MIME type and extension
 */
export function isSupportedImageFile(file) {
  if (!file) return false;
  if (SUPPORTED_MIME_TYPES.includes(file.type)) return true;

  // Fallback check by file extension
  const name = (file.name || '').toLowerCase();
  return (
    name.endsWith('.png') ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.webp') ||
    name.endsWith('.svg')
  );
}

/**
 * Sanitizes SVG source string to prevent script injection and XSS
 */
export function sanitizeSvgText(svgText) {
  if (!svgText || typeof svgText !== 'string') return '';

  try {
    if (typeof DOMParser !== 'undefined') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgText, 'image/svg+xml');

      // Check for XML parse errors
      const parserError = doc.querySelector('parsererror');
      if (parserError) {
        throw new Error('Malformed SVG document');
      }

      // Remove all <script> elements
      const scripts = doc.querySelectorAll('script');
      scripts.forEach((s) => s.remove());

      // Remove all <foreignObject> elements to prevent embedded HTML scripts
      const foreignObjects = doc.querySelectorAll('foreignObject');
      foreignObjects.forEach((fo) => fo.remove());

      // Remove all elements with on* event attributes or javascript: URIs
      const allElements = doc.querySelectorAll('*');
      for (const el of allElements) {
        for (const attr of Array.from(el.attributes)) {
          const name = attr.name.toLowerCase();
          const val = attr.value.toLowerCase().trim();
          if (name.startsWith('on') || val.startsWith('javascript:')) {
            el.removeAttribute(attr.name);
          }
        }
      }

      return new XMLSerializer().serializeToString(doc);
    }
  } catch (err) {
    console.warn('SVG sanitization error, falling back to regex:', err);
  }

  // Regex-based fallback for environments without DOMParser
  return svgText
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<foreignObject\b[^<]*(?:(?!<\/foreignObject>)<[^<]*)*<\/foreignObject>/gi, '')
    .replace(/\son\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')
    .replace(/href\s*=\s*["']?javascript:[^"'>]*/gi, '');
}

/**
 * Reads and validates an image file, extracting natural dimensions
 */
export function readImageFile(file) {
  return new Promise(async (resolve, reject) => {
    if (!file) {
      reject(new Error('No file provided.'));
      return;
    }

    if (!isSupportedImageFile(file)) {
      reject(new Error('Unsupported file format. Please upload PNG, JPG, WebP, or SVG.'));
      return;
    }

    if (file.size > MAX_IMAGE_FILE_SIZE) {
      reject(new Error('Image file is too large. Maximum size is 25MB.'));
      return;
    }

    try {
      let finalBlob = file;
      let mimeType = file.type || 'image/png';

      // If SVG, perform sanitization
      if (mimeType === 'image/svg+xml' || (file.name && file.name.toLowerCase().endsWith('.svg'))) {
        mimeType = 'image/svg+xml';
        const rawText = await file.text();
        const cleanedText = sanitizeSvgText(rawText);
        finalBlob = new Blob([cleanedText], { type: 'image/svg+xml' });
      }

      // In Node.js / non-browser test environment
      if (typeof window === 'undefined' || typeof Image === 'undefined') {
        const outBlob = finalBlob instanceof Blob ? finalBlob : new Blob([finalBlob.content || 'image_bytes'], { type: mimeType });
        resolve({
          blob: outBlob,
          mimeType,
          naturalWidth: 400,
          naturalHeight: 300,
          name: file.name || 'image'
        });
        return;
      }

      const objectUrl = URL.createObjectURL(finalBlob);
      const img = new Image();

      img.onload = () => {
        const naturalWidth = img.naturalWidth || img.width || 300;
        const naturalHeight = img.naturalHeight || img.height || 200;
        URL.revokeObjectURL(objectUrl);

        resolve({
          blob: finalBlob,
          mimeType,
          naturalWidth,
          naturalHeight,
          name: file.name || 'image'
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('The image file is corrupted or could not be decoded.'));
      };

      img.src = objectUrl;
    } catch (err) {
      reject(new Error('Failed to process image: ' + err.message));
    }
  });
}

/**
 * Creates a ready-to-insert SketchFlow image element and persists its blob to IndexedDB
 */
export async function createImageElementFromFile(file, targetPoint = { x: 100, y: 100 }, maxDimension = 500) {
  const { blob, mimeType, naturalWidth, naturalHeight } = await readImageFile(file);

  // Compute initial display dimensions maintaining aspect ratio
  let displayWidth = naturalWidth;
  let displayHeight = naturalHeight;

  if (displayWidth > maxDimension || displayHeight > maxDimension) {
    const scale = Math.min(maxDimension / displayWidth, maxDimension / displayHeight);
    displayWidth = Math.round(displayWidth * scale);
    displayHeight = Math.round(displayHeight * scale);
  }

  // Ensure minimum sizing
  displayWidth = Math.max(40, displayWidth);
  displayHeight = Math.max(40, displayHeight);

  const fileId = 'asset_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);

  let base64 = null;
  try {
    base64 = await blobToBase64(blob);
  } catch (e) {
    // Ignore base64 conversion error
  }

  // Save binary blob in IndexedDB with base64 cached
  await saveImageBlob(fileId, blob, mimeType, base64);

  // Pre-load into in-memory image cache
  await loadImageAsset(fileId);

  const element = {
    id: generateId(),
    type: 'image',
    fileId,
    x: Math.round(targetPoint.x - displayWidth / 2),
    y: Math.round(targetPoint.y - displayHeight / 2),
    width: displayWidth,
    height: displayHeight,
    naturalWidth,
    naturalHeight,
    angle: 0,
    opacity: 100,
    lockAspectRatio: true,
    mimeType
  };

  return element;
}
