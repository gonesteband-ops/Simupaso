import { unzipSync } from "fflate";
import { z } from "zod";
import { projectSchema } from "../../contract/project-schema";
import type { InputAction, Project } from "../../contract/project";
import { editorProjectSchema } from "../model/editor-schema";
import { isAcceptedImageMime } from "../model/image-rules";
import type {
  EditorAsset,
  EditorAssetMime,
  EditorClickZone,
  EditorProject,
  EditorStep,
  EditorTextValidation,
  EditorTextZone,
} from "../model/editor-types";

const MAX_ZIP_BYTES = 200 * 1024 * 1024;
const MAX_UNCOMPRESSED_BYTES = 500 * 1024 * 1024;
const MAX_ASSET_BYTES = 10 * 1024 * 1024;

const backupAssetSchema = z
  .object({
    id: z.string().min(1),
    file: z.string().min(1),
    mime: z.enum(["image/png", "image/jpeg", "image/webp"]),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    sizeBytes: z.number().int().positive(),
    name: z.string().min(1),
    createdAt: z.string().min(1),
  })
  .strict();

const backupSchema = z
  .object({
    format: z.literal("simupaso-backup"),
    version: z.number().int().positive(),
    exportedAt: z.string().min(1),
    project: editorProjectSchema,
    assets: z.array(backupAssetSchema),
  })
  .strict();

export type ImportKind = "backup" | "scorm";

export type ImportedProject = {
  kind: ImportKind;
  document: EditorProject;
  assets: EditorAsset[];
  warnings: string[];
};

export class ImportProjectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportProjectError";
  }
}

function decodeJson(bytes: Uint8Array, label: string): unknown {
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new ImportProjectError(`El archivo ${label} no contiene JSON válido.`);
  }
}

function assetBytes(
  files: Record<string, Uint8Array>,
  path: string,
): Uint8Array {
  if (!path.startsWith("assets/") || path.includes("..") || path.includes("\\")) {
    throw new ImportProjectError(`La ruta de imagen "${path}" no es segura.`);
  }
  const bytes = files[path];
  if (!bytes) {
    throw new ImportProjectError(`No se encontró la imagen "${path}" dentro del paquete.`);
  }
  if (bytes.byteLength > MAX_ASSET_BYTES) {
    throw new ImportProjectError(
      `La imagen "${path}" supera el límite de 10 MB del editor.`,
    );
  }
  return bytes;
}

function blobFrom(bytes: Uint8Array, mime: EditorAssetMime): Blob {
  const copy = new Uint8Array(bytes);
  return new Blob([copy.buffer], { type: mime });
}

function basename(path: string): string {
  return path.split("/").pop() || "captura";
}

function mapValidation(input: InputAction["validation"]): EditorTextValidation {
  if (input.kind === "non_empty") return { kind: "non_empty" };
  if (input.kind === "equals") return { kind: "equals", expected: input.expected };
  if (input.kind === "one_of") return { kind: "one_of", values: [...input.values] };
  return { kind: "rut", normalize: input.normalize ?? false };
}

function remapAssets(
  document: EditorProject,
  sourceAssets: readonly EditorAsset[],
  projectId: string,
  warnings: string[],
): { document: EditorProject; assets: EditorAsset[] } {
  const idMap = new Map<string, string>();
  const assets = sourceAssets.map((asset) => {
    const id = `captura-${crypto.randomUUID()}`;
    idMap.set(asset.id, id);
    return { ...asset, id, projectId };
  });

  const steps = document.steps.map((step) => {
    const assetId = idMap.get(step.assetId);
    if (!assetId) {
      throw new ImportProjectError(
        `El paso "${step.title}" referencia una imagen que no viene en el paquete.`,
      );
    }
    return { ...step, assetId };
  });

  const redactions = (document.redactions ?? []).flatMap((group) => {
    const assetId = idMap.get(group.assetId);
    if (!assetId) {
      warnings.push("Se omitió un grupo de difuminado sin imagen asociada.");
      return [];
    }
    return [{ ...group, assetId }];
  });

  const now = new Date().toISOString();
  const next: EditorProject = {
    ...document,
    id: projectId,
    meta: { ...document.meta, updatedAt: now },
    steps,
    redactions,
  };
  const parsed = editorProjectSchema.safeParse(next);
  if (!parsed.success) {
    throw new ImportProjectError(
      `El proyecto importado no es válido: ${parsed.error.issues[0]?.message ?? "sin detalle"}.`,
    );
  }
  return { document: parsed.data, assets };
}

