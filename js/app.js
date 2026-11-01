/**
 * Application Orchestrator & Bootstrapper
 * Adheres to Dependency Inversion (DIP) and Single Responsibility (SRP):
 * Instantiates domain services and UI components, injecting dependencies.
 */
document.addEventListener('DOMContentLoaded', () => {
  const { Helpers, EventBus, NotificationService, HistoryService, StateManager, TemplateService, ExportService, BackgroundRemovalService, SpeechToTextService, ImageGenerationService, CanvasRenderer, DragDropHandler, PropertiesPanel, LayersPanel, NavigationRail, KeyboardShortcuts } = window.CanvasApp;
  const { $, $$ } = Helpers;

  // 1. Initialize Core Services (Dependency Inversion)
  const eventBus = new EventBus();
  const historyService = new HistoryService();
  const notificationService = new NotificationService('#toastRoot');
  const stateManager = new StateManager({ eventBus, historyService });
  const templateService = new TemplateService(stateManager);
  const exportService = new ExportService();
  const backgroundRemovalService = new BackgroundRemovalService();
  const speechToTextService = new SpeechToTextService();
  const imageGenerationService = new ImageGenerationService();

  // 2. DOM Elements
  const canvas = $('#canvas');
  const canvasBg = $('#canvasBg');
  const propsContent = $('#propsContent');
  const layerList = $('#layerList');
  const previewBtn = $('#previewBtn');
  const exportBtn = $('#exportBtn');
  const exportFormat = $('#exportFormat');
  const undoBtn = $('#undo');
  const redoBtn = $('#redo');
  const statusEl = $('#status');
  const canvasHint = $('#canvasHint');
  const zoomOutBtn = $('#zoomOut');
  const zoomInBtn = $('#zoomIn');
  const zoomResetBtn = $('#zoomReset');
  const zoomLevelEl = $('#zoomLevel');
  const cropRatioSelect = $('#cropRatio');
  const cropWidthInput = $('#cropWidth');
  const cropHeightInput = $('#cropHeight');
  const cropApplyBtn = $('#cropApply');

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
    notificationService,
    backgroundRemoval: backgroundRemovalService,
    speechToText: speechToTextService
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
    canvas,
    backgroundRemoval: backgroundRemovalService,
    imageGeneration: imageGenerationService
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

  // 5. Zoom controls
  const applyZoom = () => {
    const zoom = stateManager.getZoom();
    const scale = zoom / 100;
    canvas.style.transformOrigin = 'top left';
    canvas.style.transform = `scale(${scale})`;
    if (zoomLevelEl) zoomLevelEl.textContent = `${zoom}%`;
  };

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
      stateManager.setZoom(stateManager.getZoom() - 25);
    });
  }

  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
      stateManager.setZoom(stateManager.getZoom() + 25);
    });
  }

  if (zoomResetBtn) {
    zoomResetBtn.addEventListener('click', () => {
      stateManager.setZoom(100);
    });
  }

  eventBus.on('zoom:changed', applyZoom);
  applyZoom();

  // 6. Canvas crop / resize controls
  const applyCanvasSize = () => {
    const { width, height } = stateManager.getCanvasSize();
    canvas.style.width = `${width}px`;
    canvas.style.minHeight = `${Math.max(height, 690)}px`;
    if (cropWidthInput) cropWidthInput.value = width;
    if (cropHeightInput) cropHeightInput.value = height;
    if (cropRatioSelect) cropRatioSelect.value = stateManager.getAspectRatio() || 'libre';
    notificationService.showToast(`Canvas redimensionado a ${width} × ${height} px`);
  };

  const syncRatioSelect = () => {
    if (!cropRatioSelect) return;
    cropRatioSelect.value = stateManager.getAspectRatio() || 'libre';
  };

  let isUpdatingInputs = false;

  if (cropRatioSelect) {
    cropRatioSelect.addEventListener('change', () => {
      stateManager.setAspectRatio(cropRatioSelect.value || null);
      syncRatioSelect();
    });
  }

  if (cropWidthInput) {
    cropWidthInput.addEventListener('input', () => {
      const w = parseInt(cropWidthInput.value, 10);
      if (!w || w < 200) return;
      if (isUpdatingInputs) return;
      const h = stateManager.computeHeightForWidth(w);
      isUpdatingInputs = true;
      if (cropHeightInput) cropHeightInput.value = h;
      isUpdatingInputs = false;
    });
  }

  if (cropHeightInput) {
    cropHeightInput.addEventListener('input', () => {
      const h = parseInt(cropHeightInput.value, 10);
      if (!h || h < 200) return;
      if (isUpdatingInputs) return;
      const w = stateManager.computeWidthForHeight(h);
      isUpdatingInputs = true;
      if (cropWidthInput) cropWidthInput.value = w;
      isUpdatingInputs = false;
    });
  }

  if (cropApplyBtn) {
    cropApplyBtn.addEventListener('click', () => {
      const w = parseInt(cropWidthInput.value, 10) || stateManager.getCanvasSize().width;
      const h = parseInt(cropHeightInput.value, 10) || stateManager.getCanvasSize().height;
      stateManager.setCanvasSize(w, h);
      applyCanvasSize();
    });
  }

  // Sincronizar controles cuando el estado cambie (undo/redo, etc.)
  eventBus.on('canvas:sizeChanged', applyCanvasSize);
  eventBus.on('canvas:ratioChanged', syncRatioSelect);

  // Inicializar controles con el tamaño actual
  applyCanvasSize();

  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      const originalLabel = exportBtn.textContent;
      exportBtn.disabled = true;
      exportBtn.textContent = 'Exportando…';
      const format = exportFormat ? exportFormat.value : 'html';

      try {
        await exportService.export(format, canvas);
        notificationService.showToast(`${format.toUpperCase()} exportado con éxito`);
      } catch (error) {
        notificationService.showToast(`No se pudo exportar el ${format}`);
      } finally {
        exportBtn.disabled = false;
        exportBtn.textContent = originalLabel;
      }
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
