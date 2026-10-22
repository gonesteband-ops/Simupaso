import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";

export const fixturePlayerUrl =
  "/src/player/index.html?project=/src/fixtures/project.json&root=/src/fixtures/";

export function readFixtureProject(): Record<string, unknown> {
  return JSON.parse(
    readFileSync(new URL("../../src/fixtures/project.json", import.meta.url), "utf8"),
  );
}

export async function openFixturePlayer(page: Page): Promise<void> {
  await page.goto(fixturePlayerUrl);
  await page.getByRole("heading", { name: "Ingreso de demostración" }).waitFor();
}

export async function completeLoginStep(page: Page): Promise<void> {
  await page.getByLabel("Usuario ficticio").fill("alumno-demo");
  await page.getByLabel("Usuario ficticio").press("Enter");
  const password = page.getByLabel("Contraseña simulada");
  await password.fill("clave-temporal-9182");
  await password.press("Enter");
  await page.getByRole("button", { name: "Zona de interacción 1" }).click();
}
