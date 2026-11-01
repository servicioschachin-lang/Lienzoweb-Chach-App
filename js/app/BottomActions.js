/**
 * BottomActions
 * Single Responsibility: Acciones de la barra inferior (duplicar, borrar selección).
 */
window.CanvasApp = window.CanvasApp || {};

window.CanvasApp.BottomActions = class BottomActions {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.duplicateBtn
   * @param {HTMLElement} options.deleteBtn
   * @param {StateManager} options.stateManager
   * @param {NotificationService} options.notificationService
   */
  constructor({ duplicateBtn, deleteBtn, stateManager, notificationService }) {
    this.duplicateBtn = duplicateBtn;
    this.deleteBtn = deleteBtn;
    this.state = stateManager;
    this.notifications = notificationService;

    this.bindDuplicate();
    this.bindDelete();
  }

  bindDuplicate() {
    if (!this.duplicateBtn) return;
    this.duplicateBtn.addEventListener('click', () => {
      if (this.state.duplicateSelected()) {
        this.notifications.showToast('Elemento duplicado');
      }
    });
  }

  bindDelete() {
    if (!this.deleteBtn) return;
    this.deleteBtn.addEventListener('click', () => {
      if (this.state.getSelectedId() !== null) {
        this.state.deleteSelected();
        this.notifications.showToast('Elemento eliminado');
      }
    });
  }
};
