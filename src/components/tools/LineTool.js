import { generateId } from '../../utils/canvasUtils.js';

export class LineTool {
  constructor(store) {
    this.store = store;
    this.currentElement = null;
  }

  onPointerDown(point) {
    const { toolProperties } = this.store.getState();

    this.currentElement = {
      id: generateId(),
      type: 'line',
      x: point.x,
      y: point.y,
      x2: point.x,
      y2: point.y,
      width: 0,
      height: 0,
      strokeColor: toolProperties.strokeColor,
      strokeWidth: toolProperties.strokeWidth,
      strokeStyle: toolProperties.strokeStyle,
      roughness: toolProperties.roughness,
      opacity: toolProperties.opacity
    };

    return this.currentElement;
  }

  onPointerMove(point) {
    if (!this.currentElement) return null;

    this.currentElement = {
      ...this.currentElement,
      x2: point.x,
      y2: point.y,
      width: point.x - this.currentElement.x,
      height: point.y - this.currentElement.y
    };

    return this.currentElement;
  }

  onPointerUp() {
    if (!this.currentElement) return null;

    const dx = this.currentElement.x2 - this.currentElement.x;
    const dy = this.currentElement.y2 - this.currentElement.y;

    if (Math.hypot(dx, dy) < 4) {
      this.currentElement = null;
      return null;
    }

    const finalized = { ...this.currentElement };
    this.store.getState().addElement(finalized);
    this.currentElement = null;

    return finalized;
  }
}

