import type { EditorRedaction } from "./editor-types";

type Region = { x: number; y: number; w: number; h: number };

function regionFor(redaction: EditorRedaction, width: number, height: number): Region {
  const x = Math.max(0, Math.min(width - 1, Math.round(redaction.rect.x * width)));
  const y = Math.max(0, Math.min(height - 1, Math.round(redaction.rect.y * height)));
  const w = Math.max(1, Math.min(width - x, Math.round(redaction.rect.w * width)));
  const h = Math.max(1, Math.min(height - y, Math.round(redaction.rect.h * height)));
  return { x, y, w, h };
}

function pixelate(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  region: Region,
  intensity: number,
): void {
  const blockSize = Math.max(4, Math.round(Math.min(region.w, region.h) * (intensity / 100) * 0.5));
  const columns = Math.max(1, Math.ceil(region.w / blockSize));
  const rows = Math.max(1, Math.ceil(region.h / blockSize));
  const small = document.createElement("canvas");
  small.width = columns;
  small.height = rows;
  const smallContext = small.getContext("2d");
  if (!smallContext) return;
  smallContext.imageSmoothingEnabled = false;
  smallContext.drawImage(source, region.x, region.y, region.w, region.h, 0, 0, columns, rows);
  context.save();
  context.imageSmoothingEnabled = false;
  context.drawImage(small, 0, 0, columns, rows, region.x, region.y, region.w, region.h);
  context.restore();
}

function blur(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  region: Region,
  intensity: number,
): void {
  const radius = Math.min(80, Math.max(4, Math.round(Math.min(region.w, region.h) * (intensity / 100) * 0.7)));
  context.save();
  context.beginPath();
  context.rect(region.x, region.y, region.w, region.h);
  context.clip();
  context.filter = `blur(${radius}px)`;
  context.drawImage(source, 0, 0);
  context.restore();
}

export async function applyRedactionsToImage(
  source: Blob,
  redactions: readonly EditorRedaction[],
): Promise<Blob> {
  if (redactions.length === 0) {
    return source;
  }
  if (typeof createImageBitmap !== "function") {
    throw new Error("Este navegador no puede procesar el difuminado de imágenes.");
  }

  const bitmap = await createImageBitmap(source, { imageOrientation: "from-image" });
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("No se pudo preparar el lienzo para difuminar.");
    }
    context.drawImage(bitmap, 0, 0);

    for (const redaction of redactions) {
      const region = regionFor(redaction, bitmap.width, bitmap.height);
      if (redaction.style === "solid") {
        context.fillStyle = "#111827";
        context.fillRect(region.x, region.y, region.w, region.h);
      } else if (redaction.style === "pixelate") {
        pixelate(context, bitmap, region, redaction.intensity);
      } else if (typeof context.filter === "string") {
        blur(context, bitmap, region, redaction.intensity);
      } else {
        pixelate(context, bitmap, region, redaction.intensity);
      }
    }

    const type =
      source.type === "image/png"
        ? "image/png"
        : source.type === "image/webp"
          ? "image/webp"
          : "image/jpeg";
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("No se pudo generar la imagen difuminada."));
        },
        type,
        0.92,
      );
    });
  } finally {
    bitmap.close();
  }
}
