import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import {
  createEditorStep,
  createEmptyDocument,
  createHistory,
  editorReducer,
} from "../../../src/editor/model/editor-reducer";
import { createProjectBackup } from "../../../src/editor/model/project-backup";
import type { EditorAsset } from "../../../src/editor/model/editor-types";

describe("respaldo editable .simpaso", () => {
  it("incluye proyecto, originales, difuminados y advertencia", async () => {
    const base = createEmptyDocument({ id: "proyecto-1", title: "Proyecto sensible" });
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

    const original = new TextEncoder().encode("bytes-originales");
    const asset: EditorAsset = {
      id: "captura-original",
      projectId: "proyecto-1",
      blob: new Blob([original], { type: "image/png" }),
      mime: "image/png",
      width: 1919,
      height: 1028,
      sizeBytes: original.byteLength,
      name: "captura.png",
      createdAt: "2026-10-21T10:00:00.000Z",
    };

    const backup = await createProjectBackup(document, [asset], "2026-10-21T12:00:00.000Z");
    expect(backup.fileName).toBe("proyecto-sensible-respaldo-2026-10-21.simpaso");

    const files = unzipSync(backup.bytes);
    expect(files["LEEME.txt"]).toBeDefined();
    expect(files["backup.json"]).toBeDefined();
    const manifest = JSON.parse(new TextDecoder().decode(files["backup.json"]));
    expect(manifest.format).toBe("simupaso-backup");
    expect(manifest.version).toBe(1);
    expect(manifest.project.steps).toHaveLength(1);
    expect(manifest.project.redactions[0].items[0].style).toBe("solid");
    expect(manifest.assets[0].id).toBe("captura-original");
    expect(manifest.assets[0].width).toBe(1919);

    const stored = files[manifest.assets[0].file];
    expect(stored).toEqual(original);
    expect(new TextDecoder().decode(files["LEEME.txt"])).toContain("originales sin difuminar");
  });
});
