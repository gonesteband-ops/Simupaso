import { projectSchema } from "../contract/project-schema";
import type { Project } from "../contract/project";
import { createScorm12Adapter, findScorm12Api } from "../scorm/scorm12-adapter";
import { createPlayerRuntime } from "./runtime";

function resolveLocalUrl(value: string, base: string, source: string): URL {
  if (value.includes("\\") || /^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith("//")) {
    throw new Error(`La ruta de ${source} debe ser relativa al paquete.`);
  }
  const result = new URL(value, base);
  if (result.origin !== window.location.origin) {
    throw new Error(`La ruta de ${source} debe pertenecer al paquete local.`);
  }
  return result;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "No se pudo abrir esta simulación.";
}

async function loadProject(): Promise<{ project: Project; rootUrl: URL }> {
  const params = new URLSearchParams(window.location.search);
  const rootUrl = resolveLocalUrl(params.get("root") ?? "./", document.baseURI, "raíz");
  const projectUrl = resolveLocalUrl(
    params.get("project") ?? "./data/project.json",
    document.baseURI,
    "proyecto",
  );
  const response = await fetch(projectUrl);
  if (!response.ok) {
    throw new Error(`No se pudo cargar el proyecto (${response.status}).`);
  }
  const input: unknown = await response.json();
  const result = projectSchema.safeParse(input);
  if (!result.success) {
    throw new Error(`El proyecto no es válido: ${result.error.issues[0]?.message}`);
  }
  return { project: result.data, rootUrl };
}

async function start(): Promise<void> {
  try {
    const { project, rootUrl } = await loadProject();
    const root = document.querySelector<HTMLElement>("#player");
    if (!root) {
      throw new Error("No se encontró el contenedor del reproductor.");
    }
    const lms = createScorm12Adapter(findScorm12Api());
    createPlayerRuntime(root, {
      project,
      lms,
      resolveAssetUrl: (asset) => resolveLocalUrl(asset.file, rootUrl.href, "imagen").href,
    });
  } catch (error) {
    const root = document.querySelector<HTMLElement>("#player");
    if (!root) throw error;
    const message = document.createElement("p");
    message.className = "fatal-error";
    message.setAttribute("role", "alert");
    message.textContent = errorMessage(error);
    root.replaceChildren(message);
  }
}

void start();
