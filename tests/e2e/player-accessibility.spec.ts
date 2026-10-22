import { expect, test } from "@playwright/test";
import { openFixturePlayer, readFixtureProject } from "../helpers/player";

test("informa de una imagen fallida y bloquea las acciones dependientes", async ({
  page,
}) => {
  const project = readFixtureProject();
  const assets = project.assets as Array<Record<string, unknown>>;
  assets[0].file = "assets/no-existe.svg";
  await page.route("**/src/fixtures/project.json", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(project),
    }),
  );
  await page.goto("/src/player/index.html?project=/src/fixtures/project.json&root=/src/fixtures/");

  await expect(page.getByRole("alert")).toContainText("No se pudo cargar");
  await expect(page.getByRole("button", { name: "Zona de interacción 1" })).toHaveCount(0);
});

test("avisa con resolución inferior a 1024×600", async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 700 });
  await openFixturePlayer(page);

  await expect(page.locator("#resolution-warning")).toContainText("1024×600");
});

test("ignora anotaciones, mantiene texto literal y expone foco accesible", async ({
  page,
}) => {
  const project = readFixtureProject();
  const steps = project.steps as Array<Record<string, unknown>>;
  steps[0].instruction = '<img src="x" onerror="window.injected=true">';
  await page.route("**/src/fixtures/project.json", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(project),
    }),
  );
  await page.goto("/src/player/index.html?project=/src/fixtures/project.json&root=/src/fixtures/");

  await expect(page.locator("#instruction")).toContainText("<img src=");
  await expect(page.locator("#instruction img")).toHaveCount(0);
  await expect(page.getByText("Esta anotación queda reservada", { exact: false })).toHaveCount(0);
  expect(await page.evaluate(() => Boolean((window as Window & { injected?: boolean }).injected))).toBe(
    false,
  );
  await page.getByLabel("Usuario ficticio").focus();
  await expect(page.getByLabel("Usuario ficticio")).toBeFocused();

  const colors = await page.getByLabel("Usuario ficticio").evaluate((input) => {
    const style = getComputedStyle(input);
    return {
      foreground: style.color,
      background: style.backgroundColor,
    };
  });
  expect(contrastRatio(colors.foreground, colors.background)).toBeGreaterThanOrEqual(4.5);
});

function contrastRatio(foreground: string, background: string): number {
  const luminance = (color: string) => {
    const components = color.match(/\d+/g)?.slice(0, 3).map(Number);
    if (!components || components.length !== 3) {
      throw new Error(`Color CSS inválido: ${color}`);
    }
    const linear = components.map((value) => {
      const normalized = value / 255;
      return normalized <= 0.04045
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  const l1 = luminance(foreground);
  const l2 = luminance(background);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
