import type { EditorAssetMime } from "./editor-types";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const ACCEPTED_MIME_TYPES: readonly EditorAssetMime[] = [
  "image/png",
  "image/jpeg",
  "image/webp",
];

const collator = new Intl.Collator("es-CL", { numeric: true, sensitivity: "base" });

export function isAcceptedImageMime(mime: string): mime is EditorAssetMime {
  return (ACCEPTED_MIME_TYPES as readonly string[]).includes(mime);
}

export function validateImageCandidate(input: {
  name: string;
  type: string;
  size: number;
}): string | null {
  if (!isAcceptedImageMime(input.type)) {
    return `El archivo «${input.name}» debe ser PNG, JPG o WebP.`;
  }
  if (!Number.isFinite(input.size) || input.size <= 0) {
    return `La imagen «${input.name}» está vacía o no se pudo leer.`;
  }
  if (input.size > MAX_IMAGE_BYTES) {
    return `La imagen «${input.name}» supera el límite de 10 MB.`;
  }
  return null;
}

export function sortImageFiles<T extends { name: string }>(files: readonly T[]): T[] {
  return [...files].sort((left, right) => collator.compare(left.name, right.name));
}

export function extensionForMime(mime: EditorAssetMime): string {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
  }
}
