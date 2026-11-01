/**
 * BackgroundRemovalService
 * Single Responsibility: Lazily load the on-device BEN2 model and turn an image
 * into a transparent PNG. Files never leave the browser.
 */
window.CanvasApp = window.CanvasApp || {};

window.CanvasApp.BackgroundRemovalService = class BackgroundRemovalService {
  /**
   * Preload the background-removal model on demand (with consent).
   * @param {(progress: { status: string, message: string, percent: number }) => void} [onProgress]
   */
  async load(onProgress) {
    this.progressHandler = typeof onProgress === 'function' ? onProgress : null;
    this.emitProgress('preparing', 'Preparando el modelo de IA...', 0);
    try {
      await this.sendWorkerRequest('load');
      this.modelLoaded = true;
      this.emitProgress('done', 'Modelo listo', 100);
    } finally {
      this.progressHandler = null;
    }
  }
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

    this.worker = null;
    this.workerRequests = new Map();
    this.nextWorkerRequestId = 1;
    this.modelLoaded = false;
    this.progressHandler = null;
    this.queue = Promise.resolve();
    this.lastProgressKey = null;
    this.lastProgressAt = 0;
    this.pendingProgress = null;
    this.progressFrame = null;
  }

  static isSupported() {
    if (typeof WebAssembly !== 'object' || typeof WebAssembly.instantiate !== 'function') {
      return false;
    }
    return true;
  }

  get isModelLoaded() {
    return this.modelLoaded;
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
    this.emitProgress('preparing', 'Preparando la imagen...', 0);

    try {
      this.emitProgress('preparing', 'Preparando imagen...', 10);
      const prepared = await this.prepareImage(image);
      const imageBlob = await new Promise((resolve, reject) => {
        prepared.toBlob(blob => blob ? resolve(blob) : reject(new Error('No se pudo convertir la imagen a Blob')), 'image/png');
      });
      const imageDataUrl = await this.blobToDataUrl(imageBlob);

      this.emitProgress('processing', 'Recortando el fondo...', 90);
      const png = await this.sendWorkerRequest('remove', { imageDataUrl });
      this.modelLoaded = true;
      this.emitProgress('done', 'Fondo eliminado', 100);
      return png;
    } finally {
      this.progressHandler = null;
    }
  }

  blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('No se pudo preparar la imagen para el worker.'));
      reader.readAsDataURL(blob);
    });
  }

  getWorker() {
    if (this.worker) return this.worker;

    const worker = new Worker('js/workers/background-removal.worker.js', { type: 'module' });
    worker.addEventListener('message', event => {
      const { type, requestId, info, png, message } = event.data || {};
      if (type === 'progress') {
        if (this.progressHandler) this.handleModelProgress(info);
        return;
      }

      const request = this.workerRequests.get(requestId);
      if (!request) return;
      this.workerRequests.delete(requestId);
      if (type === 'error') request.reject(new Error(message || 'Background removal worker error.'));
      else if (type === 'loaded') {
        this.modelLoaded = true;
        request.resolve(true);
      } else if (type === 'result') request.resolve(png);
    });
    worker.addEventListener('error', event => {
      const error = new Error(event.message || 'Background removal worker failed.');
      for (const request of this.workerRequests.values()) request.reject(error);
      this.workerRequests.clear();
      this.worker = null;
      this.modelLoaded = false;
    });

    this.worker = worker;
    return worker;
  }

  sendWorkerRequest(type, payload = {}) {
    const worker = this.getWorker();
    const requestId = this.nextWorkerRequestId++;

    return new Promise((resolve, reject) => {
      this.workerRequests.set(requestId, { resolve, reject });
      worker.postMessage({
        type,
        requestId,
        moduleUrl: this.moduleUrl,
        ...payload
      });
    });
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
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    const scale = Math.min(1, maxDim / Math.max(width, height));

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
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
    if (image instanceof HTMLCanvasElement) {
      return Promise.resolve(image);
    }

    if (image instanceof ImageData) {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      canvas.getContext('2d').putImageData(image, 0, 0);
      return Promise.resolve(canvas);
    }

    if (image instanceof HTMLImageElement) {
      if (image.complete && image.naturalWidth > 0) {
        return Promise.resolve(image);
      }
      // Fall through to load it from its src.
      image = image.src;
    }

    if (typeof image === 'string') {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('No se pudo leer la imagen de origen.'));
        img.src = image;
      });
    }

    if (image instanceof Blob || image instanceof File) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(image);
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(img);
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('No se pudo leer la imagen de origen.'));
        };
        img.crossOrigin = 'anonymous';
        img.src = objectUrl;
      });
    }

    return Promise.reject(new Error('Formato de imagen no admitido.'));
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
      return { status: info.status, message: 'Procesando imagen… esto puede tardar unos segundos', percent: 92 };
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

  /** Coalesce repetitive model events before updating the UI. */
  handleModelProgress(info) {
    if (!this.progressHandler) return;
    const mapped = this.mapProgress(info);
    if (!mapped) return;

    const key = `${mapped.status}:${mapped.percent}:${mapped.message}`;
    const now = Date.now();
    const hasUsefulProgress = Number.isFinite(info?.progress);
    if (key === this.lastProgressKey && (!hasUsefulProgress || now - this.lastProgressAt < 250)) return;

    this.lastProgressKey = key;
    this.lastProgressAt = now;
    this.pendingProgress = mapped;
    if (this.progressFrame !== null) return;

    const flush = () => {
      this.progressFrame = null;
      const progress = this.pendingProgress;
      this.pendingProgress = null;
      if (progress && this.progressHandler) this.progressHandler(progress);
    };
    this.progressFrame = typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame(flush)
      : setTimeout(flush, 0);
  }

  emitProgress(status, message, percent) {
    if (this.progressHandler) {
      this.lastProgressKey = null;
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
    console.error('[BackgroundRemoval] Error original:', message);

    if (/Failed to fetch|NetworkError|ERR_NETWORK|importing a module script failed|dynamically imported module|fetch dynamically imported module/i.test(message)) {
      return this.createUserError('No se pudo cargar el modelo de IA desde internet. Verifica tu conexión y que no haya bloqueadores de anuncios activos.');
    }

    if (/CORS|tainted|SecurityError|cross-origin/i.test(message)) {
      return this.createUserError('La imagen remota no permite su lectura (CORS). Sube el archivo desde tu equipo o usa otra URL.');
    }

    if (/memory|out of bounds|allocation|WebAssembly/i.test(message)) {
      return this.createUserError('No hay memoria suficiente para procesar esta imagen. Cierra otras pestañas o usa una imagen más pequeña (máximo 1024px).');
    }

    if (/timeout|tardó demasiado/i.test(message)) {
      return this.createUserError('La operación excedió el tiempo límite. El modelo de IA pesa 219 MB y requiere buena conexión. Intenta con una imagen más pequeña.');
    }

    if (/WebGPU|shader|device lost|adapter/i.test(message)) {
      return this.createUserError('La GPU no pudo ejecutar el modelo. Recarga la página para reintentar con CPU/WASM.');
    }

    return this.createUserError(`No se pudo quitar el fondo: ${message}`);
  }

  /**
   * Release the model and its memory.
   */
  dispose() {
    if (this.progressFrame !== null) {
      if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this.progressFrame);
      else clearTimeout(this.progressFrame);
      this.progressFrame = null;
    }
    this.pendingProgress = null;
    if (this.worker) this.worker.terminate();
    this.worker = null;
    for (const request of this.workerRequests.values()) request.reject(new Error('Procesamiento cancelado.'));
    this.workerRequests.clear();
    this.modelLoaded = false;
  }
};
