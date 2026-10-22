import { zipSync } from "fflate";
import { projectSchema } from "../contract/project-schema";
import type { Project } from "../contract/project";
import { buildManifest } from "./manifest";
import type { PlayerBundle } from "./player-bundle";

export type ProjectAsset = {
  id: string;
  file: string;
  mime: string;
  bytes: Uint8Array;
};

export type ScormPackageInput = {
  project: unknown;
  assets: ProjectAsset[];
  playerBundle: PlayerBundle;
};

export type ScormPackageOutput = {
  fileName: string;
  mimeType: "application/zip";
  bytes: Uint8Array;
};

const fixedMtime = new Date("2000-01-01T00:00:00.000Z");
const htmlResourceAttribute = /\b(src|href)\s*=\s*(["'])(.*?)\2/gi;

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value
      .map((item) => (item === undefined ? "null" : stableJson(item)))
      .join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const object = value as Record<string, unknown>;
    const properties = Object.keys(object)
      .filter((key) => object[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(object[key])}`);
    return `{${properties.join(",")}}`;
  }
  const serialized = JSON.stringify(value);
  return serialized === undefined ? "null" : serialized;
}

function normalizeLocalPath(path: string, source: string): string {
  if (
    path.length === 0 ||
    path.startsWith("/") ||
    path.includes("\\") ||
    path.includes("\0") ||
    path.includes("?") ||
    path.includes("#") ||
    /^[a-z][a-z\d+.-]*:/i.test(path)
  ) {
    throw new Error(`La ruta "${path}" de ${source} debe ser relativa y usar "/".`);
  }
  const segments = path.replace(/^\.\//, "").split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    throw new Error(`La ruta "${path}" de ${source} no es segura.`);
  }
  return segments.join("/");
}

function makeSlug(title: string): string {
  const slug = title
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "simulador";
}

function validateAssets(project: Project, assets: ProjectAsset[]): Map<string, ProjectAsset> {
  const assetsById = new Map<string, ProjectAsset>();
  const paths = new Set<string>();
  for (const asset of assets) {
    if (assetsById.has(asset.id)) {
      throw new Error(`El asset "${asset.id}" está duplicado.`);
    }
    const path = normalizeLocalPath(asset.file, "asset");
    if (
      path === "index.html" ||
      path === "imsmanifest.xml" ||
      path === "data/project.json" ||
      path.startsWith("player/")
    ) {
      throw new Error(`La ruta "${path}" colisiona con un archivo reservado del paquete.`);
    }
    if (paths.has(path)) {
      throw new Error(`La ruta "${path}" está duplicada en los assets.`);
    }
    paths.add(path);
    if (asset.bytes.byteLength === 0) {
      throw new Error(`El asset "${asset.id}" no contiene datos.`);
    }
    assetsById.set(asset.id, asset);
  }

  if (assetsById.size !== project.assets.length) {
    throw new Error("La cantidad de assets no coincide con el contrato del proyecto.");
  }
  for (const definition of project.assets) {
    const content = assetsById.get(definition.id);
    if (
      !content ||
      content.file !== definition.file ||
      content.mime !== definition.mime
    ) {
      throw new Error(`Falta el asset "${definition.id}" o sus metadatos no coinciden.`);
    }
  }
  return assetsById;
}

function preparePlayerBundle(bundle: PlayerBundle): Map<string, Uint8Array> {
  const files = new Map<string, Uint8Array>();
  for (const entry of bundle) {
    const path = normalizeLocalPath(entry.path, "bundle del reproductor");
    if (path.startsWith("player/") || path === "imsmanifest.xml" || path === "data/project.json") {
      throw new Error(`La ruta "${path}" colisiona con un archivo reservado del paquete.`);
    }
    if (files.has(path)) {
      throw new Error(`La ruta "${path}" del bundle está duplicada.`);
    }
    files.set(path, entry.bytes);
  }
  if (!files.has("index.html")) {
    throw new Error('El bundle del reproductor debe incluir "index.html".');
  }

  const resolveReference = (sourcePath: string, target: string): string => {
    const cleanTarget = target.split(/[?#]/, 1)[0];
    if (
      cleanTarget.length === 0 ||
      cleanTarget.startsWith("/") ||
      cleanTarget.includes("\\") ||
      /^[a-z][a-z\d+.-]*:/i.test(cleanTarget)
    ) {
      throw new Error(`El recurso "${target}" de "${sourcePath}" debe ser local y relativo.`);
    }
    const segments = sourcePath.split("/").slice(0, -1);
    for (const segment of cleanTarget.split("/")) {
      if (segment === "" || segment === ".") continue;
      if (segment === "..") {
        if (segments.length === 0) {
          throw new Error(`El recurso "${target}" de "${sourcePath}" escapa del bundle.`);
        }
        segments.pop();
      } else {
        segments.push(segment);
      }
    }
    return segments.join("/");
  };

  const html = new TextDecoder().decode(files.get("index.html"));
  const rebasedHtml = html.replace(htmlResourceAttribute, (match, attribute, quote, rawPath) => {
    if (rawPath.startsWith("#")) {
      return match;
    }
    const path = normalizeLocalPath(rawPath, "HTML de entrada");
    if (!files.has(path)) {
      throw new Error(`El recurso "${rawPath}" del HTML no está en el bundle.`);
    }
    return `${attribute}=${quote}./player/${path}${quote}`;
  });
  const cssReferencePattern = /(?:url\(\s*(["']?)(.*?)\1\s*\)|@import\s+(?:url\(\s*)?(["'])(.*?)\3\s*\)?)/gi;
  for (const [sourcePath, bytes] of files) {
    if (!sourcePath.endsWith(".css")) continue;
    const css = new TextDecoder().decode(bytes);
    for (const match of css.matchAll(cssReferencePattern)) {
      const target = match[2] ?? match[4] ?? "";
      if (/^data:/i.test(target)) continue;
      const resolved = resolveReference(sourcePath, target);
      if (!files.has(resolved)) {
        throw new Error(`El recurso "${target}" de "${sourcePath}" no está en el bundle.`);
      }
    }
  }
  files.set("index.html", new TextEncoder().encode(rebasedHtml));
  return files;
}

function asZipEntries(files: Map<string, Uint8Array>) {
  const sortedPaths = [...files.keys()].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const entries = Object.create(null) as Record<
    string,
    [Uint8Array, { level: 9; mtime: Date }]
  >;
  for (const path of sortedPaths) {
    entries[path] = [files.get(path)!, { level: 9, mtime: fixedMtime }];
  }
  return entries;
}

export function createScorm12Package(input: ScormPackageInput): ScormPackageOutput {
  const result = projectSchema.safeParse(input.project);
  if (!result.success) {
    throw new Error(`El proyecto no cumple el contrato: ${result.error.issues[0]?.message}`);
  }
  const project = result.data;
  const assetContent = validateAssets(project, input.assets);
  const playerFiles = preparePlayerBundle(input.playerBundle);
  const packageFiles = new Map<string, Uint8Array>();

  for (const [path, bytes] of playerFiles) {
    packageFiles.set(path === "index.html" ? path : `player/${path}`, bytes);
  }
  packageFiles.set("data/project.json", new TextEncoder().encode(stableJson(project)));
  for (const asset of project.assets) {
    packageFiles.set(asset.file, assetContent.get(asset.id)!.bytes);
  }
  const manifest = buildManifest(project, [...packageFiles.keys()]);
  packageFiles.set("imsmanifest.xml", new TextEncoder().encode(manifest));

  return {
    fileName: `simulador-${makeSlug(project.meta.title)}-v${project.meta.version}.zip`,
    mimeType: "application/zip",
    bytes: zipSync(asZipEntries(packageFiles)),
  };
}
