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
  constructor({ stateManager, templateService, notificationService, canvas }) {
    this.state = stateManager;
    this.templates = templateService;
    this.notifications = notificationService;
    this.canvas = canvas;

    this.panelTitles = {
      elements: 'Elementos',
      templates: 'Plantillas',
      uploads: 'Subir archivos',
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
    const panels = ['elements', 'templates', 'uploads', 'layers'];
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
    const handleFile = (input, type) => {
      if (!input) return;
      input.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const blobUrl = URL.createObjectURL(file);
        this.state.addElement(type, { src: blobUrl });
        this.notifications.showToast(`Archivo de ${type} añadido al lienzo`);
        input.value = '';
      });
    };

    handleFile(document.getElementById('imageFile'), 'image');
    handleFile(document.getElementById('audioFile'), 'audio');
    handleFile(document.getElementById('videoFile'), 'video');
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