function importBackup(
  files: Record<string, Uint8Array>,
  projectId: string,
): ImportedProject {
  const parsed = backupSchema.safeParse(decodeJson(files["backup.json"], "backup.json"));
  if (!parsed.success) {
    throw new ImportProjectError(
      `El respaldo no tiene el formato esperado: ${parsed.error.issues[0]?.message ?? "sin detalle"}.`,
    );
  }
  if (parsed.data.version > 1) {
    throw new ImportProjectError(
      `El respaldo usa una versión más nueva (${parsed.data.version}) que esta app.`,
    );
  }

  const warnings: string[] = [];
  const assets = parsed.data.assets.map((entry) => {
    const mime = entry.mime as EditorAssetMime;
    if (!isAcceptedImageMime(mime)) {
      throw new ImportProjectError(`La imagen "${entry.name}" no es PNG, JPG o WebP.`);
    }
    const bytes = assetBytes(files, entry.file);
    return {
      id: entry.id,
      projectId: "",
      blob: blobFrom(bytes, mime),
      mime,
      width: entry.width,
      height: entry.height,
      sizeBytes: bytes.byteLength,
      name: entry.name,
      createdAt: entry.createdAt,
    } satisfies EditorAsset;
  });

  const remapped = remapAssets(parsed.data.project, assets, projectId, warnings);
  return {
    kind: "backup",
    document: remapped.document,
    assets: remapped.assets,
    warnings,
  };
}

function projectToEditor(project: Project): EditorProject {
  const now = new Date().toISOString();
  const steps: EditorStep[] = project.steps.map((step) => {
    const clickActions = step.actions.filter((action) => action.type === "click");
    const inputActions = step.actions.filter(
      (action): action is InputAction => action.type === "input",
    );
    const informative =
      step.actions.length === 1 && step.actions[0]?.type === "informative"
        ? step.actions[0]
        : null;

    const clickZones: EditorClickZone[] = clickActions.flatMap((action) =>
      action.rects.map((rect) => ({
        id: `zona-${crypto.randomUUID()}`,
        rect: { ...rect },
      })),
    );
    const textZones: EditorTextZone[] = inputActions.map((action) => ({
      id: `texto-${crypto.randomUUID()}`,
      rect: { ...action.rect },
      label: action.label,
      placeholder: action.placeholder,
      masked: action.masked ?? false,
      validation: mapValidation(action.validation),
      fontSize: action.fontSize,
      errorMessage: action.messages?.error,
      successMessage: action.messages?.success,
    }));

    return {
      id: step.id,
      title: step.title,
      instruction: step.instruction,
      hint: step.hint,
      assetId: step.assetId,
      mode: informative ? "informative" : "interactive",
      informativeButtonLabel: informative?.buttonLabel,
      messages: step.messages,
      clickZones,
      clickMatch: clickActions[0]?.match ?? "any",
      textZones,
    };
  });

  return {
    schemaVersion: "editor-1",
    id: "pending-import",
    meta: {
      title: project.meta.title,
      description: project.meta.description,
      author: project.meta.author,
      language: "es-CL",
      version: project.meta.version,
      createdAt: now,
      updatedAt: now,
    },
    steps,
    redactions: [],
    completion: { ...project.completion },
  };
}

function importScorm(
  files: Record<string, Uint8Array>,
  projectId: string,
): ImportedProject {
  const validation = projectSchema.safeParse(
    decodeJson(files["data/project.json"], "data/project.json"),
  );
  if (!validation.success) {
    throw new ImportProjectError(
      `El SCORM no contiene un proyecto válido de SimuPaso: ${validation.error.issues[0]?.message ?? "sin detalle"}.`,
    );
  }
  const project = validation.data;
  const now = new Date().toISOString();
  const assets = project.assets.map((entry) => {
    if (!isAcceptedImageMime(entry.mime)) {
      throw new ImportProjectError(
        `La imagen "${entry.file}" no es PNG, JPG o WebP y no se puede editar.`,
      );
    }
    const bytes = assetBytes(files, entry.file);
    return {
      id: entry.id,
      projectId: "",
      blob: blobFrom(bytes, entry.mime),
      mime: entry.mime,
      width: entry.width,
      height: entry.height,
      sizeBytes: bytes.byteLength,
      name: basename(entry.file),
      createdAt: now,
    } satisfies EditorAsset;
  });

  const warnings = [
    "El SCORM contiene las imágenes ya procesadas; los difuminados originales no son recuperables. Para conservarlos, usa un respaldo .simpaso.",
  ];
  const source = projectToEditor(project);
  const remapped = remapAssets(source, assets, projectId, warnings);
  return {
    kind: "scorm",
    document: remapped.document,
    assets: remapped.assets,
    warnings,
  };
}

export function importProjectZip(
  bytes: Uint8Array,
  projectId: string,
): ImportedProject {
  if (bytes.byteLength > MAX_ZIP_BYTES) {
    throw new ImportProjectError("El archivo supera el límite de 200 MB para importar.");
  }
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    throw new ImportProjectError("El archivo no es un ZIP válido.");
  }
  const uncompressed = Object.values(files).reduce((total, file) => total + file.byteLength, 0);
  if (uncompressed > MAX_UNCOMPRESSED_BYTES) {
    throw new ImportProjectError("El contenido descomprimido del archivo es demasiado grande.");
  }

  if (files["backup.json"]) {
    return importBackup(files, projectId);
  }
  if (files["data/project.json"]) {
    return importScorm(files, projectId);
  }
  throw new ImportProjectError(
    "No se encontró backup.json ni data/project.json. Usa un respaldo .simpaso o un SCORM exportado por SimuPaso.",
  );
}
