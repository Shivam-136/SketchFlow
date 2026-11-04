import { hitTestElement } from '../../utils/hitTestUtils.js';

export class EraserTool {
  constructor(store) {
    this.store = store;
    this.isErasing = false;
    this.erasedAny = false;
  }

  onPointerDown(point, zoom) {
    this.isErasing = true;
    this.erasedAny = false;
    this.eraseAtPoint(point, zoom);
  }

  onPointerMove(point, zoom) {
    if (!this.isErasing) return;
    this.eraseAtPoint(point, zoom);
  }

  onPointerUp() {
    this.isErasing = false;
    if (this.erasedAny) {
      const { elements } = this.store.getState();
      this.store.getState().pushHistory(elements);
      this.erasedAny = false;
    }
  }

  eraseAtPoint(point, zoom) {
    const { elements, selectedIds, deleteElementBatch } = this.store.getState();
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (hitTestElement(point.x, point.y, el, zoom)) {
        if (deleteElementBatch) {
          deleteElementBatch(el.id);
        } else {
          // Fallback
          const remaining = elements.filter((e) => e.id !== el.id);
          this.store.setState({
            elements: remaining,
            selectedIds: selectedIds.filter((id) => id !== el.id)
          });
        }
        this.erasedAny = true;
        break;
      }
    }
  }
}
