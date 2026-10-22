import { describe, expect, it } from "vitest";
import { clampZoom, MAX_ZOOM, MIN_ZOOM } from "../../../src/editor/model/geometry";
import {
  createEditorStep,
  createEmptyDocument,
  createHistory,
  editorReducer,
} from "../../../src/editor/model/editor-reducer";

function base() {
  const document = createEmptyDocument({ id: "proyecto-1", title: "Proyecto" });
  const step = createEditorStep({ id: "paso-1", title: "Inicial", assetId: "captura-1" });
  return editorReducer(createHistory(document), { type: "addSteps", steps: [step] }).present;
}

describe("historial de la sesión", () => {
  it("recorre varios cambios hacia atrás y adelante", () => {
    let history = createHistory(base());
    history = editorReducer(history, {
      type: "updateStep",
      stepId: "paso-1",
      patch: { title: "Uno" },
    });
    history = editorReducer(history, {
      type: "updateStep",
      stepId: "paso-1",
      patch: { title: "Dos" },
    });
    history = editorReducer(history, {
      type: "updateStep",
      stepId: "paso-1",
      patch: { title: "Tres" },
    });
    expect(history.present.steps[0].title).toBe("Tres");
    expect(history.past).toHaveLength(3);

    history = editorReducer(history, { type: "undo" });
    expect(history.present.steps[0].title).toBe("Dos");
    history = editorReducer(history, { type: "undo" });
    expect(history.present.steps[0].title).toBe("Uno");
    history = editorReducer(history, { type: "redo" });
    expect(history.present.steps[0].title).toBe("Dos");
    history = editorReducer(history, { type: "redo" });
    expect(history.present.steps[0].title).toBe("Tres");
  });

  it("no deshace ni rehace más allá de los extremos", () => {
    const history = createHistory(base());
    expect(editorReducer(history, { type: "undo" })).toBe(history);
    expect(editorReducer(history, { type: "redo" })).toBe(history);
  });

  it("limpia el futuro al hacer una edición nueva", () => {
    let history = createHistory(base());
    history = editorReducer(history, {
      type: "updateStep",
      stepId: "paso-1",
      patch: { title: "Editado" },
    });
    history = editorReducer(history, { type: "undo" });
    expect(history.future).toHaveLength(1);
    history = editorReducer(history, {
      type: "updateClickZone",
      stepId: "paso-1",
      zoneId: "no-existe",
      patch: {},
    });
    expect(history.future).toHaveLength(1);
    history = editorReducer(history, {
      type: "addClickZone",
      stepId: "paso-1",
      zone: { id: "zona-1", rect: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 } },
    });
    expect(history.future).toHaveLength(0);
  });

  it("mantiene el zoom dentro de los límites", () => {
    expect(clampZoom(0)).toBe(MIN_ZOOM);
    expect(clampZoom(100)).toBe(MAX_ZOOM);
    expect(clampZoom(Number.NaN)).toBe(1);
    expect(clampZoom(1.5)).toBe(1.5);
  });
});
