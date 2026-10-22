import { expect, test, type Page } from "@playwright/test";
import {
  dragOnImage,
  openEditor,
  seedEditorDraft,
  uploadCaptures,
} from "../helpers/editor";

test.use({ viewport: { width: 1440, height: 900 } });

async function setZoom(page: Page, percent: number) {
  const slider = page.getByLabel("Nivel de zoom");
  await slider.focus();
  await slider.press("Home");
  const steps = Math.round((percent - 10) / 5);
  for (let index = 0; index < steps; index += 1) {
    await slider.press("ArrowRight");
  }
  await expect(page.locator(".zoom-value")).toHaveText(`${percent} %`);
}

test("deshace, rehace y mantiene las zonas alineadas con el zoom", async ({ page }) => {
  await seedEditorDraft(page);
  await openEditor(page);
  await uploadCaptures(page, ["captura-zoom.png"]);

  await page.getByRole("button", { name: "Agregar zona de clic" }).click();
  const zone = page.locator('[data-zone-kind="click"]');
  await expect(zone).toHaveCount(1);

  const xInput = page.locator(".coordinate-grid input").nth(0);
  const before = Number(await xInput.inputValue());
  await page.keyboard.press("ArrowRight");
  await expect.poll(async () => Number(await xInput.inputValue())).toBeGreaterThan(before);
  await page.keyboard.press("Control+z");
  await expect.poll(async () => Number(await xInput.inputValue())).toBeCloseTo(before, 2);
  await page.keyboard.press("Control+y");
  await expect.poll(async () => Number(await xInput.inputValue())).toBeGreaterThan(before);

  for (const percent of [50, 100]) {
    await setZoom(page, percent);
    const image = await page.locator(".canvas-image").boundingBox();
    const zoneBox = await zone.boundingBox();
    if (!image || !zoneBox) throw new Error("No se pudo medir la imagen o la zona.");
    expect(Math.abs(zoneBox.x - (image.x + image.width * 0.35))).toBeLessThanOrEqual(4);
    expect(Math.abs(zoneBox.y - (image.y + image.height * 0.35))).toBeLessThanOrEqual(4);
    expect(Math.abs(zoneBox.width - image.width * 0.3)).toBeLessThanOrEqual(4);
  }

  await page.getByRole("button", { name: "Ajustar" }).click();
  const fittedImage = await page.locator(".canvas-image").boundingBox();
  const fittedZone = await zone.boundingBox();
  if (!fittedImage || !fittedZone) throw new Error("No se pudo medir el ajuste.");
  expect(Math.abs(fittedZone.x - (fittedImage.x + fittedImage.width * 0.35))).toBeLessThanOrEqual(4);
  expect(Math.abs(fittedZone.width - fittedImage.width * 0.3)).toBeLessThanOrEqual(4);

  await zone.click();
  await page.getByRole("button", { name: "Seleccionar", exact: true }).focus();
  await page.keyboard.press("Delete");
  await expect(zone).toHaveCount(0);
  await page.keyboard.press("Control+z");
  await expect(zone).toHaveCount(1);
});

test("dibuja una zona con el mouse después de cambiar el zoom", async ({ page }) => {
  await seedEditorDraft(page);
  await openEditor(page);
  await uploadCaptures(page, ["captura-zoom-dibujo.png"]);
  await setZoom(page, 50);
  await page.getByRole("button", { name: "Zona de clic", exact: true }).click();
  await dragOnImage(page, { x: 0.1, y: 0.1 }, { x: 0.3, y: 0.25 });
  await expect(page.locator('[data-zone-kind="click"]')).toHaveCount(1);
});
