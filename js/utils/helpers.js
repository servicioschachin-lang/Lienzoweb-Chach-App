/**
 * Helpers & Utilities
 * Single Responsibility: Pure utility helper functions for DOM and data formatting.
 */
window.CanvasApp = window.CanvasApp || {};

window.CanvasApp.Helpers = {
  /**
   * DOM query selector shortcut
   */
  $(selector, context = document) {
    return context.querySelector(selector);
  },

  /**
   * DOM query selector all shortcut
   */
  $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
  },

  /**
   * Escape HTML special characters to prevent XSS
   */
  escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  },

  /**
   * Clamp a number between min and max
   */
  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  },

  /**
   * Detecta si una imagen tiene áreas con canal alfa no opaco (transparencia).
   * Dibuja la imagen en un canvas offscreen y muestreo el canal alfa.
   * @param {string} src URL o data URL de la imagen
   * @returns {Promise<boolean>}
   */
  async detectImageTransparency(src) {
    return new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const s = Math.min(128, Math.max(img.naturalWidth || 128, img.naturalHeight || 128));
          canvas.width = s;
          canvas.height = s;
          ctx.drawImage(img, 0, 0, s, s);
          const data = ctx.getImageData(0, 0, s, s).data;
          let transparent = false;
          for (let i = 3; i < data.length && !transparent; i += 16) {
            if (data[i] < 255) transparent = true;
          }
          resolve(transparent);
        } catch (e) {
          resolve(false);
        }
      };
      img.onerror = () => resolve(false);
      img.src = src;
    });
  }
};
