/**
 * Configuration & Defaults
 * Single Responsibility: Store default configurations and presets for elements and canvas.
 */
window.CanvasApp = window.CanvasApp || {};

window.CanvasApp.Config = {
  ELEMENT_DEFAULTS: {
    text: {
      x: 80,
      y: 90,
      w: 310,
      h: 70,
      text: 'Haz clic para editar este texto',
      fontSize: 28,
      fontFamily: 'DM Sans',
      color: '#24243a',
      bg: 'transparent',
      radius: 0,
      opacity: 1,
      // Orientación y efectos de texto
      rotate: 0,                 // grados de rotación del bloque de texto
      writingMode: 'horizontal-tb', // horizontal-tb | vertical-rl | vertical-lr
      textOrientation: 'mixed',  // mixed | upright
      letterSpacing: 0,          // px entre letras
      wordSpacing: 0,            // px entre palabras
      lineHeight: 1.2,           // multiplicador de interlineado
      // Texto en curva (círculo / media luna)
      textPath: 'none',          // none | arc | half-moon
      textPathRadius: 0.45,      // radio del arco: <=1 = fracción del menor lado del elemento, >1 = px absoluto
      textPathStart: 0,          // ángulo inicial en grados
      textPathDirection: 'cw'    // cw | ccw
    },
    button: {
      x: 80,
      y: 180,
      w: 150,
      h: 44,
      text: 'Descubre más',
      fontSize: 14,
      fontFamily: 'DM Sans',
      color: '#ffffff',
      bg: '#6d5dfc',
      radius: 10,
      href: '#',
      opacity: 1
    },
    shape: {
      x: 100,
      y: 120,
      w: 120,
      h: 100,
      text: '',
      fontSize: 16,
      color: '#ffffff',
      bg: '#9b8cff',
      radius: 18,
      shape: 'rounded',
      opacity: 1
    },
    image: {
      x: 90,
      y: 90,
      w: 250,
      h: 160,
      text: '',
      fontSize: 14,
      color: '#222222',
      bg: '#eeeeee',
      radius: 12,
      src: '',
      fit: 'cover',
      opacity: 1,
      // Recorte de imagen individual
      crop: {
        enabled: false,
        x: 0,      // offset horizontal desde la izquierda de la imagen original
        y: 0,      // offset vertical desde arriba de la imagen original
        w: null,   // ancho del área de recorte (null = ancho del elemento)
        h: null,   // alto del área de recorte (null = alto del elemento)
        ratio: 'libre' // libre | 1:1 | 16:9 | 4:3 | 3:2 | 9:16
      }
    },
    video: {
      x: 90,
      y: 90,
      w: 280,
      h: 160,
      text: '',
      fontSize: 14,
      color: '#222222',
      bg: '#eeeeee',
      radius: 8,
      src: '',
      opacity: 1,
      autoplay: false,
      loop: false,
      muted: true,
      controls: true,
      playsinline: true
    },
    audio: {
      x: 90,
      y: 90,
      w: 300,
      h: 54,
      text: 'Audio',
      fontSize: 14,
      color: '#222222',
      bg: '#f3f0ff',
      radius: 8,
      src: '',
      opacity: 1
    },
    social: {
      x: 90,
      y: 90,
      w: 280,
      h: 60,
      text: '',
      fontSize: 28,
      fontFamily: 'DM Sans',
      color: '#6d5dfc',
      bg: 'transparent',
      radius: 8,
      href: '#',
      opacity: 1,
      networks: ['facebook', 'twitter', 'instagram', 'youtube']
    },
    spacer: {
      x: 90,
      y: 90,
      w: 150,
      h: 28,
      text: 'Espaciador',
      fontSize: 12,
      fontFamily: 'DM Sans',
      color: '#999999',
      bg: '#eeeeee',
      radius: 4,
      opacity: 1
    }
  },

  BACKGROUND_REMOVAL: {
    // runonweb ships TypeScript sources; esm.sh transpiles them for the browser.
    moduleUrl: 'https://esm.sh/runonweb/remove-bg',
    // BEN2 runs on WASM only: its LayerNorm shader fails on the current WebGPU build.
    device: 'wasm',
    modelLabel: 'BEN2 (~219 MB)'
  },

  SPEECH_TO_TEXT: {
    // runonweb ships TypeScript sources; esm.sh transpiles them for the browser.
    moduleUrl: 'https://esm.sh/runonweb@0.1.0/stt',
    // El modelo por defecto de runonweb es whisper-tiny.en (solo inglés).
    // Usamos la variante multilingüe para poder dictar en español.
    model: 'onnx-community/whisper-base',
    language: 'es',
    // WASM usa pesos q8 (~77 MB). WebGPU descarga fp32 (~480 MB) y es más frágil.
    device: 'wasm',
    modelLabel: 'Whisper Base multilingüe (~77 MB)'
  },

  IMAGE_GENERATION: {
    moduleUrl: 'https://esm.sh/runonweb@0.1.0/image',
    device: 'wasm', // Forzar WASM para evitar WebGPU que puede ser más pesado
    size: 'small',
    width: 384,
    height: 384,
    steps: 2, // Reducir pasos para mejor rendimiento
    modelLabel: 'Generador de imágenes (~3.5 GB)'
  },

  VIEW_MODES: {
    desktop: { label: 'Ordenador', width: null },
    tablet: { label: 'Tablet', width: 768 },
    mobile: { label: 'Móvil', width: 360 }
  },

  HISTORY_LIMIT: 60
};
