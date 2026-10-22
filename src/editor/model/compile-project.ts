import type { Action, Project } from "../../contract/project";
import { projectSchema } from "../../contract/project-schema";
import type {
  EditorAssetMime,
  EditorIssue,
  EditorProject,
  EditorRect,
  EditorStep,
  EditorTextZone,
} from "./editor-types";
import { extensionForMime } from "./image-rules";

export type CompileAsset = {
  id: string;
  mime: EditorAssetMime;
  width: number;
  height: number;
};

export type CompileResult =
  | { ok: true; project: Project }
  | { ok: false; issues: EditorIssue[] };

const completionDefaults = {
  title: "¡Procedimiento completado!",
  message: "Revisaste todos los pasos del simulador.",
};

function rectIsInsideImage(rect: EditorRect): boolean {
  return (
    rect.x >= 0 &&
    rect.y >= 0 &&
    rect.w > 0 &&
    rect.h > 0 &&
    rect.x + rect.w <= 1 &&
    rect.y + rect.h <= 1
  );
}

function safeFileId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "captura";
}

function optionalMessages(error?: string, success?: string) {
  const messages: { error?: string; success?: string } = {};
  if (error?.trim()) messages.error = error.trim();
  if (success?.trim()) messages.success = success.trim();
  return Object.keys(messages).length > 0 ? messages : undefined;
}

function buildInputAction(zone: EditorTextZone): Action {
  const validation =
    zone.validation.kind === "one_of"
      ? {
          kind: "one_of" as const,
          values: zone.validation.values.map((value) => value.trim()).filter(Boolean),
        }
      : zone.validation;
  const placeholder = zone.placeholder?.trim();
  const messages = optionalMessages(zone.errorMessage, zone.successMessage);
  return {
    id: `texto-${zone.id}`,
    type: "input",
    rect: zone.rect,
    label: zone.label.trim(),
    masked: zone.masked,
    validation,
    ...(placeholder ? { placeholder } : {}),
    ...(zone.fontSize !== undefined ? { fontSize: zone.fontSize } : {}),
    ...(messages ? { messages } : {}),
  };
}

function buildStepActions(step: EditorStep, isLast: boolean): Action[] {
  const checkboxZones = step.checkboxZones ?? [];
  if (checkboxZones.length > 0) {
    const actions: Action[] = [
      {
        id: `casillas-${step.id}`,
        type: "checkbox",
        items: checkboxZones.map((zone) => ({
          id: zone.id,
          rect: zone.rect,
          expected: zone.expected,
          ...(zone.label?.trim() ? { label: zone.label.trim() } : {}),
        })),
        rule: "exact",
      },
    ];
    if (step.clickZones.length > 0) {
      actions.push({
        id: `clic-${step.id}`,
        type: "click",
        rects: step.clickZones.map((zone) => zone.rect),
        match: step.clickMatch,
      });
    }
    return actions;
  }

  if (step.mode === "informative") {
    const buttonLabel =
      step.informativeButtonLabel?.trim() || (isLast ? "Finalizar" : "Siguiente");
    return [
      {
        id: `informativo-${step.id}`,
        type: "informative",
        text: step.instruction.trim() || step.title,
        buttonLabel,
      },
    ];
  }

  const actions: Action[] = step.textZones.map(buildInputAction);
  if (step.clickZones.length > 0) {
    actions.push({
      id: `clic-${step.id}`,
      type: "click",
      rects: step.clickZones.map((zone) => zone.rect),
      match: step.clickMatch,
    });
  }
  return actions;
}

