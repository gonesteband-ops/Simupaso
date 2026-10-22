import type { EditorAsset, EditorAssetMime } from "./editor-types";
import {
  extensionForMime,
  sortImageFiles,
  validateImageCandidate,
} from "./image-rules";

export type ImageIngestResult =
  | { ok: true; asset: EditorAsset }
  | { ok: false; fileName: string; message: string };

async function decodeWithImageElement(file: File): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    const loaded = new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("No se pudo leer la imagen."));
    });
    image.src = url;
    await loaded;
    if (typeof image.decode === "function") {
      await image.decode().catch(() => undefined);
    }
    return { width: image.naturalWidth, height: image.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function readImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      try {
        return { width: bitmap.width, height: bitmap.height };
      } finally {
        bitmap.close();
      }
    } catch {
      // Algunos navegadores no aceptan opciones o el archivo; se usa el respaldo.
    }
  }
  return decodeWithImageElement(file);
}

export async function ingestImageFile(
  file: File,
  projectId: string,
): Promise<ImageIngestResult> {
  const problem = validateImageCandidate({ name: file.name, type: file.type, size: file.size });
  if (problem) {
    return { ok: false, fileName: file.name, message: problem };
  }

  let dimensions: { width: number; height: number };
  try {
    dimensions = await readImageDimensions(file);
  } catch {
    return {
      ok: false,
      fileName: file.name,
      message: `No se pudo leer la imagen «${file.name}». Verifica que no esté dañada.`,
    };
  }

  if (dimensions.width <= 0 || dimensions.height <= 0) {
    return {
      ok: false,
      fileName: file.name,
      message: `La imagen «${file.name}» no tiene dimensiones válidas.`,
    };
  }

  const mime = file.type as EditorAssetMime;
  return {
    ok: true,
    asset: {
      id: `captura-${crypto.randomUUID()}`,
      projectId,
      blob: file,
      mime,
      width: dimensions.width,
      height: dimensions.height,
      sizeBytes: file.size,
      name: file.name,
      createdAt: new Date().toISOString(),
    },
  };
}

export function orderImageFiles(files: readonly File[]): File[] {
  return sortImageFiles(files);
}

export function suggestedStepTitle(file: File): string {
  const dot = file.name.lastIndexOf(".");
  const base = dot > 0 ? file.name.slice(0, dot) : file.name;
  return base.trim() || `Captura ${extensionForMime(file.type as EditorAssetMime)}`;
}
