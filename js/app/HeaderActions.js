/**
 * HeaderActions
 * Single Responsibility: Acciones del encabezado (deshacer, rehacer, vista previa, exportar).
 */
window.CanvasApp = window.CanvasApp || {};

window.CanvasApp.HeaderActions = class HeaderActions {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.undoBtn
   * @param {HTMLElement} options.redoBtn
   * @param {HTMLElement} options.previewBtn
   * @param {HTMLElement} options.exportBtn
   * @param {HTMLElement} options.exportFormat
   * @param {HTMLElement} options.exportFileName
   * @param {HTMLElement} options.exportPageFormat
   * @param {StateManager} options.stateManager
   * @param {HistoryService} options.historyService
   * @param {NotificationService} options.notificationService
   * @param {ExportService} options.exportService
   * @param {HTMLElement} options.canvas
   */
  constructor({ undoBtn, redoBtn, previewBtn, exportBtn, exportFormat, exportFileName, exportPageFormat,
    stateManager, historyService, notificationService, exportService, canvas }) {
    this.undoBtn = undoBtn;
    this.redoBtn = redoBtn;
    this.previewBtn = previewBtn;
    this.exportBtn = exportBtn;
    this.exportFormat = exportFormat;
    this.exportFileName = exportFileName;
    this.exportPageFormat = exportPageFormat;
    this.state = stateManager;
    this.history = historyService;
    this.notifications = notificationService;
    this.exportService = exportService;
    this.canvas = canvas;

    this.bindUndoRedo();
    this.bindPreview();
    this.bindExport();
  }

  bindUndoRedo() {
    if (this.undoBtn) {
      this.undoBtn.addEventListener('click', () => {
        if (this.state.undo()) {
          this.notifications.showToast('Deshecho');
        }
      });
    }
    if (this.redoBtn) {
      this.redoBtn.addEventListener('click', () => {
        if (this.state.redo()) {
          this.notifications.showToast('Rehecho');
        }
      });
    }
  }

  bindPreview() {
    if (!this.previewBtn) return;
    this.previewBtn.addEventListener('click', () => {
      const next = !this.state.getPreviewMode();
      this.state.setPreviewMode(next);
      this.previewBtn.textContent = next ? '✎ Editar' : '▷ Vista previa';
      this.notifications.showToast(next ? 'Modo vista previa activado' : 'Modo edición activado');
    });
  }

  bindExport() {
    if (!this.exportBtn) return;

    const togglePageFormat = () => {
      if (this.exportPageFormat && this.exportFormat) {
        this.exportPageFormat.style.display = this.exportFormat.value === 'pdf' ? 'inline-block' : 'none';
      }
    };
    if (this.exportFormat) this.exportFormat.addEventListener('change', togglePageFormat);
    togglePageFormat();

    this.exportBtn.addEventListener('click', async () => {
      const originalLabel = this.exportBtn.textContent;
      this.exportBtn.disabled = true;
      this.exportBtn.textContent = 'Exportando…';

      try {
        const format = this.exportFormat ? this.exportFormat.value : 'html';
        const fileName = this.exportFileName ? this.exportFileName.value.trim() || 'mi-diseno' : 'mi-diseno';
        const pageFormat = this.exportPageFormat ? this.exportPageFormat.value : 'letter';

        await this.exportService.export(format, this.canvas, fileName, pageFormat);
        this.notifications.showToast(`${format.toUpperCase()} exportado con éxito`);
      } catch (error) {
        this.notifications.showToast(`No se pudo exportar el ${format}`);
      } finally {
        this.exportBtn.disabled = false;
        this.exportBtn.textContent = originalLabel;
      }
    });
  }
};
