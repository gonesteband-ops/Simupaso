import { expect, test, type Page } from "@playwright/test";
import {
  dragOnImage,
  openEditor,
  seedEditorDraft,
  uploadCaptures,
} from "../helpers/editor";

test.use({ viewport: { width: 1440, height: 900 } });

async function backToProjects(page: Page) {
  await page.getByRole("button", { name: "← Volver a proyectos" }).click();
  await expect(page.getByRole("heading", { name: "Borradores locales" })).toBeVisible();
}

async function importFile(page: Page, filePath: string) {
  await page.getByLabel("Importar SCORM o respaldo").setInputFiles(filePath);
  await expect(
    page.getByRole("status").filter({ hasText: "Proyecto importado" }),
  ).toBeVisible();
}

async function openImported(page: Page) {
  const card = page.locator(".project-card").filter({ hasText: "(importado)" }).first();
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Abrir editor" }).click();
  await expect(page.getByRole("heading", { name: /\(importado\)/ })).toBeVisible();
}

test("importa un respaldo .simpaso y conserva los difuminados", async ({ page }) => {
  await seedEditorDraft(page);
  await openEditor(page);
  await uploadCaptures(page, ["captura-respaldo-import.png"]);
  await page.getByRole("button", { name: "Agregar bloque de difuminado" }).click();

  await page.getByRole("button", { name: "Descargar respaldo" }).click();
  const dialog = page.getByRole("dialog", { name: "Confirmar respaldo" });
  await dialog.getByRole("checkbox").check();
  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Descargar respaldo" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  if (!path) throw new Error("No se pudo leer el respaldo descargado.");

  await backToProjects(page);
  await importFile(page, path);
  await openImported(page);
  await expect(page.locator('[data-zone-kind="redaction"]')).toHaveCount(1);
});

test("importa un SCORM exportado por la app y reconstruye las zonas", async ({ page }) => {
  await seedEditorDraft(page);
  await openEditor(page);
  await uploadCaptures(page, ["captura-scorm-import.png"]);
  await page.getByRole("button", { name: "Zona de clic", exact: true }).click();
  await dragOnImage(page, { x: 0.2, y: 0.2 }, { x: 0.4, y: 0.3 });

  await page.getByRole("button", { name: "Descargar SCORM 1.2" }).click();
  const dialog = page.getByRole("dialog", { name: "Confirmar exportación" });
  await dialog.getByRole("checkbox").check();
  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Descargar SCORM 1.2" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  if (!path) throw new Error("No se pudo leer el SCORM descargado.");

  await backToProjects(page);
  await importFile(page, path);
  await openImported(page);
  await expect(page.locator('[data-zone-kind="click"]')).toHaveCount(1);
});
