import { generateId, measureText } from '../../utils/canvasUtils.js';

export class TextTool {
  constructor(store) {
    this.store = store;
  }

  /**
   * Called when user clicks canvas with Text Tool.
   * Returns a template text element ready for inline editing.
   */
  createTextElement(point) {
    const { toolProperties } = this.store.getState();
    const defaultText = '';
    const metrics = measureText(defaultText, toolProperties.fontSize, toolProperties.fontFamily);

    return {
      id: generateId(),
      type: 'text',
      x: point.x,
      y: point.y,
      width: metrics.width,
      height: metrics.height,
      text: defaultText,
      fontSize: toolProperties.fontSize,
      fontFamily: toolProperties.fontFamily,
      textAlign: toolProperties.textAlign,
      strokeColor: toolProperties.strokeColor,
      opacity: toolProperties.opacity
    };
  }
}

