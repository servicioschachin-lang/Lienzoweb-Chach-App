/**
 * KeyboardShortcuts
 * Single Responsibility: Listen to keyboard shortcuts and delegate actions to StateManager.
 */
window.CanvasApp = window.CanvasApp || {};

window.CanvasApp.KeyboardShortcuts = class KeyboardShortcuts {
  /**
   * @param {Object} options
   * @param {StateManager} options.stateManager
   * @param {NotificationService} options.notificationService
   */
  constructor({ stateManager, notificationService }) {
    this.state = stateManager;
    this.notifications = notificationService;

    this.init();
  }

  init() {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  handleKeyDown(e) {
    // Avoid triggering shortcuts while typing inside inputs
    const activeTag = document.activeElement ? document.activeElement.tagName : '';
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag)) {
      return;
    }

    const isCtrlOrCmd = e.ctrlKey || e.metaKey;

    // Delete / Backspace
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (this.state.getSelectedId() !== null) {
        e.preventDefault();
        this.state.deleteSelected();
        this.notifications.showToast('Elemento eliminado');
      }
      return;
    }

    // Undo: Ctrl/Cmd + Z
    if (isCtrlOrCmd && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      if (this.state.undo()) {
        this.notifications.showToast('Deshecho');
      }
      return;
    }

    // Redo: Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z
    if ((isCtrlOrCmd && e.key.toLowerCase() === 'y') || (isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'z')) {
      e.preventDefault();
      if (this.state.redo()) {
        this.notifications.showToast('Rehecho');
      }
      return;
    }

    // Duplicate: Ctrl/Cmd + D
    if (isCtrlOrCmd && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      if (this.state.duplicateSelected()) {
        this.notifications.showToast('Elemento duplicado');
      }
      return;
    }

    // Arrow keys: move selected element
    const el = this.state.getSelectedElement();
    if (el && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;

      let newX = el.x;
      let newY = el.y;

      if (e.key === 'ArrowUp') newY -= step;
      if (e.key === 'ArrowDown') newY += step;
      if (e.key === 'ArrowLeft') newX = Math.max(0, newX - step);
      if (e.key === 'ArrowRight') newX += step;

      this.state.updateElement(el.id, { x: newX, y: newY }, true);
    }
  }
};
