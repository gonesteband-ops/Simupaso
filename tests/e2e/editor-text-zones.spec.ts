import { expect, test } from "@playwright/test";
import {
  dragOnImage,
  openEditor,
  seedEditorDraft,
  uploadCaptures,
} from "../helpers/editor";

test.use({ viewport: { width: 1440, height: 900 } });

test("configura zonas de texto, validaciones y mensajes, y las conserva", async ({ page }) => {
  await seedEditorDraft(page);
  await openEditor(page);
  await uploadCaptures(page, ["captura-texto.png"]);

  await page.getByRole("button", { name: "Zona de texto", exact: true }).click();
  await dragOnImage(page, { x: 0.2, y: 0.25 }, { x: 0.5, y: 0.34 });

  const zones = page.locator('[data-zone-kind="text"]');
  await expect(zones).toHaveCount(1);
  await expect(page.locator(".zone-badge")).toHaveText("Zona de texto");

  await page.getByLabel("Etiqueta").fill("Código ficticio");
  await page.getByLabel("Enmascarar el valor (contraseña)").check();
  await page.getByLabel("Validación").selectOption("equals");
  await page.getByLabel("Valor esperado").fill("demo-123");
  await page.getByLabel("Mensaje de error").fill("El código no corresponde.");
  await page.getByLabel("Mensaje de éxito").fill("Código aceptado.");

  await page.getByRole("button", { name: "Agregar zona de texto" }).click();
  await expect(zones).toHaveCount(2);
  await page.getByLabel("Etiqueta").fill("RUT ficticio");
  await page.getByLabel("Validación").selectOption("rut");
  await expect(page.getByLabel("Aceptar con o sin puntos y guion")).toBeChecked();

  await expect(page.getByText("Guardado localmente")).toBeVisible();
  await page.reload();
  await openEditor(page);

  await expect(page.locator('[data-zone-kind="text"]')).toHaveCount(2);
  await page.getByRole("tab", { name: "Zonas" }).click();
  await page.getByRole("button", { name: "Código ficticio" }).click();
  await expect(page.getByLabel("Etiqueta")).toHaveValue("Código ficticio");
  await expect(page.getByLabel("Enmascarar el valor (contraseña)")).toBeChecked();
  await expect(page.getByLabel("Validación")).toHaveValue("equals");
  await expect(page.getByLabel("Valor esperado")).toHaveValue("demo-123");
  await expect(page.getByLabel("Mensaje de error")).toHaveValue("El código no corresponde.");
  await expect(page.getByLabel("Mensaje de éxito")).toHaveValue("Código aceptado.");

  await page.getByRole("button", { name: "RUT ficticio" }).click();
  await expect(page.getByLabel("Etiqueta")).toHaveValue("RUT ficticio");
  await expect(page.getByLabel("Validación")).toHaveValue("rut");
  await expect(page.getByLabel("Aceptar con o sin puntos y guion")).toBeChecked();
});
