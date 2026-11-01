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
    this.size = config.size || 'small';
    this.width = config.width || 384;
    this.height = config.height || 384;
    this.steps = config.steps || 3;
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

  async load(onProgress) {
    const emit = (status, message, percent) => {
      if (typeof onProgress === 'function') {
        onProgress({ status, message, percent });
      }
    };

    if (!this.module) {
      this.module = await import(/* webpackIgnore: true */ this.moduleUrl);
    }

    if (!this.module || typeof this.module.ImageGenerator !== 'function') {
      const err = this.createUserError(
        'El módulo de generación de imágenes no se cargó correctamente o no exporta ImageGenerator. Verifica tu conexión a internet e intenta de nuevo.'
      );
      throw err;
    }

    if (!this.generator) {
      const options = {
        size: this.size,
        width: this.width,
        height: this.height,
        steps: this.steps,
        onProgress: info => this.mapProgress(info, emit)
      };
      if (this.device && this.device !== 'auto') options.device = this.device;
      try {
        this.generator = new this.module.ImageGenerator(options);
      } catch (constructError) {
        const err = this.createUserError(
          'No se pudo iniciar el generador de imágenes. El módulo podría requerir una clave de API o no estar disponible en tu región.'
        );
        err.originalError = constructError;
        throw err;
      }
      await this.generator.load();
    }
  }

  async runGeneration(prompt, onProgress) {
    const emit = (status, message, percent) => {
      if (typeof onProgress === 'function') {
        onProgress({ status, message, percent });
      }
    };

    // Timeout de 600 segundos (10 minutos) para descargar 3.5 GB del modelo
    const timeout = 600000;
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('La descarga del modelo de IA tardó demasiado. Verifica tu conexión a internet (el modelo pesa ~3.5 GB).')), timeout);
    });

    emit('engine', 'Cargando el generador de imágenes…', 0);

    if (!this.module) {
      this.module = await Promise.race([
        import(/* webpackIgnore: true */ this.moduleUrl),
        timeoutPromise
      ]);
    }

    if (!this.generator) {
      emit('model', 'Descargando el modelo de IA (~3.5 GB)…', 5);

      if (!this.module || typeof this.module.ImageGenerator !== 'function') {
        const err = this.createUserError(
          'El módulo de generación de imágenes no se cargó correctamente. Verifica tu conexión a internet e intenta de nuevo.'
        );
        throw err;
      }

      const options = {
        size: this.size,
        width: this.width,
        height: this.height,
        steps: this.steps,
        onProgress: info => this.mapProgress(info, emit)
      };
      if (this.device && this.device !== 'auto') options.device = this.device;

      try {
        this.generator = new this.module.ImageGenerator(options);
      } catch (constructError) {
        const err = this.createUserError(
          'No se pudo iniciar el generador de imágenes. El módulo podría requerir una clave de API o no estar disponible en tu región.'
        );
        err.originalError = constructError;
        throw err;
      }
      await Promise.race([
        this.generator.load(),
        timeoutPromise
      ]);
    }

    emit('processing', 'Creando la imagen…', 90);
    const result = await Promise.race([
      this.generator.generate(prompt, {
        width: this.width,
        height: this.height,
        steps: this.steps
      }),
      timeoutPromise
    ]);
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
