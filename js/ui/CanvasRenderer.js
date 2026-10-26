/**
 * CanvasRenderer
 * Single Responsibility: Render and update DOM elements inside the Canvas.
 * Adheres to Open/Closed Principle via extensible element type renderers.
 */
window.CanvasApp = window.CanvasApp || {};

window.CanvasApp.CanvasRenderer = class CanvasRenderer {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.canvas
   * @param {HTMLElement} options.canvasBg
   * @param {StateManager} options.stateManager
   * @param {EventBus} options.eventBus
   */
  constructor({ canvas, canvasBg, stateManager, eventBus }) {
    this.canvas = canvas;
    this.canvasBg = canvasBg;
    this.state = stateManager;
    this.eventBus = eventBus;

    this.typeRenderers = {
      text: this.renderText.bind(this),
      button: this.renderButton.bind(this),
      shape: this.renderShape.bind(this),
      image: this.renderImage.bind(this),
      video: this.renderVideo.bind(this),
      audio: this.renderAudio.bind(this),
      social: this.renderSocial.bind(this),
      spacer: this.renderSpacer.bind(this)
    };

    this.bindEvents();
  }

  bindEvents() {
    this.eventBus.on('elements:changed', () => this.renderAll());
    this.eventBus.on('selection:changed', ({ selectedId }) => this.updateSelectionVisual(selectedId));
    this.eventBus.on('element:updated', ({ id, element, changes }) => this.updateElementDom(id, element, changes));
    this.eventBus.on('canvas:bgChanged', bg => this.updateCanvasBg(bg));
    this.eventBus.on('view:changed', ({ view }) => this.updateView(view));
    this.eventBus.on('preview:changed', ({ preview }) => this.updatePreview(preview));

    // Deselect when clicking canvas background
    this.canvas.addEventListener('click', e => {
      if (e.target === this.canvas || e.target === this.canvasBg) {
        this.state.clearSelection();
      }
    });

    this.canvas.addEventListener('dragover', e => e.preventDefault());
  }

  /**
   * Re-render all elements from state
   */
  renderAll() {
    // Remove existing element nodes
    this.canvas.querySelectorAll('.element').forEach(node => node.remove());

    const elements = this.state.getElements();
    const selectedId = this.state.getSelectedId();

    elements.forEach(element => {
      const elNode = this.createElementNode(element, element.id === selectedId);
      this.canvas.appendChild(elNode);
    });
  }

  /**
   * Create DOM node for an element
   */
  createElementNode(element, isSelected) {
    const el = document.createElement('div');
    el.className = 'element' + (isSelected ? ' selected' : '');
    el.dataset.id = element.id;

    this.applyElementStyles(el, element);

    const renderer = this.typeRenderers[element.type] || this.renderFallback.bind(this);
    renderer(el, element);

    // Click handler for selection
    el.addEventListener('click', ev => {
      if (!this.state.getPreviewMode()) {
        ev.stopPropagation();
        this.state.select(element.id);
      }
    });

    return el;
  }

  /**
   * Apply bounding box & common styles
   */
  applyElementStyles(node, el) {
    node.style.left = `${el.x}px`;
    node.style.top = `${el.y}px`;
    node.style.width = `${el.w}px`;
    node.style.height = `${el.h}px`;
    node.style.zIndex = el.z ?? 1;
    node.style.color = el.color ?? '#202238';
    node.style.background = el.bg ?? 'transparent';
    node.style.borderRadius = `${el.radius ?? 0}px`;
    node.style.fontSize = `${el.fontSize ?? 14}px`;
    node.style.opacity = el.opacity ?? 1;
  }

  /**
   * Fast localized DOM updates for dragging / slider changes
   */
  updateElementDom(id, element, changes) {
    const node = this.canvas.querySelector(`[data-id="${id}"]`);
    if (!node) {
      this.renderAll();
      return;
    }

    const keys = Object.keys(changes);
    // If structural properties changed, re-render the element
    const structuralKeys = ['type', 'shape', 'src', 'fit', 'text', 'href', 'radius', 'networks'];
    const hasStructuralChanges = keys.some(k => structuralKeys.includes(k));

    if (hasStructuralChanges) {
      this.applyElementStyles(node, element);
      const renderer = this.typeRenderers[element.type] || this.renderFallback.bind(this);
      renderer(node, element);
    } else {
      // Fast property updates
      if ('x' in changes) node.style.left = `${element.x}px`;
      if ('y' in changes) node.style.top = `${element.y}px`;
      if ('w' in changes) node.style.width = `${element.w}px`;
      if ('h' in changes) node.style.height = `${element.h}px`;
      if ('z' in changes) node.style.zIndex = element.z;
      if ('color' in changes) node.style.color = element.color;
      if ('bg' in changes) node.style.background = element.bg;
      if ('radius' in changes) node.style.borderRadius = `${element.radius}px`;
      if ('fontSize' in changes) node.style.fontSize = `${element.fontSize}px`;
      if ('opacity' in changes) node.style.opacity = element.opacity;
    }
  }

  /**
   * Update visual selection class without recreating DOM
   */
  updateSelectionVisual(selectedId) {
    this.canvas.querySelectorAll('.element').forEach(node => {
      const isSelected = Number(node.dataset.id) === selectedId;
      node.classList.toggle('selected', isSelected);
    });
  }

  updateCanvasBg(bg) {
    if (bg.color) this.canvas.style.backgroundColor = bg.color;
    if (this.canvasBg) {
      this.canvasBg.style.backgroundImage = bg.url ? `url("${bg.url.replace(/"/g, '')}")` : '';
    }
  }

  updateView(view) {
    this.canvas.classList.toggle('mobile', view === 'mobile');
    this.canvas.classList.toggle('tablet', view === 'tablet');
  }

  updatePreview(preview) {
    document.body.classList.toggle('preview-mode', preview);
    this.canvas.style.outline = preview ? 'none' : '';
  }

  /* --- Type-Specific Renderers --- */

  renderText(node, el) {
    const { escapeHtml } = window.CanvasApp.Helpers;
    node.innerHTML = `<div class="txt" style="font-size:${el.fontSize}px;color:${el.color}">${escapeHtml(el.text)}</div>`;
  }

  renderButton(node, el) {
    const { escapeHtml } = window.CanvasApp.Helpers;
    node.innerHTML = `<a href="${escapeHtml(el.href || '#')}" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:${el.color};background:${el.bg};border-radius:${el.radius}px;text-decoration:none;font-weight:700;font-size:${el.fontSize}px;pointer-events:none">${escapeHtml(el.text)}</a>`;
  }

  renderShape(node, el) {
    const { escapeHtml } = window.CanvasApp.Helpers;
    
    // Reset styles
    node.style.clipPath = '';
    node.style.width = `${el.w}px`;
    node.style.height = `${el.h}px`;
    node.style.background = el.bg;
    node.style.borderLeft = '';
    node.style.borderRight = '';
    node.style.borderBottom = '';
    
    if (el.shape === 'circle') {
      node.style.borderRadius = '50%';
    } else if (el.shape === 'triangle') {
      node.style.borderRadius = '0';
      node.style.background = 'transparent';
      node.style.width = '0';
      node.style.height = '0';
      node.style.borderLeft = `${el.w / 2}px solid transparent`;
      node.style.borderRight = `${el.w / 2}px solid transparent`;
      node.style.borderBottom = `${el.h}px solid ${el.bg}`;
      node.innerHTML = '';
      return;
    } else if (el.shape === 'star') {
      node.style.clipPath = 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
    } else if (el.shape === 'diamond') {
      node.style.clipPath = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
    } else if (el.shape === 'hexagon') {
      node.style.clipPath = 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';
    } else if (el.shape === 'octagon') {
      node.style.clipPath = 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)';
    } else if (el.shape === 'oval') {
      node.style.borderRadius = '50%';
    } else if (el.shape === 'pentagon') {
      node.style.clipPath = 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)';
    } else if (el.shape === 'parallelogram') {
      node.style.clipPath = 'polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%)';
    } else if (el.shape === 'trapezoid') {
      node.style.clipPath = 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)';
    } else {
      node.style.borderRadius = `${el.radius}px`;
    }

    node.innerHTML = el.text ? `<div class="txt" style="padding:10px;text-align:center">${escapeHtml(el.text)}</div>` : '';
  }

  renderImage(node, el) {
    const { escapeHtml } = window.CanvasApp.Helpers;
    if (el.src) {
      node.innerHTML = `<img class="media" src="${escapeHtml(el.src)}" alt="Imagen" style="border-radius:${el.radius}px;object-fit:${el.fit || 'cover'}">`;
    } else {
      node.innerHTML = `<div style="height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;color:#777;background:#f0f0f5;border-radius:${el.radius}px"><b style="font-size:24px">▧</b><span style="font-size:12px">Añadir imagen</span></div>`;
    }
  }

  renderVideo(node, el) {
    const { escapeHtml } = window.CanvasApp.Helpers;
    if (el.src) {
      node.innerHTML = `<video class="media" src="${escapeHtml(el.src)}" controls style="border-radius:${el.radius}px"></video>`;
    } else {
      node.innerHTML = `<div style="height:100%;display:flex;align-items:center;justify-content:center;background:#eee;border-radius:${el.radius}px;font-size:12px;color:#777">▷ Añadir video</div>`;
    }
  }

  renderAudio(node, el) {
    const { escapeHtml } = window.CanvasApp.Helpers;
    if (el.src) {
      node.innerHTML = `<audio src="${escapeHtml(el.src)}" controls style="width:100%;margin-top:8px"></audio>`;
    } else {
      node.innerHTML = `<div style="padding:15px 8px;font-size:12px;display:flex;align-items:center;gap:6px">♫ ${escapeHtml(el.text || 'Añadir audio')}</div>`;
    }
  }

  renderSocial(node, el) {
    const { escapeHtml } = window.CanvasApp.Helpers;
    
    const networkIcons = {
      facebook: 'fab fa-facebook',
      twitter: 'fab fa-x-twitter',
      instagram: 'fab fa-instagram',
      youtube: 'fab fa-youtube',
      linkedin: 'fab fa-linkedin',
      tiktok: 'fab fa-tiktok',
      pinterest: 'fab fa-pinterest',
      whatsapp: 'fab fa-whatsapp',
      telegram: 'fab fa-telegram',
      github: 'fab fa-github',
      discord: 'fab fa-discord',
      snapchat: 'fab fa-snapchat'
    };

    const networks = el.networks || ['facebook', 'twitter', 'instagram', 'youtube'];
    const iconsHtml = networks.map(network => {
      const iconClass = networkIcons[network] || 'fas fa-circle';
      return `<a href="${escapeHtml(el.href || '#')}" target="_blank" style="color:${el.color};text-decoration:none;font-size:${el.fontSize}px"><i class="${iconClass}"></i></a>`;
    }).join(' ');

    node.innerHTML = `<div class="social" style="color:${el.color};font-size:${el.fontSize}px">${iconsHtml}</div>`;
  }

  renderSpacer(node, el) {
    const { escapeHtml } = window.CanvasApp.Helpers;
    node.innerHTML = `<div style="padding:6px;font-size:12px;color:${el.color}">${escapeHtml(el.text)}</div>`;
  }

  renderFallback(node, el) {
    const { escapeHtml } = window.CanvasApp.Helpers;
    node.innerHTML = `<div style="padding:6px;font-size:12px">${escapeHtml(el.text || el.type)}</div>`;
  }
};
