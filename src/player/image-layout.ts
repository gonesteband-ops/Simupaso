import type { Rect } from "../contract/project";

export function applyRect(element: HTMLElement, rect: Rect): void {
  element.style.left = `${rect.x * 100}%`;
  element.style.top = `${rect.y * 100}%`;
  element.style.width = `${rect.w * 100}%`;
  element.style.height = `${rect.h * 100}%`;
}

export function fitImageToViewport(
  viewport: HTMLElement,
  stage: HTMLElement,
  image: HTMLImageElement,
): void {
  if (!image.naturalWidth || !image.naturalHeight) {
    return;
  }
  const scale = Math.min(
    viewport.clientWidth / image.naturalWidth,
    viewport.clientHeight / image.naturalHeight,
  );
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  stage.style.width = `${width}px`;
  stage.style.height = `${height}px`;
}
