import { generateId } from '../../utils/canvasUtils.js';

export class RectangleTool {
  constructor(store) {
    this.store = store;
    this.currentElement = null;
    this.startPoint = null;
  }

  onPointerDown(point) {
    this.startPoint = point;
    const { toolProperties } = this.store.getState();

    this.currentElement = {
      id: generateId(),
      type: 'rectangle',
      x: point.x,
      y: point.y,
      width: 0,
      height: 0,
      strokeColor: toolProperties.strokeColor,
      backgroundColor: toolProperties.backgroundColor,
      strokeWidth: toolProperties.strokeWidth,
      strokeStyle: toolProperties.strokeStyle,
      fillStyle: toolProperties.fillStyle,
      roughness: toolProperties.roughness,
      edgeStyle: toolProperties.edgeStyle,
      opacity: toolProperties.opacity
    };

    return this.currentElement;
  }

  onPointerMove(point) {
    if (!this.currentElement || !this.startPoint) return null;

    const width = point.x - this.startPoint.x;
    const height = point.y - this.startPoint.y;

    this.currentElement = {
      ...this.currentElement,
      width,
      height
    };

    return this.currentElement;
  }

  onPointerUp() {
    if (!this.currentElement) return null;

    // Discard if tiny click without drag
    if (Math.abs(this.currentElement.width) < 3 && Math.abs(this.currentElement.height) < 3) {
      this.currentElement = null;
      this.startPoint = null;
      return null;
    }

    // Normalize coordinates so x, y is top-left and width/height are positive
    const x = Math.min(this.currentElement.x, this.currentElement.x + this.currentElement.width);
    const y = Math.min(this.currentElement.y, this.currentElement.y + this.currentElement.height);
    const width = Math.abs(this.currentElement.width);
    const height = Math.abs(this.currentElement.height);

    const finalized = {
      ...this.currentElement,
      x,
      y,
      width,
      height
    };

    this.store.getState().addElement(finalized);
    this.currentElement = null;
    this.startPoint = null;

    return finalized;
  }
}

