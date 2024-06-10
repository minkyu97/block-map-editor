export function resizeImage(image: HTMLImageElement, width: number = 1024, height: number = 1024): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, 0, 0, width, height);
  return canvas;
}
