/**
 * PersistenceController
 * Single Responsibility: Guardar y cargar el proyecto en IndexedDB/localStorage,
 * incluyendo la inlining de media local (blob: URLs) para que el proyecto sea
 * portable y no se rompa al recargar.
 */
window.CanvasApp = window.CanvasApp || {};

window.CanvasApp.PersistenceController = class PersistenceController {
  /**
   * @param {Object} options
   * @param {PersistenceService} options.persistenceService
   * @param {NotificationService} options.notificationService
   * @param {EventBus} options.eventBus
   * @param {StateManager} options.stateManager
   */
  constructor({ persistenceService, notificationService, eventBus, stateManager }) {
    this.persistenceService = persistenceService;
    this.notifications = notificationService;
    this.eventBus = eventBus;
    this.state = stateManager;

    this.autoSaveTimer = null;
    this.saveNeeded = false;
  }

  /**
   * Prepara el snapshot para guardar: convierte URLs blob: locales en asset: clave
   * y devuelve los blobs para almacenarlos junto al snapshot.
   * @param {Object} snapshot
   * @returns {Promise<{snapshot: Object, assets: Array}>}
   */
  async prepareSnapshotForSave(snapshot) {
    const prepared = JSON.parse(JSON.stringify(snapshot));
    prepared.elements = prepared.elements || [];
    const assets = [];
    const blobUrlCache = new Map();

    // Procesar cada elemento con media local (blob: URLs)
    await Promise.all(prepared.elements.map(async (element, index) => {
      const src = element.src || '';
      if (!/^blob:/i.test(src)) return;

      // Si ya procesamos este blob, reutilizar la clave
      if (blobUrlCache.has(src)) {
        element.src = blobUrlCache.get(src);
        return;
      }

      try {
        const response = await fetch(src);
        if (!response.ok) throw new Error(`Blob no disponible: ${response.status}`);
        const blob = await response.blob();
        const key = `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`;
        element.src = `asset:${key}`;
        blobUrlCache.set(src, element.src);
        assets.push({ key, blob });
      } catch (error) {
        // Si el blob ya no es válido (revocado o inexistente), marcar src vacío
        // sin romper el guardado del resto del proyecto.
        console.debug('[Persistence] Blob no recuperable, se omite:', src);
        element.src = '';
      }
    }));

    // Limpiar elementos que aún tengan blob: y no se pudieron procesar
    prepared.elements.forEach(element => {
      if (/^blob:/i.test(element.src || '')) element.src = '';
    });

    return { snapshot: prepared, assets };
  }

  /**
   * Guarda el proyecto actual.
   * @param {boolean} silent Si es true, no muestra toast de éxito
   * @returns {Promise<boolean>}
   */
  async save(silent = false) {
    try {
      const snapshot = this.state.getStateSnapshot();
      const prepared = await this.prepareSnapshotForSave(snapshot);
      await this.persistenceService.save('current-project', prepared.snapshot, prepared.assets);
      if (!silent) this.notifications.showToast('Proyecto guardado');
      this.saveNeeded = false;
      this.eventBus.emit('save:changed', { needed: false });
      return true;
    } catch (error) {
      console.error('[Persistence] No se pudo guardar el proyecto:', error);
      if (!silent) this.notifications.showToast('No se pudo guardar el proyecto');
      return false;
    }
  }

  /**
   * Marca el proyecto como con cambios pendientes y programa auto-save si está activo.
   * Nota: `state:updated` ya se emite en otros puntos (StateManager), por lo que
   * aquí no se re-lanza para evitar bucles de evento recursivo.
   */
  markDirty() {
    this.saveNeeded = true;
    this.eventBus.emit('save:changed', { needed: true });

    if (!this._autoSaveEnabled) return;
    clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = setTimeout(() => this.save(true), 1200);
  }

  setAutoSave(enabled) {
    this._autoSaveEnabled = enabled;
  }

  /**
   * Carga el proyecto guardado.
   * @returns {Promise<Object|null>}
   */
  async load() {
    try {
      return await this.persistenceService.load('current-project');
    } catch (error) {
      console.warn('[Persistence] No se pudo recuperar el proyecto:', error);
      return null;
    }
  }
};
