/**
 * PropertiesPanel
 * Single Responsibility: Render inspector form controls and manage two-way binding
 * for the currently selected canvas element.
 */
window.CanvasApp = window.CanvasApp || {};

window.CanvasApp.PropertiesPanel = class PropertiesPanel {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.container
   * @param {StateManager} options.stateManager
   * @param {EventBus} options.eventBus
   * @param {NotificationService} options.notificationService
   */
  constructor({ container, stateManager, eventBus, notificationService, backgroundRemoval, speechToText }) {
    this.container = container;
    this.state = stateManager;
    this.eventBus = eventBus;
    this.notifications = notificationService;
    this.backgroundRemoval = backgroundRemoval;
    this.speechToText = speechToText;
    this.removingId = null;

    // Dictation state
    this.recordingId = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.stream = null;

    this.bindEvents();
    this.render();
  }

  bindEvents() {
    this.eventBus.on('selection:changed', () => this.render());
    this.eventBus.on('drag:moved', ({ x, y }) => this.updateCoordinatesDisplay(x, y));
  }

  /**
   * Update x/y input values during drag without rebuilding DOM
   */
  updateCoordinatesDisplay(x, y) {
    const xInput = this.container.querySelector('[data-prop="x"]');
    const yInput = this.container.querySelector('[data-prop="y"]');
    if (xInput) xInput.value = x;
    if (yInput) yInput.value = y;
  }

  render() {
    const el = this.state.getSelectedElement();
    if (!el) {
      this.renderEmptyState();
      return;
    }

    const { escapeHtml } = window.CanvasApp.Helpers;

    let html = `
      <div class="prop-group">
        <div class="prop-title">
          <span>Editar elemento</span>
          <span class="small">#${el.id} (${escapeHtml(el.type)})</span>
        </div>
        <div class="mini-actions">
          <button id="propDup" title="Duplicar elemento">⧉ Duplicar</button>
          <button id="propFront" title="Traer al frente">↑ Adelante</button>
          <button id="propDelete" title="Eliminar elemento">⌫ Borrar</button>
        </div>
      </div>
    `;

    // Text content field
    if (['text', 'button', 'social', 'spacer', 'shape', 'audio'].includes(el.type)) {
      const isRecording = this.recordingId === el.id;
      const speechModelLabel = window.CanvasApp.Config.SPEECH_TO_TEXT.modelLabel;
      html += `
        <div class="prop-group">
          <div class="prop-title">Contenido</div>
          <div class="field">
            <label>Texto</label>
            <div class="dictation-wrap">
              <textarea data-prop="text">${escapeHtml(el.text || '')}</textarea>
              <button type="button" id="propDictate" class="dictate-btn${isRecording ? ' recording' : ''}" title="${isRecording ? 'Detener dictado' : 'Dictar por voz'}">
                ${isRecording ? '⏹' : '🎤'}
              </button>
            </div>
            <p class="field-hint">Dictado con IA local (${escapeHtml(speechModelLabel)}). La primera vez descarga el modelo.</p>
          </div>
        </div>
      `;
    }

    // Media fields
    if (['image', 'video', 'audio'].includes(el.type)) {
      const acceptType = el.type === 'image' ? 'image/*' : el.type === 'video' ? 'video/*' : 'audio/*';
      html += `
        <div class="prop-group">
          <div class="prop-title">Medios</div>
          ${this.createInputField('URL del archivo', 'src', el.src || '', 'url')}
          <div class="field">
            <label>O subir archivo local</label>
            <input type="file" id="propFile" accept="${acceptType}">
          </div>
        </div>
      `;
    // Image crop controls
    if (el.type === 'image') {
      const crop = el.crop || { enabled: false, x: 0, y: 0, w: null, h: null, ratio: 'libre' };
      const ratios = [
        { value: 'libre', label: 'Libre' },
        { value: '1:1', label: '1:1 (Cuadrado)' },
        { value: '16:9', label: '16:9 (Paisaje)' },
        { value: '4:3', label: '4:3' },
        { value: '3:2', label: '3:2' },
        { value: '9:16', label: '9:16 (Retrato)' }
      ];
      const ratioOptions = ratios.map(r => `<option value="${r.value}" ${crop.ratio === r.value ? 'selected' : ''}>${r.label}</option>`).join('');
      const cropDisabled = !crop.enabled ? 'display:none' : '';
      html += `
        <div class="prop-group">
          <div class="prop-title">Recortar imagen</div>
          <div class="field">
            <label>Habilitar recorte</label>
            <label class="toggle-switch">
              <input type="checkbox" id="propCropEnabled" ${crop.enabled ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="field" id="propCropRatioField" style="${cropDisabled}">
            <label>Formato de recorte</label>
            <select id="propCropRatio">${ratioOptions}</select>
          </div>
          <div class="crop-fields" id="propCropFields" style="${cropDisabled}">
            <div class="field">
              <label>Offset X (px)</label>
              <input type="number" id="propCropX" value="${crop.x || 0}" min="0">
            </div>
            <div class="field">
              <label>Offset Y (px)</label>
              <input type="number" id="propCropY" value="${crop.y || 0}" min="0">
            </div>
            <div class="field">
              <label>Ancho recorte (px)</label>
              <input type="number" id="propCropW" value="${crop.w || ''}" min="0" placeholder="auto">
            </div>
            <div class="field">
              <label>Alto recorte (px)</label>
              <input type="number" id="propCropH" value="${crop.h || ''}" min="0" placeholder="auto">
            </div>
          </div>
        </div>
      `;
    }
    }

    // Links
    if (['button', 'social'].includes(el.type)) {
      html += `
        <div class="prop-group">
          <div class="prop-title">Enlace</div>
          ${this.createInputField('URL destino', 'href', el.href || '#', 'url')}
        </div>
      `;
    }

    // Social networks selection
    if (el.type === 'social') {
      html += `
        <div class="prop-group">
          <div class="prop-title">Redes Sociales</div>
          <div class="field">
            <label>Selecciona las redes a mostrar</label>
            <div class="social-networks-grid">
              <label class="social-checkbox">
                <input type="checkbox" data-social="facebook" ${el.networks?.includes('facebook') ? 'checked' : ''}>
                <span>Facebook</span>
              </label>
              <label class="social-checkbox">
                <input type="checkbox" data-social="twitter" ${el.networks?.includes('twitter') ? 'checked' : ''}>
                <span>Twitter/X</span>
              </label>
              <label class="social-checkbox">
                <input type="checkbox" data-social="instagram" ${el.networks?.includes('instagram') ? 'checked' : ''}>
                <span>Instagram</span>
              </label>
              <label class="social-checkbox">
                <input type="checkbox" data-social="youtube" ${el.networks?.includes('youtube') ? 'checked' : ''}>
                <span>YouTube</span>
              </label>
              <label class="social-checkbox">
                <input type="checkbox" data-social="linkedin" ${el.networks?.includes('linkedin') ? 'checked' : ''}>
                <span>LinkedIn</span>
              </label>
              <label class="social-checkbox">
                <input type="checkbox" data-social="tiktok" ${el.networks?.includes('tiktok') ? 'checked' : ''}>
                <span>TikTok</span>
              </label>
              <label class="social-checkbox">
                <input type="checkbox" data-social="pinterest" ${el.networks?.includes('pinterest') ? 'checked' : ''}>
                <span>Pinterest</span>
              </label>
              <label class="social-checkbox">
                <input type="checkbox" data-social="whatsapp" ${el.networks?.includes('whatsapp') ? 'checked' : ''}>
                <span>WhatsApp</span>
              </label>
              <label class="social-checkbox">
                <input type="checkbox" data-social="telegram" ${el.networks?.includes('telegram') ? 'checked' : ''}>
                <span>Telegram</span>
              </label>
              <label class="social-checkbox">
                <input type="checkbox" data-social="github" ${el.networks?.includes('github') ? 'checked' : ''}>
                <span>GitHub</span>
              </label>
              <label class="social-checkbox">
                <input type="checkbox" data-social="discord" ${el.networks?.includes('discord') ? 'checked' : ''}>
                <span>Discord</span>
              </label>
              <label class="social-checkbox">
                <input type="checkbox" data-social="snapchat" ${el.networks?.includes('snapchat') ? 'checked' : ''}>
                <span>Snapchat</span>
              </label>
            </div>
          </div>
        </div>
      `;
    }

    // Shape geometry
    if (el.type === 'shape') {
      html += `
        <div class="prop-group">
          <div class="prop-title">Forma</div>
          <div class="field">
            <label>Geometría</label>
            <select data-prop="shape">
              <option value="rounded" ${el.shape === 'rounded' ? 'selected' : ''}>Rectángulo redondeado</option>
              <option value="square" ${el.shape === 'square' ? 'selected' : ''}>Cuadrado</option>
              <option value="circle" ${el.shape === 'circle' ? 'selected' : ''}>Círculo</option>
              <option value="triangle" ${el.shape === 'triangle' ? 'selected' : ''}>Triángulo</option>
              <option value="star" ${el.shape === 'star' ? 'selected' : ''}>Estrella</option>
              <option value="diamond" ${el.shape === 'diamond' ? 'selected' : ''}>Rombo</option>
              <option value="hexagon" ${el.shape === 'hexagon' ? 'selected' : ''}>Hexágono</option>
              <option value="octagon" ${el.shape === 'octagon' ? 'selected' : ''}>Octágono</option>
              <option value="oval" ${el.shape === 'oval' ? 'selected' : ''}>Óvalo</option>
              <option value="pentagon" ${el.shape === 'pentagon' ? 'selected' : ''}>Pentágono</option>
              <option value="parallelogram" ${el.shape === 'parallelogram' ? 'selected' : ''}>Paralelogramo</option>
              <option value="trapezoid" ${el.shape === 'trapezoid' ? 'selected' : ''}>Trapecio</option>
            </select>
          </div>
        </div>
      `;
    }

    // General Appearance
    const swatchBg = /^#[0-9a-f]{6}$/i.test(el.bg || '') ? el.bg : '#ffffff';

    html += `
      <div class="prop-group">
        <div class="prop-title">Dimensiones y Posición</div>
        <div class="two">
          ${this.createInputField('Ancho (px)', 'w', el.w, 'number')}
          ${this.createInputField('Alto (px)', 'h', el.h, 'number')}
        </div>
        <div class="two">
          ${this.createInputField('Posición X', 'x', el.x, 'number')}
          ${this.createInputField('Posición Y', 'y', el.y, 'number')}
        </div>
      </div>

      <div class="prop-group">
        <div class="prop-title">Estilos Visuales</div>
        <div class="two">
          ${this.createInputField('Color texto', 'color', el.color || '#202238', 'color')}
          ${this.createInputField('Color fondo', 'bg', swatchBg, 'color')}
        </div>
        ${this.createInputField('Tamaño de texto (px)', 'fontSize', el.fontSize || 14, 'number')}
        <div class="field">
          <label>Tipografía</label>
          <select id="propFontFamily" data-prop="fontFamily">
            <option value="DM Sans" ${el.fontFamily === 'DM Sans' ? 'selected' : ''}>DM Sans</option>
            <option value="Space Grotesk" ${el.fontFamily === 'Space Grotesk' ? 'selected' : ''}>Space Grotesk</option>
            <option value="Arial" ${el.fontFamily === 'Arial' ? 'selected' : ''}>Arial</option>
            <option value="Helvetica" ${el.fontFamily === 'Helvetica' ? 'selected' : ''}>Helvetica</option>
            <option value="Georgia" ${el.fontFamily === 'Georgia' ? 'selected' : ''}>Georgia</option>
            <option value="Times New Roman" ${el.fontFamily === 'Times New Roman' ? 'selected' : ''}>Times New Roman</option>
            <option value="Courier New" ${el.fontFamily === 'Courier New' ? 'selected' : ''}>Courier New</option>
            <option value="Verdana" ${el.fontFamily === 'Verdana' ? 'selected' : ''}>Verdana</option>
            <option value="Trebuchet MS" ${el.fontFamily === 'Trebuchet MS' ? 'selected' : ''}>Trebuchet MS</option>
            <option value="Comic Sans MS" ${el.fontFamily === 'Comic Sans MS' ? 'selected' : ''}>Comic Sans MS</option>
            <option value="Impact" ${el.fontFamily === 'Impact' ? 'selected' : ''}>Impact</option>
            <option value="Tahoma" ${el.fontFamily === 'Tahoma' ? 'selected' : ''}>Tahoma</option>
            <option value="Palatino" ${el.fontFamily === 'Palatino' ? 'selected' : ''}>Palatino</option>
            <option value="Garamond" ${el.fontFamily === 'Garamond' ? 'selected' : ''}>Garamond</option>
          </select>
        </div>
        ${this.createInputField('Radio de borde (px)', 'radius', el.radius || 0, 'number')}
        <div class="field">
          <label>Opacidad</label>
          <input data-prop="opacity" type="range" min="0.1" max="1" step="0.05" value="${el.opacity ?? 1}">
        </div>
      </div>
    `;

    // Image fit + background removal
    if (el.type === 'image') {
      const modelLabel = window.CanvasApp.Config.BACKGROUND_REMOVAL.modelLabel;
      const hasOriginal = Boolean(el.bgRemoved && el.originalSrc);

      html += `
        <div class="prop-group">
          <div class="prop-title">Ajuste de Imagen</div>
          <div class="field">
            <label>Modo de ajuste</label>
            <select data-prop="fit">
              <option value="cover" ${el.fit === 'cover' ? 'selected' : ''}>Cubrir (cover)</option>
              <option value="contain" ${el.fit === 'contain' ? 'selected' : ''}>Contener (contain)</option>
            </select>
          </div>
        </div>

        <div class="prop-group">
          <div class="prop-title">
            <span>Fondo</span>
            ${el.bgRemoved ? '<span class="badge">PNG transparente</span>' : ''}
          </div>
          <button class="btn ai-btn" id="propRemoveBg" ${el.src ? '' : 'disabled'}>
            ✂ ${el.bgRemoved ? 'Volver a quitar el fondo' : 'Quitar fondo con IA'}
          </button>
          <p class="field-hint">
            Se procesa en tu navegador con ${escapeHtml(modelLabel)}; la imagen no se sube a ningún servidor.
            La primera vez descarga el modelo y luego queda en caché.
          </p>
          ${hasOriginal ? '<button class="btn restore-btn" id="propRestoreBg">↺ Restaurar imagen original</button>' : ''}
          <div class="bg-inline-progress hidden" id="propBgProgress">
            <span>Preparando IA…</span>
            <div><i></i></div>
          </div>
        </div>
      `;
    }

    this.container.innerHTML = html;
    this.attachFormListeners(el);
    this.bindDictationEvents(el);
  }

  renderEmptyState() {
    this.container.innerHTML = `
      <div class="props-empty">
        <div class="big">✳</div>
        <strong>Selecciona un elemento</strong><br>
        Haz clic en cualquier objeto del lienzo para editar texto, color, tamaño, posición, enlaces y más.
      </div>
    `;
  }

  createInputField(label, key, value, type = 'text', extra = '') {
    const { escapeHtml } = window.CanvasApp.Helpers;
    return `
      <div class="field">
        <label>${label}</label>
        <input data-prop="${key}" type="${type}" value="${escapeHtml(value ?? '')}" ${extra}>
      </div>
    `;
  }

  attachFormListeners(el) {
    // Action buttons
    const dupBtn = this.container.querySelector('#propDup');
    const delBtn = this.container.querySelector('#propDelete');
    const frontBtn = this.container.querySelector('#propFront');
    const fileInput = this.container.querySelector('#propFile');
    const removeBgBtn = this.container.querySelector('#propRemoveBg');
    const restoreBgBtn = this.container.querySelector('#propRestoreBg');

    if (dupBtn) dupBtn.onclick = () => this.state.duplicateSelected();
    if (delBtn) delBtn.onclick = () => this.state.deleteSelected();
    if (frontBtn) frontBtn.onclick = () => this.state.bringToFront(el.id);
    if (removeBgBtn) removeBgBtn.onclick = () => this.removeBackground(el);
    if (restoreBgBtn) restoreBgBtn.onclick = () => this.restoreOriginal(el);

    if (fileInput) {
      fileInput.onchange = () => {
        const file = fileInput.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        this.state.updateElement(el.id, {
          src: url,
          bgRemoved: false,
          originalSrc: null,
          originalBg: null
        }, true);
        this.notifications.showToast('Archivo multimedia cargado');
      };
    }

    // Image crop controls
    if (el.type === 'image') {
      const cropEnabled = this.container.querySelector('#propCropEnabled');
      const cropRatio = this.container.querySelector('#propCropRatio');
      const cropX = this.container.querySelector('#propCropX');
      const cropY = this.container.querySelector('#propCropY');
      const cropW = this.container.querySelector('#propCropW');
      const cropH = this.container.querySelector('#propCropH');
      const cropRatioField = this.container.querySelector('#propCropRatioField');
      const cropFields = this.container.querySelector('#propCropFields');

      if (cropEnabled) {
        cropEnabled.onchange = () => {
          const enabled = cropEnabled.checked;
          if (cropRatioField) cropRatioField.style.display = enabled ? '' : 'none';
          if (cropFields) cropFields.style.display = enabled ? '' : 'none';
          this.state.updateElement(el.id, {
            crop: { ...(el.crop || {}), enabled }
          }, true);
        };
      }

      if (cropRatio) {
        cropRatio.onchange = () => {
          this.state.updateElement(el.id, {
            crop: { ...(el.crop || {}), ratio: cropRatio.value }
          }, true);
        };
      }

      const makeCropHandler = (key) => (input) => {
        return () => {
          const val = input.value === '' ? null : Number(input.value);
          this.state.updateElement(el.id, {
            crop: { ...(el.crop || {}), [key]: val }
          }, false);
        };
      };

      if (cropX) cropX.oninput = makeCropHandler('x')(cropX);
      if (cropY) cropY.oninput = makeCropHandler('y')(cropY);
      if (cropW) cropW.oninput = makeCropHandler('w')(cropW);
      if (cropH) cropH.oninput = makeCropHandler('h')(cropH);
    }

    // Social networks checkboxes
    // Social networks checkboxes
    if (el.type === 'social') {
      const socialCheckboxes = this.container.querySelectorAll('[data-social]');
      socialCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
          const networks = [];
          socialCheckboxes.forEach(cb => {
            if (cb.checked) {
              networks.push(cb.dataset.social);
            }
          });
          this.state.updateElement(el.id, { networks }, true);
        });
      });
    }

    // Property inputs
    this.container.querySelectorAll('[data-prop]').forEach(input => {
      const propKey = input.dataset.prop;

      const handleInput = (isFinal = false) => {
        let val = input.value;
        const numericProps = ['w', 'h', 'x', 'y', 'fontSize', 'radius', 'opacity'];
        if (numericProps.includes(propKey)) {
          val = Number(val);
        }

        // Apply change to state
        this.state.updateElement(el.id, { [propKey]: val }, isFinal);
      };

      // Live updates while typing/sliding
      input.addEventListener('input', () => {
        handleInput(false);
      });

      // Snapshot when change is finalized (e.g., blur or release)
      input.addEventListener('change', () => {
        handleInput(true);
      });
    });
  }

  /**
   * Remove the background of the selected image on-device and replace its src.
   * Keeps the original src so the user can undo the change.
   */
  async removeBackground(el) {
    if (!this.backgroundRemoval) return;

    if (!el.src) {
      this.notifications.showToast('Primero sube una imagen o indica una URL');
      return;
    }

    if (this.removingId !== null) {
      this.notifications.showToast('Ya hay un recorte de fondo en curso');
      return;
    }

    const button = this.container.querySelector('#propRemoveBg');
    const progressEl = this.container.querySelector('#propBgProgress');

    this.removingId = el.id;

    if (button) {
      button.disabled = true;
      button.innerHTML = '<span class="spinner"></span>Quitando fondo…';
    }

    if (progressEl) {
      progressEl.classList.remove('hidden');
    }

    const updateProgress = ({ message, percent }) => {
      this.notifications.showProgress(message, percent);

      if (!progressEl) return;
      const label = progressEl.querySelector('span');
      const fill = progressEl.querySelector('i');
      if (label) label.textContent = message;
      if (fill) fill.style.width = `${Math.max(0, Math.min(100, Math.round(percent)))}%`;
    };

    this.notifications.showProgress('Preparando IA…', 0);

    try {
      const png = await this.backgroundRemoval.remove(el.src, { onProgress: updateProgress });
      const current = this.state.getElementById(el.id);

      if (!current) return;

      const pngUrl = URL.createObjectURL(png);
      const originalSrc = current.bgRemoved && current.originalSrc ? current.originalSrc : current.src;
      const originalBg = current.bgRemoved && current.originalBg !== undefined
        ? current.originalBg
        : current.bg;

      this.state.updateElement(el.id, {
        src: pngUrl,
        bg: 'transparent',
        bgRemoved: true,
        originalSrc,
        originalBg
      }, true);

      this.notifications.showToast('Fondo eliminado: PNG transparente aplicado');

      if (this.state.getSelectedId() === el.id) {
        this.render();
      }
    } catch (error) {
      this.notifications.showToast(error.userMessage || 'No se pudo quitar el fondo');

      if (button && button.isConnected) {
        button.disabled = false;
        button.innerHTML = '✂ Quitar fondo con IA';
      }

      if (progressEl) {
        progressEl.classList.add('hidden');
      }
    } finally {
      this.removingId = null;
      this.notifications.hideProgress();
    }
  }

  /**
   * Restore the image src and background color from before the AI removal.
   */
  restoreOriginal(el) {
    if (!el.originalSrc) return;

    this.state.updateElement(el.id, {
      src: el.originalSrc,
      bg: el.originalBg ?? '#eeeeee',
      bgRemoved: false,
      originalSrc: null,
      originalBg: null
    }, true);

    this.notifications.showToast('Imagen original restaurada');

    if (this.state.getSelectedId() === el.id) {
      this.render();
    }
  }

  /**
   * Wire up the dictate button after the HTML has been inserted into the DOM.
   */
  bindDictationEvents(el) {
    const btn = this.container.querySelector('#propDictate');
    if (!btn) return;

    btn.replaceWith(btn.cloneNode(true));
    const newBtn = this.container.querySelector('#propDictate');
    newBtn.addEventListener('click', () => {
      this.toggleDictation(el).catch(error => {
        console.error('[PropertiesPanel] Error en dictado:', error);
        this.notifications.hideProgress();
        this.notifications.showToast(error.userMessage || 'No se pudo completar el dictado por voz');
      });
    });
  }

  /**
   * Start or stop voice dictation for the given element.
   * When starting: request mic access, record audio chunks.
   * When stopping: transcribe the recorded blob via runonweb/stt and write the text.
   */
  async toggleDictation(el) {
    if (!this.speechToText) {
      this.notifications.showToast('Servicio de reconocimiento de voz no disponible');
      return;
    }

    if (this.recordingId === el.id) {
      await this.stopDictationAndTranscribe();
      return;
    }

    // If another element is recording, stop it first
    if (this.recordingId !== null) {
      await this.stopDictationAndTranscribe();
    }

    await this.startDictation(el);
  }

  async startDictation(el) {
    if (!window.CanvasApp.SpeechToTextService.isSupported()) {
      this.notifications.showToast('Este navegador no puede ejecutar el modelo de reconocimiento de voz (falta WebAssembly).');
      return;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(this.stream);
    } catch (error) {
      console.error('[PropertiesPanel] No se pudo iniciar el micrófono:', error);
      this.stopStream();
      this.mediaRecorder = null;
      const denied = error && (error.name === 'NotAllowedError' || error.name === 'SecurityError');
      this.notifications.showToast(
        denied
          ? 'Permiso de micrófono denegado. Actívalo en el navegador para usar el dictado por voz.'
          : 'No se pudo acceder al micrófono. Comprueba que esté disponible y concede permiso.'
      );
      return;
    }

    this.audioChunks = [];

    this.mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) this.audioChunks.push(e.data);
    };

    this.mediaRecorder.onstop = () => this.stopStream();

    try {
      this.mediaRecorder.start();
    } catch (error) {
      console.error('[PropertiesPanel] No se pudo iniciar la grabación:', error);
      this.mediaRecorder = null;
      this.stopStream();
      this.notifications.showToast('No se pudo iniciar la grabación de audio. Inténtalo de nuevo.');
      return;
    }

    this.recordingId = el.id;

    const btn = this.container.querySelector('#propDictate');
    if (btn) {
      btn.classList.add('recording');
      btn.textContent = '⏹';
      btn.title = 'Detener dictado';
    }

    this.notifications.showToast('Escuchando… haz clic de nuevo para detener y transcribir');

    // Re-render to reflect recording state on the selected element
    this.render();
  }

  stopStream() {
    if (!this.stream) return;
    this.stream.getTracks().forEach(track => track.stop());
    this.stream = null;
  }

  async stopDictationAndTranscribe() {
    if (!this.mediaRecorder || this.recordingId === null) return;

    const elId = this.recordingId;
    const recorder = this.mediaRecorder;
    const btn = this.container.querySelector('#propDictate');
    if (btn) {
      btn.classList.remove('recording');
      btn.textContent = '🎤';
      btn.title = 'Dictar por voz';
    }

    this.recordingId = null;

    return new Promise(resolve => {
      recorder.onstop = async () => {
        this.stopStream();

        try {
          // Read the chunks synchronously so a new recording cannot clear them.
          const audioBlob = new Blob(this.audioChunks, { type: recorder.mimeType || 'audio/webm' });
          this.audioChunks = [];
          if (this.mediaRecorder === recorder) this.mediaRecorder = null;

          if (audioBlob.size === 0) {
            this.notifications.showToast('No se grabó audio. Inténtalo de nuevo manteniendo el dictado unos segundos.');
            resolve();
            return;
          }

          this.notifications.showProgress('Transcribiendo audio…', 0);

          const result = await this.speechToText.transcribe(audioBlob, {
            onProgress: ({ message, percent }) => {
              this.notifications.showProgress(message, percent);
            }
          });

          this.notifications.hideProgress();

          if (result && result.text) {
            const current = this.state.getElementById(elId);
            if (current) {
              const newText = current.text ? `${current.text} ${result.text}` : result.text;
              this.state.updateElement(elId, { text: newText }, true);
              this.notifications.showToast('Texto dictado: ' + result.text);
              if (this.state.getSelectedId() === elId) {
                this.render();
              }
            }
          } else {
            this.notifications.showToast('No se detectó voz en la grabación. Inténtalo de nuevo.');
          }
          resolve();
        } catch (error) {
          console.error('[PropertiesPanel] Error al transcribir:', error);
          this.notifications.hideProgress();
          this.notifications.showToast(error.userMessage || 'No se pudo transcribir el audio');
          resolve();
        }
      };

      try {
        recorder.stop();
      } catch (error) {
        console.error('[PropertiesPanel] No se pudo detener la grabación:', error);
        if (this.mediaRecorder === recorder) this.mediaRecorder = null;
        this.stopStream();
        this.notifications.hideProgress();
        this.notifications.showToast('No se pudo detener la grabación. Inténtalo de nuevo.');
        resolve();
      }
    });
  }
};




