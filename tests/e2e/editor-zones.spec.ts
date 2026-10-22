import { expect, test } from "@playwright/test";
import {
  dragOnImage,
  openEditor,
  seedEditorDraft,
  uploadCaptures,
} from "../helpers/editor";

test.use({ viewport: { width: 1440, height: 900 } });

test("dibuja, mueve, redimensiona y conserva zonas de clic", async ({ page }) => {
  await seedEditorDraft(page);
  await openEditor(page);
  await uploadCaptures(page, ["captura-clic.png"]);

  await page.getByRole("button", { name: "Zona de clic", exact: true }).click();
  await dragOnImage(page, { x: 0.2, y: 0.2 }, { x: 0.45, y: 0.32 });

  const zones = page.locator('[data-zone-kind="click"]');
  await expect(zones).toHaveCount(1);

  await page.getByRole("button", { name: "Seleccionar", exact: true }).click();
  await zones.first().click();
  await expect(page.locator(".zone-badge")).toHaveText("Zona de clic");

  const inputs = page.locator(".coordinate-grid input");
  const initialX = await inputs.nth(0).inputValue();
  const zoneBox = await zones.first().boundingBox();
  if (!zoneBox) throw new Error("No se pudo medir la zona.");
  await page.mouse.move(zoneBox.x + zoneBox.width / 2, zoneBox.y + zoneBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(zoneBox.x + zoneBox.width / 2 + 40, zoneBox.y + zoneBox.height / 2 + 20, {
    steps: 6,
  });
  await page.mouse.up();
  await expect(inputs.nth(0)).not.toHaveValue(initialX);

  const widthBeforeResize = await inputs.nth(2).inputValue();
  const handle = page.locator('[data-handle="se"]');
  const handleBox = await handle.boundingBox();
  if (!handleBox) throw new Error("No se encontró la manija de redimensión.");
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox.x + 30, handleBox.y + 20, { steps: 6 });
  await page.mouse.up();
  await expect(inputs.nth(2)).not.toHaveValue(widthBeforeResize);

  await page.getByRole("button", { name: "Agregar zona de clic" }).click();
  await expect(zones).toHaveCount(2);

  await page.getByRole("tab", { name: "Paso" }).click();
  await page.getByLabel("Regla de las zonas de clic").selectOption("all");
  await expect(page.getByLabel("Regla de las zonas de clic")).toHaveValue("all");

  await expect(page.getByText("Guardado localmente")).toBeVisible();
  await page.reload();
  await openEditor(page);
  await expect(page.locator('[data-zone-kind="click"]')).toHaveCount(2);
  await expect(page.getByRole("button", { name: /captura-clic/ })).toContainText("2 zonas");
});

test("permite crear, mover y eliminar una zona de clic con teclado", async ({ page }) => {
  await seedEditorDraft(page);
  await openEditor(page);
  await uploadCaptures(page, ["captura-teclado.png"]);

  await page.getByRole("button", { name: "Agregar zona de clic" }).click();
  const zone = page.locator('[data-zone-kind="click"]');
  await expect(zone).toHaveCount(1);

  const xInput = page.locator(".coordinate-grid input").nth(0);
  const before = Number(await xInput.inputValue());
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(async () => Number(await xInput.inputValue()))
    .toBeGreaterThan(before);

  await page.keyboard.press("Delete");
  await expect(zone).toHaveCount(0);
});