function collectIssues(document: EditorProject, assets: readonly CompileAsset[]): EditorIssue[] {
  const issues: EditorIssue[] = [];
  if (document.steps.length === 0) {
    issues.push({
      field: "steps",
      message: "Agrega al menos un paso para previsualizar.",
    });
    return issues;
  }

  const assetIds = new Set(assets.map((asset) => asset.id));

  document.steps.forEach((step, stepIndex) => {
    if (!step.title.trim()) {
      issues.push({
        stepId: step.id,
        field: "title",
        message: `El paso ${stepIndex + 1} necesita un título.`,
      });
    }
    if (!assetIds.has(step.assetId)) {
      issues.push({
        stepId: step.id,
        field: "assetId",
        message: `El paso «${step.title}» no tiene una captura válida.`,
      });
    }

    const checkboxZones = step.checkboxZones ?? [];
    if (checkboxZones.length > 0 && step.textZones.length > 0) {
      issues.push({
        stepId: step.id,
        field: "checkboxZones",
        message: `El paso «${step.title}» no puede mezclar casillas y campos de texto.`,
      });
    }
    if (checkboxZones.length > 0 && step.mode === "informative") {
      issues.push({
        stepId: step.id,
        field: "checkboxZones",
        message: `El paso «${step.title}» tiene casillas; no puede ser informativo.`,
      });
    }

    if (step.mode === "informative") {
      return;
    }

    if (
      step.textZones.length === 0 &&
      step.clickZones.length === 0 &&
      checkboxZones.length === 0
    ) {
      issues.push({
        stepId: step.id,
        field: "zones",
        message: `El paso «${step.title}» necesita una zona de clic o de texto.`,
      });
    }

    step.textZones.forEach((zone) => {
      if (!zone.label.trim()) {
        issues.push({
          stepId: step.id,
          zoneId: zone.id,
          field: "label",
          message: `La zona de texto del paso «${step.title}» necesita una etiqueta.`,
        });
      }
      if (zone.validation.kind === "equals" && !zone.validation.expected.trim()) {
        issues.push({
          stepId: step.id,
          zoneId: zone.id,
          field: "validation.expected",
          message: `Define el valor esperado de la zona «${zone.label || `Zona ${stepIndex + 1}`}».`,
        });
      }
      if (
        zone.validation.kind === "one_of" &&
        zone.validation.values.filter((value) => value.trim()).length === 0
      ) {
        issues.push({
          stepId: step.id,
          zoneId: zone.id,
          field: "validation.values",
          message: `Agrega al menos un valor válido en la zona «${zone.label || `Zona ${stepIndex + 1}`}».`,
        });
      }
      if (!rectIsInsideImage(zone.rect)) {
        issues.push({
          stepId: step.id,
          zoneId: zone.id,
          field: "rect",
          message: `La zona «${zone.label || `Zona ${stepIndex + 1}`}» debe quedar dentro de la captura.`,
        });
      }
    });

    for (const zone of step.clickZones) {
      if (!rectIsInsideImage(zone.rect)) {
        issues.push({
          stepId: step.id,
          zoneId: zone.id,
          field: "rect",
          message: `La zona «${zone.label || `Zona de clic ${stepIndex + 1}`}» debe quedar dentro de la captura.`,
        });
      }
    }
  });

  return issues;
}

export function compileEditorProject(
  document: EditorProject,
  assets: readonly CompileAsset[],
): CompileResult {
  const issues = collectIssues(document, assets);
  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const usedAssetIds = new Set(document.steps.map((step) => step.assetId));
  const projectAssets = assets
    .filter((asset) => usedAssetIds.has(asset.id))
    .map((asset) => ({
      id: asset.id,
      file: `assets/${safeFileId(asset.id)}.${extensionForMime(asset.mime)}`,
      mime: asset.mime,
      width: asset.width,
      height: asset.height,
    }));

  const steps = document.steps.map((step, index) => {
    const stepMessages = optionalMessages(step.messages?.error, step.messages?.success);
    const hint = step.hint?.trim();
    const formMode = step.textZones.length > 0 && step.clickZones.length > 0;
    return {
      id: step.id,
      title: step.title,
      instruction: step.instruction.trim() || step.title,
      assetId: step.assetId,
      actions: buildStepActions(step, index === document.steps.length - 1),
      ...(hint ? { hint } : {}),
      ...(stepMessages ? { messages: stepMessages } : {}),
      ...(formMode ? { formMode } : {}),
    };
  });

  const description = document.meta.description?.trim();
  const author = document.meta.author?.trim();
  const candidate: Project = {
    schemaVersion: "1.0",
    id: document.id,
    meta: {
      title: document.meta.title,
      language: "es-CL",
      version: document.meta.version,
      ...(description ? { description } : {}),
      ...(author ? { author } : {}),
    },
    settings: {
      allowedModes: ["guided"],
      defaultMode: "guided",
    },
    assets: projectAssets,
    steps,
    completion: {
      title: document.completion.title.trim() || completionDefaults.title,
      message: document.completion.message.trim() || completionDefaults.message,
    },
  } as Project;

  const validation = projectSchema.safeParse(candidate);
  if (!validation.success) {
    return {
      ok: false,
      issues: validation.error.issues.map((issue) => ({
        field: issue.path.join(".") || "project",
        message: `No se pudo validar el proyecto: ${issue.message}`,
      })),
    };
  }

  return { ok: true, project: validation.data };
}
