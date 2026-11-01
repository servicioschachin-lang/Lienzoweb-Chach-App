/**
 * ViewController
 * Single Responsibility: Controlar vistas (desktop/tablet/móvil), zoom y tamaño
 * del lienzo.
 */
window.CanvasApp = window.CanvasApp || {};

window.CanvasApp.ViewController = class ViewController {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.canvas
   * @param {HTMLElement} options.canvasHint
   * @param {HTMLElement} options.zoomLevelEl
   * @param {StateManager} options.stateManager
   * @param {NotificationService} options.notificationService
   * @param {EventBus} options.eventBus
   */
  constructor({ canvas, canvasHint, zoomLevelEl, stateManager, notificationService, eventBus }) {
    this.canvas = canvas;
    this.canvasHint = canvasHint;
    this.zoomLevelEl = zoomLevelEl;
    this.state = stateManager;
    this.notifications = notificationService;
    this.eventBus = eventBus;

    this.bindViewButtons();
    this.bindZoomButtons();
    this.applyZoom();
  }

  bindViewButtons() {
    document.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        this.state.setView(view);

        document.querySelectorAll('[data-view]').forEach(b =>
          b.classList.toggle('active', b === btn)
        );

        this.updateCanvasHint(view);
        this.notifications.showToast(
          `Cambiado a vista ${view === 'mobile' ? 'móvil' : view === 'tablet' ? 'tablet' : 'de escritorio'}`
        );
      });
    });
  }

  updateCanvasHint(view) {
    if (!this.canvasHint) return;
    this.canvasHint.textContent = view === 'mobile'
      ? 'Vista móvil · 360×640 px (9:16)'
      : view === 'tablet'
        ? 'Vista tablet · 768×1024 px'
        : 'Lienzo web · escritorio responsivo';
  }

  bindZoomButtons() {
    const zoomOut = document.getElementById('zoomOut');
    const zoomIn = document.getElementById('zoomIn');
    const zoomReset = document.getElementById('zoomReset');

    if (zoomOut) zoomOut.addEventListener('click', () =>
      this.state.setZoom(this.state.getZoom() - 25)
    );
    if (zoomIn) zoomIn.addEventListener('click', () =>
      this.state.setZoom(this.state.getZoom() + 25)
    );
    if (zoomReset) zoomReset.addEventListener('click', () =>
      this.state.setZoom(100)
    );
  }

  applyZoom() {
    const zoom = this.state.getZoom();
    const scale = zoom / 100;
    this.canvas.style.transformOrigin = 'top left';
    this.canvas.style.transform = `scale(${scale})`;
    if (this.zoomLevelEl) this.zoomLevelEl.textContent = `${zoom}%`;
  }

  applyCanvasSize() {
    const { width, height } = this.state.getCanvasSize();
    this.canvas.style.width = `${width}px`;
    this.canvas.style.minHeight = `${Math.max(height, 690)}px`;
    this.notifications.showToast(`Canvas redimensionado a ${width} × ${height} px`);
  }
};
