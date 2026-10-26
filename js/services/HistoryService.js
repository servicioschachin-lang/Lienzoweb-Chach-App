/**
 * HistoryService
 * Single Responsibility: Manage undo/redo state stacks and history limits.
 */
window.CanvasApp = window.CanvasApp || {};

window.CanvasApp.HistoryService = class HistoryService {
  constructor(limit = 60) {
    this.limit = limit;
    this.past = [];
    this.future = [];
  }

  /**
   * Save a snapshot of the current state
   * @param {Object} state - Deep cloneable state snapshot
   */
  snapshot(state) {
    this.past.push(JSON.stringify(state));
    if (this.past.length > this.limit) {
      this.past.shift();
    }
    // Any new state clears the redo branch
    this.future = [];
  }

  /**
   * Undo to previous state
   * @param {Object} currentState - Current state to push to redo
   * @returns {Object|null} Previous state or null if cannot undo
   */
  undo(currentState) {
    if (!this.canUndo()) return null;

    this.future.push(JSON.stringify(currentState));
    const previousRaw = this.past.pop();
    return JSON.parse(previousRaw);
  }

  /**
   * Redo to next state
   * @param {Object} currentState - Current state to push to undo
   * @returns {Object|null} Next state or null if cannot redo
   */
  redo(currentState) {
    if (!this.canRedo()) return null;

    this.past.push(JSON.stringify(currentState));
    const nextRaw = this.future.pop();
    return JSON.parse(nextRaw);
  }

  canUndo() {
    return this.past.length > 0;
  }

  canRedo() {
    return this.future.length > 0;
  }

  clear() {
    this.past = [];
    this.future = [];
  }
};
