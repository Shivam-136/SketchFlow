import { generateId } from '../../utils/canvasUtils.js';

export class PencilTool {
  constructor(store) {
    this.store = store;
    this.currentElement = null;
  }

  onPointerDown(point) {
    const { toolProperties } = this.store.getState();

    this.currentElement = {
      id: generateId(),
      type: 'pencil',
      x: point.x,
      y: point.y,
      points: [{ x: point.x, y: point.y }],
      strokeColor: toolProperties.strokeColor,
      strokeWidth: toolProperties.strokeWidth,
      strokeStyle: toolProperties.strokeStyle,
      opacity: toolProperties.opacity
    };

    return this.currentElement;
  }

  onPointerMove(point) {
    if (!this.currentElement || !this.currentElement.points) return null;

    const points = this.currentElement.points;
    const lastPoint = points[points.length - 1];

    // Filter points that are too close to reduce memory and smoothen
    const dist = Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y);
    if (dist < 2) return null;

    points.push({ x: point.x, y: point.y });

    return this.currentElement;
  }

  onPointerUp() {
    if (!this.currentElement || !this.currentElement.points || this.currentElement.points.length === 0) {
      this.currentElement = null;
      return null;
    }

    const finalized = { ...this.currentElement };
    this.store.getState().addElement(finalized);
    this.currentElement = null;

    return finalized;
  }
}

