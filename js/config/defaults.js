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
      color: '#24243a',
      bg: 'transparent',
      radius: 0,
      opacity: 1
    },
    button: {
      x: 80,
      y: 180,
      w: 150,
      h: 44,
      text: 'Descubre más',
      fontSize: 14,
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
      opacity: 1
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
      opacity: 1
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
      color: '#999999',
      bg: '#eeeeee',
      radius: 4,
      opacity: 1
    }
  },

  VIEW_MODES: {
    desktop: { label: 'Ordenador', width: null },
    tablet: { label: 'Tablet', width: 768 },
    mobile: { label: 'Móvil', width: 375 }
  },

  HISTORY_LIMIT: 60
};
