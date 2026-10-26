/**
 * ExportService
 * Single Responsibility: Generate and trigger client-side download of standalone HTML.
 */
window.CanvasApp = window.CanvasApp || {};

window.CanvasApp.ExportService = class ExportService {
  /**
   * Export the canvas as a standalone HTML file
   * @param {HTMLElement} canvasElement - Canvas DOM node
   * @param {string} fileName - Download filename
   */
  exportHtml(canvasElement, fileName = 'mi-pagina-web.html') {
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
};
