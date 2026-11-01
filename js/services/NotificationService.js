/**
 * NotificationService
 * Single Responsibility: Manage toast notifications, progress feedback and status messages in the UI.
 */
window.CanvasApp = window.CanvasApp || {};

window.CanvasApp.NotificationService = class NotificationService {
  constructor(rootSelector = '#toastRoot') {
    this.root = document.querySelector(rootSelector);
    this.timer = null;
    this.toastEl = null;
    this.progressEl = null;
  }

  /**
   * Display a temporary toast message.
   * @param {string} message - Text to display
   * @param {number} durationMs - Display duration in milliseconds
   */
  showToast(message, durationMs = 2200) {
    if (!this.root) return;

    this.clearTimer();

    if (!this.toastEl) {
      this.toastEl = document.createElement('div');
      this.toastEl.className = 'toast';
      this.toastEl.setAttribute('role', 'alert');
      this.root.appendChild(this.toastEl);
    }

    this.toastEl.textContent = message;
    this.stackElements();

    this.timer = setTimeout(() => this.hideToast(), Math.max(0, durationMs));
  }

  hideToast() {
    this.clearTimer();

    if (this.toastEl) {
      this.toastEl.remove();
      this.toastEl = null;
    }
  }

  /**
   * Display a persistent progress toast. It stays visible until hideProgress() is called.
   * @param {string} message
   * @param {number} percent - 0 to 100
   */
  showProgress(message, percent = 0) {
    if (!this.root) return;

    if (!this.progressEl) {
      this.progressEl = document.createElement('div');
      this.progressEl.className = 'toast progress-toast';
      this.progressEl.setAttribute('role', 'status');
      this.progressEl.setAttribute('aria-live', 'polite');
      this.progressEl.innerHTML = '<div class="progress-label"></div><div class="progress-track"><div class="progress-fill"></div></div>';

      this.progressLabel = this.progressEl.querySelector('.progress-label');
      this.progressFill = this.progressEl.querySelector('.progress-fill');
      this.root.appendChild(this.progressEl);
      this.stackElements();
    }

    if (this.progressLabel) {
      this.progressLabel.textContent = message;
    }

    if (this.progressFill) {
      const value = Number.isFinite(percent) ? Math.max(0, Math.min(100, Math.round(percent))) : 0;
      this.progressFill.style.width = `${value}%`;
    }
  }

  hideProgress() {
    if (!this.progressEl) return;

    this.progressEl.remove();
    this.progressEl = null;
    this.progressLabel = null;
    this.progressFill = null;
    this.stackElements();
  }

  /**
   * Keep the regular toast above the progress toast when both are visible.
   */
  stackElements() {
    if (this.toastEl) {
      this.toastEl.style.bottom = this.progressEl ? '148px' : '';
    }
  }

  clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
};
