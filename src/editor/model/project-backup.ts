import { zipSync } from "fflate";
import type { EditorAsset, EditorProject } from "./editor-types";
import { extensionForMime } from "./image-rules";

export const BACKUP_FORMAT = "simupaso-backup";
export const BACKUP_VERSION = 1;

export type BackupAsset = {
  id: string;
  file: string;
  mime: string;
  width: number;
  height: number;
  sizeBytes: number;
  name: string;
  createdAt: string;
};

export type BackupManifest = {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  project: EditorProject;
  assets: BackupAsset[];
};

export type ProjectBackup = {
  fileName: string;
  bytes: Uint8Array;
};

function safeFileId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "captura";
}

function safeTitle(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[áàäâ]/g, "a")
    .replace(/[éèëê]/g, "e")
    .replace(/[íìïî]/g, "i")
    .replace(/[óòöô]/g, "o")
    .replace(/[úùüû]/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "simulador";
}

export async function createProjectBackup(
  document: EditorProject,
  assets: readonly EditorAsset[],
  exportedAt = new Date().toISOString(),
): Promise<ProjectBackup> {
  const files: Record<string, Uint8Array> = {};
  const manifestAssets: BackupAsset[] = [];

  for (const asset of assets) {
    const file = `assets/${safeFileId(asset.id)}.${extensionForMime(asset.mime)}`;
    files[file] = new Uint8Array(await asset.blob.arrayBuffer());
    manifestAssets.push({
      id: asset.id,
      file,
      mime: asset.mime,
      width: asset.width,
      height: asset.height,
      sizeBytes: asset.sizeBytes,
      name: asset.name,
      createdAt: asset.createdAt,
    });
  }

  const manifest: BackupManifest = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt,
    project: document,
    assets: manifestAssets,
  };

  files["backup.json"] = new TextEncoder().encode(JSON.stringify(manifest, null, 2));
  files["LEEME.txt"] = new TextEncoder().encode(
    [
      "Respaldo editable de SimuPaso Studio.",
      "",
      "Este archivo contiene las capturas originales sin difuminar y los datos editables",
      "del proyecto. No debe subirse al LMS ni compartirse sin las precauciones de datos",
      "personales correspondientes.",
      "",
      "Para editar el proyecto, ábrelo nuevamente en SimuPaso Studio cuando la importación",
      "de respaldos esté disponible.",
    ].join("\n"),
  );

  return {
    fileName: `${safeTitle(document.meta.title)}-respaldo-${exportedAt.slice(0, 10)}.simpaso`,
    bytes: zipSync(files, { level: 6 }),
  };
}
