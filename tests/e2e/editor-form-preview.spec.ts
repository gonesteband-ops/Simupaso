import { expect, test } from "@playwright/test";
import {
  dragOnImage,
  openEditor,
  seedEditorDraft,
  uploadCaptures,
} from "../helpers/editor";

test.use({ viewport: { width: 1440, height: 900 } });

test("previsualiza RUT y clave simultáneos sobre la captura", async ({ page }) => {
  await seedEditorDraft(page);
  await openEditor(page);
  await uploadCaptures(page, ["captura-login.png"]);

  await page.getByRole("button", { name: "Zona de texto", exact: true }).click();
  await dragOnImage(page, { x: 0.2, y: 0.25 }, { x: 0.5, y: 0.33 });
  await page.getByLabel("Etiqueta").fill("RUT ficticio");
  await page.getByLabel("Tamaño del texto (% del alto de la zona)").fill("22");
  await page.getByLabel("Validación").selectOption("rut");

  await page.getByRole("button", { name: "Agregar zona de texto" }).click();
  await page.getByLabel("Etiqueta").fill("Clave ficticia");
  await page.getByLabel("Enmascarar el valor (contraseña)").check();

  await page.getByRole("button", { name: "Zona de clic", exact: true }).click();
  await dragOnImage(page, { x: 0.2, y: 0.55 }, { x: 0.45, y: 0.63 });

  await page.getByRole("button", { name: "Vista previa" }).click();
  const frame = page.frameLocator('iframe[title="Vista previa del simulador"]');
  const rut = frame.getByLabel("RUT ficticio");
  const clave = frame.getByLabel("Clave ficticia");
  await expect(rut).toBeVisible();
  await expect(clave).toBeVisible();
  await expect(clave).toHaveAttribute("type", "password");
  await expect(frame.locator(".input-form")).toHaveCount(0);
  const rutFont = await rut.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).fontSize),
  );
  expect(rutFont).toBeLessThan(18);

  const image = await frame.locator(".player-image").boundingBox();
  const rutBox = await rut.boundingBox();
  if (!image || !rutBox) throw new Error("No se pudieron medir los campos superpuestos.");
  expect(Math.abs(rutBox.y - (image.y + image.height * 0.25))).toBeLessThanOrEqual(4);

  await rut.fill("87.654.321-5");
  await clave.fill("clave-ficticia");
  await frame.getByRole("button", { name: "Zona de interacción 1" }).click();
  await expect(frame.getByRole("alert")).toContainText("dígito verificador");
  await expect(rut).toBeVisible();

  await rut.fill("876543214");
  await clave.press("Enter");
  await expect(frame.getByRole("heading", { name: "¡Procedimiento completado!" })).toBeVisible();
  await page.getByRole("button", { name: "Cerrar vista previa" }).click();
});
