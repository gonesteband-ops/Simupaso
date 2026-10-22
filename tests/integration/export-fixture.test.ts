import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { samplePlayerBundle } from "../helpers/package-fixture";

const root = resolve(fileURLToPath(new URL("../../", import.meta.url)));

describe("CLI de exportación del fixture", () => {
  it("escribe un paquete con nombre estable y falla con argumentos inválidos", () => {
    const temp = mkdtempSync(join(tmpdir(), "simupaso-cli-"));
    const output = join(temp, "demo.zip");
    const bundle = join(temp, "player-bundle.json");
    const bundleJson = samplePlayerBundle.map((file) => ({
      path: file.path,
      bytesBase64: Buffer.from(file.bytes).toString("base64"),
    }));
    writeFileSync(bundle, JSON.stringify(bundleJson));

    try {
      const valid = spawnSync(
        process.execPath,
        [
          "--import",
          "tsx",
          "src/cli/export-fixture.ts",
          "--out",
          output,
          "--bundle",
          bundle,
        ],
        { cwd: root, encoding: "utf8" },
      );
      expect(valid.status).toBe(0);
      expect(readFileSync(output).byteLength).toBeGreaterThan(0);

      const invalid = spawnSync(
        process.execPath,
        ["--import", "tsx", "src/cli/export-fixture.ts"],
        { cwd: root, encoding: "utf8" },
      );
      expect(invalid.status).not.toBe(0);
      expect(invalid.stderr).toMatch(/--out|salida/i);
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  });
});
