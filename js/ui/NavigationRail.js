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
  constructor({ stateManager, templateService, notificationService, canvas, backgroundRemoval, imageGeneration, speechToText, mediaLibrary }) {
    this.state = stateManager;
    this.templates = templateService;
    this.notifications = notificationService;
    this.canvas = canvas;
    this.backgroundRemoval = backgroundRemoval;
    this.imageGeneration = imageGeneration;
    this.speechToText = speechToText;
    this.mediaLibrary = mediaLibrary;
    this.libraryPreviewUrls = [];

    this.panelTitles = {
      elements: 'Elementos',
      templates: 'Plantillas',
      uploads: 'Subir archivos',
      imageAi: 'Imagen con IA',
      packages: 'Paquetes IA',
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
    this.bindMediaLibrary();
    this.bindImageGeneration();
    this.bindAddElements();
    this.bindPackageInstalls();
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
    const panels = ['elements', 'templates', 'uploads', 'imageAi', 'packages', 'layers'];
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
    const prepareButton = document.getElementById('prepareAiImage');

    if (!button || !promptInput || !this.imageGeneration) return;

    prepareButton?.addEventListener('click', async () => {
      prepareButton.disabled = true;
      prepareButton.textContent = 'Descargando…';
      progress?.classList.remove('hidden');

      try {
        await this.imageGeneration.load(({ message, percent }) => {
          if (progressLabel) progressLabel.textContent = message || 'Descargando el modelo de IA…';
          if (progressFill) progressFill.style.width = `${Math.max(0, Math.min(89, percent || 0))}%`;
        });
        this.notifications.showToast('IA de imágenes lista');
      } catch (error) {
        console.error('[ImageGeneration] No se pudo preparar la IA:', error);
        this.notifications.showToast(error.userMessage || 'No se pudo cargar la IA de imágenes.');
      } finally {
        prepareButton.disabled = false;
        prepareButton.textContent = 'Preparar IA antes';
        progress?.classList.add('hidden');
      }
    });

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
        this.state.addElement('image', { src, name: 'Imagen generada con IA' });
        this.saveToMediaLibrary(image, 'image', 'Imagen generada con IA');
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
    const pageBgVideo = document.getElementById('pageBgVideo');
    const applyBgVideo = document.getElementById('applyBgVideo');
    const clearBgVideo = document.getElementById('clearBgVideo');

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

    // Video de fondo del lienzo (capa detrás de los elementos)
    if (applyBgVideo && pageBgVideo) {
      applyBgVideo.addEventListener('click', () => {
        const url = pageBgVideo.value.trim();
        this.state.setBgVideo(url, { autoplay: true, loop: true, muted: true });
        this.notifications.showToast(url ? 'Video de fondo aplicado' : 'Video de fondo restablecido');
      });
    }
    if (clearBgVideo) {
      clearBgVideo.addEventListener('click', () => {
        this.state.clearBgVideo();
        pageBgVideo && (pageBgVideo.value = '');
        this.notifications.showToast('Video de fondo eliminado');
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
        const element = this.state.addElement(type, { src: blobUrl, name: file.name });
        this.saveToMediaLibrary(file, type);

        const shouldRemoveBg = type === 'image' &&
          this.backgroundRemoval &&
          document.getElementById('removeBgOnUpload')?.checked;

        if (shouldRemoveBg) {
          await this.removeElementBackground(element, file);
          return;
        }

        // Detectar transparencia automática en imágenes: si tiene canal alfa, no se asigna color de fondo
        if (type === 'image') {
          const transparent = await window.CanvasApp.Helpers?.detectImageTransparency?.(blobUrl) ?? false;
          if (transparent) {
            this.state.updateElement(element.id, { bg: 'transparent', bgRemoved: true, bgTransparent: true }, true);
            this.notifications.showToast('Fondo transparente detectado en la imagen');
          }
        }

        this.notifications.showToast(`Archivo de ${typeLabels[type] || type} añadido al lienzo`);
      });
    };

    handleFile(document.getElementById('imageFile'), 'image');
    handleFile(document.getElementById('audioFile'), 'audio');
    handleFile(document.getElementById('videoFile'), 'video');
  }

  async saveToMediaLibrary(file, type, name = file.name) {
    if (!this.mediaLibrary) return;
    try {
      await this.mediaLibrary.add(file, { type, name });
    } catch (error) {
      console.error('[MediaLibrary] No se pudo guardar el archivo:', error);
      this.notifications.showToast('El archivo se agrego al lienzo, pero no se pudo guardar en la biblioteca.');
    }
  }

  bindMediaLibrary() {
    const container = document.getElementById('mediaLibrary');
    if (!container || !this.mediaLibrary) return;

    window.addEventListener('media-library:changed', () => this.renderMediaLibrary());

    container.addEventListener('click', async event => {
      const removeButton = event.target.closest('[data-library-remove]');
      const item = event.target.closest('[data-library-asset]');
      if (!item) return;

      const id = item.dataset.libraryAsset;
      if (removeButton) {
        try {
          await this.mediaLibrary.remove(id);
          await this.renderMediaLibrary();
          this.notifications.showToast('Archivo quitado de la biblioteca');
        } catch (error) {
          this.notifications.showToast('No se pudo quitar el archivo de la biblioteca');
        }
        return;
      }

      const asset = await this.mediaLibrary.get(id);
      if (!asset) return;
      const src = URL.createObjectURL(asset.blob);
      this.state.addElement(asset.type, { src, name: asset.name });
      this.notifications.showToast(`${asset.name} agregado al lienzo`);
    });

    this.renderMediaLibrary();
  }

  async renderMediaLibrary() {
    const container = document.getElementById('mediaLibrary');
    const empty = document.getElementById('mediaLibraryEmpty');
    if (!container || !this.mediaLibrary) return;

    this.libraryPreviewUrls.forEach(url => URL.revokeObjectURL(url));
    this.libraryPreviewUrls = [];

    try {
      const assets = await this.mediaLibrary.list();
      container.replaceChildren();
      if (empty) empty.classList.toggle('hidden', assets.length > 0);

      assets.forEach(asset => {
        const card = document.createElement('div');
        card.className = 'media-library-card';
        card.dataset.libraryAsset = asset.id;

        const addButton = document.createElement('button');
        addButton.type = 'button';
        addButton.className = 'media-library-item';
        addButton.title = `Agregar ${asset.name} al lienzo`;

        const preview = document.createElement('span');
        preview.className = 'media-library-preview';
        if (asset.type === 'image') {
          const url = URL.createObjectURL(asset.blob);
          this.libraryPreviewUrls.push(url);
          const image = document.createElement('img');
          image.src = url;
          image.alt = '';
          preview.append(image);
        } else {
          preview.textContent = asset.type === 'video' ? 'VID' : 'AUD';
        }

        const name = document.createElement('span');
        name.className = 'media-library-name';
        name.textContent = asset.name;
        addButton.append(preview, name);

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'media-library-remove';
        removeButton.dataset.libraryRemove = '';
        removeButton.setAttribute('aria-label', `Quitar ${asset.name} de la biblioteca`);
        removeButton.textContent = 'x';

        card.append(addButton, removeButton);
        container.append(card);
      });
    } catch (error) {
      if (empty) {
        empty.textContent = 'No se pudo cargar la biblioteca multimedia.';
        empty.classList.remove('hidden');
      }
      console.error('[MediaLibrary] No se pudo cargar la biblioteca:', error);
    }
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
      this.notifications.showToast('No se pudo quitar el fondo. Verifica tu conexión.');
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

  bindPackageInstalls() {
    const bind = (btnId, progressId, service, label) => {
      const btn = document.getElementById(btnId);
      const progressEl = document.getElementById(progressId);
      if (!btn || !service) return;
      btn.addEventListener('click', async () => {
        const confirmed = window.confirm(`¿Instalar "${label}"? Se descargará en tu navegador (puede tardar).`);
        if (!confirmed) return;
        btn.disabled = true;
        btn.textContent = 'Instalando…';
        if (progressEl) progressEl.classList.remove('hidden');
        const updateProgress = ({ message, percent }) => {
          this.notifications.showProgress(message, percent);
          if (!progressEl) return;
          const labelEl = progressEl.querySelector('span');
          const fill = progressEl.querySelector('i');
          if (labelEl) labelEl.textContent = message;
          if (fill) fill.style.width = `${Math.max(0, Math.min(100, Math.round(percent)))}%`;
        };
        try {
          await service.load(updateProgress);
          this.notifications.showToast(`${label} instalado`);
          btn.textContent = 'Instalado';
        } catch (error) {
          this.notifications.showToast(error.userMessage || `No se pudo instalar ${label}`);
          btn.disabled = false;
          btn.textContent = 'Instalar';
        } finally {
          if (progressEl) progressEl.classList.add('hidden');
          this.notifications.hideProgress();
        }
      });
    };

    bind('installBgPkg', 'bgPkgProgress', this.backgroundRemoval, 'Quitar fondo (BEN2)');
    bind('installSttPkg', 'sttPkgProgress', this.speechToText, 'Dictado por voz (Whisper)');
    bind('installImgPkg', 'imgPkgProgress', this.imageGeneration, 'Generador de imágenes');
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
