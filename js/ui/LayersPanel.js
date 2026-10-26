/**
 * LayersPanel
 * Single Responsibility: Render document layers list and manage layer selection.
 */
window.CanvasApp = window.CanvasApp || {};

window.CanvasApp.LayersPanel = class LayersPanel {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.container
   * @param {StateManager} options.stateManager
   * @param {EventBus} options.eventBus
   */
  constructor({ container, stateManager, eventBus }) {
    this.container = container;
    this.state = stateManager;
    this.eventBus = eventBus;

    this.typeIcons = {
      text: 'T',
      button: '▰',
      shape: '◧',
      image: '▧',
      video: '▷',
      audio: '♫',
      social: '◎',
      spacer: '↔'
    };

    this.bindEvents();
    this.render();
  }

  bindEvents() {
    this.eventBus.on('elements:changed', () => this.render());
    this.eventBus.on('selection:changed', () => this.render());
  }

  render() {
    if (!this.container) return;

    const elements = this.state.getElements();
    const selectedId = this.state.getSelectedId();
    const { escapeHtml } = window.CanvasApp.Helpers;

    if (elements.length === 0) {
      this.container.innerHTML = '<p class="small">Aún no hay elementos en el lienzo.</p>';
      return;
    }

    // Render layers in top-to-bottom z-order (highest z first)
    const sorted = [...elements].sort((a, b) => (b.z || 0) - (a.z || 0));

    this.container.innerHTML = sorted.map(el => {
      const isSelected = el.id === selectedId;
      const icon = this.typeIcons[el.type] || '•';
      const label = escapeHtml((el.text || el.type || 'Elemento').slice(0, 24));
      const activeStyle = isSelected ? 'border-color:var(--purple);background:#faf9ff;color:var(--purple);' : '';

      return `
        <button class="preset" data-layer-id="${el.id}" style="${activeStyle}">
          <span>${icon}</span>
          <span style="flex:1;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${label}</span>
          <span class="small" style="color:var(--muted)">#${el.id}</span>
        </button>
      `;
    }).join('');

    this.container.querySelectorAll('[data-layer-id]').forEach(btn => {
      btn.onclick = () => {
        const id = Number(btn.dataset.layerId);
        this.state.select(id);
      };
    });
  }
};
