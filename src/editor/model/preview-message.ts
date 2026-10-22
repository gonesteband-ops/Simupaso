import type { Project } from "../../contract/project";
import type { EditorAsset } from "./editor-types";

export const PREVIEW_READY = "simupaso:preview:ready";
export const PREVIEW_LOAD = "simupaso:preview:load";
export const PREVIEW_MOUNTED = "simupaso:preview:mounted";
export const PREVIEW_ERROR = "simupaso:preview:error";

export type PreviewLoadMessage = {
  type: typeof PREVIEW_LOAD;
  requestId: string;
  project: Project;
  assets: Record<string, string>;
  initialStepIndex: number;
};

export type PreviewReadyMessage = {
  type: typeof PREVIEW_READY;
};

export type PreviewMountedMessage = {
  type: typeof PREVIEW_MOUNTED;
  requestId: string;
};

export type PreviewErrorMessage = {
  type: typeof PREVIEW_ERROR;
  requestId: string;
  message: string;
};

export type PreviewToEditorMessage =
  | PreviewReadyMessage
  | PreviewMountedMessage
  | PreviewErrorMessage;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isPreviewLoadMessage(value: unknown): value is PreviewLoadMessage {
  if (!isRecord(value)) return false;
  if (value.type !== PREVIEW_LOAD) return false;
  if (typeof value.requestId !== "string" || value.requestId.length === 0) return false;
  if (!isRecord(value.project)) return false;
  if (!isRecord(value.assets)) return false;
  if (
    !Object.values(value.assets).every(
      (url) => typeof url === "string" && url.length > 0,
    )
  ) {
    return false;
  }
  if (
    typeof value.initialStepIndex !== "number" ||
    !Number.isInteger(value.initialStepIndex) ||
    value.initialStepIndex < 0
  ) {
    return false;
  }
  return true;
}

export function parsePreviewToEditorMessage(
  value: unknown,
): PreviewToEditorMessage | null {
  if (!isRecord(value)) return null;
  if (value.type === PREVIEW_READY) {
    return { type: PREVIEW_READY };
  }
  if (
    value.type === PREVIEW_MOUNTED &&
    typeof value.requestId === "string" &&
    value.requestId.length > 0
  ) {
    return { type: PREVIEW_MOUNTED, requestId: value.requestId };
  }
  if (
    value.type === PREVIEW_ERROR &&
    typeof value.requestId === "string" &&
    value.requestId.length > 0 &&
    typeof value.message === "string"
  ) {
    return { type: PREVIEW_ERROR, requestId: value.requestId, message: value.message };
  }
  return null;
}

export function buildPreviewAssetUrls(
  project: Project,
  assets: readonly EditorAsset[],
  createUrl: (blob: Blob) => string = (blob) => URL.createObjectURL(blob),
): Record<string, string> {
  const byId = new Map(assets.map((asset) => [asset.id, asset]));
  const urls: Record<string, string> = {};
  for (const asset of project.assets) {
    const source = byId.get(asset.id);
    if (source) urls[asset.id] = createUrl(source.blob);
  }
  return urls;
}

export function missingPreviewAssets(
  project: Project,
  assets: readonly Pick<EditorAsset, "id">[],
): string[] {
  const ids = new Set(assets.map((asset) => asset.id));
  return project.assets.filter((asset) => !ids.has(asset.id)).map((asset) => asset.id);
}
