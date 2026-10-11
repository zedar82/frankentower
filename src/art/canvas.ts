// Logical scene dimensions stay independent of the displayed bitmap resolution.
// Draw directly at display density instead of magnifying a fixed 2x backing store.
export function prepareCanvas(c: CanvasRenderingContext2D, width: number, height: number) {
  const canvas = c.canvas;
  const density = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth || width;
  const pixelWidth = Math.max(1, Math.round(cssWidth * density));
  const pixelHeight = Math.max(1, Math.round(((cssWidth * height) / width) * density));
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  c.setTransform(pixelWidth / width, 0, 0, pixelHeight / height, 0, 0);
  c.imageSmoothingEnabled = false;
}
