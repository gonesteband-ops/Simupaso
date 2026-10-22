import { expect, test, type Page } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 900 } });

const nav = (page: Page) =>
  page.getByRole("navigation", { name: "Secciones principales" });

async function expectNoOverlap(page: Page) {
  const spotlight = await page.locator(".guide-spotlight").boundingBox();
  const tooltip = await page.locator(".guide-tooltip").boundingBox();
  if (!spotlight || !tooltip) throw new Error("No se pudieron medir spotlight y globo.");
  const overlaps =
    spotlight.x < tooltip.x + tooltip.width &&
    tooltip.x < spotlight.x + spotlight.width &&
    spotlight.y < tooltip.y + tooltip.height &&
    tooltip.y < spotlight.y + spotlight.height;
  expect(overlaps).toBe(false);
}

test("recorre la guía con mouse y teclado, y puede saltar o reiniciar", async ({ page }) => {
  await page.goto("/");
  await nav(page).getByRole("button", { name: "Simu Paso a paso" }).click();
  await expect(page.getByRole("heading", { name: "Simu Paso a paso" })).toBeVisible();

  let dialog = page.getByRole("dialog", { name: "Simu Paso a paso" });
  await expect(dialog).toContainText("Paso 1 de 9");
  await expect(dialog).toContainText("Carga una o varias capturas");
  await expect(dialog).toBeFocused();
  await expect(page.locator(".guide-spotlight")).toBeVisible();
  await expect(page.locator('[data-guide="upload"]')).toBeVisible();
  const veil = await page
    .locator(".guide-spotlight")
    .evaluate((element) => getComputedStyle(element).boxShadow);
  expect(veil).toContain("100, 116, 139");
  await expectNoOverlap(page);

  await dialog.getByRole("button", { name: "Siguiente" }).click();
  await expect(dialog).toContainText("Paso 2 de 9");
  await expect(dialog).toContainText("Revisa la secuencia de pasos");
  await expectNoOverlap(page);

  await page.keyboard.press("ArrowRight");
  await expect(dialog).toContainText("Paso 3 de 9");
  await page.keyboard.press("ArrowLeft");
  await expect(dialog).toContainText("Paso 2 de 9");

  await page.keyboard.press("Escape");
  await expect(page.getByText("La guía está oculta")).toBeVisible();
  await page.getByRole("button", { name: "Reiniciar guía" }).click();
  dialog = page.getByRole("dialog", { name: "Simu Paso a paso" });
  await expect(dialog).toContainText("Paso 1 de 9");

  for (let index = 0; index < 8; index += 1) {
    await dialog.getByRole("button", { name: "Siguiente" }).click();
  }
  await expect(dialog).toContainText("Paso 9 de 9");
  await dialog.getByRole("button", { name: "Ver manual" }).click();
  await expect(page.getByRole("heading", { name: "Manual de SimuPaso Studio" })).toBeVisible();
});

test("el manual tiene índice, secciones, FAQ y lleva a crear", async ({ page }) => {
  await page.goto("/");
  await nav(page).getByRole("button", { name: "Acerca de" }).click();
  await expect(page.getByRole("heading", { name: "Manual de SimuPaso Studio" })).toBeVisible();

  await expect(page.getByRole("navigation", { name: "Índice del manual" })).toBeVisible();
  await page
    .getByRole("navigation", { name: "Índice del manual" })
    .getByRole("link", { name: "Difuminar datos sensibles" })
    .click();
  await expect(page.getByRole("heading", { name: "Difuminar datos sensibles" })).toBeVisible();
  await expect(page.getByRole("table")).toContainText("SCORM 1.2 (.zip)");
  await expect(page.getByRole("heading", { name: "Preguntas frecuentes" })).toBeVisible();
  await expect(page.locator("details").first()).toBeVisible();

  await page.getByRole("button", { name: "Empezar a crear" }).first().click();
  await expect(page.getByRole("heading", { name: "Datos básicos del proyecto" })).toBeVisible();
});
