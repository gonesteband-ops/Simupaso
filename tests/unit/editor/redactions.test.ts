import { describe, expect, it } from "vitest";
import {
  createEditorStep,
  createEmptyDocument,
  createHistory,
  editorReducer,
} from "../../../src/editor/model/editor-reducer";
import {
  createRedaction,
  redactionsForAsset,
} from "../../../src/editor/model/redactions";
import { editorProjectSchema } from "../../../src/editor/model/editor-schema";

function documentWithStep() {
  const document = createEmptyDocument({ id: "proyecto-1", title: "Proyecto" });
  const step = createEditorStep({ id: "paso-1", title: "Paso", assetId: "captura-1" });
  return editorReducer(createHistory(document), { type: "addSteps", steps: [step] }).present;
}

describe("difuminado de datos sensibles", () => {
  it("agrega, actualiza, duplica y elimina redacciones por asset", () => {
    const document = documentWithStep();
    const redaction = createRedaction({ rect: { x: 0.1, y: 0.1, w: 0.2, h: 0.1 } });
    let history = editorReducer(createHistory(document), {
      type: "addRedaction",
      assetId: "captura-1",
      redaction,
    });
    expect(redactionsForAsset(history.present, "captura-1")).toHaveLength(1);

    history = editorReducer(history, {
      type: "updateRedaction",
      assetId: "captura-1",
      redactionId: redaction.id,
      patch: { style: "pixelate", intensity: 70 },
    });
    expect(redactionsForAsset(history.present, "captura-1")[0]).toMatchObject({
      style: "pixelate",
      intensity: 70,
    });

    history = editorReducer(history, {
      type: "duplicateRedaction",
      assetId: "captura-1",
      redactionId: redaction.id,
    });
    expect(redactionsForAsset(history.present, "captura-1")).toHaveLength(2);

    history = editorReducer(history, {
      type: "deleteRedaction",
      assetId: "captura-1",
      redactionId: redaction.id,
    });
    expect(redactionsForAsset(history.present, "captura-1")).toHaveLength(1);
  });

  it("elimina el grupo al borrar el último paso que usa la imagen", () => {
    let history = editorReducer(createHistory(documentWithStep()), {
      type: "addRedaction",
      assetId: "captura-1",
      redaction: createRedaction({ rect: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 } }),
    });
    expect(history.present.redactions).toHaveLength(1);
    history = editorReducer(history, { type: "deleteStep", stepId: "paso-1" });
    expect(history.present.redactions).toHaveLength(0);
    history = editorReducer(history, { type: "undo" });
    expect(history.present.redactions).toHaveLength(1);
  });

  it("valida el estilo y la intensidad en el documento", () => {
    const document = documentWithStep();
    document.redactions = [
      {
        assetId: "captura-1",
        items: [
          {
            id: "dif-1",
            rect: { x: 0.1, y: 0.1, w: 0.2, h: 0.1 },
            style: "solid",
            intensity: 60,
          },
        ],
      },
    ];
    expect(editorProjectSchema.safeParse(document).success).toBe(true);
    document.redactions[0].items[0].intensity = 5;
    expect(editorProjectSchema.safeParse(document).success).toBe(false);
  });

  it("no aplica redacciones de otro asset", () => {
    const document = documentWithStep();
    expect(redactionsForAsset(document, "captura-2")).toEqual([]);
  });
});
