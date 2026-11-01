/**
 * ExportService
 * Single Responsibility: Generate and trigger client-side download of the canvas
 * in multiple formats: HTML, PNG, JPG, PDF and SVG.
 */
window.CanvasApp = window.CanvasApp || {};

window.CanvasApp.ExportService = class ExportService {
  /**
   * Export the canvas in the requested format.
   * @param {string} format - 'html' | 'png' | 'jpg' | 'pdf' | 'svg'
   * @param {HTMLElement} canvasElement - Canvas DOM node
   * @param {string} fileName - Download filename
   */
  async export(format, canvasElement, fileName, pageFormat) {
    if (!canvasElement) return;

    // Asegurar extensión correcta según el formato
    const extByFormat = { html: 'html', png: 'png', jpg: 'jpg', pdf: 'pdf', svg: 'svg' };
    const ext = extByFormat[format] || 'html';
    if (fileName && !fileName.toLowerCase().endsWith('.' + ext)) {
      fileName = fileName + '.' + ext;
    }

    switch (format) {
      case 'png': return this.exportPng(canvasElement, fileName || 'mi-diseno.png');
      case 'jpg': return this.exportJpg(canvasElement, fileName || 'mi-diseno.jpg');
      case 'pdf': return this.exportPdf(canvasElement, fileName || 'mi-diseno.pdf', pageFormat);
      case 'svg': return this.exportSvg(canvasElement, fileName || 'mi-diseno.svg');
      case 'html':
      default:    return this.exportHtml(canvasElement, fileName || 'mi-pagina-web.html');
    }
  }

  /**
   * Export the canvas as a standalone HTML file
   * @param {HTMLElement} canvasElement - Canvas DOM node
   * @param {string} fileName - Download filename
   */
  async exportHtml(canvasElement, fileName = 'mi-pagina-web.html') {
    if (!canvasElement) return;

    // Clone the canvas node to strip editor artifacts
    const clone = canvasElement.cloneNode(true);

    // Remove selection outlines, editor classes & make links functional
    clone.querySelectorAll('.selected').forEach(node => node.classList.remove('selected'));
    clone.querySelectorAll('.element').forEach(el => {
      el.style.cursor = 'default';
      el.style.outline = 'none';
      el.style.touchAction = 'auto';
      el.style.userSelect = 'auto';
      el.querySelectorAll('a').forEach(a => {
        a.style.pointerEvents = 'auto';
      });
    });

    // Local uploads (and AI-processed PNGs) use blob: URLs that die with the page.
    await this.inlineBlobMedia(clone);

    const exportHtml = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mi página web</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "DM Sans", -apple-system, BlinkMacSystemFont, sans-serif;
      background: #ffffff;
      color: #202238;
    }
    .canvas-wrap {
      display: flex;
      justify-content: center;
      width: 100%;
    }
    .canvas {
      position: relative;
      width: 100%;
      max-width: 1120px;
      min-height: 700px;
      margin: 0 auto;
      overflow: hidden;
      background: #ffffff;
    }
    .canvas-bg {
      position: absolute;
      inset: 0;
      z-index: -1;
      background-size: cover;
      background-position: center;
    }
    .element {
      position: absolute;
      box-sizing: border-box;
      overflow-wrap: anywhere;
    }
    .element img, .element video {
      max-width: 100%;
      display: block;
    }
    .txt {
      white-space: pre-wrap;
    }
    .social {
      display: flex;
      gap: 12px;
      align-items: center;
      font-weight: 700;
    }
    @media (max-width: 768px) {
      .canvas {
        width: 100% !important;
        min-height: 700px;
      }
      .element {
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="canvas-wrap">
    ${clone.outerHTML}
  </div>
</body>
</html>`;

    const blob = new Blob([exportHtml], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  }

  /**
   * Replace blob: media sources with data URLs so the exported file is self-contained.
   * @param {HTMLElement} root
   */
  async inlineBlobMedia(root) {
    const nodes = Array.from(root.querySelectorAll(
      'img[src^="blob:"], video[src^="blob:"], audio[src^="blob:"]'
    ));

    await Promise.all(nodes.map(async node => {
      try {
        const src = node.getAttribute('src');
        const response = await fetch(src);
        const blob = await response.blob();
        node.setAttribute('src', await this.blobToDataUrl(blob));
      } catch (error) {
        console.warn('No se pudo incrustar un archivo local en el HTML exportado.', error);
      }
    }));
  }

  /**
   * @param {Blob} blob
   * @returns {Promise<string>}
   */
  blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error || new Error('No se pudo leer el archivo'));
      reader.readAsDataURL(blob);
    });
  }

  /* ------------------------------------------------------------------ *
   * Descarga helpers                                                   *
   * ------------------------------------------------------------------ */

  /**
   * Descarga un Blob como archivo.
   * @param {Blob} blob
   * @param {string} fileName
   */
  downloadBlob(blob, fileName) {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  }

  /**
   * Descarga un data URL como archivo.
   * @param {string} dataUrl
   * @param {string} fileName
   */
  downloadDataUrl(dataUrl, fileName) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /* ------------------------------------------------------------------ *
   * PNG                                                                *
   * ------------------------------------------------------------------ */

  /**
   * Exporta el canvas como imagen PNG mediante html2canvas.
   * @param {HTMLElement} canvasElement
   * @param {string} fileName
   */
  async exportPng(canvasElement, fileName = 'mi-diseno.png') {
    const canvas = await html2canvas(canvasElement, {
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
      scale: 2
    });
    this.downloadDataUrl(canvas.toDataURL('image/png'), fileName);
  }

  /* ------------------------------------------------------------------ *
   * JPG / JPEG                                                         *
   * ------------------------------------------------------------------ */

  /**
   * Exporta el canvas como imagen JPG mediante html2canvas.
   * @param {HTMLElement} canvasElement
   * @param {string} fileName
   */
  async exportJpg(canvasElement, fileName = 'mi-diseno.jpg') {
    const canvas = await html2canvas(canvasElement, {
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
      scale: 2
    });
    this.downloadDataUrl(canvas.toDataURL('image/jpeg', 0.92), fileName);
  }

  /* ------------------------------------------------------------------ *
   * PDF                                                                *
   * ------------------------------------------------------------------ */

  /**
   * Exporta el canvas como PDF mediante jsPDF.
   * @param {HTMLElement} canvasElement
   * @param {string} fileName
   */
  async exportPdf(canvasElement, fileName = 'mi-diseno.pdf', pageFormat = 'letter') {
    const canvas = await html2canvas(canvasElement, {
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
      scale: 2
    });
    const imgData = canvas.toDataURL('image/png');

    const { jsPDF } = window.jspdf || window;

    // Formatos de página en milímetros
    const pageSizes = {
      letter: [215.9, 279.4],   // Carta 8.5 × 11 pulgadas
      oficio: [215.9, 342.9]    // Oficio 8.5 × 13.5 pulgadas
    };
    const [pageWidth, pageHeight] = pageSizes[pageFormat] || pageSizes.letter;

    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: [pageWidth, pageHeight]
    });

    // Ajustar la imagen a la página manteniendo proporciones (centrada)
    const imgW = canvas.width;
    const imgH = canvas.height;
    const scale = Math.min(pageWidth / imgW, pageHeight / imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;
    const offsetX = (pageWidth - drawW) / 2;
    const offsetY = (pageHeight - drawH) / 2;

    pdf.addImage(imgData, 'PNG', offsetX, offsetY, drawW, drawH);
    pdf.save(fileName);
  }

  /* ------------------------------------------------------------------ *
   * SVG                                                                *
   * ------------------------------------------------------------------ */

  /**
   * Exporta el canvas como SVG en línea (sin librerías externas).
   * Convierte los elementos posicionados absolutamente a nodos SVG.
   * @param {HTMLElement} canvasElement
   * @param {string} fileName
   */
  async exportSvg(canvasElement, fileName = 'mi-diseno.svg') {
    const clone = canvasElement.cloneNode(true);
    clone.querySelectorAll('.selected').forEach(node => node.classList.remove('selected'));
    clone.querySelectorAll('.element').forEach(el => {
      el.style.cursor = 'default';
      el.style.outline = 'none';
      el.style.touchAction = 'auto';
      el.style.userSelect = 'auto';
      el.querySelectorAll('a').forEach(a => { a.style.pointerEvents = 'auto'; });
    });

    await this.inlineBlobMedia(clone);

    const rect = canvasElement.getBoundingClientRect();
    const width = rect.width || 1120;
    const height = rect.height || 700;

    const svgParts = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
      `<foreignObject width="100%" height="100%">`,
      `<div xmlns="http://www.w3.org/1999/xhtml" style="font-family: 'DM Sans', sans-serif; width:${width}px;height:${height}px;">`,
      clone.outerHTML,
      `</div>`,
      `</foreignObject>`,
      `</svg>`
    ];

    const svg = svgParts.join('');
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    this.downloadBlob(blob, fileName);
  }
};
