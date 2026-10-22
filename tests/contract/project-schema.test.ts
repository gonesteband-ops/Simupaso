import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { projectJsonSchema } from "../../src/contract/json-schema";
import type { Project } from "../../src/contract/project";
import { projectSchema } from "../../src/contract/project-schema";

const fixture = JSON.parse(
  readFileSync(new URL("../../src/fixtures/project.json", import.meta.url), "utf8"),
);

function validProject(): Project {
  return {
    schemaVersion: "1.0",
    id: "demo-ficticio",
    meta: {
      title: "Consulta de prueba",
      language: "es-CL",
      version: "1.0.0",
    },
    settings: {
      allowedModes: ["guided"],
      defaultMode: "guided",
    },
    assets: [
      {
        id: "captura-1",
        file: "assets/demo.svg",
        mime: "image/svg+xml",
        width: 800,
        height: 600,
      },
    ],
    steps: [
      {
        id: "paso-1",
        title: "Abrir sección",
        instruction: "Selecciona el botón ficticio.",
        assetId: "captura-1",
        actions: [
          {
            id: "accion-1",
            type: "click",
            rects: [{ x: 0.1, y: 0.2, w: 0.2, h: 0.1 }],
          },
        ],
      },
      {
        id: "paso-2",
        title: "Ingresar dato de prueba",
        instruction: "Ingresa un texto ficticio.",
        assetId: "captura-1",
        actions: [
          {
            id: "accion-2",
            type: "input",
            rect: { x: 0.1, y: 0.4, w: 0.3, h: 0.08 },
            label: "Código ficticio",
            validation: { kind: "non_empty" },
          },
          {
            id: "accion-3",
            type: "informative",
            text: "Confirma la revisión de demostración.",
          },
        ],
      },
    ],
    completion: {
      title: "Demostración completada",
      message: "Terminaste la prueba ficticia.",
    },
  };
}

describe("projectSchema", () => {
  it("acepta el contrato versionado mínimo con dos pasos", () => {
    expect(projectSchema.safeParse(validProject()).success).toBe(true);
  });

  it("acepta un proyecto de un solo paso para la vista previa", () => {
    const project = validProject();
    project.steps = [project.steps[0]];
    expect(projectSchema.safeParse(project).success).toBe(true);
  });

  it("acepta una acción de casillas", () => {
    const project = validProject();
    project.steps[0].actions.push({
      id: "casillas",
      type: "checkbox",
      items: [
        {
          id: "casilla-1",
          rect: { x: 0.1, y: 0.1, w: 0.04, h: 0.03 },
          expected: true,
        },
      ],
      rule: "exact",
    });
    expect(projectSchema.safeParse(project).success).toBe(true);
  });

  it("acepta el modo formulario simultáneo opcional", () => {
    const project = validProject();
    project.steps[0].formMode = true;
    expect(projectSchema.safeParse(project).success).toBe(true);
  });

  it("acepta pista, mensajes y texto de botón informativo opcionales", () => {
    const project = validProject();
    const firstStep = project.steps[0] as unknown as Record<string, unknown>;
    firstStep.hint = "El botón está bajo los campos.";
    firstStep.messages = {
      error: "Ese botón no corresponde.",
      success: "Muy bien.",
    };
    const secondStep = project.steps[1];
    const input = secondStep.actions.find((action) => action.type === "input");
    const informative = secondStep.actions.find((action) => action.type === "informative");
    if (input?.type !== "input" || informative?.type !== "informative") {
      throw new Error("El fixture debe incluir acciones de texto e informativa.");
    }
    (input as unknown as Record<string, unknown>).messages = {
      error: "Revisa el código ficticio.",
    };
    (input as unknown as Record<string, unknown>).fontSize = 24;
    (informative as unknown as Record<string, unknown>).buttonLabel = "Finalizar";

    const result = projectSchema.safeParse(project);
    expect(result.success).toBe(true);
  });

  it("sigue rechazando un proyecto sin pasos", () => {
    const project = validProject();
    project.steps = [];
    expect(projectSchema.safeParse(project).success).toBe(false);
  });

  it("rechaza mensajes con claves desconocidas", () => {
    const project = validProject();
    (project.steps[0] as unknown as Record<string, unknown>).messages = {
      warning: "No permitido",
    };
    expect(projectSchema.safeParse(project).success).toBe(false);
  });

  it("rechaza una versión de contrato desconocida", () => {
    const project = { ...validProject(), schemaVersion: "2.0" };
    expect(projectSchema.safeParse(project).success).toBe(false);
  });

  it("rechaza referencias a recursos inexistentes", () => {
    const project = validProject();
    project.steps[0].assetId = "no-existe";
    expect(projectSchema.safeParse(project).success).toBe(false);
  });

  it.each([
    { x: -0.1, y: 0, w: 0.2, h: 0.2 },
    { x: 0.8, y: 0, w: 0.3, h: 0.2 },
    { x: 0, y: 0.9, w: 0.2, h: 0.2 },
    { x: 0, y: 0, w: 0, h: 0.2 },
  ])("rechaza rectángulos fuera del rango normalizado: %o", (rect) => {
    const project = validProject();
    const action = project.steps[0].actions[0];
    if (action.type !== "click") {
      throw new Error("El fixture de prueba debe comenzar con una acción de clic.");
    }
    action.rects[0] = rect;
    expect(projectSchema.safeParse(project).success).toBe(false);
  });

  it("reserva anotaciones opcionales como JSON sin interpretarlas semánticamente", () => {
    const project = validProject();
    project.steps[0].annotations = [{ extension: { custom: true } }];
    expect(projectSchema.safeParse(project).success).toBe(true);

    delete project.steps[0].annotations;
    expect(projectSchema.safeParse(project).success).toBe(true);
  });

  it("rechaza identificadores duplicados y rutas de recursos no relativas", () => {
    const duplicate = validProject();
    duplicate.steps[1].id = duplicate.steps[0].id;
    expect(projectSchema.safeParse(duplicate).success).toBe(false);

    const absolutePath = validProject();
    absolutePath.assets[0].file = "https://example.invalid/image.svg";
    expect(projectSchema.safeParse(absolutePath).success).toBe(false);
  });
});

describe("projectJsonSchema", () => {
  it("expone el contrato como JSON Schema serializable", () => {
    const serialized = JSON.stringify(projectJsonSchema);
    expect(serialized).toContain('"schemaVersion"');
    expect(serialized).toContain('"steps"');
    expect(serialized).toContain('"hint"');
    expect(serialized).toContain('"buttonLabel"');
    expect(serialized).toContain('"formMode"');
    expect(serialized).toContain('"minItems":1');
  });
});

describe("fixture sintético", () => {
  it("valida el contrato e incluye una imagen PNG con dimensiones naturales declaradas", () => {
    expect(projectSchema.safeParse(fixture).success).toBe(true);

    const image = readFileSync(
      new URL("../../src/fixtures/assets/search-demo.png", import.meta.url),
    );
    expect(image.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(image.readUInt32BE(16)).toBe(1200);
    expect(image.readUInt32BE(20)).toBe(800);
  });
});
