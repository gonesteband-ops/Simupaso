import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { createScorm12Package } from "../../../src/exporter/create-scorm12-package";
import { projectSchema } from "../../../src/contract/project-schema";
import { samplePackageInput } from "../../helpers/package-fixture";

describe("createScorm12Package", () => {
  it("crea un paquete ZIP SCORM con los archivos locales requeridos", () => {
    const output = createScorm12Package(samplePackageInput());

    expect(output.mimeType).toBe("application/zip");
    expect(output.fileName).toBe("simulador-consulta-de-demostracion-v1.0.0.zip");
    expect(output.bytes.byteLength).toBeGreaterThan(0);
  });

  it("omite propiedades undefined y genera project.json válido", () => {
    const input = samplePackageInput();
    const project = projectSchema.parse(input.project);
    (project.steps[0] as unknown as Record<string, unknown>).formMode = undefined;
    (project.steps[0] as unknown as Record<string, unknown>).hint = undefined;
    input.project = project;

    const files = unzipSync(createScorm12Package(input).bytes);
    const json = new TextDecoder().decode(files["data/project.json"]);
    expect(json).not.toContain("undefined");
    expect(() => JSON.parse(json)).not.toThrow();
    expect(JSON.parse(json).steps[0].formMode).toBeUndefined();
  });

  it("rechaza contratos inválidos y assets que falten", () => {
    const invalidProject = samplePackageInput();
    const project = projectSchema.parse(invalidProject.project);
    invalidProject.project = { ...project, meta: { ...project.meta, title: "" } };
    expect(() => createScorm12Package(invalidProject)).toThrow(/proyecto|contrato/i);

    const missingAsset = samplePackageInput();
    missingAsset.assets.pop();
    expect(() => createScorm12Package(missingAsset)).toThrow(/asset|recurso/i);
  });

  it.each([
    "../escape.js",
    "/absolute.js",
    "https://example.invalid/player.js",
    "folder\\player.js",
  ])("rechaza una ruta de bundle no relativa o insegura: %s", (path) => {
    const input = samplePackageInput();
    input.playerBundle[1] = { ...input.playerBundle[1], path };
    expect(() => createScorm12Package(input)).toThrow(/ruta|path/i);
  });

  it("rechaza rutas duplicadas en el bundle del reproductor", () => {
    const input = samplePackageInput();
    input.playerBundle.push({ ...input.playerBundle[1] });
    expect(() => createScorm12Package(input)).toThrow(/duplicad/i);
  });

  it("rechaza recursos remotos referenciados por CSS del reproductor", () => {
    const input = samplePackageInput();
    input.playerBundle[1].bytes = new TextEncoder().encode(
      'body{background-image:url("https://example.invalid/image.png")}',
    );
    expect(() => createScorm12Package(input)).toThrow(/local|relativo/i);
  });
});
