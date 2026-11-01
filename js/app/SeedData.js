/**
 * SeedData
 * Single Responsibility: Datos iniciales (seed) del proyecto cuando no hay uno guardado.
 */
window.CanvasApp = window.CanvasApp || {};

window.CanvasApp.SeedData = class SeedData {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.canvas
   * @param {StateManager} options.stateManager
   * @param {HistoryService} options.historyService
   * @param {Function} options.updateStatus
   */
  constructor({ canvas, stateManager, historyService, updateStatus }) {
    this.canvas = canvas;
    this.state = stateManager;
    this.history = historyService;
    this.updateStatus = updateStatus;
  }

  run() {
    const canvasWidth = this.canvas.clientWidth || 900;

    this.state.addElement('shape', {
      x: 38,
      y: 38,
      w: Math.max(300, canvasWidth - 76),
      h: 350,
      bg: '#f0edff',
      radius: 22,
      shape: 'rounded',
      z: 1
    }, false);

    this.state.addElement('text', {
      x: 78,
      y: 90,
      w: Math.min(canvasWidth - 100, 440),
      h: 105,
      text: 'Diseña tu próxima web.',
      fontSize: 44,
      color: '#24243a',
      bg: 'transparent',
      z: 2
    }, false);

    this.state.addElement('text', {
      x: 80,
      y: 208,
      w: Math.min(canvasWidth - 100, 370),
      h: 60,
      text: 'Arrastra, personaliza y crea sin límites. Tu idea, tu estilo.',
      fontSize: 16,
      color: '#696b80',
      bg: 'transparent',
      z: 3
    }, false);

    this.state.addElement('button', {
      x: 80,
      y: 292,
      w: 160,
      h: 46,
      text: 'Explorar diseño',
      bg: '#6d5dfc',
      color: '#ffffff',
      radius: 10,
      z: 4
    }, false);

    this.state.clearSelection();
    this.history.clear();
    if (typeof this.updateStatus === 'function') this.updateStatus();
  }
};
