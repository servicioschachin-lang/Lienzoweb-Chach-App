/**
 * DragDropHandler
 * Single Responsibility: Manage pointer dragging interactions on canvas elements,
 * accounting for responsive viewport scaling and boundary restrictions.
 */
window.CanvasApp = window.CanvasApp || {};

window.CanvasApp.DragDropHandler = class DragDropHandler {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.canvas
   * @param {StateManager} options.stateManager
   * @param {EventBus} options.eventBus
   */
  constructor({ canvas, stateManager, eventBus }) {
    this.canvas = canvas;
    this.state = stateManager;
    this.eventBus = eventBus;

    this.dragging = null;
    this.initEvents();
  }

  initEvents() {
    this.canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
    window.addEventListener('pointermove', this.onPointerMove.bind(this));
    window.addEventListener('pointerup', this.onPointerUp.bind(this));
  }

  onPointerDown(ev) {
    if (this.state.getPreviewMode()) return;

    const elementNode = ev.target.closest('.element');
    if (!elementNode) return;

    // Do not initiate drag if interacting directly with audio/video controls or links in preview
    if (ev.target.closest('audio, video, input, textarea, select')) return;

    const id = Number(elementNode.dataset.id);
    const element = this.state.getElementById(id);
    if (!element) return;

    ev.preventDefault();

    // Select the element if not already selected
    if (this.state.getSelectedId() !== id) {
      this.state.select(id);
    }

    // Save snapshot before drag begins
    this.state.takeSnapshot();

    this.dragging = {
      id,
      startX: ev.clientX,
      startY: ev.clientY,
      origX: element.x,
      origY: element.y
    };

    if (typeof elementNode.setPointerCapture === 'function') {
      try {
        elementNode.setPointerCapture(ev.pointerId);
      } catch (err) {
        // Pointer capture can fail in certain synthetic event conditions, safe to ignore
      }
    }
  }

  onPointerMove(ev) {
    if (!this.dragging) return;

    const element = this.state.getElementById(this.dragging.id);
    if (!element) return;

    const currentView = this.state.getView();
    const rect = this.canvas.getBoundingClientRect();
    const targetWidth = currentView === 'mobile' ? 375 : currentView === 'tablet' ? 768 : Math.max(this.canvas.clientWidth, 1);
    const scale = rect.width / targetWidth;

    const deltaX = (ev.clientX - this.dragging.startX) / (scale || 1);
    const deltaY = (ev.clientY - this.dragging.startY) / (scale || 1);

    const newX = Math.max(0, Math.round(this.dragging.origX + deltaX));
    const newY = Math.max(0, Math.round(this.dragging.origY + deltaY));

    if (element.x !== newX || element.y !== newY) {
      this.state.updateElement(element.id, { x: newX, y: newY }, false);
      this.eventBus.emit('drag:moved', { id: element.id, x: newX, y: newY });
    }
  }

  onPointerUp() {
    if (!this.dragging) return;
    this.dragging = null;
    this.eventBus.emit('drag:ended');
  }
};
