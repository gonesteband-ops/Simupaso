import { describe, expect, it } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { buildDraft } from "../../src/app/storage";
import {
  createEditorStep,
  createEmptyDocument,
  createHistory,
  editorReducer,
} from "../../src/editor/model/editor-reducer";
import { createEditorRepository } from "../../src/editor/storage/editor-repository";
import type { EditorAsset } from "../../src/editor/model/editor-types";

describe("ciclo de persistencia del editor", () => {
  it("crea un borrador, guarda su documento, lo recupera y lo elimina en cascada", async () => {
    const repository = createEditorRepository(new IDBFactory());
    const draft = buildDraft({
      id: "proyecto-integracion",
      name: "Proyecto de integración",
      client: "Cliente ficticio",
    });

    const empty = createEmptyDocument({
      id: draft.id,
      title: draft.name,
      client: draft.client,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
    });
    expect(await repository.loadProject(draft.id)).toBeNull();

    const asset: EditorAsset = {
      id: "captura-integracion",
      projectId: draft.id,
      blob: new Blob(["demo"], { type: "image/png" }),
      mime: "image/png",
      width: 1200,
      height: 800,
      sizeBytes: 4,
      name: "captura-integracion.png",
      createdAt: "2026-10-20T10:00:00.000Z",
    };
    const step = createEditorStep({
      id: "paso-integracion",
      title: "Paso de integración",
      assetId: asset.id,
    });
    const document = editorReducer(createHistory(empty), {
      type: "addSteps",
      steps: [step],
    }).present;

    await repository.saveAsset(asset);
    await repository.saveProject(document);

    const loaded = await repository.loadProject(draft.id);
    expect(loaded?.steps).toHaveLength(1);
    expect(await repository.loadAssets(draft.id)).toHaveLength(1);

    const renamed = editorReducer(createHistory(loaded!), {
      type: "updateStep",
      stepId: "paso-integracion",
      patch: { title: "Paso actualizado" },
    }).present;
    await repository.saveProject(renamed);
    expect((await repository.loadProject(draft.id))?.steps[0].title).toBe("Paso actualizado");

    await repository.deleteProjectData(draft.id);
    expect(await repository.loadProject(draft.id)).toBeNull();
    expect(await repository.loadAssets(draft.id)).toEqual([]);
  });
});
