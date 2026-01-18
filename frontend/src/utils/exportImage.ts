/**
 * Export utilities for generating publication-quality images
 * from canvas elements.
 */

export interface ExportOptions {
  filename?: string;
  format?: 'png' | 'svg';
  scale?: number;  // For higher resolution (e.g., 2 for retina)
  backgroundColor?: string;
}

/**
 * Export a canvas element as a PNG image
 */
export function exportCanvasAsPNG(
  canvas: HTMLCanvasElement,
  options: ExportOptions = {}
): void {
  const {
    filename = 'export',
    scale = 2,
    backgroundColor = '#1a1a1a',
  } = options;

  // Create a higher resolution canvas for export
  const exportCanvas = document.createElement('canvas');
  const ctx = exportCanvas.getContext('2d');
  if (!ctx) return;

  exportCanvas.width = canvas.width * scale;
  exportCanvas.height = canvas.height * scale;

  // Fill background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

  // Draw the original canvas scaled up
  ctx.scale(scale, scale);
  ctx.drawImage(canvas, 0, 0);

  // Convert to blob and download
  exportCanvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

/**
 * Export multiple canvases stacked vertically as a single PNG
 */
export function exportMultipleCanvasesAsPNG(
  canvases: HTMLCanvasElement[],
  options: ExportOptions = {}
): void {
  const {
    filename = 'export',
    scale = 2,
    backgroundColor = '#1a1a1a',
  } = options;

  if (canvases.length === 0) return;

  // Calculate total dimensions
  const maxWidth = Math.max(...canvases.map((c) => c.width));
  const totalHeight = canvases.reduce((sum, c) => sum + c.height, 0);

  // Create export canvas
  const exportCanvas = document.createElement('canvas');
  const ctx = exportCanvas.getContext('2d');
  if (!ctx) return;

  exportCanvas.width = maxWidth * scale;
  exportCanvas.height = totalHeight * scale;

  // Fill background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

  // Draw each canvas
  ctx.scale(scale, scale);
  let yOffset = 0;
  for (const canvas of canvases) {
    ctx.drawImage(canvas, 0, yOffset);
    yOffset += canvas.height;
  }

  // Convert to blob and download
  exportCanvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

/**
 * Generate SVG from canvas data
 * Note: This creates a rasterized SVG with the canvas as an embedded image
 */
export function exportCanvasAsSVG(
  canvas: HTMLCanvasElement,
  options: ExportOptions = {}
): void {
  const {
    filename = 'export',
    scale = 2,
  } = options;

  const width = canvas.width * scale;
  const height = canvas.height * scale;

  // Create higher res canvas
  const exportCanvas = document.createElement('canvas');
  const ctx = exportCanvas.getContext('2d');
  if (!ctx) return;

  exportCanvas.width = width;
  exportCanvas.height = height;
  ctx.scale(scale, scale);
  ctx.drawImage(canvas, 0, 0);

  // Get data URL
  const dataUrl = exportCanvas.toDataURL('image/png');

  // Create SVG
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <title>LinguAI Export</title>
  <image width="${width}" height="${height}" xlink:href="${dataUrl}"/>
</svg>`;

  // Download
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Capture the current view and export
 */
export function captureViewport(
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<void> {
  return new Promise((resolve) => {
    // Use html2canvas for full viewport capture
    // For now, we'll find canvas elements and export them
    const canvases = element.querySelectorAll('canvas');
    if (canvases.length === 0) {
      console.warn('No canvas elements found to export');
      resolve();
      return;
    }

    const canvasArray = Array.from(canvases) as HTMLCanvasElement[];

    if (options.format === 'svg') {
      // Export first canvas as SVG
      exportCanvasAsSVG(canvasArray[0], options);
    } else {
      exportMultipleCanvasesAsPNG(canvasArray, options);
    }

    resolve();
  });
}
