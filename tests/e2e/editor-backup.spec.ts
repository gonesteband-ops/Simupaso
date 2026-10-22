import { readFileSync } from "node:fs";
import { unzipSync } from "fflate";
import { expect, test } from "@playwright/test";
import {
  fixturePng,
  openEditor,
  seedEditorDraft,
  uploadCaptures,
} from "../helpers/editor";

test.use({ viewport: { width: 1440, height: 900 } });

test("descarga un respaldo .simpaso con originales y difuminados", async ({ page }) => {
  await seedEditorDraft(page);
  await openEditor(page);
  await uploadCaptures(page, ["captura-respaldo.png"]);
  await page.getByRole("button", { name: "Agregar bloque de difuminado" }).click();

  await page.getByRole("button", { name: "Descargar respaldo" }).click();
  const dialog = page.getByRole("dialog", { name: "Confirmar respaldo" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("originales sin difuminar");
  await dialog.getByRole("checkbox").check();

  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Descargar respaldo" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.simpaso$/);

  const path = await download.path();
  if (!path) throw new Error("No se pudo leer el respaldo.");
  const files = unzipSync(new Uint8Array(readFileSync(path)));
  expect(files["LEEME.txt"]).toBeDefined();
  const manifest = JSON.parse(new TextDecoder().decode(files["backup.json"]));
  expect(manifest.format).toBe("simupaso-backup");
  expect(manifest.project.redactions[0].items).toHaveLength(1);
  expect(manifest.assets).toHaveLength(1);

  const stored = Buffer.from(files[manifest.assets[0].file]);
  expect(stored.equals(fixturePng)).toBe(true);
});
