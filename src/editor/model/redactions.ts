import type {
  EditorProject,
  EditorRect,
  EditorRedaction,
} from "./editor-types";

export const REDACTION_DEFAULT_INTENSITY = 60;

export function redactionsForAsset(
  document: EditorProject,
  assetId: string | undefined,
): EditorRedaction[] {
  if (!assetId) return [];
  return document.redactions?.find((group) => group.assetId === assetId)?.items ?? [];
}

export function createRedaction(input: {
  rect: EditorRect;
  style?: EditorRedaction["style"];
  intensity?: number;
}): EditorRedaction {
  return {
    id: `difuminado-${crypto.randomUUID()}`,
    rect: input.rect,
    style: input.style ?? "solid",
    intensity: input.intensity ?? REDACTION_DEFAULT_INTENSITY,
  };
}
