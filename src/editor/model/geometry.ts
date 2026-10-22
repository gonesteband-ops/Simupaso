import type { EditorRect } from "./editor-types";

export const MIN_RECT_SIZE = 0.005;
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4;

export type Point = { x: number; y: number };
export type DisplayRect = { left: number; top: number; width: number; height: number };
export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

export function clampZoom(value: number): number {
  return clamp(Number.isFinite(value) ? value : 1, MIN_ZOOM, MAX_ZOOM);
}

export function clientToNormalized(
  clientX: number,
  clientY: number,
  display: DisplayRect,
): Point {
  if (display.width <= 0 || display.height <= 0) {
    return { x: 0, y: 0 };
  }
  return {
    x: clamp((clientX - display.left) / display.width, 0, 1),
    y: clamp((clientY - display.top) / display.height, 0, 1),
  };
}

export function normalizeDelta(dx: number, dy: number, display: DisplayRect): Point {
  return {
    x: display.width > 0 ? dx / display.width : 0,
    y: display.height > 0 ? dy / display.height : 0,
  };
}

export function rectFromPoints(
  start: Point,
  end: Point,
  minimum = MIN_RECT_SIZE,
): EditorRect | null {
  const x1 = clamp(start.x, 0, 1);
  const y1 = clamp(start.y, 0, 1);
  const x2 = clamp(end.x, 0, 1);
  const y2 = clamp(end.y, 0, 1);
  const x = Math.min(x1, x2);
  const y = Math.min(y1, y2);
  const w = Math.abs(x2 - x1);
  const h = Math.abs(y2 - y1);
  if (w < minimum || h < minimum) {
    return null;
  }
  return { x, y, w, h };
}

export function clampRect(rect: EditorRect, minimum = MIN_RECT_SIZE): EditorRect {
  const w = clamp(rect.w, minimum, 1);
  const h = clamp(rect.h, minimum, 1);
  return {
    x: clamp(rect.x, 0, 1 - w),
    y: clamp(rect.y, 0, 1 - h),
    w,
    h,
  };
}

export function moveRect(rect: EditorRect, dx: number, dy: number): EditorRect {
  return {
    x: clamp(rect.x + dx, 0, 1 - rect.w),
    y: clamp(rect.y + dy, 0, 1 - rect.h),
    w: rect.w,
    h: rect.h,
  };
}

export function resizeRect(
  rect: EditorRect,
  handle: ResizeHandle,
  dx: number,
  dy: number,
  minimum = MIN_RECT_SIZE,
): EditorRect {
  let left = rect.x;
  let top = rect.y;
  let right = rect.x + rect.w;
  let bottom = rect.y + rect.h;

  if (handle.includes("w")) {
    left = clamp(left + dx, 0, right - minimum);
  }
  if (handle.includes("e")) {
    right = clamp(right + dx, left + minimum, 1);
  }
  if (handle.includes("n")) {
    top = clamp(top + dy, 0, bottom - minimum);
  }
  if (handle.includes("s")) {
    bottom = clamp(bottom + dy, top + minimum, 1);
  }

  return {
    x: left,
    y: top,
    w: right - left,
    h: bottom - top,
  };
}

export function fitZoom(
  viewportWidth: number,
  viewportHeight: number,
  imageWidth: number,
  imageHeight: number,
  padding = 0.95,
): number {
  if (imageWidth <= 0 || imageHeight <= 0) {
    return 1;
  }
  return clampZoom(
    Math.min((viewportWidth * padding) / imageWidth, (viewportHeight * padding) / imageHeight),
  );
}

export type PercentRect = { x: number; y: number; w: number; h: number };

export function rectToPercent(rect: EditorRect): PercentRect {
  const round = (value: number) => Math.round(value * 10000) / 100;
  return {
    x: round(rect.x),
    y: round(rect.y),
    w: round(rect.w),
    h: round(rect.h),
  };
}

export function percentToRect(percent: PercentRect): EditorRect {
  return {
    x: percent.x / 100,
    y: percent.y / 100,
    w: percent.w / 100,
    h: percent.h / 100,
  };
}
