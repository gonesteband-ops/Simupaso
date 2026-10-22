import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const draft = {
  id: "proyecto-editor",
  name: "Proyecto ficticio",
  client: "Empresa ficticia",
  industry: "Servicios",
  description: "Demostración ficticia",
  author: "Trainer ficticio",
  createdAt: "2026-10-20T10:00:00.000Z",
  updatedAt: "2026-10-20T10:00:00.000Z",
  stepCount: 0,
  status: "draft" as const,
};

const png = readFileSync(new URL("../../src/fixtures/assets/search-demo.png", import.meta.url));

async function seedDraft(page: Page) {
  await page.addInitScript((value) => {
    window.localStorage.setItem("simupaso-studio-projects-v1", JSON.stringify([value]));
  }, draft);
}

async function openEditor(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Mis proyectos" }).click();
  await page.getByRole("button", { name: "Abrir editor" }).click();
  await expect(page.getByRole("heading", { name: "Proyecto ficticio" })).toBeVisible();
}

async function uploadTwoCaptures(page: Page) {
  await page.getByLabel("Agregar capturas").setInputFiles([
    { name: "captura-1.png", mimeType: "image/png", buffer: png },
    { name: "captura-2.png", mimeType: "image/png", buffer: png },
  ]);
  await expect(page.getByRole("button", { name: /captura-1/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /captura-2/ })).toBeVisible();
}

test.use({ viewport: { width: 1440, height: 900 } });

test("carga capturas, ordena pasos, duplica, elimina y conserva tras recargar", async ({
  page,
}) => {
  await seedDraft(page);
  await openEditor(page);
  await page.getByLabel("Agregar capturas").first().waitFor();
  await expect(page.getByText("Las capturas se procesan y quedan solo en este navegador.")).toBeVisible();

  await uploadTwoCaptures(page);

  const stepButtons = page.getByRole("button", { name: /captura-\d/ });
  await expect(stepButtons).toHaveCount(2);
  await expect(stepButtons.first()).toContainText("captura-1");

  await page.getByRole("button", { name: "Mover paso 2 arriba" }).click();
  await expect(stepButtons.first()).toContainText("captura-2");

  await page.getByRole("button", { name: "Duplicar paso 1" }).click();
  await expect(page.getByRole("button", { name: /captura-2/ })).toHaveCount(2);

  await page.getByRole("button", { name: "Eliminar paso 2" }).click();
  await expect(page.getByRole("dialog", { name: "Eliminar paso" })).toBeVisible();
  await page.getByRole("button", { name: "Eliminar paso", exact: true }).click();
  await expect(page.getByRole("button", { name: /captura-/ })).toHaveCount(2);

  await expect(page.getByText("Guardado localmente")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Mis proyectos" }).click();
  await page.getByRole("button", { name: "Abrir editor" }).click();

  await expect(page.getByRole("button", { name: /captura-/ })).toHaveCount(2);
  await expect(page.getByRole("button", { name: /captura-/ }).first()).toContainText("captura-2");
  await expect(page.getByRole("button", { name: /captura-/ }).last()).toContainText("captura-1");
});

test("rechaza archivos no compatibles sin bloquear los válidos", async ({ page }) => {
  await seedDraft(page);
  await openEditor(page);

  await page.getByLabel("Agregar capturas").setInputFiles([
    { name: "no-valido.txt", mimeType: "text/plain", buffer: Buffer.from("texto") },
    { name: "captura-valida.png", mimeType: "image/png", buffer: png },
  ]);

  await expect(page.getByRole("alert")).toContainText("debe ser PNG, JPG o WebP");
  await expect(page.getByRole("button", { name: /captura-valida/ })).toBeVisible();
});
