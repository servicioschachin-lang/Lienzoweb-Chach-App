/**
 * ImageGenerationService
 * Single Responsibility: Lazy-load runonweb/image, generate a local image and
 * return it as a Blob for insertion into the canvas.
 */
window.CanvasApp = window.CanvasApp || {};

window.CanvasApp.ImageGenerationService = class ImageGenerationService {
  constructor({ moduleUrl, device } = {}) {
    const config = window.CanvasApp.Config.IMAGE_GENERATION;

    this.moduleUrl = moduleUrl || config.moduleUrl;
    this.device = device || config.device;
    this.module = null;
    this.generator = null;
    this.queue = Promise.resolve();
  }

  generate(prompt, { onProgress } = {}) {
    const cleanPrompt = String(prompt || '').trim();
    if (!cleanPrompt) {
      return Promise.reject(this.createUserError('Describe la imagen que quieres crear.'));
    }

    const run = () => this.runGeneration(cleanPrompt, onProgress);
    const task = this.queue.then(run, run).catch(error => {
      throw this.toUserError(error);
    });

    this.queue = task.catch(() => {});
    return task;
  }

  async runGeneration(prompt, onProgress) {
    const emit = (status, message, percent) => {
      if (typeof onProgress === 'function') {
        onProgress({ status, message, percent });
      }
    };

    emit('engine', 'Cargando el generador de imágenes…', 0);

    if (!this.module) {
      this.module = await import(/* webpackIgnore: true */ this.moduleUrl);
    }

    if (!this.generator) {
      emit('model', 'Descargando el modelo de IA…', 5);
      const options = { onProgress: info => this.mapProgress(info, emit) };
      if (this.device) options.device = this.device;

      this.generator = new this.module.ImageGenerator(options);
      await this.generator.load();
    }

    emit('processing', 'Creando la imagen…', 90);
    const result = await this.generator.generate(prompt);
    const image = await (result && result.image);

    if (!(image instanceof Blob)) {
      throw new Error('ImageGenerator returned an invalid image result.');
    }

    emit('done', 'Imagen creada', 100);
    return image;
  }

  mapProgress(info, emit) {
    if (!info || typeof emit !== 'function') return;

    const rawPercent = Number(info.progress);
    const percent = Number.isFinite(rawPercent)
      ? Math.max(5, Math.min(89, Math.round(rawPercent <= 1 ? rawPercent * 100 : rawPercent)))
      : 5;
    const message = info.message || info.status || 'Descargando el modelo de IA…';
    emit('model', message, percent);
  }

  createUserError(message) {
    const error = new Error(message);
    error.userMessage = message;
    return error;
  }

  toUserError(error) {
    if (error && error.userMessage) return error;

    const detail = error && (error.userMessage || error.message);
    const userError = new Error(detail || 'No se pudo generar la imagen.');
    userError.userMessage = detail || 'No se pudo generar la imagen.';
    userError.originalError = error;
    return userError;
  }
};
