/**
 * BackgroundRemovalService
 * Single Responsibility: Lazily load the on-device BEN2 model and turn an image
 * into a transparent PNG. Files never leave the browser.
 */
window.CanvasApp = window.CanvasApp || {};

window.CanvasApp.BackgroundRemovalService = class BackgroundRemovalService {
  /** Tamaño máximo (px) del lado más largo antes de enviarse al modelo IA. */
  static MAX_DIMENSION = 1024;

  /**
   * @param {Object} [options]
   * @param {string} [options.moduleUrl] - ESM entry point for runonweb/remove-bg
   * @param {'auto'|'wasm'|'webgpu'} [options.device]
   */
  constructor({ moduleUrl, device } = {}) {
    const config = window.CanvasApp.Config.BACKGROUND_REMOVAL;

    this.moduleUrl = moduleUrl || config.moduleUrl;
    this.device = device || config.device;

    this.module = null;
    this.remover = null;
    this.progressHandler = null;
    this.queue = Promise.resolve();
  }

  static isSupported() {
    return typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function';
  }

  get isModelLoaded() {
    return Boolean(this.remover);
  }

  /**
   * Remove the background from an image.
   * @param {Blob|File|string|HTMLImageElement|HTMLCanvasElement|ImageData} image
   * @param {{ onProgress?: (progress: { status: string, message: string, percent: number }) => void }} [options]
   * @returns {Promise<Blob>} PNG blob with an alpha channel
   */
  remove(image, { onProgress } = {}) {
    if (!BackgroundRemovalService.isSupported()) {
      return Promise.reject(this.createUserError('Este navegador no puede ejecutar el modelo (falta WebAssembly).'));
    }

    const run = () => this.runRemoval(image, onProgress);
    const task = this.queue.then(run, run).catch(error => {
      throw this.toUserError(error);
    });

    // Keep the chain alive after a failure, but return the real task to the caller.
    this.queue = task.catch(() => {});
    return task;
  }

  async runRemoval(image, onProgress) {
    this.progressHandler = typeof onProgress === 'function' ? onProgress : null;
    this.emitProgress('preparing', 'Preparando el modelo de IA…', 0);

    try {
      if (!this.module) {
        this.emitProgress('engine', 'Cargando el motor de IA…', 0);
        this.module = await import(/* webpackIgnore: true */ this.moduleUrl);
      }

      if (!this.remover) {
        this.remover = new this.module.RemoveBackground({
          device: this.device,
          onProgress: info => {
            const mapped = this.mapProgress(info);
            if (mapped && this.progressHandler) {
              this.progressHandler(mapped);
            }
          }
        });

        this.emitProgress('model', 'Descargando el modelo de IA…', 0);
        await this.remover.load();
      }

      // Redimensionar imágenes grandes para evitar saturar la RAM del navegador.
      const prepared = await this.prepareImage(image);

      this.emitProgress('processing', 'Recortando el fondo…', 90);
      const png = await this.remover.remove(prepared);
      this.emitProgress('done', 'Fondo eliminado', 100);
      return png;
    } finally {
      this.progressHandler = null;
    }
  }

  /**
   * Si la imagen excede MAX_DIMENSION, la redimensiona para evitar consumir toda la memoria.
   * Devuelve un HTMLCanvasElement listo para el modelo.
   * @param {Blob|File|string|HTMLImageElement|HTMLCanvasElement|ImageData} image
   * @returns {Promise<HTMLCanvasElement>}
   */
  async prepareImage(image) {
    const maxDim = BackgroundRemovalService.MAX_DIMENSION;

    const img = await this.toImageElement(image);
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));

    if (scale >= 1) {
      return img;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth || img.width) * scale;
    canvas.height = Math.round(img.naturalHeight || img.height) * scale;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  /**
   * Convierte cualquier fuente de imagen admitida en un HTMLImageElement cargado.
   * @param {Blob|File|string|HTMLImageElement|HTMLCanvasElement|ImageData} image
   * @returns {Promise<HTMLImageElement>}
   */
  toImageElement(image) {
    if (image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0) {
      return Promise.resolve(image);
    }
    if (image instanceof HTMLCanvasElement) {
      return Promise.resolve(image);
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('No se pudo leer la imagen de origen.'));

      if (typeof image === 'string') {
        img.src = image;
      } else if (image instanceof Blob || image instanceof File) {
        const objectUrl = URL.createObjectURL(image);
        img.onload = () => {
          // Revocar la URL después de decodificar; el bitmap queda en memoria.
          URL.revokeObjectURL(objectUrl);
          resolve(img);
        };
        img.src = objectUrl;
      } else if (image instanceof ImageData) {
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        canvas.getContext('2d').putImageData(image, 0, 0);
        resolve(canvas);
      } else {
        reject(new Error('Formato de imagen no admitido.'));
      }
    });
  }

  /* … resto sin cambios … */

  /**
   * Translate runonweb progress events into UI-friendly messages.
   */
  mapProgress(info = {}) {
    const percent = Number.isFinite(info.progress)
      ? Math.max(0, Math.min(100, Math.round(info.progress)))
      : 0;

    if (info.status === 'processing') {
      return { status: info.status, message: 'Recortando el fondo…', percent: 90 };
    }

    if (info.status === 'done') {
      return { status: info.status, message: 'Fondo eliminado', percent: 100 };
    }

    if (info.status === 'ready') {
      return { status: info.status, message: 'Modelo listo. Recortando…', percent: 85 };
    }

    if (['loading', 'progress', 'progress_total'].includes(info.status)) {
      const hasBytes = Number.isFinite(info.loaded) && Number.isFinite(info.total) && info.total > 0;
      const detail = hasBytes
        ? ` (${this.formatMegabytes(info.loaded)} / ${this.formatMegabytes(info.total)} MB)`
        : '';

      return {
        status: info.status,
        message: `Descargando modelo de IA… ${percent}%${detail}`,
        percent
      };
    }

    return null;
  }

  emitProgress(status, message, percent) {
    if (this.progressHandler) {
      this.progressHandler({ status, message, percent });
    }
  }

  formatMegabytes(bytes) {
    return Math.round(bytes / (1024 * 1024));
  }

  createUserError(message) {
    const error = new Error(message);
    error.userMessage = message;
    return error;
  }

  toUserError(error) {
    if (error && error.userMessage) return error;

    const message = error instanceof Error ? error.message : String(error);

    if (/Failed to fetch|NetworkError|ERR_NETWORK|importing a module script failed|dynamically imported module|fetch dynamically imported module/i.test(message)) {
      return this.createUserError('No se pudo cargar el modelo de IA. Revisa tu conexión a internet e inténtalo de nuevo.');
    }

    if (/CORS|tainted|SecurityError|cross-origin/i.test(message)) {
      return this.createUserError('La imagen remota no permite su lectura (CORS). Sube el archivo desde tu equipo o usa otra URL.');
    }

    if (/memory|out of bounds|allocation/i.test(message)) {
      return this.createUserError('No hay memoria suficiente para procesar esta imagen. Prueba con una imagen más pequeña.');
    }

    return this.createUserError('No se pudo quitar el fondo. Inténtalo de nuevo.');
  }

  /**
   * Release the model and its memory.
   */
  dispose() {
    if (this.remover && typeof this.remover.dispose === 'function') {
      this.remover.dispose();
    }
    this.remover = null;
    this.module = null;
  }
};
