import { describe, expect, it } from "vitest";
import { projectSchema } from "../../../src/contract/project-schema";
import { compileEditorProject } from "../../../src/editor/model/compile-project";
import {
  createEditorStep,
  createEmptyDocument,
  createHistory,
  editorReducer,
} from "../../../src/editor/model/editor-reducer";
import type { EditorAsset } from "../../../src/editor/model/editor-types";

const asset: EditorAsset = {
  id: "captura-1",
  projectId: "proyecto-1",
  blob: new Blob(["demo"], { type: "image/png" }),
  mime: "image/png",
  width: 1200,
  height: 800,
  sizeBytes: 4,
  name: "captura-1.png",
  createdAt: "2026-10-21T10:00:00.000Z",
};

function stepWithCheckboxes() {
  const document = createEmptyDocument({ id: "proyecto-1", title: "Proyecto" });
  const step = createEditorStep({
    id: "paso-1",
    title: "Selecciona casos",
    instruction: "Marca los casos correctos.",
    assetId: "captura-1",
  });
  step.checkboxZones = [
    { id: "casilla-1", rect: { x: 0.1, y: 0.1, w: 0.04, h: 0.03 }, expected: true },
    { id: "casilla-2", rect: { x: 0.2, y: 0.1, w: 0.04, h: 0.03 }, expected: false },
  ];
  step.clickZones = [
    { id: "aplicar", rect: { x: 0.5, y: 0.5, w: 0.1, h: 0.05 } },
  ];
  return editorReducer(createHistory(document), {
    type: "addSteps",
    steps: [step],
  }).present;
}

describe("casillas de selección", () => {
  it("compila casillas y botón de confirmación", () => {
    const result = compileEditorProject(stepWithCheckboxes(), [asset]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(projectSchema.safeParse(result.project).success).toBe(true);
    const actions = result.project.steps[0].actions;
    expect(actions.map((action) => action.type)).toEqual(["checkbox", "click"]);
    const checkbox = actions[0];
    if (checkbox.type !== "checkbox") throw new Error("Se esperaba checkbox.");
    expect(checkbox.items).toHaveLength(2);
    expect(checkbox.items[0].expected).toBe(true);
    expect(checkbox.items[1].expected).toBe(false);
  });

  it("bloquea la mezcla de casillas y texto en un paso", () => {
    const document = stepWithCheckboxes();
    document.steps[0].textZones = [
      {
        id: "texto-1",
        rect: { x: 0.3, y: 0.2, w: 0.2, h: 0.1 },
        label: "Dato",
        masked: false,
        validation: { kind: "non_empty" },
      },
    ];
    const result = compileEditorProject(document, [asset]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((issue) => issue.message.includes("mezclar casillas"))).toBe(
      true,
    );
  });

  it("agrega, actualiza, duplica y elimina casillas", () => {
    let history = createHistory(stepWithCheckboxes());
    history = editorReducer(history, {
      type: "addCheckboxZone",
      stepId: "paso-1",
      zone: {
        id: "casilla-3",
        rect: { x: 0.3, y: 0.1, w: 0.04, h: 0.03 },
        expected: true,
      },
    });
    expect(history.present.steps[0].checkboxZones).toHaveLength(3);

    history = editorReducer(history, {
      type: "updateCheckboxZone",
      stepId: "paso-1",
      zoneId: "casilla-3",
      patch: { expected: false },
    });
    expect(history.present.steps[0].checkboxZones?.[2].expected).toBe(false);

    history = editorReducer(history, {
      type: "duplicateCheckboxZone",
      stepId: "paso-1",
      zoneId: "casilla-1",
    });
    expect(history.present.steps[0].checkboxZones).toHaveLength(4);

    history = editorReducer(history, {
      type: "deleteCheckboxZone",
      stepId: "paso-1",
      zoneId: "casilla-1",
    });
    expect(
      history.present.steps[0].checkboxZones?.some((zone) => zone.id === "casilla-1"),
    ).toBe(false);
  });
});
