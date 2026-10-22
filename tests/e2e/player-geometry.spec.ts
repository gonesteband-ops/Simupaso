import { expect, test } from "@playwright/test";
import { fixturePlayerUrl } from "../helpers/player";

const viewports = [
  { width: 1024, height: 600 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
];

test("las imágenes PNG y SVG mantienen dimensiones naturales y zonas alineadas en todos los viewports", async ({
  page,
}) => {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto(fixturePlayerUrl);
    await page.getByRole("heading", { name: "Ingreso de demostración" }).waitFor();
    await expect(page.locator(".player-image")).toHaveJSProperty("naturalWidth", 1200);
    await expect(page.locator(".player-image")).toHaveJSProperty("naturalHeight", 800);

    const svgGeometry = await page.evaluate(() => {
      const image = document.querySelector<HTMLImageElement>(".player-image");
      const hotspot = document.querySelector<HTMLElement>(".hotspot");
      if (!image || !hotspot) {
        throw new Error("Falta la imagen o la zona del reproductor.");
      }
      const imageRect = image.getBoundingClientRect();
      const zoneRect = hotspot.getBoundingClientRect();
      return {
        imageWidth: imageRect.width,
        imageHeight: imageRect.height,
        ratio: imageRect.width / imageRect.height,
        offsetX: zoneRect.left - imageRect.left,
        offsetY: zoneRect.top - imageRect.top,
        expectedX: imageRect.width * 0.25,
        expectedY: imageRect.height * 0.32,
        widthDifference: Math.abs(zoneRect.width - imageRect.width * 0.5),
        heightDifference: Math.abs(zoneRect.height - imageRect.height * 0.09),
      };
    });
    expect(svgGeometry.ratio).toBeCloseTo(1.5, 3);
    expect(Math.abs(svgGeometry.offsetX - svgGeometry.expectedX)).toBeLessThanOrEqual(1);
    expect(Math.abs(svgGeometry.offsetY - svgGeometry.expectedY)).toBeLessThanOrEqual(1);
    expect(svgGeometry.widthDifference).toBeLessThanOrEqual(1);
    expect(svgGeometry.heightDifference).toBeLessThanOrEqual(1);

    await page.getByLabel("Usuario ficticio").fill("demo");
    await page.getByLabel("Usuario ficticio").press("Enter");
    await page.getByLabel("Contraseña simulada").fill("demo");
    await page.getByLabel("Contraseña simulada").press("Enter");
    await page.getByRole("button", { name: "Zona de interacción 1" }).click();
    await page.getByRole("heading", { name: "Consulta de demostración" }).waitFor();
    await expect(page.locator(".player-image")).toHaveJSProperty("naturalWidth", 1200);
    await expect(page.locator(".player-image")).toHaveJSProperty("naturalHeight", 800);
    await expect(page.locator(".player-image")).toHaveAttribute(
      "src",
      /search-demo\.png/,
    );
  }
});
