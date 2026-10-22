import { expect, test } from "@playwright/test";
import { completeLoginStep, openFixturePlayer } from "../helpers/player";

test("las acciones correctas completan los dos pasos y el reproductor informa el final", async ({
  page,
}) => {
  await openFixturePlayer(page);
  await completeLoginStep(page);

  await expect(
    page.getByRole("heading", { name: "Consulta de demostración" }),
  ).toBeVisible();
  await page.getByLabel("RUT de prueba").fill("876543214");
  await page.getByLabel("RUT de prueba").press("Enter");
  await page.getByRole("button", { name: "Zona de interacción 1" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByRole("heading", { name: "Simulación completada" })).toBeVisible();
});

test("el clic fuera de zona muestra un mensaje no bloqueante y no avanza", async ({
  page,
}) => {
  await openFixturePlayer(page);
  await page.getByLabel("Usuario ficticio").fill("alumno-demo");
  await page.getByLabel("Usuario ficticio").press("Enter");
  await page.getByLabel("Contraseña simulada").fill("clave-temporal");
  await page.getByLabel("Contraseña simulada").press("Enter");
  await page.getByTestId("image-viewport").click({ position: { x: 4, y: 4 } });

  await expect(page.locator("#feedback")).toContainText("zona indicada");
  await expect(
    page.getByRole("heading", { name: "Ingreso de demostración" }),
  ).toBeVisible();
});

test("un RUT inválido se conserva y no permite avanzar hasta corregirlo", async ({
  page,
}) => {
  await openFixturePlayer(page);
  await completeLoginStep(page);

  const rut = page.getByLabel("RUT de prueba");
  await rut.fill("87.654.321-5");
  await rut.press("Enter");
  await expect(rut).toHaveValue("87.654.321-5");
  await expect(page.getByRole("alert")).toContainText("dígito verificador");
  await expect(
    page.getByRole("heading", { name: "Consulta de demostración" }),
  ).toBeVisible();
});

test("usa los mensajes configurados del campo y del paso", async ({ page }) => {
  await page.goto(
    "/src/player/index.html?project=/src/fixtures/project-messages.json&root=/src/fixtures/",
  );
  await page.getByRole("heading", { name: "Mensajes del paso" }).waitFor();

  const field = page.getByLabel("Código ficticio");
  await field.focus();
  await page.getByRole("button", { name: "Validar y continuar" }).click();
  await expect(page.getByRole("alert")).toContainText("Error de campo configurado.");

  await field.fill("texto ficticio");
  await field.press("Enter");
  await expect(page.locator("#feedback")).toContainText("Éxito de campo configurado.");

  await page.getByTestId("image-viewport").click({ position: { x: 4, y: 4 } });
  await expect(page.locator("#feedback")).toContainText("Error de clic configurado.");

  await page.getByRole("button", { name: "Zona de interacción 1" }).click();
  await page.getByRole("button", { name: "Finalizar" }).click();
  await expect(page.getByRole("heading", { name: "Cierre completado" })).toBeVisible();
});

test("las entradas aceptan teclado y la acción informativa se confirma con Enter", async ({
  page,
}) => {
  await openFixturePlayer(page);
  const user = page.getByLabel("Usuario ficticio");
  await user.focus();
  await user.fill("alumno-teclado");
  await user.press("Enter");
  await page.getByLabel("Contraseña simulada").fill("clave-temporal");
  await page.getByLabel("Contraseña simulada").press("Enter");
  await page.getByRole("button", { name: "Zona de interacción 1" }).focus();
  await page.keyboard.press("Enter");

  await page.getByLabel("RUT de prueba").fill("876543214");
  await page.getByLabel("RUT de prueba").press("Enter");
  await page.getByRole("button", { name: "Zona de interacción 1" }).focus();
  await page.keyboard.press("Enter");
  const continueButton = page.getByRole("button", { name: "Continuar" });
  await continueButton.focus();
  await page.keyboard.press("Enter");

  await expect(page.getByRole("heading", { name: "Simulación completada" })).toBeVisible();
});
