/**
 * Application Orchestrator & Bootstrapper
 * Adheres to Dependency Inversion (DIP) and Single Responsibility (SRP):
 * Instancia servicios de dominio y UI controllers, inyectando dependencias.
 * La lógica se divide en módulos bajo js/app/:
 *   - PersistenceController.js   guardar/cargar + auto-save
 *   - ViewController.js          vistas, zoom, tamaño del lienzo
 *   - HeaderActions.js           undo/redo, vista previa, exportar
 *   - BottomActions.js           duplicar, borrar
 *   - SeedData.js                datos iniciales del proyecto
 */
document.addEventListener('DOMContentLoaded', async () => {
  const { Helpers, EventBus, NotificationService, HistoryService, StateManager, TemplateService,
    ExportService, BackgroundRemovalService, SpeechToTextService, ImageGenerationService,
    PersistenceService, MediaLibraryService, CanvasRenderer, DragDropHandler, PropertiesPanel,
    LayersPanel, NavigationRail, KeyboardShortcuts, PersistenceController, ViewController,
    HeaderActions, BottomActions, SeedData } = window.CanvasApp;
  const { $, $$ } = Helpers;

  // 1. Servicios core
  const eventBus = new EventBus();
  const historyService = new HistoryService();
  const notificationService = new NotificationService('#toastRoot');
  const stateManager = new StateManager({ eventBus, historyService });
  const templateService = new TemplateService(stateManager);
  const exportService = new ExportService();
  const backgroundRemovalService = new BackgroundRemovalService();
  const speechToTextService = new SpeechToTextService();
  const imageGenerationService = new ImageGenerationService();
  const persistenceService = new PersistenceService();
  const mediaLibraryService = new MediaLibraryService();

  // 2. Elementos del DOM
  const canvas = $('#canvas');
  const canvasBg = $('#canvasBg');
  const propsContent = $('#propsContent');
  const layerList = $('#layerList');
  const previewBtn = $('#previewBtn');
  const exportBtn = $('#exportBtn');
  const exportFormat = $('#exportFormat');
  const exportFileName = $('#exportFileName');
  const exportPageFormat = $('#exportPageFormat');
  const undoBtn = $('#undo');
  const redoBtn = $('#redo');
  const saveBtn = $('#saveBtn');
  const autoSaveToggle = $('#autoSaveToggle');
  const statusEl = $('#status');
  const canvasHint = $('#canvasHint');
  const zoomOutBtn = $('#zoomOut');
  const zoomInBtn = $('#zoomIn');
  const zoomResetBtn = $('#zoomReset');
  const zoomLevelEl = $('#zoomLevel');
  const duplicateBtn = $('#duplicateBtn');
  const deleteBtn = $('#deleteBtn');

  // 3. UI Controllers
  const canvasRenderer = new CanvasRenderer({ canvas, canvasBg, stateManager, eventBus });
  const dragDropHandler = new DragDropHandler({ canvas, stateManager, eventBus });
  const propertiesPanel = new PropertiesPanel({
    container: propsContent, stateManager, eventBus, notificationService,
    backgroundRemoval: backgroundRemovalService, speechToText: speechToTextService,
    mediaLibrary: mediaLibraryService
  });
  const layersPanel = new LayersPanel({ container: layerList, stateManager, eventBus });

  const navigationRail = new NavigationRail({
    stateManager, templateService, notificationService, canvas,
    backgroundRemoval: backgroundRemovalService,
    imageGeneration: imageGenerationService,
    speechToText: speechToTextService,
    mediaLibrary: mediaLibraryService
  });

  const keyboardShortcuts = new KeyboardShortcuts({ stateManager, notificationService });

  // 4. Módulos de responsabilidad única
  const persistenceController = new PersistenceController({
    persistenceService, notificationService, eventBus, stateManager
  });
  persistenceController.setAutoSave(autoSaveToggle ? autoSaveToggle.checked : true);

  const viewController = new ViewController({
    canvas, canvasHint, zoomLevelEl, stateManager, notificationService, eventBus
  });

  const headerActions = new HeaderActions({
    undoBtn, redoBtn, previewBtn, exportBtn, exportFormat, exportFileName, exportPageFormat,
    stateManager, historyService, notificationService, exportService, canvas
  });

  const bottomActions = new BottomActions({
    duplicateBtn, deleteBtn, stateManager, notificationService
  });

  const seedData = new SeedData({ canvas, stateManager, historyService, updateStatus: null });

  // 5. Barra de estado y vista
  const updateStatus = () => {
    if (!statusEl) return;
    const elements = stateManager.getElements();
    const count = elements.length;
    const viewName = {
      mobile: 'Móvil',
      tablet: 'Tablet',
      desktop: 'Ordenador'
    }[stateManager.getView()] || 'Ordenador';
    statusEl.textContent = count + ' elemento' + (count === 1 ? '' : 's') + ' · ' + viewName;
  };

  seedData.updateStatus = updateStatus;

  eventBus.on('state:updated', updateStatus);
  eventBus.on('view:changed', updateStatus);
  eventBus.on('canvas:sizeChanged', () => viewController.applyCanvasSize());

  // Auto-save y estado de "guardar necesario"
  eventBus.on('state:updated', () => {
    saveBtn?.classList.add('save-needed');
    persistenceController.markDirty();
  });

  // Toggle auto-save
  if (autoSaveToggle) {
    autoSaveToggle.addEventListener('change', () => {
      persistenceController.setAutoSave(autoSaveToggle.checked);
    });
  }

  // Botón Guardar explícito
  if (saveBtn) {
    saveBtn.addEventListener('click', () => persistenceController.save(false));
  }

  // Drawer móvil: abrir propiedades al seleccionar elemento
  eventBus.on('selection:changed', ({ selectedId }) => {
    if (selectedId && window.innerWidth <= 760) {
      $('#rightPanel')?.classList.add('open');
    }
  });

  // 6. Cargar proyecto guardado o semilla inicial
  const savedSnapshot = await persistenceController.load().catch(error => {
    console.warn('[Persistence] No se pudo recuperar el proyecto:', error);
    return null;
  });

  if (savedSnapshot) {
    stateManager.restoreState(savedSnapshot);
    viewController.applyCanvasSize();
  } else {
    seedData.run();
  }
});
