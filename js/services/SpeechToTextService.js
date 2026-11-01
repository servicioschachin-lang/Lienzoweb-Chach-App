/**
 * SpeechToTextService
 * Single Responsibility: Lazily load the on-device Whisper model via runonweb/stt
 * and transcribe an audio blob into text. Audio never leaves the browser.
 */
window.CanvasApp = window.CanvasApp || {};

window.CanvasApp.SpeechToTextService = class SpeechToTextService {
  /**
   * @param {Object} [options]
   * @param {string} [options.moduleUrl] - ESM entry point for runonweb/stt
   * @param {string} [options.model] - Hugging Face model id (multilingual for Spanish)
   * @param {string|null} [options.language] - Language code, null to auto-detect
   * @param {'auto'|'wasm'|'webgpu'} [options.device]
   */
  constructor({ moduleUrl, model, language, device } = {}) {
    const config = window.CanvasApp.Config.SPEECH_TO_TEXT;

    this.moduleUrl = moduleUrl || config.moduleUrl;
    this.model = model || config.model;
    this.language = language !== undefined ? language : config.language;
    this.device = device || config.device;
    this.modelLabel = config.modelLabel || this.model;

    this.module = null;
    this.stt = null;
    this.progressHandler = null;
    this.queue = Promise.resolve();

    // Aggregate download progress. Transformers.js reports per-file and total
    // events; showing every per-file percentage makes the bar jump around.
    this.totalProgress = null;
    this.hasTotalProgress = false;
  }

  static isSupported() {
    return typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function';
  }

  get isModelLoaded() {
    return Boolean(this.stt);
  }

  /**
   * Transcribe an audio blob into text.
   * @param {Blob|File} audio - Audio blob to transcribe
   * @param {{ onProgress?: (progress: { status: string, message: string, percent: number }) => void }} [options]
   * @returns {Promise<{ text: string }>}
   */
  async transcribe(audio, { onProgress } = {}) {
    if (!SpeechToTextService.isSupported()) {
      throw this.createUserError('Este navegador no puede ejecutar el modelo de reconocimiento de voz (falta WebAssembly).');
    }

    const run = () => this.runTranscription(audio, onProgress);
    const task = this.queue.then(run, run).catch(error => {
      throw this.toUserError(error);
    });

    // Keep the chain alive after a failure, but return the real task to the caller.
    this.queue = task.catch(() => {});
    return task;
  }

  async runTranscription(audio, onProgress) {
    this.progressHandler = typeof onProgress === 'function' ? onProgress : null;
    this.emitProgress('preparing', 'Preparando el reconocedor de voz…', 0);

    try {
      if (!this.module) {
        this.emitProgress('engine', 'Cargando el motor de STT…', 0);
        this.module = await import(/* webpackIgnore: true */ this.moduleUrl);
      }

      if (!this.stt) {
        this.stt = new this.module.SpeechToText({
          model: this.model,
          device: this.device,
          // Omitir language permite la autodetección; con 'es' forzamos español.
          ...(this.language ? { language: this.language } : {}),
          onProgress: info => {
            const mapped = this.mapProgress(info);
            if (mapped && this.progressHandler) {
              this.progressHandler(mapped);
            }
          }
        });

        this.emitProgress('model', `Descargando ${this.modelLabel}…`, 0);
        this.totalProgress = 0;
        this.hasTotalProgress = false;
        await this.stt.load();
      }

      this.emitProgress('processing', 'Transcribiendo audio…', 95);
      const result = await this.stt.transcribe(audio);
      this.emitProgress('done', 'Transcripción completada', 100);
      return result;
    } catch (error) {
      console.error('[SpeechToTextService]', error);
      throw error;
    } finally {
      this.progressHandler = null;
    }
  }

  /**
   * Translate runonweb progress events into UI-friendly messages.
   */
  mapProgress(info = {}) {
    if (['loading', 'progress', 'progress_total'].includes(info.status)) {
      const hasBytes = Number.isFinite(info.loaded) && Number.isFinite(info.total) && info.total > 0;
      const filePercent = hasBytes
        ? (info.loaded / info.total) * 100
        : Number.isFinite(info.progress) ? info.progress : 0;

      if (info.status === 'progress_total' && hasBytes) {
        this.hasTotalProgress = true;
        this.totalProgress = Math.max(0, Math.min(90, Math.round(filePercent)));
      } else if (!this.hasTotalProgress) {
        // Single-file downloads never emit progress_total.
        this.totalProgress = Math.max(0, Math.min(90, Math.round(filePercent)));
      }

      const percent = this.totalProgress ?? 0;
      const detail = hasBytes
        ? ` (${this.formatMegabytes(info.loaded)} / ${this.formatMegabytes(info.total)} MB)`
        : '';

      return {
        status: info.status,
        message: `Descargando ${this.modelLabel}… ${percent}%${detail}`,
        percent
      };
    }

    if (info.status === 'processing' || info.status === 'transcribing') {
      return { status: 'processing', message: 'Transcribiendo audio…', percent: 95 };
    }

    if (info.status === 'ready') {
      return { status: 'ready', message: 'Modelo listo. Transcribiendo…', percent: 95 };
    }

    // Transformers.js also reports `done` when each model file finishes
    // downloading. The service emits the real completion after transcribe().
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

  /**
   * Turn low-level model/runtime errors into actionable Spanish messages.
   */
  toUserError(error) {
    if (error && error.userMessage) return error;

    const message = error instanceof Error ? error.message : String(error);

    if (/English-only model/i.test(message)) {
      return this.createUserError('El modelo de voz configurado solo admite inglés. Cambia a un modelo multilingüe como onnx-community/whisper-base.');
    }

    if (/Failed to fetch|NetworkError|ERR_NETWORK|importing a module script failed|dynamically imported module|fetch dynamically imported module/i.test(message)) {
      return this.createUserError('No se pudo descargar el modelo de voz. Revisa tu conexión a internet e inténtalo de nuevo.');
    }

    if (/quota|storage|Cache API|QuotaExceeded/i.test(message)) {
      return this.createUserError('El navegador no pudo guardar el modelo de voz. Libera espacio de almacenamiento e inténtalo de nuevo.');
    }

    if (/decodeAudioData|Unable to decode|AudioContext|audio data/i.test(message)) {
      return this.createUserError('No se pudo leer el audio grabado. Intenta dictar de nuevo.');
    }

    if (/WebGPU|shader|device lost|adapter/i.test(message)) {
      return this.createUserError('La GPU no pudo ejecutar el modelo de voz. Recarga la página para reintentar con CPU/WASM.');
    }

    return this.createUserError('No se pudo transcribir el audio. Inténtalo de nuevo.');
  }

  /**
   * Release the model and its memory.
   */
  dispose() {
    if (this.stt && typeof this.stt.dispose === 'function') {
      this.stt.dispose();
    }
    this.stt = null;
    this.module = null;
  }
};
