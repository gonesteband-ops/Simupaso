import { readFileSync } from "node:fs";
import { unzipSync } from "fflate";
import { expect, test } from "@playwright/test";
import { dragOnImage, openEditor, seedEditorDraft, uploadCaptures } from "../helpers/editor";

test.use({ viewport: { width: 1440, height: 900 } });

test("crea casillas, valida la selección y permite corregirla", async ({ page }) => {
  await seedEditorDraft(page);
  await openEditor(page);
  await uploadCaptures(page, ["captura-casillas.png"]);

  await page.getByRole("button", { name: "Casilla", exact: true }).click();
  await dragOnImage(page, { x: 0.2, y: 0.2 }, { x: 0.25, y: 0.25 });
  await expect(page.locator('[data-zone-kind="checkbox"]')).toHaveCount(1);
  await page.getByRole("button", { name: "Casilla", exact: true }).click();
  await dragOnImage(page, { x: 0.3, y: 0.2 }, { x: 0.35, y: 0.25 });
  await expect(page.locator('[data-zone-kind="checkbox"]')).toHaveCount(2);

  await page.getByLabel("Debe quedar marcada").uncheck();

  await page.getByRole("button", { name: "Zona de clic", exact: true }).click();
  await dragOnImage(page, { x: 0.5, y: 0.6 }, { x: 0.7, y: 0.7 });

  await page.getByRole("button", { name: "Vista previa" }).click();
  const frame = page.frameLocator('iframe[title="Vista previa del simulador"]');
  const checkboxes = frame.getByRole("checkbox");
  await expect(checkboxes).toHaveCount(2);

  await checkboxes.first().focus();
  await checkboxes.first().press("Space");
  await expect(checkboxes.first()).toBeChecked();

  await frame.locator(".checkbox-overlay").nth(1).click();
  await expect(checkboxes.nth(1)).toBeChecked();

  await frame.getByRole("button", { name: "Zona de interacción 1" }).click();
  await expect(frame.getByRole("alert")).toContainText("Revisa las casillas seleccionadas.");

  await frame.locator(".checkbox-overlay").nth(1).click();
  await expect(checkboxes.nth(1)).not.toBeChecked();
  await frame.getByRole("button", { name: "Zona de interacción 1" }).click();
  await expect(
    frame.getByRole("heading", { name: "¡Procedimiento completado!" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cerrar vista previa" }).click();

  await page.getByRole("button", { name: "Descargar SCORM 1.2" }).click();
  const dialog = page.getByRole("dialog", { name: "Confirmar exportación" });
  await dialog.getByRole("checkbox").check();
  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Descargar SCORM 1.2" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  if (!path) throw new Error("No se pudo leer el SCORM.");
  const files = unzipSync(new Uint8Array(readFileSync(path)));
  const exported = JSON.parse(new TextDecoder().decode(files["data/project.json"]));
  const actions = exported.steps[0].actions;
  expect(
    actions.some((action: { type: string }) => action.type === "checkbox"),
  ).toBe(true);
  const checkboxAction = actions.find(
    (action: { type: string }) => action.type === "checkbox",
  );
  expect(checkboxAction.items).toHaveLength(2);
  expect(checkboxAction.items[1].expected).toBe(false);
});
