import type {
  EditorCheckboxZone,
  EditorClickZone,
  EditorHistory,
  EditorProject,
  EditorRedaction,
  EditorStep,
  EditorTextZone,
} from "./editor-types";

export type EditorAction =
  | { type: "load"; document: EditorProject }
  | { type: "addSteps"; steps: EditorStep[] }
  | { type: "insertSteps"; steps: EditorStep[]; afterStepId?: string }
  | { type: "reorderStep"; stepId: string; toIndex: number }
  | { type: "duplicateStep"; stepId: string }
  | { type: "deleteStep"; stepId: string }
  | {
      type: "updateStep";
      stepId: string;
      patch: Partial<
        Omit<EditorStep, "id" | "assetId" | "clickZones" | "textZones">
      >;
    }
  | { type: "addClickZone"; stepId: string; zone: EditorClickZone }
  | {
      type: "updateClickZone";
      stepId: string;
      zoneId: string;
      patch: Partial<Omit<EditorClickZone, "id">>;
    }
  | { type: "deleteClickZone"; stepId: string; zoneId: string }
  | { type: "duplicateClickZone"; stepId: string; zoneId: string }
  | { type: "addCheckboxZone"; stepId: string; zone: EditorCheckboxZone }
  | {
      type: "updateCheckboxZone";
      stepId: string;
      zoneId: string;
      patch: Partial<Omit<EditorCheckboxZone, "id">>;
    }
  | { type: "deleteCheckboxZone"; stepId: string; zoneId: string }
  | { type: "duplicateCheckboxZone"; stepId: string; zoneId: string }
  | { type: "addRedaction"; assetId: string; redaction: EditorRedaction }
  | {
      type: "updateRedaction";
      assetId: string;
      redactionId: string;
      patch: Partial<Omit<EditorRedaction, "id">>;
    }
  | { type: "deleteRedaction"; assetId: string; redactionId: string }
  | { type: "duplicateRedaction"; assetId: string; redactionId: string }
  | { type: "addTextZone"; stepId: string; zone: EditorTextZone }
  | {
      type: "updateTextZone";
      stepId: string;
      zoneId: string;
      patch: Partial<Omit<EditorTextZone, "id">>;
    }
  | { type: "deleteTextZone"; stepId: string; zoneId: string }
  | { type: "duplicateTextZone"; stepId: string; zoneId: string }
  | { type: "undo" }
  | { type: "redo" };

const completionDefaults = {
  title: "¡Procedimiento completado!",
  message: "Revisaste todos los pasos del simulador.",
};

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function createEmptyDocument(input: {
  id: string;
  title: string;
  client?: string;
  description?: string;
  author?: string;
  version?: string;
  createdAt?: string;
  updatedAt?: string;
}): EditorProject {
  const now = new Date().toISOString();
  return {
    schemaVersion: "editor-1",
    id: input.id,
    meta: {
      title: input.title.trim(),
      client: input.client?.trim() || undefined,
      description: input.description?.trim() || undefined,
      author: input.author?.trim() || undefined,
      language: "es-CL",
      version: input.version ?? "1.0.0",
      createdAt: input.createdAt ?? now,
      updatedAt: input.updatedAt ?? now,
    },
    steps: [],
    redactions: [],
    completion: { ...completionDefaults },
  };
}

export function createEditorStep(input: {
  id?: string;
  title?: string;
  instruction?: string;
  assetId: string;
}): EditorStep {
  return {
    id: input.id ?? newId("paso"),
    title: input.title?.trim() || "Nuevo paso",
    instruction: input.instruction ?? "",
    assetId: input.assetId,
    mode: "interactive",
    clickZones: [],
    clickMatch: "any",
    textZones: [],
    checkboxZones: [],
  };
}

export function createHistory(document: EditorProject): EditorHistory {
  return { present: document, past: [], future: [] };
}

function withDocument(state: EditorHistory, next: EditorProject): EditorHistory {
  if (next === state.present) {
    return state;
  }
  return {
    present: next,
    past: [...state.past, state.present],
    future: [],
  };
}

function updateStep(
  document: EditorProject,
  stepId: string,
  update: (step: EditorStep) => EditorStep,
): EditorProject {
  let changed = false;
  const steps = document.steps.map((step) => {
    if (step.id !== stepId) return step;
    const updated = update(step);
    if (updated !== step) changed = true;
    return updated;
  });
  return changed ? { ...document, steps } : document;
}

