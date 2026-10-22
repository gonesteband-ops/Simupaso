import { createScorm12Package } from "../../exporter/create-scorm12-package";
import {
  decodePlayerBundle,
  type PlayerBundle,
} from "../../exporter/player-bundle";
import { compileEditorProject } from "./compile-project";
import { applyRedactionsToImage } from "./redact-image";
import { redactionsForAsset } from "./redactions";
import type { EditorAsset, EditorIssue, EditorProject } from "./editor-types";

export type ExportScormResult =
  | { ok: true; fileName: string; bytes: Uint8Array }
  | { ok: false; issues: EditorIssue[] };

export type ExportScormOptions = {
  playerBundle?: PlayerBundle;
};

export async function exportEditorProject(
  document: EditorProject,
  assets: readonly EditorAsset[],
  options: ExportScormOptions = {},
): Promise<ExportScormResult> {
  const compiled = compileEditorProject(document, assets);
  if (!compiled.ok) {
    return { ok: false, issues: compiled.issues };
  }

  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  const projectAssets = [];
  for (const definition of compiled.project.assets) {
    const source = assetsById.get(definition.id);
    if (!source) {
      return {
        ok: false,
        issues: [
          {
            field: "assets",
            message: `Falta la captura local del asset «${definition.id}».`,
          },
        ],
      };
    }
    const redactions = redactionsForAsset(document, definition.id);
    const blob =
      redactions.length > 0
        ? await applyRedactionsToImage(source.blob, redactions)
        : source.blob;
    projectAssets.push({
      id: definition.id,
      file: definition.file,
      mime: definition.mime,
      bytes: new Uint8Array(await blob.arrayBuffer()),
    });
  }

  try {
    let playerBundle = options.playerBundle;
    if (!playerBundle) {
      const stored = await import("../../exporter/player-bundle.json");
      playerBundle = decodePlayerBundle(stored.default);
    }
    const output = createScorm12Package({
      project: compiled.project,
      assets: projectAssets,
      playerBundle,
    });
    return { ok: true, fileName: output.fileName, bytes: output.bytes };
  } catch (error) {
    return {
      ok: false,
      issues: [
        {
          field: "export",
          message:
            error instanceof Error
              ? `No se pudo generar el paquete SCORM: ${error.message}`
              : "No se pudo generar el paquete SCORM.",
        },
      ],
    };
  }
}

export function downloadBytes(fileName: string, bytes: Uint8Array): void {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const blob = new Blob([buffer], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
