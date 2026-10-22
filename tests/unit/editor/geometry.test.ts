import { describe, expect, it } from "vitest";
import {
  clampRect,
  clientToNormalized,
  fitZoom,
  moveRect,
  normalizeDelta,
  percentToRect,
  rectFromPoints,
  rectToPercent,
  resizeRect,
} from "../../../src/editor/model/geometry";

const imageRect = { left: 100, top: 50, width: 400, height: 200 };

describe("geometría del lienzo", () => {
  it("convierte un punto de pantalla a coordenadas normalizadas", () => {
    expect(clientToNormalized(300, 150, imageRect)).toEqual({ x: 0.5, y: 0.5 });
  });

  it("recorta un punto fuera de la imagen a sus límites", () => {
    expect(clientToNormalized(0, 0, imageRect)).toEqual({ x: 0, y: 0 });
    expect(clientToNormalized(600, 400, imageRect)).toEqual({ x: 1, y: 1 });
  });

  it("construye un rectángulo desde dos puntos en cualquier dirección", () => {
    expect(rectFromPoints({ x: 0.2, y: 0.2 }, { x: 0.5, y: 0.4 })).toEqual({
      x: 0.2,
      y: 0.2,
      w: expect.closeTo(0.3, 6),
      h: expect.closeTo(0.2, 6),
    });
    expect(rectFromPoints({ x: 0.5, y: 0.4 }, { x: 0.2, y: 0.2 })).toMatchObject({
      x: 0.2,
      y: 0.2,
    });
  });

  it("rechaza un rectángulo demasiado pequeño", () => {
    expect(rectFromPoints({ x: 0.2, y: 0.2 }, { x: 0.201, y: 0.201 })).toBeNull();
  });

  it("recorta el arrastre a los bordes de la imagen", () => {
    expect(rectFromPoints({ x: 0.8, y: 0.8 }, { x: 1.4, y: 1.4 })).toMatchObject({
      x: 0.8,
      y: 0.8,
      w: expect.closeTo(0.2, 6),
      h: expect.closeTo(0.2, 6),
    });
  });

  it("limita un rectángulo mayor que la imagen", () => {
    expect(clampRect({ x: -0.2, y: -0.1, w: 1.5, h: 1.4 })).toEqual({
      x: 0,
      y: 0,
      w: 1,
      h: 1,
    });
  });

  it("mueve un rectángulo sin salir de la imagen", () => {
    expect(moveRect({ x: 0.1, y: 0.1, w: 0.2, h: 0.2 }, 0.5, 0.5)).toEqual({
      x: 0.6,
      y: 0.6,
      w: 0.2,
      h: 0.2,
    });
    expect(moveRect({ x: 0.1, y: 0.1, w: 0.2, h: 0.2 }, 1, 1)).toEqual({
      x: 0.8,
      y: 0.8,
      w: 0.2,
      h: 0.2,
    });
  });

  it("redimensiona desde cada manija respetando el tamaño mínimo", () => {
    const rect = { x: 0.2, y: 0.2, w: 0.4, h: 0.4 };
    expect(resizeRect(rect, "se", 0.1, 0.1)).toMatchObject({
      x: 0.2,
      y: 0.2,
      w: expect.closeTo(0.5, 6),
      h: expect.closeTo(0.5, 6),
    });
    expect(resizeRect(rect, "nw", -0.1, -0.1)).toMatchObject({
      x: expect.closeTo(0.1, 6),
      y: expect.closeTo(0.1, 6),
      w: expect.closeTo(0.5, 6),
      h: expect.closeTo(0.5, 6),
    });
    expect(resizeRect(rect, "se", -1, -1)).toMatchObject({
      w: expect.any(Number),
      h: expect.any(Number),
    });
    const tiny = resizeRect(rect, "se", -10, -10);
    expect(tiny.w).toBeGreaterThan(0);
    expect(tiny.h).toBeGreaterThan(0);
  });

  it("convierte deltas de pantalla a coordenadas normalizadas", () => {
    expect(normalizeDelta(40, 20, imageRect)).toEqual({ x: 0.1, y: 0.1 });
  });

  it("calcula un zoom de ajuste con margen y respeta los límites", () => {
    expect(fitZoom(800, 400, 1600, 800, 0.95)).toBeCloseTo(0.475, 6);
    expect(fitZoom(10, 10, 1600, 800)).toBeGreaterThanOrEqual(0.1);
    expect(fitZoom(100000, 100000, 10, 10)).toBeLessThanOrEqual(4);
  });

  it("convierte coordenadas a porcentajes editables y de vuelta", () => {
    const rect = { x: 0.1234, y: 0.5, w: 0.25, h: 0.1 };
    const percent = rectToPercent(rect);
    expect(percent).toEqual({ x: 12.34, y: 50, w: 25, h: 10 });
    const back = percentToRect(percent);
    expect(back.x).toBeCloseTo(rect.x, 6);
    expect(back.y).toBeCloseTo(rect.y, 6);
    expect(back.w).toBeCloseTo(rect.w, 6);
    expect(back.h).toBeCloseTo(rect.h, 6);
  });
});
