import { expect, test } from "@playwright/test";
import { openFixturePlayer } from "../helpers/player";

declare global {
  interface Window {
    __scormCalls?: string[][];
  }
}

test("la contraseña simulada está enmascarada y se descarta al abandonar la acción", async ({
  page,
}) => {
  await openFixturePlayer(page);

  await page.getByLabel("Usuario ficticio").fill("dato-alumno-ficticio");
  await page.getByLabel("Usuario ficticio").press("Enter");
  const password = page.getByLabel("Contraseña simulada");
  await expect(password).toHaveAttribute("type", "password");
  await password.fill("clave-privada-7091");
  await password.press("Enter");
  await expect(page.getByLabel("Contraseña simulada")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("clave-privada-7091");

  const storedValues = await page.evaluate(() => ({
    local: Object.values(localStorage),
    session: Object.values(sessionStorage),
  }));
  expect(JSON.stringify(storedValues)).not.toContain("clave-privada-7091");
  expect(JSON.stringify(storedValues)).not.toContain("dato-alumno-ficticio");
});

test("ningún valor escrito por el alumno se envía a la API LMS simulada", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const calls: string[][] = [];
    const api = {
      LMSInitialize: (value: string) => (calls.push(["LMSInitialize", value]), "true"),
      LMSFinish: (value: string) => (calls.push(["LMSFinish", value]), "true"),
      LMSGetValue: (key: string) => (calls.push(["LMSGetValue", key]), ""),
      LMSSetValue: (key: string, value: string) => (
        calls.push(["LMSSetValue", key, value]), "true"
      ),
      LMSCommit: (value: string) => (calls.push(["LMSCommit", value]), "true"),
      LMSGetLastError: () => "000",
    };
    Object.assign(window, { API: api, __scormCalls: calls });
  });

  await openFixturePlayer(page);
  await page.getByLabel("Usuario ficticio").fill("texto-no-reportable-7462");
  await page.getByLabel("Usuario ficticio").press("Enter");
  await page.getByLabel("Contraseña simulada").fill("clave-no-reportable-9182");
  await page.getByLabel("Contraseña simulada").press("Enter");
  await page.getByRole("button", { name: "Zona de interacción 1" }).click();
  await page.getByLabel("RUT de prueba").fill("876543214");
  await page.getByLabel("RUT de prueba").press("Enter");
  await page.getByRole("button", { name: "Zona de interacción 1" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  const calls = await page.evaluate(
    () => window.__scormCalls ?? [],
  );
  const serializedCalls = JSON.stringify(calls);
  expect(calls).toContainEqual([
    "LMSSetValue",
    "cmi.core.lesson_status",
    "incomplete",
  ]);
  expect(calls).toContainEqual([
    "LMSSetValue",
    "cmi.core.lesson_status",
    "completed",
  ]);
  expect(serializedCalls).not.toContain("texto-no-reportable-7462");
  expect(serializedCalls).not.toContain("clave-no-reportable-9182");
  expect(serializedCalls).not.toContain("876543214");
});
