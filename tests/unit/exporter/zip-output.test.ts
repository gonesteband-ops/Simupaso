import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { createScorm12Package } from "../../../src/exporter/create-scorm12-package";
import { samplePackageInput } from "../../helpers/package-fixture";

function zipPaths(bytes: Uint8Array): string[] {
  return Object.keys(unzipSync(bytes)).sort();
}

describe("salida ZIP reproducible", () => {
  it("produce bytes idénticos cuando recibe la misma entrada", () => {
    const input = samplePackageInput();

    expect(createScorm12Package(input).bytes).toEqual(
      createScorm12Package(input).bytes,
    );
  });

  it("usa rutas relativas con separadores `/` en todas las entradas", () => {
    const output = createScorm12Package(samplePackageInput());
    const paths = zipPaths(output.bytes);

    expect(paths).toContain("imsmanifest.xml");
    expect(paths).toContain("index.html");
    expect(paths.every((path) => !path.includes("\\"))).toBe(true);
    expect(paths.every((path) => !path.startsWith("/") && !path.includes("../"))).toBe(
      true,
    );
  });

  it("reubica el HTML y conserva los recursos del bundle bajo player/", () => {
    const files = unzipSync(createScorm12Package(samplePackageInput()).bytes);
    const html = new TextDecoder().decode(files["index.html"]);

    expect(html).toContain("./player/assets/player.css");
    expect(html).toContain("./player/assets/player.js");
    expect(files["player/assets/player.css"]).toBeDefined();
    expect(files["player/assets/player.js"]).toBeDefined();
  });
});
