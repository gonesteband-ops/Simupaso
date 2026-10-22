import { expect, test } from "@playwright/test";
import {
  dragOnImage,
  openEditor,
  seedEditorDraft,
  uploadCaptures,
} from "../helpers/editor";

test.use({ viewport: { width: 1440, height: 900 } });

test("oculta una zona y la quema en la imagen de la vista previa", async ({ page }) => {
  await seedEditorDraft(page);
  await openEditor(page);
  await uploadCaptures(page, ["captura-sensible.png"]);

  await page.getByRole("button", { name: "Difuminar", exact: true }).click();
  await dragOnImage(page, { x: 0.2, y: 0.2 }, { x: 0.4, y: 0.3 });

  await expect(page.locator('[data-zone-kind="redaction"]')).toHaveCount(1);
  await expect(page.locator(".zone-badge.redact")).toHaveText("Difuminado");
  await expect(page.getByLabel("Estilo")).toHaveValue("solid");
  await page.getByRole("button", { name: "Zona de clic", exact: true }).click();
  await dragOnImage(page, { x: 0.6, y: 0.6 }, { x: 0.75, y: 0.7 });

  await page.getByRole("button", { name: "Vista previa" }).click();
  const frame = page.frameLocator('iframe[title="Vista previa del simulador"]');
  const image = frame.locator(".player-image");
  await expect(image).toBeVisible();

  const pixel = await image.evaluate(async (element) => {
    const bitmap = await createImageBitmap(element as HTMLImageElement);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Sin contexto 2D");
    context.drawImage(bitmap, 0, 0);
    const sample = context.getImageData(
      Math.round(bitmap.width * 0.3),
      Math.round(bitmap.height * 0.25),
      1,
      1,
    ).data;
    bitmap.close();
    return [sample[0], sample[1], sample[2]];
  });

  expect(Math.abs(pixel[0] - 17)).toBeLessThanOrEqual(2);
  expect(Math.abs(pixel[1] - 24)).toBeLessThanOrEqual(2);
  expect(Math.abs(pixel[2] - 39)).toBeLessThanOrEqual(2);
  await page.getByRole("button", { name: "Cerrar vista previa" }).click();
});

test("persiste el difuminado y lo incluye al exportar", async ({ page }) => {
  await seedEditorDraft(page);
  await openEditor(page);
  await uploadCaptures(page, ["captura-difuminada.png"]);
  await page.getByRole("button", { name: "Agregar bloque de difuminado" }).click();
  await page.getByRole("button", { name: "Agregar zona de clic" }).click();
  await expect(page.getByText("Guardado localmente")).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "Mis proyectos" }).click();
  await page.getByRole("button", { name: "Abrir editor" }).click();
  await expect(page.locator('[data-zone-kind="redaction"]')).toHaveCount(1);

  await page.getByRole("button", { name: "Descargar SCORM 1.2" }).click();
  const dialog = page.getByRole("dialog", { name: "Confirmar exportación" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("checkbox").check();
  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Descargar SCORM 1.2" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.zip$/);
});
