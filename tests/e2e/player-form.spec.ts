import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 900 } });

test("muestra los campos simultáneos sobre la imagen y valida al pulsar Entrar", async ({
  page,
}) => {
  await page.goto("/src/player/index.html?project=/src/fixtures/project-form.json&root=/src/fixtures/");
  await page.getByRole("heading", { name: "Ingreso simulado" }).waitFor();

  await expect(page.getByRole("button", { name: "Pantalla completa" })).toBeVisible();
  const layout = await page.locator(".simulation-card").evaluate((element) => ({
    display: getComputedStyle(element).display,
    columns: getComputedStyle(element).gridTemplateColumns,
  }));
  expect(layout.display).toBe("flex");
  expect(layout.columns).toBe("none");
  const content = await page.locator(".player-content").boundingBox();
  const viewport = await page.getByTestId("image-viewport").boundingBox();
  if (!content || !viewport) throw new Error("No se pudo medir el lienzo.");
  expect(viewport.width).toBeGreaterThan(content.width * 0.85);

  const rut = page.getByLabel("RUT ficticio");
  const clave = page.getByLabel("Clave ficticia");
  await expect(rut).toBeVisible();
  await expect(clave).toBeVisible();
  await expect(clave).toHaveAttribute("type", "password");
  await expect(page.locator(".input-form")).toHaveCount(0);
  const fontPx = await rut.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).fontSize),
  );
  expect(fontPx).toBeLessThan(20);

  await rut.hover();
  await expect(page.getByRole("tooltip")).toHaveText("RUT ficticio");
  await expect(page.getByRole("tooltip")).toBeVisible();

  const image = await page.locator(".player-image").boundingBox();
  const rutBox = await rut.boundingBox();
  const claveBox = await clave.boundingBox();
  if (!image || !rutBox || !claveBox) throw new Error("No se pudieron medir los campos.");
  expect(Math.abs(rutBox.x - (image.x + image.width * 0.2))).toBeLessThanOrEqual(4);
  expect(Math.abs(rutBox.y - (image.y + image.height * 0.3))).toBeLessThanOrEqual(4);
  expect(Math.abs(claveBox.y - (image.y + image.height * 0.42))).toBeLessThanOrEqual(4);

  const submit = page.getByRole("button", { name: "Zona de interacción 1" });
  await expect(submit).toHaveClass(/form-submit/);
  await rut.fill("87.654.321-5");
  await clave.fill("clave-ficticia");
  await submit.click();
  await expect(page.getByRole("alert")).toContainText("dígito verificador");
  await expect(page.getByRole("heading", { name: "Ingreso simulado" })).toBeVisible();

  await rut.fill("876543214");
  await clave.press("Enter");
  await expect(page.getByRole("heading", { name: "Ingreso completado" })).toBeVisible();
});
