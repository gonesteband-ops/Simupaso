import { describe, expect, it } from "vitest";
import { editorProjectSchema } from "../../../src/editor/model/editor-schema";
import type { EditorProject } from "../../../src/editor/model/editor-types";

function validDocument(): EditorProject {
  return {
    schemaVersion: "editor-1",
    id: "proyecto-ficticio",
    meta: {
      title: "Consulta de demostración",
      client: "Empresa ficticia",
      description: "Procedimiento de prueba",
      author: "Trainer ficticio",
      language: "es-CL",
      version: "1.0.0",
      createdAt: "2026-10-20T12:00:00.000Z",
      updatedAt: "2026-10-20T12:00:00.000Z",
    },
    completion: {
      title: "Procedimiento completado",
      message: "Terminaste la demostración ficticia.",
    },
    steps: [
      {
        id: "paso-1",
        title: "Ingreso",
        instruction: "Escribe un usuario ficticio.",
        assetId: "captura-1",
        mode: "interactive",
        clickMatch: "any",
        clickZones: [],
        textZones: [
          {
            id: "texto-1",
            rect: { x: 0.1, y: 0.2, w: 0.3, h: 0.08 },
            label: "Usuario ficticio",
            placeholder: "alumno-demo",
            masked: false,
            validation: { kind: "non_empty" },
          },
        ],
      },
    ],
  };
}

describe("editorProjectSchema", () => {
  it("acepta un documento con cero pasos", () => {
    const document = validDocument();
    document.steps = [];
    expect(editorProjectSchema.safeParse(document).success).toBe(true);
  });

  it("acepta un documento con pasos, zonas y validaciones", () => {
    expect(editorProjectSchema.safeParse(validDocument()).success).toBe(true);
  });

  it("rechaza una versión de documento desconocida", () => {
    const document = { ...validDocument(), schemaVersion: "editor-2" };
    expect(editorProjectSchema.safeParse(document).success).toBe(false);
  });

  it("rechaza identificadores de paso duplicados", () => {
    const document = validDocument();
    document.steps.push({ ...document.steps[0], title: "Duplicado" });
    expect(editorProjectSchema.safeParse(document).success).toBe(false);
  });

  it("rechaza identificadores de zona duplicados dentro de un paso", () => {
    const document = validDocument();
    const zone = document.steps[0].textZones[0];
    document.steps[0].textZones.push({ ...zone, label: "Otra etiqueta" });
    expect(editorProjectSchema.safeParse(document).success).toBe(false);
  });

  it("rechaza rectángulos fuera de la imagen", () => {
    const document = validDocument();
    document.steps[0].textZones[0].rect = { x: 0.9, y: 0.2, w: 0.3, h: 0.1 };
    expect(editorProjectSchema.safeParse(document).success).toBe(false);
  });

  it("permite una validación incompleta mientras se edita", () => {
    const document = validDocument();
    document.steps[0].textZones[0].validation = { kind: "equals", expected: "" };
    expect(editorProjectSchema.safeParse(document).success).toBe(true);
  });

  it("rechaza claves desconocidas en el paso", () => {
    const document = validDocument();
    (document.steps[0] as unknown as Record<string, unknown>).unexpected = true;
    expect(editorProjectSchema.safeParse(document).success).toBe(false);
  });

  it("acepta un tamaño de texto entre 10 y 100", () => {
    const document = validDocument();
    document.steps[0].textZones[0].fontSize = 22;
    expect(editorProjectSchema.safeParse(document).success).toBe(true);
    document.steps[0].textZones[0].fontSize = 5;
    expect(editorProjectSchema.safeParse(document).success).toBe(false);
  });

  it("acepta una pista y mensajes opcionales", () => {
    const document = validDocument();
    document.steps[0].hint = "El campo está bajo el título.";
    document.steps[0].messages = { error: "Revisa el dato.", success: "Muy bien." };
    expect(editorProjectSchema.safeParse(document).success).toBe(true);
  });
});
