/**
 * TemplateService
 * Single Responsibility: Generate and apply section presets (Hero, Nav, Card, CTA).
 * Adheres to Open/Closed Principle (OCP) - easy to register new layout templates.
 */
window.CanvasApp = window.CanvasApp || {};

window.CanvasApp.TemplateService = class TemplateService {
  constructor(stateManager) {
    this.state = stateManager;
    this.presets = {
      hero: this.createHeroSection.bind(this),
      nav: this.createNavSection.bind(this),
      card: this.createCardSection.bind(this),
      cta: this.createCtaSection.bind(this)
    };
  }

  /**
   * Apply preset by name
   * @param {string} name - Preset identifier
   * @param {number} canvasWidth - Current visible canvas width
   */
  applyPreset(name, canvasWidth = 900) {
    const generator = this.presets[name];
    if (!generator) {
      console.warn(`Template preset "${name}" not found.`);
      return false;
    }

    this.state.takeSnapshot();
    generator(canvasWidth);
    return true;
  }

  createHeroSection(canvasWidth) {
    const width = Math.max(320, canvasWidth - 70);
    this.state.addElement('shape', {
      x: 35,
      y: 35,
      w: width,
      h: 350,
      bg: '#f0edff',
      radius: 22,
      shape: 'rounded',
      z: 1
    }, false);

    this.state.addElement('text', {
      x: 75,
      y: 90,
      w: Math.min(width - 80, 430),
      h: 110,
      text: 'Tu próxima gran idea empieza aquí.',
      fontSize: 42,
      color: '#24243a',
      bg: 'transparent',
      z: 2
    }, false);

    this.state.addElement('text', {
      x: 78,
      y: 215,
      w: Math.min(width - 80, 360),
      h: 65,
      text: 'Diseña una experiencia digital que tus clientes recuerden.',
      fontSize: 16,
      color: '#696b80',
      bg: 'transparent',
      z: 3
    }, false);

    this.state.addElement('button', {
      x: 78,
      y: 305,
      w: 155,
      h: 46,
      text: 'Comenzar ahora',
      bg: '#6d5dfc',
      color: '#ffffff',
      radius: 10,
      z: 4
    }, false);
  }

  createNavSection(canvasWidth) {
    const width = Math.max(320, canvasWidth);
    this.state.addElement('shape', {
      x: 0,
      y: 0,
      w: width,
      h: 68,
      bg: '#ffffff',
      radius: 0
    }, false);

    this.state.addElement('text', {
      x: 28,
      y: 20,
      w: 145,
      h: 30,
      text: 'MI MARCA',
      fontSize: 18,
      color: '#27243d',
      bg: 'transparent'
    }, false);

    // En móvil, mostramos los items horizontalmente sin hamburguesa
    const navX = width < 768 ? 170 : Math.max(200, width - 360);
    const navW = width < 768 ? width - 200 : 330;
    const navText = width < 768 ? 'Inicio • Servicios • Nosotros • Contacto' : 'Inicio     Servicios     Nosotros     Contacto';
    const navFontSize = width < 768 ? 11 : 13;

    this.state.addElement('text', {
      x: navX,
      y: 24,
      w: navW,
      h: 25,
      text: navText,
      fontSize: navFontSize,
      color: '#44445b',
      bg: 'transparent'
    }, false);
  }

  createCardSection() {
    this.state.addElement('shape', {
      x: 65,
      y: 70,
      w: 260,
      h: 290,
      bg: '#f4f3ff',
      radius: 18
    }, false);

    this.state.addElement('shape', {
      x: 82,
      y: 88,
      w: 226,
      h: 125,
      bg: '#d8d2ff',
      radius: 12
    }, false);

    this.state.addElement('text', {
      x: 85,
      y: 232,
      w: 220,
      h: 30,
      text: 'Nombre del producto',
      fontSize: 18,
      color: '#28243c',
      bg: 'transparent'
    }, false);

    this.state.addElement('text', {
      x: 85,
      y: 267,
      w: 220,
      h: 40,
      text: 'Una descripción breve y atractiva.',
      fontSize: 13,
      color: '#73738a',
      bg: 'transparent'
    }, false);

    this.state.addElement('button', {
      x: 85,
      y: 310,
      w: 130,
      h: 34,
      text: 'Ver detalles',
      fontSize: 12
    }, false);
  }

  createCtaSection(canvasWidth) {
    const width = Math.max(320, canvasWidth - 70);
    this.state.addElement('shape', {
      x: 35,
      y: 420,
      w: width,
      h: 150,
      bg: '#27243d',
      radius: 18
    }, false);

    this.state.addElement('text', {
      x: 60,
      y: 450,
      w: Math.max(280, width - 60),
      h: 35,
      text: '¿Listo para empezar tu proyecto?',
      fontSize: 25,
      color: '#ffffff',
      bg: 'transparent'
    }, false);

    this.state.addElement('button', {
      x: 60,
      y: 500,
      w: 145,
      h: 38,
      text: 'Contáctanos',
      fontSize: 13,
      bg: '#8b7cff'
    }, false);
  }
};
