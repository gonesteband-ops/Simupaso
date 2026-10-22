import { describe, expect, it } from "vitest";
import {
  MAX_IMAGE_BYTES,
  extensionForMime,
  isAcceptedImageMime,
  sortImageFiles,
  validateImageCandidate,
} from "../../../src/editor/model/image-rules";

describe("reglas de imágenes del editor", () => {
  it("acepta PNG, JPG y WebP", () => {
    expect(isAcceptedImageMime("image/png")).toBe(true);
    expect(isAcceptedImageMime("image/jpeg")).toBe(true);
    expect(isAcceptedImageMime("image/webp")).toBe(true);
  });

  it("rechaza SVG, GIF y tipos desconocidos", () => {
    expect(isAcceptedImageMime("image/svg+xml")).toBe(false);
    expect(isAcceptedImageMime("image/gif")).toBe(false);
    expect(isAcceptedImageMime("application/pdf")).toBe(false);
  });

  it("acepta un archivo hasta el límite de 10 MB", () => {
    expect(
      validateImageCandidate({ name: "captura-1.png", type: "image/png", size: MAX_IMAGE_BYTES }),
    ).toBeNull();
  });

  it("rechaza un archivo sobre el límite con un mensaje claro", () => {
    const message = validateImageCandidate({
      name: "captura-grande.png",
      type: "image/png",
      size: MAX_IMAGE_BYTES + 1,
    });
    expect(message).toContain("captura-grande.png");
    expect(message).toContain("10 MB");
  });

  it("rechaza un archivo vacío o de tipo no permitido", () => {
    expect(
      validateImageCandidate({ name: "vacia.png", type: "image/png", size: 0 }),
    ).toContain("vacía");
    expect(
      validateImageCandidate({ name: "vector.svg", type: "image/svg+xml", size: 120 }),
    ).toContain("PNG, JPG o WebP");
  });

  it("ordena por nombre natural en español", () => {
    const files = [
      { name: "captura-10.png" },
      { name: "Captura-2.png" },
      { name: "captura-1.png" },
      { name: "Árbol.png" },
    ];
    expect(sortImageFiles(files).map((file) => file.name)).toEqual([
      "Árbol.png",
      "captura-1.png",
      "Captura-2.png",
      "captura-10.png",
    ]);
  });

  it("deriva una extensión segura desde el MIME", () => {
    expect(extensionForMime("image/png")).toBe("png");
    expect(extensionForMime("image/jpeg")).toBe("jpg");
    expect(extensionForMime("image/webp")).toBe("webp");
  });
});
