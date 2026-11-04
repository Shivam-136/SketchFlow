import { SelectionTool } from '../tools/SelectionTool';
import { RectangleTool } from '../tools/RectangleTool';
import { CircleTool } from '../tools/CircleTool';
import { DiamondTool } from '../tools/DiamondTool';
import { ArrowTool } from '../tools/ArrowTool';
import { LineTool } from '../tools/LineTool';
import { PencilTool } from '../tools/PencilTool';
import { TextTool } from '../tools/TextTool';
import { EraserTool } from '../tools/EraserTool';

export class DrawingEngine {
  constructor(store) {
    this.store = store;
    this.tools = {
      selection: new SelectionTool(store),
      rectangle: new RectangleTool(store),
      circle: new CircleTool(store),
      diamond: new DiamondTool(store),
      arrow: new ArrowTool(store),
      line: new LineTool(store),
      pencil: new PencilTool(store),
      text: new TextTool(store),
      eraser: new EraserTool(store)
    };
    this.previewElement = null;
  }

  getTool(toolName) {
    return this.tools[toolName] || this.tools.selection;
  }

  getCursor(point, zoom) {
    const { activeTool, isSpacePressed } = this.store.getState();
    if (isSpacePressed || activeTool === 'hand') {
      return 'grab';
    }
    if (activeTool === 'selection') {
      return this.tools.selection.getCursor(point, zoom);
    }
    if (activeTool === 'text') {
      return 'text';
    }
    if (activeTool === 'eraser') {
      return 'crosshair';
    }
    return 'crosshair';
  }

  onPointerDown(point, isShift, zoom, isTouch = false) {
    const { activeTool } = this.store.getState();
    const tool = this.tools[activeTool];

    if (activeTool === 'selection') {
      return tool.onPointerDown(point, isShift, zoom, isTouch);
    }
    if (activeTool === 'eraser') {
      tool.onPointerDown(point, zoom);
      return null;
    }
    if (activeTool === 'text') {
      return { type: 'open_text_editor', point };
    }
    if (tool && tool.onPointerDown) {
      this.previewElement = tool.onPointerDown(point);
      return { type: 'draw_start', element: this.previewElement };
    }
    return null;
  }

  onPointerMove(point, zoom) {
    const { activeTool } = this.store.getState();
    const tool = this.tools[activeTool];

    if (activeTool === 'selection') {
      return tool.onPointerMove(point);
    }
    if (activeTool === 'eraser') {
      tool.onPointerMove(point, zoom);
      return null;
    }
    if (tool && tool.onPointerMove) {
      this.previewElement = tool.onPointerMove(point);
      return { type: 'drawing', element: this.previewElement };
    }
    return null;
  }

  onPointerUp() {
    const { activeTool } = this.store.getState();
    const tool = this.tools[activeTool];

    if (activeTool === 'selection') {
      return tool.onPointerUp();
    }
    if (activeTool === 'eraser') {
      tool.onPointerUp();
      return null;
    }
    if (tool && tool.onPointerUp) {
      const finalized = tool.onPointerUp();
      this.previewElement = null;

      // Automatically switch back to selection tool after creating a shape (optional / like Excalidraw)
      // or keep active tool. We keep active tool for continuity, user can switch or press V.
      return { type: 'draw_end', element: finalized };
    }
    return null;
  }
}

