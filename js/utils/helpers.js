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
  }
};
