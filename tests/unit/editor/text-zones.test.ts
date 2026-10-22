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
  createdAt: "2026-10-20T10:00:00.000Z",
};

function textOnlyStep() {
  const document = createEmptyDocument({ id: "proyecto-1", title: "Proyecto" });
  const step = createEditorStep({
    id: "paso-1",
    title: "Formulario",
    instruction: "Completa los campos.",
    assetId: "captura-1",
  });
  step.textZones = [
    {
      id: "texto-1",
      rect: { x: 0.1, y: 0.2, w: 0.3, h: 0.08 },
      label: "Usuario",
      masked: false,
      validation: { kind: "non_empty" },
    },
    {
      id: "texto-2",
      rect: { x: 0.1, y: 0.4, w: 0.3, h: 0.08 },
      label: "Código",
      masked: true,
      validation: { kind: "one_of", values: ["A", "B"] },
    },
  ];
  return editorReducer(createHistory(document), { type: "addSteps", steps: [step] }).present;
}

describe("zonas de texto", () => {
  it("actualiza etiqueta, enmascarado, validación y mensajes", () => {
    const document = textOnlyStep();
    const history = editorReducer(createHistory(document), {
      type: "updateTextZone",
      stepId: "paso-1",
      zoneId: "texto-1",
      patch: {
        label: "RUT ficticio",
        masked: true,
        validation: { kind: "rut", normalize: true },
        errorMessage: "Revisa el RUT.",
        successMessage: "RUT aceptado.",
      },
    });
    const zone = history.present.steps[0].textZones[0];
    expect(zone.label).toBe("RUT ficticio");
    expect(zone.masked).toBe(true);
    expect(zone.validation).toEqual({ kind: "rut", normalize: true });
    expect(zone.errorMessage).toBe("Revisa el RUT.");
  });

  it("duplica y elimina una zona de texto sin alterar la otra", () => {
    const document = textOnlyStep();
    const duplicated = editorReducer(createHistory(document), {
      type: "duplicateTextZone",
      stepId: "paso-1",
      zoneId: "texto-1",
    }).present;
    expect(duplicated.steps[0].textZones).toHaveLength(3);
    expect(new Set(duplicated.steps[0].textZones.map((zone) => zone.id)).size).toBe(3);

    const deleted = editorReducer(createHistory(duplicated), {
      type: "deleteTextZone",
      stepId: "paso-1",
      zoneId: "texto-2",
    }).present;
    expect(deleted.steps[0].textZones.map((zone) => zone.id)).not.toContain("texto-2");
  });

  it("compila las zonas de texto en orden con mensajes y validación", () => {
    const document = textOnlyStep();
    const history = editorReducer(createHistory(document), {
      type: "updateTextZone",
      stepId: "paso-1",
      zoneId: "texto-1",
      patch: {
        errorMessage: "Campo obligatorio.",
        validation: { kind: "one_of", values: ["alumno", "", "docente"] },
      },
    });
    const result = compileEditorProject(history.present, [asset]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(projectSchema.safeParse(result.project).success).toBe(true);
    const actions = result.project.steps[0].actions;
    expect(actions.map((action) => action.type)).toEqual(["input", "input"]);
    const first = actions[0];
    if (first.type !== "input") throw new Error("Se esperaba una acción de texto.");
    expect(first.label).toBe("Usuario");
    expect(first.messages?.error).toBe("Campo obligatorio.");
    expect(first.validation).toEqual({ kind: "one_of", values: ["alumno", "docente"] });
    const second = actions[1];
    if (second.type !== "input") throw new Error("Se esperaba una acción de texto.");
    expect(second.masked).toBe(true);
  });

  it("bloquea la vista previa si el valor exacto está vacío", () => {
    const document = textOnlyStep();
    document.steps[0].textZones[0].validation = { kind: "equals", expected: "" };
    const result = compileEditorProject(document, [asset]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((issue) => issue.message.includes("valor esperado"))).toBe(true);
  });
});
