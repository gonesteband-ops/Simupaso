import { expect, test } from "@playwright/test";
import { completeLoginStep, openFixturePlayer } from "../helpers/player";

test("el player completa el fixture sin API LMS y no muestra errores de integración", async ({
  page,
}) => {
  await openFixturePlayer(page);
  await completeLoginStep(page);
  await page.getByLabel("RUT de prueba").fill("876543214");
  await page.getByLabel("RUT de prueba").press("Enter");
  await page.getByRole("button", { name: "Zona de interacción 1" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByRole("heading", { name: "Simulación completada" })).toBeVisible();
  await expect(page.getByRole("alert")).toBeHidden();
});
