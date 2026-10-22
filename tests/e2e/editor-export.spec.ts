import { readFileSync } from "node:fs";
import { unzipSync } from "fflate";
import { expect, test } from "@playwright/test";
import { openEditor, seedEditorDraft, uploadCaptures } from "../helpers/editor";

test.use({ viewport: { width: 1440, height: 900 } });

test("descarga un paquete SCORM 1.2 con el proyecto y el reproductor", async ({ page }) => {
  await seedEditorDraft(page);
  await openEditor(page);
  await uploadCaptures(page, ["captura-export.png"]);
  await page.getByRole("button", { name: "Agregar zona de clic" }).click();

  await page.getByRole("button", { name: "Descargar SCORM 1.2" }).click();
  const confirmDialog = page.getByRole("dialog", { name: "Confirmar exportación" });
  await confirmDialog.getByRole("checkbox").check();
  const downloadPromise = page.waitForEvent("download");
  await confirmDialog.getByRole("button", { name: "Descargar SCORM 1.2" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/\.zip$/);
  const path = await download.path();
  if (!path) throw new Error("No se pudo leer el archivo descargado.");
  const bytes = readFileSync(path);
  expect(bytes.subarray(0, 2).toString()).toBe("PK");

  const files = unzipSync(new Uint8Array(bytes));
  expect(files["imsmanifest.xml"]).toBeDefined();
  expect(files["data/project.json"]).toBeDefined();
  expect(files["index.html"]).toBeDefined();
  expect(Object.keys(files).some((name) => name.startsWith("player/"))).toBe(true);

  const projectJson = new TextDecoder().decode(files["data/project.json"]);
  expect(projectJson).not.toContain("undefined");
  expect(() => JSON.parse(projectJson)).not.toThrow();
  expect(JSON.parse(projectJson).steps[0].formMode).toBeUndefined();
  await expect(page.getByRole("status").filter({ hasText: "Se descargó" })).toBeVisible();
});

test("no descarga un paquete inválido y muestra los problemas", async ({ page }) => {
  await seedEditorDraft(page);
  await openEditor(page);

  await page.getByRole("button", { name: "Descargar SCORM 1.2" }).click();
  const confirmDialog = page.getByRole("dialog", { name: "Confirmar exportación" });
  await confirmDialog.getByRole("checkbox").check();
  await confirmDialog.getByRole("button", { name: "Descargar SCORM 1.2" }).click();
  await expect(page.getByRole("alert")).toContainText("No se pudo descargar el SCORM");
  await expect(page.getByRole("alert")).toContainText("al menos un paso");
});
