/**
 * NotificationService
 * Single Responsibility: Manage toast notifications and feedback messages in the UI.
 */
window.CanvasApp = window.CanvasApp || {};

window.CanvasApp.NotificationService = class NotificationService {
  constructor(rootSelector = '#toastRoot') {
    this.root = document.querySelector(rootSelector);
    this.timer = null;
  }

  /**
   * Display a temporary toast message
   * @param {string} message - Text to display
   * @param {number} durationMs - Display duration in milliseconds
   */
  showToast(message, durationMs = 2200) {
    if (!this.root) return;

    if (this.timer) {
      clearTimeout(this.timer);
    }

    const { escapeHtml } = window.CanvasApp.Helpers;
    this.root.innerHTML = `<div class="toast" role="alert">${escapeHtml(message)}</div>`;

    this.timer = setTimeout(() => {
      this.root.innerHTML = '';
      this.timer = null;
    }, durationMs);
  }
};
