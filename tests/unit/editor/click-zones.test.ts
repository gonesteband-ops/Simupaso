import { describe, expect, it } from "vitest";
import {
  createEditorStep,
  createEmptyDocument,
  createHistory,
  editorReducer,
} from "../../../src/editor/model/editor-reducer";

function withStep() {
  const document = createEmptyDocument({ id: "proyecto-1", title: "Proyecto" });
  const step = createEditorStep({ id: "paso-1", title: "Paso", assetId: "captura-1" });
  return editorReducer(createHistory(document), { type: "addSteps", steps: [step] }).present;
}

const rect = { x: 0.1, y: 0.1, w: 0.2, h: 0.1 };

describe("zonas de clic", () => {
  it("agrega varias zonas y conserva la regla any/all", () => {
    const document = withStep();
    const first = editorReducer(createHistory(document), {
      type: "addClickZone",
      stepId: "paso-1",
      zone: { id: "zona-1", label: "Botón", rect },
    });
    const second = editorReducer(first, {
      type: "addClickZone",
      stepId: "paso-1",
      zone: { id: "zona-2", rect: { ...rect, x: 0.4 } },
    });
    const withRule = editorReducer(second, {
      type: "updateStep",
      stepId: "paso-1",
      patch: { clickMatch: "all" },
    });

    expect(withRule.present.steps[0].clickZones).toHaveLength(2);
    expect(withRule.present.steps[0].clickZones[0].label).toBe("Botón");
    expect(withRule.present.steps[0].clickMatch).toBe("all");
  });

  it("mueve y redimensiona una zona", () => {
    const document = editorReducer(createHistory(withStep()), {
      type: "addClickZone",
      stepId: "paso-1",
      zone: { id: "zona-1", rect },
    }).present;
    const moved = editorReducer(createHistory(document), {
      type: "updateClickZone",
      stepId: "paso-1",
      zoneId: "zona-1",
      patch: { rect: { x: 0.5, y: 0.4, w: 0.3, h: 0.2 } },
    }).present;
    expect(moved.steps[0].clickZones[0].rect).toEqual({ x: 0.5, y: 0.4, w: 0.3, h: 0.2 });
  });

  it("duplica y elimina zonas sin afectar a las demás", () => {
    let document = editorReducer(createHistory(withStep()), {
      type: "addClickZone",
      stepId: "paso-1",
      zone: { id: "zona-1", rect },
    }).present;
    document = editorReducer(createHistory(document), {
      type: "addClickZone",
      stepId: "paso-1",
      zone: { id: "zona-2", rect: { ...rect, y: 0.5 } },
    }).present;

    const duplicated = editorReducer(createHistory(document), {
      type: "duplicateClickZone",
      stepId: "paso-1",
      zoneId: "zona-1",
    }).present;
    expect(duplicated.steps[0].clickZones).toHaveLength(3);
    const copy = duplicated.steps[0].clickZones[1];
    expect(copy.id).not.toBe("zona-1");
    expect(copy.rect).toEqual(rect);

    const deleted = editorReducer(createHistory(duplicated), {
      type: "deleteClickZone",
      stepId: "paso-1",
      zoneId: "zona-1",
    }).present;
    expect(deleted.steps[0].clickZones.map((zone) => zone.id)).not.toContain("zona-1");
    expect(deleted.steps[0].clickZones).toHaveLength(2);
  });
});
