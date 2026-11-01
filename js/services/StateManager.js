/**
 * StateManager
 * Single Responsibility: Central store and controller for application state.
 * Emits events via EventBus to decouple business logic from UI rendering.
 */
window.CanvasApp = window.CanvasApp || {};

window.CanvasApp.StateManager = class StateManager {
  /**
   * @param {Object} options
   * @param {EventBus} options.eventBus
   * @param {HistoryService} options.historyService
   */
  constructor({ eventBus, historyService }) {
    this.eventBus = eventBus;
    this.history = historyService;

    this.elements = [];
    this.selectedId = null;
    this.nextId = 1;
    this.currentView = 'desktop';
    this.canvasBg = {
      color: '#ffffff',
      url: ''
    };
    this.previewMode = false;
    this.zoomLevel = 100;
    this.canvasSize = { width: 1120, height: 690 };
    this.aspectRatioLock = null; // null = libre, '1:1', '16:9', '4:3', '3:2', '9:16'
    this.viewStates = {
      desktop: null,
      tablet: null,
      mobile: null
    };
  }

  /**
   * Get serializable state representation for history snapshot
   */
  getStateSnapshot() {
    return {
      elements: JSON.parse(JSON.stringify(this.elements)),
      selectedId: this.selectedId,
      nextId: this.nextId,
      canvasBg: { ...this.canvasBg },
      canvasSize: { ...this.canvasSize },
      aspectRatioLock: this.aspectRatioLock,
      currentView: this.currentView,
      viewStates: JSON.parse(JSON.stringify(this.viewStates))
    };
  }

  /**
   * Take an undoable history snapshot
   */
  takeSnapshot() {
    this.history.snapshot(this.getStateSnapshot());
  }

  /**
   * Get all elements
   */
  getElements() {
    return this.elements;
  }

  /**
   * Get element by id
   */
  getElementById(id) {
    return this.elements.find(e => e.id === Number(id));
  }

  /**
   * Get currently selected element
   */
  getSelectedElement() {
    if (this.selectedId === null) return null;
    return this.getElementById(this.selectedId) || null;
  }

  /**
   * Get selected element ID
   */
  getSelectedId() {
    return this.selectedId;
  }

  /**
   * Select an element by ID
   */
  select(id) {
    const numId = id !== null ? Number(id) : null;
    if (this.selectedId === numId) return;

    this.selectedId = numId;
    this.eventBus.emit('selection:changed', {
      selectedId: this.selectedId,
      element: this.getSelectedElement()
    });
  }

  /**
   * Clear current selection
   */
  clearSelection() {
    this.select(null);
  }

  /**
   * Add a new element to state
   */
  addElement(type, overrides = {}, recordSnapshot = true) {
    if (recordSnapshot) {
      this.takeSnapshot();
    }

    const { ELEMENT_DEFAULTS } = window.CanvasApp.Config;
    const baseConfig = ELEMENT_DEFAULTS[type] || {};

    const maxZ = this.elements.reduce((max, e) => Math.max(max, e.z || 0), 0);

    const newElement = {
      ...baseConfig,
      ...overrides,
      id: this.nextId++,
      type,
      z: overrides.z !== undefined ? overrides.z : maxZ + 1
    };

    this.elements.push(newElement);
    this.selectedId = newElement.id;

    this.eventBus.emit('elements:changed', { elements: this.elements });
    this.eventBus.emit('selection:changed', {
      selectedId: this.selectedId,
      element: newElement
    });
    this.eventBus.emit('state:updated');

    return newElement;
  }

  /**
   * Update properties of an existing element
   */
  updateElement(id, partialProps, recordSnapshot = false) {
    const el = this.getElementById(id);
    if (!el) return;

    if (recordSnapshot) {
      this.takeSnapshot();
    }

    Object.assign(el, partialProps);

    this.eventBus.emit('element:updated', { id: el.id, element: el, changes: partialProps });
    this.eventBus.emit('state:updated');
  }

  /**
   * Delete the selected element
   */
  deleteSelected() {
    if (this.selectedId === null) return;

    this.takeSnapshot();
    this.elements = this.elements.filter(e => e.id !== this.selectedId);
    this.selectedId = null;

    this.eventBus.emit('elements:changed', { elements: this.elements });
    this.eventBus.emit('selection:changed', { selectedId: null, element: null });
    this.eventBus.emit('state:updated');
  }

  /**
   * Duplicate the selected element
   */
  duplicateSelected() {
    const el = this.getSelectedElement();
    if (!el) return null;

    this.takeSnapshot();

    const maxZ = this.elements.reduce((max, e) => Math.max(max, e.z || 0), 0);
    const clone = {
      ...JSON.parse(JSON.stringify(el)),
      id: this.nextId++,
      x: el.x + 20,
      y: el.y + 20,
      z: maxZ + 1
    };

    this.elements.push(clone);
    this.selectedId = clone.id;

    this.eventBus.emit('elements:changed', { elements: this.elements });
    this.eventBus.emit('selection:changed', {
      selectedId: this.selectedId,
      element: clone
    });
    this.eventBus.emit('state:updated');

    return clone;
  }

  /**
   * Bring element to the front
   */
  bringToFront(id) {
    const el = this.getElementById(id);
    if (!el) return;

    this.takeSnapshot();
    const maxZ = this.elements.reduce((max, e) => Math.max(max, e.z || 0), 0);
    el.z = maxZ + 1;

    this.eventBus.emit('element:updated', { id: el.id, element: el, changes: { z: el.z } });
    this.eventBus.emit('elements:changed', { elements: this.elements });
    this.eventBus.emit('state:updated');
  }

  /**
   * Switch viewport view (desktop, tablet, mobile)
   */
  setView(viewMode) {
    // Save current view state
    this.viewStates[this.currentView] = {
      elements: JSON.parse(JSON.stringify(this.elements)),
      selectedId: this.selectedId,
      nextId: this.nextId,
      canvasSize: { ...this.canvasSize },
      aspectRatioLock: this.aspectRatioLock
    };

    // Switch to new view
    this.currentView = viewMode;

    const defaultSizes = {
      desktop: { width: 1120, height: 690 },
      tablet: { width: 768, height: 1024 },
      mobile: { width: 360, height: 640 } // Exactamente 9:16 (360/640 = 9/16)
    };

    const defaultRatios = {
      desktop: null,
      tablet: null,
      mobile: '9:16' // Forzar 9:16 en móvil
    };

    // Restore the new view's state if it exists
    if (this.viewStates[viewMode] && this.viewStates[viewMode].elements) {
      this.elements = this.viewStates[viewMode].elements;
      this.selectedId = this.viewStates[viewMode].selectedId;
      this.nextId = this.viewStates[viewMode].nextId;
      this.canvasSize = this.viewStates[viewMode].canvasSize
        ? { ...this.viewStates[viewMode].canvasSize }
        : { ...defaultSizes[viewMode] };
      this.aspectRatioLock = this.viewStates[viewMode].aspectRatioLock !== undefined
        ? this.viewStates[viewMode].aspectRatioLock
        : defaultRatios[viewMode];
    } else {
      // First time switching to this view, reposition from desktop without deforming.
      // Positions are kept relative (percentage of canvas) so the design looks the same
      // on desktop/tablet/mobile; only the layout/distribution changes.
      if (viewMode !== 'desktop' && this.viewStates.desktop) {
        const prevW = this.viewStates.desktop.canvasSize?.width ?? defaultSizes.desktop.width;
        const prevH = this.viewStates.desktop.canvasSize?.height ?? defaultSizes.desktop.height;
        const newW = defaultSizes[viewMode].width;
        const newH = defaultSizes[viewMode].height;

        this.elements = JSON.parse(JSON.stringify(this.viewStates.desktop.elements));
        this.elements.forEach(el => {
          // Posiciones relativas: un elemento al 50% del ancho sigue al 50% en cualquier vista
          el.x = Math.round((el.x / prevW) * newW);
          el.y = Math.round((el.y / prevH) * newH);

          // Mantener tamaño original; si no cabe, reducir proporcionalmente preservando aspect ratio
          if (el.w > newW) {
            const scale = newW / el.w;
            el.w = newW;
            el.h = Math.max(1, Math.round(el.h * scale));
          }
          if (el.h > newH) {
            const scale = newH / el.h;
            el.h = newH;
            el.w = Math.max(1, Math.round(el.w * scale));
          }

          // Clamp para que no se salga del canvas
          el.x = Math.max(0, Math.min(el.x, newW - el.w));
          el.y = Math.max(0, Math.min(el.y, newH - el.h));
        });
        this.selectedId = null;
        this.nextId = this.viewStates.desktop.nextId;
      }
      this.canvasSize = { ...defaultSizes[viewMode] };
      this.aspectRatioLock = defaultRatios[viewMode];
    }

    this.eventBus.emit('view:changed', { view: viewMode });
    this.eventBus.emit('canvas:sizeChanged', { ...this.canvasSize });
    this.eventBus.emit('canvas:ratioChanged', { ratio: this.aspectRatioLock });
    this.eventBus.emit('elements:changed', { elements: this.elements });
    this.eventBus.emit('selection:changed', {
      selectedId: this.selectedId,
      element: this.getSelectedElement()
    });
    this.eventBus.emit('state:updated');
  }

  getView() {
    return this.currentView;
  }

  /**
   * Set canvas background
   */
  setBgColor(color) {
    this.canvasBg.color = color;
    this.eventBus.emit('canvas:bgChanged', this.canvasBg);
  }

  setBgUrl(url) {
    this.canvasBg.url = url;
    this.eventBus.emit('canvas:bgChanged', this.canvasBg);
  }

  /**
   * Establece un video como fondo del canvas (capa detrás de los elementos).
   * @param {string} src URL del video
   * @param {Object} opts { autoplay, loop, muted }
   */
  setBgVideo(src, opts = {}) {
    this.canvasBg.video = {
      src: src || '',
      autoplay: opts.autoplay !== false,
      loop: opts.loop !== false,
      muted: opts.muted !== false
    };
    this.eventBus.emit('canvas:bgChanged', this.canvasBg);
  }

  /** Quita el video de fondo y restaura solo color/imagen */
  clearBgVideo() {
    this.canvasBg.video = null;
    this.eventBus.emit('canvas:bgChanged', this.canvasBg);
  }

  getBg() {
    return { ...this.canvasBg };
  }

  /**
   * Preview mode toggle
   */
  setPreviewMode(enabled) {
    this.previewMode = enabled;
    if (enabled) {
      this.clearSelection();
    }
    this.eventBus.emit('preview:changed', { preview: enabled });
  }

  getPreviewMode() {
    return this.previewMode;
  }

  /** Zoom level in percent (50-300) */
  setZoom(percent) {
    const clamped = Math.max(25, Math.min(300, Math.round(percent)));
    if (this.zoomLevel === clamped) return;
    this.zoomLevel = clamped;
    this.eventBus.emit('zoom:changed', { zoom: this.zoomLevel });
    this.eventBus.emit('state:updated');
  }

  getZoom() {
    return this.zoomLevel;
  }

  /* --------------------------------------------------------------- *
   * Canvas crop / resize                                            *
   * --------------------------------------------------------------- */

  ASPECT_RATIOS = {
    libre: null,
    '1:1': 1,
    '16:9': 16 / 9,
    '4:3': 4 / 3,
    '3:2': 3 / 2,
    '9:16': 9 / 16
  };

  /**
   * Establece el tamaño del canvas en píxeles.
   * @param {number} width
   * @param {number} height
   */
  setCanvasSize(width, height) {
    const w = Math.max(200, Math.round(width));
    const h = Math.max(200, Math.round(height));
    if (this.canvasSize.width === w && this.canvasSize.height === h) return;
    this.canvasSize = { width: w, height: h };
    this.eventBus.emit('canvas:sizeChanged', { ...this.canvasSize });
    this.eventBus.emit('state:updated');
  }

  /**
   * Bloquea o desbloquea la relación de aspecto del canvas.
   * @param {string|null} ratio - 'libre', '1:1', '16:9', '4:3', '3:2', '9:16' o null
   */
  setAspectRatio(ratio) {
    if (this.aspectRatioLock === ratio) return;
    this.aspectRatioLock = ratio;
    this.eventBus.emit('canvas:ratioChanged', { ratio: this.aspectRatioLock });
    this.eventBus.emit('state:updated');
  }

  /**
   * Calcula la altura correspondiente para un ancho dado según el ratio bloqueado.
   * @param {number} width
   * @returns {number}
   */
  computeHeightForWidth(width) {
    const ratio = this.aspectRatioLock ? this.ASPECT_RATIOS[this.aspectRatioLock] : null;
    if (!ratio) return Math.round(width * (this.canvasSize.height / this.canvasSize.width));
    return Math.round(width / ratio);
  }

  /**
   * Calcula el ancho correspondiente para una altura dada según el ratio bloqueado.
   * @param {number} height
   * @returns {number}
   */
  computeWidthForHeight(height) {
    const ratio = this.aspectRatioLock ? this.ASPECT_RATIOS[this.aspectRatioLock] : null;
    if (!ratio) return Math.round(height * (this.canvasSize.width / this.canvasSize.height));
    return Math.round(height * ratio);
  }

  getCanvasSize() {
    return { ...this.canvasSize };
  }

  getAspectRatio() {
    return this.aspectRatioLock;
  }

  /**
   * Undo action
   */
  undo() {
    const previous = this.history.undo(this.getStateSnapshot());
    if (!previous) return false;

    this.restoreState(previous);
    return true;
  }

  /**
   * Redo action
   */
  redo() {
    const next = this.history.redo(this.getStateSnapshot());
    if (!next) return false;

    this.restoreState(next);
    return true;
  }

  /**
   * Restore state from a snapshot
   */
  restoreState(snapshot) {
    this.elements = snapshot.elements || [];
    this.selectedId = snapshot.selectedId || null;
    this.nextId = snapshot.nextId || (this.elements.length + 1);

    if (snapshot.canvasBg) {
      this.canvasBg = { ...snapshot.canvasBg };
      this.eventBus.emit('canvas:bgChanged', this.canvasBg);
    }

    if (snapshot.currentView) {
      this.currentView = snapshot.currentView;
    }

    if (snapshot.canvasSize) {
      this.canvasSize = { ...snapshot.canvasSize };
    }

    if (snapshot.aspectRatioLock !== undefined) {
      this.aspectRatioLock = snapshot.aspectRatioLock;
    }

    if (snapshot.viewStates) {
      this.viewStates = JSON.parse(JSON.stringify(snapshot.viewStates));
    }

    this.eventBus.emit('elements:changed', { elements: this.elements });
    this.eventBus.emit('selection:changed', {
      selectedId: this.selectedId,
      element: this.getSelectedElement()
    });
    this.eventBus.emit('state:updated');
  }
};
