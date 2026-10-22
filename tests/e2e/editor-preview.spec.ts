import { expect, test } from "@playwright/test";
import {
  dragOnImage,
  openEditor,
  seedEditorDraft,
  uploadCaptures,
} from "../helpers/editor";

test.use({ viewport: { width: 1440, height: 900 } });

test("previsualiza desde el paso seleccionado, usa el reproductor y no llama al LMS", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const host = window as unknown as Record<string, unknown>;
    host.__lmsCalled = false;
    host.LMSInitialize = () => {
      host.__lmsCalled = true;
      return "true";
    };
    host.LMSGetLastError = () => "0";
    host.LMSSetValue = () => "true";
    host.LMSCommit = () => "true";
    host.LMSFinish = () => "true";
    host.LMSGetValue = () => "";
  });
  await seedEditorDraft(page);
  await openEditor(page);
  await uploadCaptures(page, ["paso-1.png", "paso-2.png"]);

  await page.getByRole("button", { name: /paso-1/ }).click();
  await page.getByRole("tab", { name: "Paso" }).click();
  await page.getByLabel("Tipo de paso").selectOption("informative");

  await page.getByRole("button", { name: /paso-2/ }).click();
  await page.getByRole("button", { name: "Zona de texto", exact: true }).click();
  await dragOnImage(page, { x: 0.2, y: 0.3 }, { x: 0.5, y: 0.4 });
  await page.getByLabel("Etiqueta").fill("Código ficticio");

  await page.getByRole("button", { name: "Vista previa" }).click();
  const frame = page.frameLocator('iframe[title="Vista previa del simulador"]');
  await expect(frame.getByText("Paso 2 de 2")).toBeVisible();
  await frame.getByLabel("Código ficticio").fill("texto ficticio");
  await frame.getByLabel("Código ficticio").press("Enter");
  await expect(frame.getByRole("heading", { name: "¡Procedimiento completado!" })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as Record<string, unknown>).__lmsCalled)).toBe(
    false,
  );

  await page.getByRole("button", { name: "Cerrar vista previa" }).click();
  await expect(page.getByRole("button", { name: "Vista previa" })).toBeFocused();

  await page.getByRole("button", { name: /paso-1/ }).click();
  await page.getByRole("button", { name: "Vista previa" }).click();
  const firstFrame = page.frameLocator('iframe[title="Vista previa del simulador"]');
  await expect(firstFrame.getByRole("button", { name: "Siguiente" })).toBeVisible();
  await firstFrame.getByRole("button", { name: "Siguiente" }).click();
  await expect(firstFrame.getByText("Paso 2 de 2")).toBeVisible();
  await page.getByRole("button", { name: "Cerrar vista previa" }).click();
});

test("valida el RUT configurado en la vista previa", async ({ page }) => {
  await seedEditorDraft(page);
  await openEditor(page);
  await uploadCaptures(page, ["captura-rut.png"]);

  await page.getByRole("button", { name: "Zona de texto", exact: true }).click();
  await dragOnImage(page, { x: 0.2, y: 0.3 }, { x: 0.5, y: 0.4 });
  await page.getByLabel("Etiqueta").fill("RUT ficticio");
  await page.getByLabel("Validación").selectOption("rut");
  await expect(page.getByLabel("Aceptar con o sin puntos y guion")).toBeChecked();

  await page.getByRole("button", { name: "Vista previa" }).click();
  const frame = page.frameLocator('iframe[title="Vista previa del simulador"]');
  const rut = frame.getByLabel("RUT ficticio");
  await rut.fill("87.654.321-5");
  await rut.press("Enter");
  await expect(frame.getByRole("alert")).toContainText("dígito verificador");
  await rut.fill("876543214");
  await rut.press("Enter");
  await expect(frame.getByRole("heading", { name: "¡Procedimiento completado!" })).toBeVisible();
  await page.getByRole("button", { name: "Cerrar vista previa" }).click();
});

test("bloquea la vista previa con datos incompletos y permite ir al problema", async ({
  page,
}) => {
  await seedEditorDraft(page);
  await openEditor(page);
  await uploadCaptures(page, ["captura-issue.png"]);

  await page.getByRole("button", { name: "Zona de texto", exact: true }).click();
  await dragOnImage(page, { x: 0.2, y: 0.3 }, { x: 0.5, y: 0.4 });
  await page.getByLabel("Etiqueta").fill("");

  await page.getByRole("button", { name: "Vista previa" }).click();
  await expect(
    page.getByRole("heading", { name: "Revisa estos puntos antes de continuar" }),
  ).toBeVisible();
  await expect(page.getByText(/necesita una etiqueta/)).toBeVisible();

  await page.getByRole("button", { name: "Ir a la zona" }).click();
  await expect(page.getByLabel("Etiqueta")).toBeVisible();
  await page.getByLabel("Etiqueta").fill("Dato ficticio");

  await page.getByRole("button", { name: "Vista previa" }).click();
  const frame = page.frameLocator('iframe[title="Vista previa del simulador"]');
  await expect(frame.getByLabel("Dato ficticio")).toBeVisible();
  await page.getByRole("button", { name: "Cerrar vista previa" }).click();
});