function updateRedactionGroup(
  document: EditorProject,
  assetId: string,
  update: (group: { assetId: string; items: EditorRedaction[] }) => {
    assetId: string;
    items: EditorRedaction[];
  },
): EditorProject {
  const groups = document.redactions ?? [];
  const index = groups.findIndex((group) => group.assetId === assetId);
  if (index < 0) return document;
  const updated = update(groups[index]);
  if (updated === groups[index]) return document;
  if (updated.items.length === 0) {
    return {
      ...document,
      redactions: groups.filter((_, groupIndex) => groupIndex !== index),
    };
  }
  const next = [...groups];
  next[index] = updated;
  return { ...document, redactions: next };
}

function duplicateZone<T extends EditorClickZone | EditorTextZone>(
  zone: T,
  prefix: string,
): T {
  return {
    ...zone,
    id: newId(prefix),
    label: zone.label ? `${zone.label} (copia)` : zone.label,
    rect: { ...zone.rect },
  };
}

export function editorReducer(state: EditorHistory, action: EditorAction): EditorHistory {
  switch (action.type) {
    case "load":
      return createHistory(action.document);

    case "undo": {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        present: previous,
        past: state.past.slice(0, -1),
        future: [...state.future, state.present],
      };
    }

    case "redo": {
      if (state.future.length === 0) return state;
      const next = state.future[state.future.length - 1];
      return {
        present: next,
        past: [...state.past, state.present],
        future: state.future.slice(0, -1),
      };
    }

    case "addSteps": {
      if (action.steps.length === 0) return state;
      return withDocument(state, {
        ...state.present,
        steps: [...state.present.steps, ...action.steps],
      });
    }

    case "insertSteps": {
      if (action.steps.length === 0) return state;
      const index = action.afterStepId
        ? state.present.steps.findIndex((step) => step.id === action.afterStepId)
        : state.present.steps.length - 1;
      const insertAt = action.afterStepId && index >= 0 ? index + 1 : state.present.steps.length;
      const steps = [...state.present.steps];
      steps.splice(insertAt, 0, ...action.steps);
      return withDocument(state, { ...state.present, steps });
    }

    case "reorderStep": {
      const index = state.present.steps.findIndex((step) => step.id === action.stepId);
      if (index < 0) return state;
      const target = Math.min(Math.max(action.toIndex, 0), state.present.steps.length - 1);
      if (target === index) return state;
      const steps = [...state.present.steps];
      const [step] = steps.splice(index, 1);
      steps.splice(target, 0, step);
      return withDocument(state, { ...state.present, steps });
    }

    case "duplicateStep": {
      const index = state.present.steps.findIndex((step) => step.id === action.stepId);
      if (index < 0) return state;
      const original = state.present.steps[index];
      const copy: EditorStep = {
        ...original,
        id: newId("paso"),
        title: `${original.title} (copia)`,
        messages: original.messages ? { ...original.messages } : undefined,
        clickZones: original.clickZones.map((zone) => duplicateZone(zone, "zona")),
        textZones: original.textZones.map((zone) => duplicateZone(zone, "texto")),
      };
      const steps = [...state.present.steps];
      steps.splice(index + 1, 0, copy);
      return withDocument(state, { ...state.present, steps });
    }

    case "deleteStep": {
      const removed = state.present.steps.find((step) => step.id === action.stepId);
      const steps = state.present.steps.filter((step) => step.id !== action.stepId);
      if (!removed) return state;
      const assetStillUsed = steps.some((step) => step.assetId === removed.assetId);
      const redactions = assetStillUsed
        ? state.present.redactions
        : state.present.redactions?.filter((group) => group.assetId !== removed.assetId);
      return withDocument(state, { ...state.present, steps, redactions });
    }

    case "updateStep": {
      const next = updateStep(state.present, action.stepId, (step) => ({
        ...step,
        ...action.patch,
      }));
      return withDocument(state, next);
    }

    case "addClickZone": {
      const next = updateStep(state.present, action.stepId, (step) => ({
        ...step,
        clickZones: [...step.clickZones, action.zone],
      }));
      return withDocument(state, next);
    }

    case "updateClickZone": {
      const next = updateStep(state.present, action.stepId, (step) => {
        let found = false;
        const clickZones = step.clickZones.map((zone) => {
          if (zone.id !== action.zoneId) return zone;
          found = true;
          return { ...zone, ...action.patch };
        });
        return found ? { ...step, clickZones } : step;
      });
      return withDocument(state, next);
    }

    case "deleteClickZone": {
      const next = updateStep(state.present, action.stepId, (step) => ({
        ...step,
        clickZones: step.clickZones.filter((zone) => zone.id !== action.zoneId),
      }));
      return withDocument(state, next);
    }

    case "duplicateClickZone": {
      const next = updateStep(state.present, action.stepId, (step) => {
        const index = step.clickZones.findIndex((zone) => zone.id === action.zoneId);
        if (index < 0) return step;
        const clickZones = [...step.clickZones];
        clickZones.splice(index + 1, 0, duplicateZone(clickZones[index], "zona"));
        return { ...step, clickZones };
      });
      return withDocument(state, next);
    }

    case "addCheckboxZone": {
      const next = updateStep(state.present, action.stepId, (step) => ({
        ...step,
        checkboxZones: [...(step.checkboxZones ?? []), action.zone],
      }));
      return withDocument(state, next);
    }

    case "updateCheckboxZone": {
      const next = updateStep(state.present, action.stepId, (step) => {
        let found = false;
        const checkboxZones = (step.checkboxZones ?? []).map((zone) => {
          if (zone.id !== action.zoneId) return zone;
          found = true;
          return { ...zone, ...action.patch };
        });
        return found ? { ...step, checkboxZones } : step;
      });
      return withDocument(state, next);
    }

    case "deleteCheckboxZone": {
      const next = updateStep(state.present, action.stepId, (step) => ({
        ...step,
        checkboxZones: (step.checkboxZones ?? []).filter(
          (zone) => zone.id !== action.zoneId,
        ),
      }));
      return withDocument(state, next);
    }

    case "duplicateCheckboxZone": {
      const next = updateStep(state.present, action.stepId, (step) => {
        const zones = step.checkboxZones ?? [];
        const index = zones.findIndex((zone) => zone.id === action.zoneId);
        if (index < 0) return step;
        const copy = {
          ...zones[index],
          id: newId("casilla"),
          rect: { ...zones[index].rect },
        };
        const checkboxZones = [...zones];
        checkboxZones.splice(index + 1, 0, copy);
        return { ...step, checkboxZones };
      });
      return withDocument(state, next);
    }

    case "addRedaction": {
      const groups = state.present.redactions ?? [];
      const index = groups.findIndex((group) => group.assetId === action.assetId);
      let redactions;
      if (index < 0) {
        redactions = [
          ...groups,
          { assetId: action.assetId, items: [action.redaction] },
        ];
      } else {
        redactions = groups.map((group, groupIndex) =>
          groupIndex === index
            ? { ...group, items: [...group.items, action.redaction] }
            : group,
        );
      }
      return withDocument(state, { ...state.present, redactions });
    }

    case "updateRedaction": {
      const next = updateRedactionGroup(state.present, action.assetId, (group) => {
        let changed = false;
        const items = group.items.map((item) => {
          if (item.id !== action.redactionId) return item;
          changed = true;
          return { ...item, ...action.patch };
        });
        return changed ? { ...group, items } : group;
      });
      return withDocument(state, next);
    }

    case "deleteRedaction": {
      const next = updateRedactionGroup(state.present, action.assetId, (group) => ({
        ...group,
        items: group.items.filter((item) => item.id !== action.redactionId),
      }));
      return withDocument(state, next);
    }

    case "duplicateRedaction": {
      const next = updateRedactionGroup(state.present, action.assetId, (group) => {
        const index = group.items.findIndex((item) => item.id === action.redactionId);
        if (index < 0) return group;
        const item = group.items[index];
        const items = [...group.items];
        items.splice(index + 1, 0, {
          ...item,
          id: newId("difuminado"),
          rect: { ...item.rect },
        });
        return { ...group, items };
      });
      return withDocument(state, next);
    }

    case "addTextZone": {
      const next = updateStep(state.present, action.stepId, (step) => ({
        ...step,
        textZones: [...step.textZones, action.zone],
      }));
      return withDocument(state, next);
    }

    case "updateTextZone": {
      const next = updateStep(state.present, action.stepId, (step) => {
        let found = false;
        const textZones = step.textZones.map((zone) => {
          if (zone.id !== action.zoneId) return zone;
          found = true;
          return { ...zone, ...action.patch };
        });
        return found ? { ...step, textZones } : step;
      });
      return withDocument(state, next);
    }

    case "deleteTextZone": {
      const next = updateStep(state.present, action.stepId, (step) => ({
        ...step,
        textZones: step.textZones.filter((zone) => zone.id !== action.zoneId),
      }));
      return withDocument(state, next);
    }

    case "duplicateTextZone": {
      const next = updateStep(state.present, action.stepId, (step) => {
        const index = step.textZones.findIndex((zone) => zone.id === action.zoneId);
        if (index < 0) return step;
        const textZones = [...step.textZones];
        textZones.splice(index + 1, 0, duplicateZone(textZones[index], "texto"));
        return { ...step, textZones };
      });
      return withDocument(state, next);
    }

    default:
      return state;
  }
}
