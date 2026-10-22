import { describe, expect, it } from "vitest";
import {
  createEditorStep,
  createEmptyDocument,
  createHistory,
  editorReducer,
} from "../../../src/editor/model/editor-reducer";

function baseDocument() {
  return createEmptyDocument({
    id: "proyecto-1",
    title: "Proyecto ficticio",
    createdAt: "2026-10-20T10:00:00.000Z",
    updatedAt: "2026-10-20T10:00:00.000Z",
  });
}

function twoSteps() {
  const document = baseDocument();
  const steps = [
    createEditorStep({ id: "paso-1", title: "Paso uno", instruction: "", assetId: "asset-1" }),
    createEditorStep({ id: "paso-2", title: "Paso dos", instruction: "", assetId: "asset-2" }),
  ];
  return editorReducer(createHistory(document), { type: "addSteps", steps }).present;
}

describe("editorReducer", () => {
  it("crea un documento vacío con valores por defecto", () => {
    const document = baseDocument();
    expect(document.schemaVersion).toBe("editor-1");
    expect(document.steps).toEqual([]);
    expect(document.completion.title.length).toBeGreaterThan(0);
  });

  it("agrega pasos al final", () => {
    const document = twoSteps();
    expect(document.steps.map((step) => step.id)).toEqual(["paso-1", "paso-2"]);
  });

  it("reordena pasos y limita el índice", () => {
    const history = createHistory(twoSteps());
    const moved = editorReducer(history, {
      type: "reorderStep",
      stepId: "paso-2",
      toIndex: 0,
    });
    expect(moved.present.steps.map((step) => step.id)).toEqual(["paso-2", "paso-1"]);

    const clamped = editorReducer(moved, {
      type: "reorderStep",
      stepId: "paso-2",
      toIndex: 99,
    });
    expect(clamped.present.steps.map((step) => step.id)).toEqual(["paso-1", "paso-2"]);
  });

  it("duplica un paso con zonas e identificadores nuevos", () => {
    const history = createHistory(twoSteps());
    const withZone = editorReducer(history, {
      type: "addClickZone",
      stepId: "paso-1",
      zone: { id: "zona-1", rect: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 } },
    });
    const duplicated = editorReducer(withZone, {
      type: "duplicateStep",
      stepId: "paso-1",
    });
    const original = duplicated.present.steps[0];
    const copy = duplicated.present.steps[1];
    expect(duplicated.present.steps).toHaveLength(3);
    expect(copy.id).not.toBe(original.id);
    expect(copy.assetId).toBe(original.assetId);
    expect(copy.clickZones).toHaveLength(1);
    expect(copy.clickZones[0].id).not.toBe(original.clickZones[0].id);
    expect(copy.clickZones[0].rect).toEqual(original.clickZones[0].rect);
  });

  it("elimina pasos y zonas", () => {
    const history = createHistory(twoSteps());
    const withZone = editorReducer(history, {
      type: "addTextZone",
      stepId: "paso-1",
      zone: {
        id: "texto-1",
        rect: { x: 0.1, y: 0.1, w: 0.2, h: 0.1 },
        label: "Usuario",
        masked: false,
        validation: { kind: "non_empty" },
      },
    });
    const withoutZone = editorReducer(withZone, {
      type: "deleteTextZone",
      stepId: "paso-1",
      zoneId: "texto-1",
    });
    expect(withoutZone.present.steps[0].textZones).toEqual([]);

    const withoutStep = editorReducer(withoutZone, {
      type: "deleteStep",
      stepId: "paso-2",
    });
    expect(withoutStep.present.steps.map((step) => step.id)).toEqual(["paso-1"]);
  });

  it("actualiza propiedades del paso y de la zona de clic", () => {
    const withZone = editorReducer(createHistory(twoSteps()), {
      type: "addClickZone",
      stepId: "paso-1",
      zone: { id: "zona-1", rect: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 } },
    });
    const updatedStep = editorReducer(withZone, {
      type: "updateStep",
      stepId: "paso-1",
      patch: { title: "Nuevo título", instruction: "Nueva instrucción", hint: "Una pista" },
    });
    const updatedZone = editorReducer(updatedStep, {
      type: "updateClickZone",
      stepId: "paso-1",
      zoneId: "zona-1",
      patch: { rect: { x: 0.2, y: 0.2, w: 0.3, h: 0.3 } },
    });
    expect(updatedZone.present.steps[0].title).toBe("Nuevo título");
    expect(updatedZone.present.steps[0].hint).toBe("Una pista");
    expect(updatedZone.present.steps[0].clickZones[0].rect).toEqual({
      x: 0.2,
      y: 0.2,
      w: 0.3,
      h: 0.3,
    });
  });

  it("cambia la regla de clic y el modo informativo", () => {
    const history = createHistory(twoSteps());
    const updated = editorReducer(history, {
      type: "updateStep",
      stepId: "paso-1",
      patch: { clickMatch: "all", mode: "informative" },
    });
    expect(updated.present.steps[0].clickMatch).toBe("all");
    expect(updated.present.steps[0].mode).toBe("informative");
  });

  it("deshace y rehace cambios, y una edición nueva limpia el futuro", () => {
    const history = createHistory(twoSteps());
    const renamed = editorReducer(history, {
      type: "updateStep",
      stepId: "paso-1",
      patch: { title: "Renombrado" },
    });
    expect(renamed.present.steps[0].title).toBe("Renombrado");

    const undone = editorReducer(renamed, { type: "undo" });
    expect(undone.present.steps[0].title).toBe("Paso uno");
    expect(undone.future).toHaveLength(1);

    const redone = editorReducer(undone, { type: "redo" });
    expect(redone.present.steps[0].title).toBe("Renombrado");

    const newEdit = editorReducer(undone, {
      type: "addClickZone",
      stepId: "paso-1",
      zone: { id: "zona-1", rect: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 } },
    });
    expect(newEdit.future).toHaveLength(0);
  });

  it("cargar un documento reinicia el historial", () => {
    const history = createHistory(twoSteps());
    const renamed = editorReducer(history, {
      type: "updateStep",
      stepId: "paso-1",
      patch: { title: "Renombrado" },
    });
    const loaded = editorReducer(renamed, { type: "load", document: baseDocument() });
    expect(loaded.past).toEqual([]);
    expect(loaded.future).toEqual([]);
    expect(loaded.present.steps).toEqual([]);
  });
});
