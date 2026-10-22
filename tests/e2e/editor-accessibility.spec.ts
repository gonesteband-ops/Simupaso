import { expect, test, type Page } from "@playwright/test";
import {
  dragOnImage,
  openEditor,
  seedEditorDraft,
  uploadCaptures,
} from "../helpers/editor";

test.use({ viewport: { width: 1440, height: 900 } });

async function contrastRatio(page: Page, selector: string): Promise<number> {
  return page.locator(selector).first().evaluate((element) => {
    const parse = (value: string) => {
      const numbers = value.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0];
      return { r: numbers[0], g: numbers[1], b: numbers[2], a: numbers[3] ?? 1 };
    };
    const luminance = ({ r, g, b }: { r: number; g: number; b: number }) => {
      const convert = (value: number) => {
        const channel = value / 255;
        return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * convert(r) + 0.7152 * convert(g) + 0.0722 * convert(b);
    };
    const foreground = parse(getComputedStyle(element).color);
    let background = { r: 255, g: 255, b: 255, a: 1 };
    let node: HTMLElement | null = element as HTMLElement;
    while (node) {
      const candidate = parse(getComputedStyle(node).backgroundColor);
      if (candidate.a > 0) {
        background = {
          r: candidate.r * candidate.a + background.r * (1 - candidate.a),
          g: candidate.g * candidate.a + background.g * (1 - candidate.a),
          b: candidate.b * candidate.a + background.b * (1 - candidate.a),
          a: 1,
        };
        break;
      }
      node = node.parentElement;
    }
    const first = luminance(foreground);
    const second = luminance(background);
    return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
  });
}

test("mantiene foco visible, nombres accesibles y contraste AA", async ({ page }) => {
  await seedEditorDraft(page);
  await openEditor(page);
  await uploadCaptures(page, ["captura-accesible.png"]);
  await page.getByRole("button", { name: "Agregar zona de texto" }).click();
  await expect(page.getByText("Guardado localmente")).toBeVisible();

  for (const selector of [
    ".panel-heading h2",
    ".step-copy strong",
    ".save-indicator.saved",
    ".canvas-status",
    ".panel-tab.active",
  ]) {
    expect(await contrastRatio(page, selector), selector).toBeGreaterThanOrEqual(4.5);
  }

  const tool = page.getByRole("button", { name: "Zona de clic", exact: true });
  await tool.focus();
  const outline = await tool.evaluate((element) => getComputedStyle(element).outlineStyle);
  expect(outline).not.toBe("none");

  await expect(page.getByRole("slider", { name: "Nivel de zoom" })).toBeVisible();
  await expect(page.locator(".save-indicator")).toHaveAttribute("aria-live", "polite");
  await expect(page.getByRole("tab", { name: "Paso" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Zonas" })).toBeVisible();
});

test("el diálogo de vista previa tiene nombre y iframe identificable", async ({ page }) => {
  await seedEditorDraft(page);
  await openEditor(page);
  await uploadCaptures(page, ["captura-dialogo.png"]);
  await page.getByRole("button", { name: "Zona de texto", exact: true }).click();
  await dragOnImage(page, { x: 0.2, y: 0.3 }, { x: 0.5, y: 0.4 });
  await page.getByLabel("Etiqueta").fill("Dato accesible");

  await page.getByRole("button", { name: "Vista previa" }).click();
  await expect(page.getByRole("dialog", { name: "Vista previa" })).toBeVisible();
  await expect(page.getByTitle("Vista previa del simulador")).toBeVisible();
  await page.getByRole("button", { name: "Cerrar vista previa" }).click();
  await expect(page.getByRole("button", { name: "Vista previa" })).toBeFocused();
});
