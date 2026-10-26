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
  constructor({ container, stateManager, eventBus, notificationService }) {
    this.container = container;
    this.state = stateManager;
    this.eventBus = eventBus;
    this.notifications = notificationService;

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
      html += `
        <div class="prop-group">
          <div class="prop-title">Contenido</div>
          <div class="field">
            <label>Texto</label>
            <textarea data-prop="text">${escapeHtml(el.text || '')}</textarea>
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
          ${this.createInputField('Color fondo', 'bg', el.bg || '#ffffff', 'color')}
        </div>
        ${this.createInputField('Tamaño de texto (px)', 'fontSize', el.fontSize || 14, 'number')}
        ${this.createInputField('Radio de borde (px)', 'radius', el.radius || 0, 'number')}
        <div class="field">
          <label>Opacidad</label>
          <input data-prop="opacity" type="range" min="0.1" max="1" step="0.05" value="${el.opacity ?? 1}">
        </div>
      </div>
    `;

    // Image fit
    if (el.type === 'image') {
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
      `;
    }

    this.container.innerHTML = html;
    this.attachFormListeners(el);
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

    if (dupBtn) dupBtn.onclick = () => this.state.duplicateSelected();
    if (delBtn) delBtn.onclick = () => this.state.deleteSelected();
    if (frontBtn) frontBtn.onclick = () => this.state.bringToFront(el.id);

    if (fileInput) {
      fileInput.onchange = () => {
        const file = fileInput.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        this.state.updateElement(el.id, { src: url }, true);
        this.notifications.showToast('Archivo multimedia cargado');
      };
    }

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
};
