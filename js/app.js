/**
 * Application Orchestrator & Bootstrapper
 * Adheres to Dependency Inversion (DIP) and Single Responsibility (SRP):
 * Instantiates domain services and UI components, injecting dependencies.
 */
document.addEventListener('DOMContentLoaded', () => {
  const { Helpers, EventBus, NotificationService, HistoryService, StateManager, TemplateService, ExportService, CanvasRenderer, DragDropHandler, PropertiesPanel, LayersPanel, NavigationRail, KeyboardShortcuts } = window.CanvasApp;
  const { $, $$ } = Helpers;

  // 1. Initialize Core Services (Dependency Inversion)
  const eventBus = new EventBus();
  const historyService = new HistoryService();
  const notificationService = new NotificationService('#toastRoot');
  const stateManager = new StateManager({ eventBus, historyService });
  const templateService = new TemplateService(stateManager);
  const exportService = new ExportService();

  // 2. DOM Elements
  const canvas = $('#canvas');
  const canvasBg = $('#canvasBg');
  const propsContent = $('#propsContent');
  const layerList = $('#layerList');
  const previewBtn = $('#previewBtn');
  const exportBtn = $('#exportBtn');
  const undoBtn = $('#undo');
  const redoBtn = $('#redo');
  const statusEl = $('#status');
  const canvasHint = $('#canvasHint');

  // 3. Initialize UI Controllers
  const canvasRenderer = new CanvasRenderer({
    canvas,
    canvasBg,
    stateManager,
    eventBus
  });

  const dragDropHandler = new DragDropHandler({
    canvas,
    stateManager,
    eventBus
  });

  const propertiesPanel = new PropertiesPanel({
    container: propsContent,
    stateManager,
    eventBus,
    notificationService
  });

  const layersPanel = new LayersPanel({
    container: layerList,
    stateManager,
    eventBus
  });

  const navigationRail = new NavigationRail({
    stateManager,
    templateService,
    notificationService,
    canvas
  });

  const keyboardShortcuts = new KeyboardShortcuts({
    stateManager,
    notificationService
  });

  // 4. Status Bar & View Mode Controller
  const updateStatus = () => {
    if (!statusEl) return;
    const elements = stateManager.getElements();
    const count = elements.length;
    const viewName = {
      mobile: 'Móvil',
      tablet: 'Tablet',
      desktop: 'Ordenador'
    }[stateManager.getView()] || 'Ordenador';

    statusEl.textContent = `${count} elemento${count === 1 ? '' : 's'} · ${viewName}`;
  };

  eventBus.on('state:updated', updateStatus);
  eventBus.on('view:changed', updateStatus);

  // View switch buttons
  $$('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      stateManager.setView(view);

      $$('[data-view]').forEach(b => b.classList.toggle('active', b === btn));

      if (canvasHint) {
        canvasHint.textContent = view === 'mobile'
          ? 'Vista móvil · ancho 375 px'
          : view === 'tablet'
          ? 'Vista tablet · ancho 768 px'
          : 'Lienzo web · escritorio responsivo';
      }

      notificationService.showToast(`Cambiado a vista ${view === 'mobile' ? 'móvil' : view === 'tablet' ? 'tablet' : 'de escritorio'}`);
    });
  });

  // 5. Header Actions (Undo, Redo, Preview, Export)
  if (undoBtn) {
    undoBtn.addEventListener('click', () => {
      if (stateManager.undo()) {
        notificationService.showToast('Deshecho');
      }
    });
  }

  if (redoBtn) {
    redoBtn.addEventListener('click', () => {
      if (stateManager.redo()) {
        notificationService.showToast('Rehecho');
      }
    });
  }

  if (previewBtn) {
    previewBtn.addEventListener('click', () => {
      const nextPreviewState = !stateManager.getPreviewMode();
      stateManager.setPreviewMode(nextPreviewState);
      previewBtn.textContent = nextPreviewState ? '✎ Editar' : '▷ Vista previa';

      if (nextPreviewState) {
        notificationService.showToast('Modo vista previa activado');
      } else {
        notificationService.showToast('Modo edición activado');
      }
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      exportService.exportHtml(canvas);
      notificationService.showToast('HTML exportado con éxito');
    });
  }

  // 6. Bottom Bar Action Buttons
  const duplicateBtn = $('#duplicateBtn');
  const deleteBtn = $('#deleteBtn');

  if (duplicateBtn) {
    duplicateBtn.addEventListener('click', () => {
      if (stateManager.duplicateSelected()) {
        notificationService.showToast('Elemento duplicado');
      }
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      if (stateManager.getSelectedId() !== null) {
        stateManager.deleteSelected();
        notificationService.showToast('Elemento eliminado');
      }
    });
  }

  // Mobile Drawer behavior: auto-open properties panel on element select if on mobile
  eventBus.on('selection:changed', ({ selectedId }) => {
    if (selectedId && window.innerWidth <= 760) {
      $('#rightPanel')?.classList.add('open');
    }
  });

  // 7. Initial Seed Data
  const seedInitialProject = () => {
    const canvasWidth = canvas.clientWidth || 900;

    stateManager.addElement('shape', {
      x: 38,
      y: 38,
      w: Math.max(300, canvasWidth - 76),
      h: 350,
      bg: '#f0edff',
      radius: 22,
      shape: 'rounded',
      z: 1
    }, false);

    stateManager.addElement('text', {
      x: 78,
      y: 90,
      w: Math.min(canvasWidth - 100, 440),
      h: 105,
      text: 'Diseña tu próxima web.',
      fontSize: 44,
      color: '#24243a',
      bg: 'transparent',
      z: 2
    }, false);

    stateManager.addElement('text', {
      x: 80,
      y: 208,
      w: Math.min(canvasWidth - 100, 370),
      h: 60,
      text: 'Arrastra, personaliza y crea sin límites. Tu idea, tu estilo.',
      fontSize: 16,
      color: '#696b80',
      bg: 'transparent',
      z: 3
    }, false);

    stateManager.addElement('button', {
      x: 80,
      y: 292,
      w: 160,
      h: 46,
      text: 'Explorar diseño',
      bg: '#6d5dfc',
      color: '#ffffff',
      radius: 10,
      z: 4
    }, false);

    stateManager.clearSelection();
    historyService.clear();
    updateStatus();
  };

  seedInitialProject();
});
