import { projectSchema } from "../contract/project-schema";
import { createPlayerRuntime, type PlayerRuntimeHandle } from "../player/runtime";
import {
  PREVIEW_ERROR,
  PREVIEW_LOAD,
  PREVIEW_MOUNTED,
  PREVIEW_READY,
  isPreviewLoadMessage,
  type PreviewLoadMessage,
} from "../editor/model/preview-message";
import "../player/player.css";

const root = document.querySelector<HTMLElement>("#preview-root");
let runtime: PlayerRuntimeHandle | null = null;

function postToParent(message: unknown): void {
  window.parent.postMessage(message, window.location.origin);
}

function showError(message: string, requestId: string): void {
  if (root) {
    root.replaceChildren();
    const paragraph = document.createElement("p");
    paragraph.className = "fatal-error";
    paragraph.setAttribute("role", "alert");
    paragraph.textContent = message;
    root.append(paragraph);
  }
  postToParent({ type: PREVIEW_ERROR, requestId, message });
}

function mount(message: PreviewLoadMessage): void {
  if (!root) return;
  const parsed = projectSchema.safeParse(message.project);
  if (!parsed.success) {
    showError(
      `La vista previa recibió un proyecto inválido: ${parsed.error.issues[0]?.message ?? "sin detalle"}.`,
      message.requestId,
    );
    return;
  }
  const project = parsed.data;
  const missing = project.assets.find((asset) => !message.assets[asset.id]);
  if (missing) {
    showError(`Falta la imagen local del asset "${missing.id}".`, message.requestId);
    return;
  }

  runtime?.unmount();
  root.replaceChildren();
  try {
    runtime = createPlayerRuntime(root, {
      project,
      lms: null,
      initialStepIndex: Math.min(message.initialStepIndex, project.steps.length - 1),
      resolveAssetUrl: (asset) => message.assets[asset.id],
    });
    postToParent({ type: PREVIEW_MOUNTED, requestId: message.requestId });
  } catch (error) {
    showError(
      error instanceof Error ? error.message : "No se pudo montar la vista previa.",
      message.requestId,
    );
  }
}

window.addEventListener("message", (event) => {
  if (event.source !== window.parent) return;
  if (event.origin !== window.location.origin) return;
  if (!isPreviewLoadMessage(event.data)) return;
  if (event.data.type !== PREVIEW_LOAD) return;
  mount(event.data);
});

window.addEventListener("beforeunload", () => {
  runtime?.unmount();
});

postToParent({ type: PREVIEW_READY });
