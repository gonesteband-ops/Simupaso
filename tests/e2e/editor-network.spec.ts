import { expect, test } from "@playwright/test";
import {
  dragOnImage,
  openEditor,
  seedEditorDraft,
  uploadCaptures,
} from "../helpers/editor";

test.use({ viewport: { width: 1440, height: 900 } });

test("el editor y la vista previa no hacen peticiones externas", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.protocol !== "http:" && url.protocol !== "https:") return;
    if (url.hostname === "127.0.0.1" || url.hostname === "localhost") return;
    external.push(url.href);
  });

  await seedEditorDraft(page);
  await openEditor(page);
  await uploadCaptures(page, ["captura-red.png"]);
  await page.getByRole("button", { name: "Zona de texto", exact: true }).click();
  await dragOnImage(page, { x: 0.2, y: 0.3 }, { x: 0.5, y: 0.4 });
  await page.getByLabel("Etiqueta").fill("Dato ficticio");

  await page.getByRole("button", { name: "Vista previa" }).click();
  const frame = page.frameLocator('iframe[title="Vista previa del simulador"]');
  await expect(frame.getByLabel("Dato ficticio")).toBeVisible();
  await frame.getByLabel("Dato ficticio").fill("texto");
  await frame.getByLabel("Dato ficticio").press("Enter");
  await expect(frame.getByRole("heading", { name: "¡Procedimiento completado!" })).toBeVisible();

  expect(external).toEqual([]);
});
