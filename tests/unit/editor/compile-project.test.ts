import { describe, expect, it } from "vitest";
import { projectSchema } from "../../../src/contract/project-schema";
import { compileEditorProject } from "../../../src/editor/model/compile-project";
import {
  createEditorStep,
  createEmptyDocument,
  editorReducer,
  createHistory,
} from "../../../src/editor/model/editor-reducer";
import type { EditorAsset, EditorProject } from "../../../src/editor/model/editor-types";

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

function documentWithZones() {
  const document = createEmptyDocument({
    id: "proyecto-1",
    title: "Proyecto ficticio",
  });
  const step = createEditorStep({
    id: "paso-1",
    title: "Ingreso",
    instruction: "Escribe y presiona el botón.",
    assetId: "captura-1",
  });
  step.hint = "El botón está abajo.";
  step.messages = { error: "Revisa el dato.", success: "Correcto." };
  step.textZones = [
    {
      id: "texto-1",
      rect: { x: 0.1, y: 0.2, w: 0.2, h: 0.06 },
      label: "Usuario",
      placeholder: "alumno-demo",
      masked: false,
      validation: { kind: "non_empty" },
      fontSize: 22,
      successMessage: "Usuario aceptado.",
    },
  ];
  step.clickZones = [
    { id: "zona-1", rect: { x: 0.1, y: 0.3, w: 0.15, h: 0.05 } },
    { id: "zona-2", rect: { x: 0.3, y: 0.3, w: 0.15, h: 0.05 } },
  ];
  step.clickMatch = "all";
  const history = editorReducer(createHistory(document), {
    type: "addSteps",
    steps: [step],
  });
  return history.present;
}

describe("compileEditorProject", () => {
  it("compila zonas de texto y clic en el orden esperado", () => {
    const result = compileEditorProject(documentWithZones(), [asset]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(projectSchema.safeParse(result.project).success).toBe(true);
    expect(result.project.steps).toHaveLength(1);
    const actions = result.project.steps[0].actions;
    expect(actions.map((action) => action.type)).toEqual(["input", "click"]);
    const input = actions[0];
    const click = actions[1];
    if (input.type !== "input" || click.type !== "click") {
      throw new Error("Se esperaban acciones de texto y clic.");
    }
    expect(input.label).toBe("Usuario");
    expect(input.fontSize).toBe(22);
    expect(input.messages?.success).toBe("Usuario aceptado.");
    expect(click.rects).toHaveLength(2);
    expect(click.match).toBe("all");
    expect(result.project.steps[0].hint).toBe("El botón está abajo.");
    expect(result.project.steps[0].messages?.error).toBe("Revisa el dato.");
    expect(result.project.steps[0].formMode).toBe(true);
    expect(result.project.assets[0].file).toBe("assets/captura-1.png");
  });

  it("compila un paso informativo con botón Siguiente o Finalizar", () => {
    const document = createEmptyDocument({ id: "proyecto-1", title: "Proyecto" });
    const step = createEditorStep({
      id: "paso-1",
      title: "Bienvenida",
      instruction: "Lee la pantalla y continúa.",
      assetId: "captura-1",
    });
    step.mode = "informative";
    const history = editorReducer(createHistory(document), {
      type: "addSteps",
      steps: [step],
    });

    const result = compileEditorProject(history.present, [asset]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.project.steps[0].actions).toEqual([
      {
        id: "informativo-paso-1",
        type: "informative",
        text: "Lee la pantalla y continúa.",
        buttonLabel: "Finalizar",
      },
    ]);
    expect(result.project.steps[0].formMode).toBeUndefined();
    expect("formMode" in result.project.steps[0]).toBe(false);
  });

  it("usa el título como instrucción cuando está vacía", () => {
    const document = createEmptyDocument({ id: "proyecto-1", title: "Proyecto" });
    const step = createEditorStep({
      id: "paso-1",
      title: "Solo título",
      instruction: "",
      assetId: "captura-1",
    });
    step.mode = "informative";
    const result = compileEditorProject(
      editorReducer(createHistory(document), { type: "addSteps", steps: [step] }).present,
      [asset],
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const action = result.project.steps[0].actions[0];
    expect(action.type).toBe("informative");
    if (action.type === "informative") {
      expect(action.text).toBe("Solo título");
    }
  });

  it("rechaza un proyecto sin pasos", () => {
    const document = createEmptyDocument({ id: "proyecto-1", title: "Proyecto" });
    const result = compileEditorProject(document, [asset]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues[0].message).toContain("al menos un paso");
  });

  it("rechaza un paso interactivo sin zonas", () => {
    const document = createEmptyDocument({ id: "proyecto-1", title: "Proyecto" });
    const step = createEditorStep({ assetId: "captura-1" });
    const result = compileEditorProject(
      editorReducer(createHistory(document), { type: "addSteps", steps: [step] }).present,
      [asset],
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues[0].message).toContain("zona de clic o de texto");
  });

  it("rechaza un paso sin asset o con asset inexistente", () => {
    const document = createEmptyDocument({ id: "proyecto-1", title: "Proyecto" });
    const step = createEditorStep({ assetId: "captura-inexistente" });
    step.textZones = [
      {
        id: "texto-1",
        rect: { x: 0.1, y: 0.1, w: 0.2, h: 0.1 },
        label: "Dato",
        masked: false,
        validation: { kind: "non_empty" },
      },
    ];
    const result = compileEditorProject(
      editorReducer(createHistory(document), { type: "addSteps", steps: [step] }).present,
      [asset],
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues[0].message).toContain("captura válida");
  });

  it("rechaza una zona de texto sin etiqueta o con valores incompletos", () => {
    const document = documentWithZones();
    const zone = document.steps[0].textZones[0];
    zone.label = "";
    const invalid = document as EditorProject;
    const result = compileEditorProject(invalid, [asset]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((issue) => issue.message.includes("etiqueta"))).toBe(true);
  });

  it("traduce la validación RUT con normalización y enmascarado", () => {
    const document = documentWithZones();
    document.steps[0].textZones[0].validation = { kind: "rut", normalize: true };
    document.steps[0].textZones[0].masked = true;
    const result = compileEditorProject(document, [asset]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const action = result.project.steps[0].actions[0];
    if (action.type !== "input") throw new Error("Se esperaba una acción de texto.");
    expect(action.validation).toEqual({ kind: "rut", normalize: true });
    expect(action.masked).toBe(true);
  });
});
