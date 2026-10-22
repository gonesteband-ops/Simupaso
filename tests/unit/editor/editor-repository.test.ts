import { beforeEach, describe, expect, it } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import {
  createEditorRepository,
  storageErrorMessage,
  type EditorRepository,
} from "../../../src/editor/storage/editor-repository";
import {
  createEditorStep,
  createEmptyDocument,
  createHistory,
  editorReducer,
} from "../../../src/editor/model/editor-reducer";
import type { EditorAsset, EditorProject } from "../../../src/editor/model/editor-types";

function makeDocument(id = "proyecto-1", title = "Proyecto ficticio"): EditorProject {
  return createEmptyDocument({ id, title });
}

function withStep(document: EditorProject, stepId = "paso-1", assetId = "captura-1") {
  const step = createEditorStep({ id: stepId, title: "Paso", assetId });
  step.textZones = [
    {
      id: `texto-${stepId}`,
      rect: { x: 0.1, y: 0.1, w: 0.2, h: 0.1 },
      label: "Dato ficticio",
      masked: false,
      validation: { kind: "non_empty" },
    },
  ];
  return editorReducer(createHistory(document), { type: "addSteps", steps: [step] }).present;
}

function makeAsset(projectId = "proyecto-1", id = "captura-1"): EditorAsset {
  return {
    id,
    projectId,
    blob: new Blob(["demo"], { type: "image/png" }),
    mime: "image/png",
    width: 1200,
    height: 800,
    sizeBytes: 4,
    name: `${id}.png`,
    createdAt: "2026-10-20T10:00:00.000Z",
  };
}

let repository: EditorRepository;

beforeEach(() => {
  repository = createEditorRepository(new IDBFactory());
});

describe("repositorio del editor", () => {
  it("guarda y recupera un documento", async () => {
    const document = withStep(makeDocument());
    await repository.saveProject(document);
    await expect(repository.loadProject(document.id)).resolves.toEqual(document);
  });

  it("devuelve null si no existe el documento", async () => {
    await expect(repository.loadProject("no-existe")).resolves.toBeNull();
  });

  it("rechaza documentos inválidos antes de escribir", async () => {
    const document = makeDocument();
    (document as unknown as Record<string, unknown>).schemaVersion = "editor-2";
    await expect(repository.saveProject(document)).rejects.toThrow(/versión|inválido/i);
  });

  it("guarda assets y los devuelve ordenados por creación e id", async () => {
    const first = makeAsset("proyecto-1", "captura-b");
    first.createdAt = "2026-10-20T10:00:00.000Z";
    const second = makeAsset("proyecto-1", "captura-a");
    second.createdAt = "2026-10-20T10:00:00.000Z";
    const third = makeAsset("otro-proyecto", "captura-c");

    await repository.saveAsset(first);
    await repository.saveAsset(second);
    await repository.saveAsset(third);

    const assets = await repository.loadAssets("proyecto-1");
    expect(assets.map((asset) => asset.id)).toEqual(["captura-a", "captura-b"]);
    expect(assets[0].blob).toBeInstanceOf(Blob);
  });

  it("rechaza assets con MIME no permitido o tamaño excesivo", async () => {
    const invalidMime = makeAsset();
    invalidMime.mime = "image/svg+xml" as never;
    await expect(repository.saveAsset(invalidMime)).rejects.toThrow(/PNG, JPG o WebP/);

    const tooLarge = makeAsset();
    tooLarge.sizeBytes = 11 * 1024 * 1024;
    await expect(repository.saveAsset(tooLarge)).rejects.toThrow(/10 MB/);
  });

  it("rechaza reutilizar el id de un asset de otro proyecto", async () => {
    await repository.saveAsset(makeAsset("proyecto-1", "captura-1"));
    await expect(repository.saveAsset(makeAsset("proyecto-2", "captura-1"))).rejects.toThrow(
      /otro proyecto/,
    );
  });

  it("elimina documento y assets en cascada sin tocar otros proyectos", async () => {
    await repository.saveProject(withStep(makeDocument("proyecto-1")));
    await repository.saveProject(withStep(makeDocument("proyecto-2"), "paso-2", "captura-2"));
    await repository.saveAsset(makeAsset("proyecto-1", "captura-1"));
    await repository.saveAsset(makeAsset("proyecto-2", "captura-2"));

    await repository.deleteProjectData("proyecto-1");

    await expect(repository.loadProject("proyecto-1")).resolves.toBeNull();
    await expect(repository.loadAssets("proyecto-1")).resolves.toEqual([]);
    await expect(repository.loadProject("proyecto-2")).resolves.not.toBeNull();
    await expect(repository.loadAssets("proyecto-2")).resolves.toHaveLength(1);
    await expect(repository.deleteProjectData("proyecto-1")).resolves.toBeUndefined();
  });

  it("traduce un error de cuota a un mensaje claro", () => {
    const error = new DOMException("quota", "QuotaExceededError");
    expect(storageErrorMessage(error)).toMatch(/espacio/i);
    expect(storageErrorMessage(new Error("otro"))).toContain("otro");
  });
});
