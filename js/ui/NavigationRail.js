/**
 * NavigationRail
 * Single Responsibility: Manage left sidebar navigation tabs, tool search filtering,
 * panel collapse/expand states, and responsive mobile drawers.
 */
window.CanvasApp = window.CanvasApp || {};

window.CanvasApp.NavigationRail = class NavigationRail {
  /**
   * @param {Object} options
   * @param {StateManager} options.stateManager
   * @param {TemplateService} options.templateService
   * @param {NotificationService} options.notificationService
   * @param {HTMLElement} options.canvas
   */
  constructor({ stateManager, templateService, notificationService, canvas, backgroundRemoval, imageGeneration }) {
    this.state = stateManager;
    this.templates = templateService;
    this.notifications = notificationService;
    this.canvas = canvas;
    this.backgroundRemoval = backgroundRemoval;
    this.imageGeneration = imageGeneration;

    this.panelTitles = {
      elements: 'Elementos',
      templates: 'Plantillas',
      uploads: 'Subir archivos',
      imageAi: 'Imagen con IA',
      layers: 'Capas'
    };

    this.init();
  }

  init() {
    this.bindTabSwitching();
    this.bindPanelToggles();
    this.bindToolSearch();
    this.bindBackgroundControls();
    this.bindUploadHandlers();
    this.bindImageGeneration();
    this.bindAddElements();
    this.bindPresetButtons();
  }

  bindTabSwitching() {
    const railButtons = document.querySelectorAll('.rail [data-panel]');
    railButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const panelName = btn.dataset.panel;
        this.switchPanel(panelName);
      });
    });
  }

  switchPanel(name) {
    const panels = ['elements', 'templates', 'uploads', 'imageAi', 'layers'];
    panels.forEach(p => {
      const el = document.getElementById(`${p}Panel`);
      if (el) el.classList.toggle('hidden', p !== name);
    });

    const titleEl = document.getElementById('leftTitle');
    if (titleEl) {
      titleEl.textContent = this.panelTitles[name] || 'Panel';
    }

    document.querySelectorAll('.rail [data-panel]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.panel === name);
    });

    // On mobile screens, open drawer if closed
    const leftPanel = document.getElementById('leftPanel');
    if (window.innerWidth <= 760 && leftPanel) {
      leftPanel.classList.add('open');
    }
  }

  bindImageGeneration() {
    const button = document.getElementById('generateAiImage');
    const promptInput = document.getElementById('aiImagePrompt');
    const progress = document.getElementById('aiImageProgress');
    const progressLabel = document.getElementById('aiImageProgressLabel');
    const progressFill = document.getElementById('aiImageProgressFill');

    if (!button || !promptInput || !this.imageGeneration) return;

    button.addEventListener('click', async () => {
      const prompt = promptInput.value.trim();
      if (!prompt) {
        this.notifications.showToast('Escribe una descripción para generar la imagen.');
        promptInput.focus();
        return;
      }

      button.disabled = true;
      button.textContent = 'Generando…';
      progress?.classList.remove('hidden');

      try {
        const image = await this.imageGeneration.generate(prompt, {
          onProgress: ({ message, percent }) => {
            if (progressLabel) progressLabel.textContent = message;
            if (progressFill) progressFill.style.width = `${Math.max(0, Math.min(100, percent || 0))}%`;
          }
        });

        const src = URL.createObjectURL(image);
        this.state.addElement('image', { src });
        this.notifications.showToast('Imagen generada y añadida al lienzo');
      } catch (error) {
        console.error('[ImageGeneration] No se pudo generar la imagen:', error);
        this.notifications.showToast(error.userMessage || 'No se pudo generar la imagen.');
      } finally {
        button.disabled = false;
        button.textContent = '✦ Generar imagen';
        progress?.classList.add('hidden');
        if (progressFill) progressFill.style.width = '0%';
      }
    });
  }

  bindPanelToggles() {
    const toggleLeft = document.getElementById('toggleLeft');
    const toggleRight = document.getElementById('toggleRight');
    const closeLeft = document.getElementById('closeLeft');
    const closeRight = document.getElementById('closeRight');
    const leftPanel = document.getElementById('leftPanel');
    const rightPanel = document.getElementById('rightPanel');

    if (toggleLeft) {
      toggleLeft.addEventListener('click', () => {
        if (window.innerWidth <= 760) {
          leftPanel?.classList.toggle('open');
        } else {
          document.body.classList.toggle('collapse-left');
        }
      });
    }

    if (toggleRight) {
      toggleRight.addEventListener('click', () => {
        if (window.innerWidth <= 760) {
          rightPanel?.classList.toggle('open');
        } else {
          document.body.classList.toggle('collapse-right');
        }
      });
    }

    if (closeLeft) {
      closeLeft.addEventListener('click', () => {
        if (window.innerWidth <= 760) {
          leftPanel?.classList.remove('open');
        } else {
          document.body.classList.add('collapse-left');
        }
      });
    }

    if (closeRight) {
      closeRight.addEventListener('click', () => {
        if (window.innerWidth <= 760) {
          rightPanel?.classList.remove('open');
        } else {
          document.body.classList.add('collapse-right');
        }
      });
    }
  }

  bindToolSearch() {
    const searchInput = document.getElementById('toolSearch');
    if (!searchInput) return;

    searchInput.addEventListener('input', e => {
      const query = e.target.value.toLowerCase().trim();
      document.querySelectorAll('#elementsPanel [data-add]').forEach(button => {
        const match = button.innerText.toLowerCase().includes(query);
        button.classList.toggle('hidden', !match);
      });
    });
  }

  bindBackgroundControls() {
    const pageColor = document.getElementById('pageColor');
    const pageBgUrl = document.getElementById('pageBgUrl');
    const applyBg = document.getElementById('applyBg');

    if (pageColor) {
      pageColor.addEventListener('input', e => {
        this.state.setBgColor(e.target.value);
      });
    }

    if (applyBg && pageBgUrl) {
      applyBg.addEventListener('click', () => {
        const url = pageBgUrl.value.trim();
        this.state.setBgUrl(url);
        this.notifications.showToast(url ? 'Fondo de página aplicado' : 'Fondo de página restablecido');
      });
    }
  }

  bindUploadHandlers() {
    const typeLabels = { image: 'imagen', audio: 'audio', video: 'video' };

    const handleFile = (input, type) => {
      if (!input) return;

      input.addEventListener('change', async e => {
        const file = e.target.files[0];
        if (!file) return;

        input.value = '';

        const blobUrl = URL.createObjectURL(file);
        const element = this.state.addElement(type, { src: blobUrl });

        const shouldRemoveBg = type === 'image' &&
          this.backgroundRemoval &&
          document.getElementById('removeBgOnUpload')?.checked;

        if (shouldRemoveBg) {
          await this.removeElementBackground(element, file);
          return;
        }

        this.notifications.showToast(`Archivo de ${typeLabels[type] || type} añadido al lienzo`);
      });
    };

    handleFile(document.getElementById('imageFile'), 'image');
    handleFile(document.getElementById('audioFile'), 'audio');
    handleFile(document.getElementById('videoFile'), 'video');
  }

  /**
   * Run on-device background removal and replace the element image with the transparent PNG.
   * @param {Object} element - Canvas element created for the uploaded file
   * @param {Blob|File|string} source
   */
  async removeElementBackground(element, source) {
    if (!this.backgroundRemoval) return;

    this.notifications.showProgress('Preparando IA…', 0);

    try {
      const png = await this.backgroundRemoval.remove(source, {
        onProgress: ({ message, percent }) => this.notifications.showProgress(message, percent)
      });

      const current = this.state.getElementById(element.id);
      if (!current) return;

      const pngUrl = URL.createObjectURL(png);
      this.state.updateElement(element.id, {
        src: pngUrl,
        bg: 'transparent',
        bgRemoved: true,
        originalSrc: current.src,
        originalBg: current.bg
      }, true);

      this.notifications.showToast('Fondo eliminado: imagen transparente añadida');
    } catch (error) {
      this.notifications.showToast(error.userMessage || 'No se pudo quitar el fondo.');
    } finally {
      this.notifications.hideProgress();
    }
  }

  bindAddElements() {
    document.querySelectorAll('[data-add]').forEach(button => {
      button.addEventListener('click', () => {
        const type = button.dataset.add;
        this.state.addElement(type);

        if (['image', 'audio', 'video'].includes(type)) {
          this.switchPanel('uploads');
          this.notifications.showToast('Sube un archivo o añade una URL en Propiedades');
        } else {
          this.notifications.showToast('Elemento agregado. Arrástralo para posicionarlo');
        }
      });
    });
  }

  bindPresetButtons() {
    document.querySelectorAll('[data-preset]').forEach(button => {
      button.addEventListener('click', () => {
        const presetName = button.dataset.preset;
        const canvasWidth = this.canvas.clientWidth || 900;
        this.templates.applyPreset(presetName, canvasWidth);
        this.notifications.showToast('Sección prefabricada agregada al lienzo');
      });
    });
  }
};
