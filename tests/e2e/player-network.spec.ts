import { expect, test } from "@playwright/test";
import { completeLoginStep, openFixturePlayer } from "../helpers/player";

test("el player no realiza solicitudes de red externas", async ({ page }) => {
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin !== "http://127.0.0.1:4173") {
      externalRequests.push(request.url());
    }
  });

  await openFixturePlayer(page);
  await completeLoginStep(page);
  await page.getByLabel("RUT de prueba").fill("876543214");
  await page.getByLabel("RUT de prueba").press("Enter");

  await expect(page.getByRole("heading", { name: "Consulta de demostración" })).toBeVisible();
  expect(externalRequests).toEqual([]);
});
