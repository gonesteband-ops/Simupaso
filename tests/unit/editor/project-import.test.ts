import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import type { Project } from "../../../src/contract/project";
import { importProjectZip } from "../../../src/editor/import/project-import";
import { createProjectBackup } from "../../../src/editor/model/project-backup";
import {
  createEditorStep,
  createEmptyDocument,
  createHistory,
  editorReducer,
} from "../../../src/editor/model/editor-reducer";
import type { EditorAsset } from "../../../src/editor/model/editor-types";

function asset(id = "captura-original"): EditorAsset {
  const bytes = new TextEncoder().encode("imagen-original");
  return {
    id,
    projectId: "proyecto-original",
    blob: new Blob([bytes], { type: "image/png" }),
    mime: "image/png",
    width: 1200,
    height: 800,
    sizeBytes: bytes.byteLength,
    name: "captura.png",
    createdAt: "2026-10-21T10:00:00.000Z",
  };
}

function scormProject(): Project {
  return {
    schemaVersion: "1.0",
    id: "scorm-original",
    meta: { title: "SCORM original", language: "es-CL", version: "1.0.0" },
    settings: { allowedModes: ["guided"], defaultMode: "guided" },
    assets: [
      {
        id: "captura-scorm",
        file: "assets/captura-scorm.png",
        mime: "image/png",
        width: 1200,
        height: 800,
      },
    ],
    steps: [
      {
        id: "paso-login",
        title: "Login importado",
        instruction: "Ingresa los datos.",
        assetId: "captura-scorm",
        formMode: true,
        actions: [
          {
            id: "rut",
            type: "input",
            rect: { x: 0.2, y: 0.2, w: 0.3, h: 0.08 },
            label: "RUT",
            validation: { kind: "rut", normalize: true },
            fontSize: 22,
            messages: { error: "RUT inválido." },
          },
          {
            id: "entrar",
            type: "click",
            rects: [{ x: 0.2, y: 0.4, w: 0.2, h: 0.08 }],
            match: "any",
          },
        ],
      },
    ],
    completion: { title: "Fin", message: "Terminado" },
  };
}

describe("importación de proyectos", () => {
  it("importa un respaldo .simpaso y remapea assets conservando difuminados", async () => {
    const base = createEmptyDocument({ id: "proyecto-original", title: "Proyecto original" });
    const step = createEditorStep({
      id: "paso-1",
      title: "Paso",
      assetId: "captura-original",
    });
    let document = editorReducer(createHistory(base), {
      type: "addSteps",
      steps: [step],
    }).present;
    document = editorReducer(createHistory(document), {
      type: "addRedaction",
      assetId: "captura-original",
      redaction: {
        id: "dif-1",
        rect: { x: 0.1, y: 0.1, w: 0.2, h: 0.1 },
        style: "solid",
        intensity: 60,
      },
    }).present;

    const backup = await createProjectBackup(document, [asset()], "2026-10-21T12:00:00.000Z");
    const imported = importProjectZip(backup.bytes, "proyecto-importado");

    expect(imported.kind).toBe("backup");
    expect(imported.document.id).toBe("proyecto-importado");
    expect(imported.assets).toHaveLength(1);
    expect(imported.assets[0].projectId).toBe("proyecto-importado");
    expect(imported.assets[0].id).not.toBe("captura-original");
    expect(imported.document.steps[0].assetId).toBe(imported.assets[0].id);
    expect(imported.document.redactions?.[0].assetId).toBe(imported.assets[0].id);
    expect(imported.document.redactions?.[0].items[0].style).toBe("solid");
    expect(new TextDecoder().decode(await imported.assets[0].blob.arrayBuffer())).toBe(
      "imagen-original",
    );
  });

  it("importa un SCORM exportado por la app y reconstruye zonas", () => {
    const bytes = zipSync(
      {
        "data/project.json": strToU8(JSON.stringify(scormProject())),
        "assets/captura-scorm.png": strToU8("imagen-scorm"),
      },
      { level: 0 },
    );
    const imported = importProjectZip(bytes, "proyecto-scorm-importado");

    expect(imported.kind).toBe("scorm");
    expect(imported.document.meta.title).toBe("SCORM original");
    expect(imported.document.steps).toHaveLength(1);
    const step = imported.document.steps[0];
    expect(step.assetId).toBe(imported.assets[0].id);
    expect(step.textZones).toHaveLength(1);
    expect(step.textZones[0].label).toBe("RUT");
    expect(step.textZones[0].validation).toEqual({ kind: "rut", normalize: true });
    expect(step.textZones[0].fontSize).toBe(22);
    expect(step.textZones[0].errorMessage).toBe("RUT inválido.");
    expect(step.clickZones).toHaveLength(1);
    expect(step.clickZones[0].rect).toEqual({ x: 0.2, y: 0.4, w: 0.2, h: 0.08 });
    expect(imported.warnings[0]).toContain("difuminados originales no son recuperables");
  });

  it("importa casillas de selección desde un SCORM", () => {
    const project = scormProject();
    project.steps[0].actions = [
      {
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
      },
      {
        id: "aplicar",
        type: "click",
        rects: [{ x: 0.5, y: 0.5, w: 0.1, h: 0.05 }],
        match: "any",
      },
    ];
    const bytes = zipSync(
      {
        "data/project.json": strToU8(JSON.stringify(project)),
        "assets/captura-scorm.png": strToU8("imagen-scorm"),
      },
      { level: 0 },
    );
    const imported = importProjectZip(bytes, "proyecto-casillas-importado");
    expect(imported.document.steps[0].checkboxZones).toHaveLength(1);
    expect(imported.document.steps[0].checkboxZones?.[0].expected).toBe(true);
  });

  it("rechaza un ZIP sin proyecto reconocible", () => {
    const bytes = zipSync({ "LEEME.txt": strToU8("nada") });
    expect(() => importProjectZip(bytes, "nuevo")).toThrow(/backup\.json|project\.json/);
  });
});
