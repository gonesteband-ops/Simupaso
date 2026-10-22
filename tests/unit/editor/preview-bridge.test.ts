import { describe, expect, it, vi } from "vitest";
import type { Project } from "../../../src/contract/project";
import {
  PREVIEW_ERROR,
  PREVIEW_LOAD,
  PREVIEW_MOUNTED,
  PREVIEW_READY,
  buildPreviewAssetUrls,
  isPreviewLoadMessage,
  missingPreviewAssets,
  parsePreviewToEditorMessage,
} from "../../../src/editor/model/preview-message";
import type { EditorAsset } from "../../../src/editor/model/editor-types";

const project: Project = {
  schemaVersion: "1.0",
  id: "proyecto-preview",
  meta: { title: "Preview", language: "es-CL", version: "1.0.0" },
  settings: { allowedModes: ["guided"], defaultMode: "guided" },
  assets: [
    { id: "captura-1", file: "assets/captura-1.png", mime: "image/png", width: 100, height: 80 },
  ],
  steps: [
    {
      id: "paso-1",
      title: "Paso",
      instruction: "Instrucción",
      assetId: "captura-1",
      actions: [{ id: "info", type: "informative", text: "Continuar" }],
    },
  ],
  completion: { title: "Fin", message: "Terminado" },
};

const asset: EditorAsset = {
  id: "captura-1",
  projectId: "proyecto-preview",
  blob: new Blob(["demo"], { type: "image/png" }),
  mime: "image/png",
  width: 100,
  height: 80,
  sizeBytes: 4,
  name: "captura-1.png",
  createdAt: "2026-10-20T10:00:00.000Z",
};

describe("puente de vista previa", () => {
  it("acepta un mensaje de carga válido", () => {
    const message = {
      type: PREVIEW_LOAD,
      requestId: "req-1",
      project,
      assets: { "captura-1": "blob:local" },
      initialStepIndex: 0,
    };
    expect(isPreviewLoadMessage(message)).toBe(true);
  });

  it("rechaza mensajes incompletos o con índices inválidos", () => {
    expect(isPreviewLoadMessage(null)).toBe(false);
    expect(isPreviewLoadMessage({ type: PREVIEW_LOAD })).toBe(false);
    expect(
      isPreviewLoadMessage({
        type: PREVIEW_LOAD,
        requestId: "req-1",
        project,
        assets: {},
        initialStepIndex: -1,
      }),
    ).toBe(false);
    expect(
      isPreviewLoadMessage({
        type: PREVIEW_LOAD,
        requestId: "req-1",
        project,
        assets: { "captura-1": 42 },
        initialStepIndex: 0,
      }),
    ).toBe(false);
  });

  it("interpreta los mensajes del iframe y descarta los desconocidos", () => {
    expect(parsePreviewToEditorMessage({ type: PREVIEW_READY })).toEqual({
      type: PREVIEW_READY,
    });
    expect(
      parsePreviewToEditorMessage({ type: PREVIEW_MOUNTED, requestId: "req-1" }),
    ).toEqual({ type: PREVIEW_MOUNTED, requestId: "req-1" });
    expect(
      parsePreviewToEditorMessage({
        type: PREVIEW_ERROR,
        requestId: "req-1",
        message: "Error",
      }),
    ).toEqual({ type: PREVIEW_ERROR, requestId: "req-1", message: "Error" });
    expect(parsePreviewToEditorMessage({ type: "otro" })).toBeNull();
    expect(parsePreviewToEditorMessage({ type: PREVIEW_MOUNTED })).toBeNull();
  });

  it("crea URLs locales solo para los assets del proyecto", () => {
    const createUrl = vi.fn(() => "blob:test");
    const urls = buildPreviewAssetUrls(project, [asset], createUrl);
    expect(urls).toEqual({ "captura-1": "blob:test" });
    expect(createUrl).toHaveBeenCalledWith(asset.blob);
  });

  it("detecta assets faltantes", () => {
    expect(missingPreviewAssets(project, [asset])).toEqual([]);
    expect(missingPreviewAssets(project, [])).toEqual(["captura-1"]);
  });
});
