import { readFileSync } from "node:fs";
import { expect, type Page } from "@playwright/test";

export const editorDraft = {
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

export const fixturePng = readFileSync(
  new URL("../../src/fixtures/assets/search-demo.png", import.meta.url),
);

export function pngFile(name: string) {
  return { name, mimeType: "image/png", buffer: fixturePng };
}

export async function seedEditorDraft(page: Page) {
  await page.addInitScript((value) => {
    window.localStorage.setItem("simupaso-studio-projects-v1", JSON.stringify([value]));
  }, editorDraft);
}

export async function openEditor(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Mis proyectos" }).click();
  await page.getByRole("button", { name: "Abrir editor" }).click();
  await expect(page.getByRole("heading", { name: "Proyecto ficticio" })).toBeVisible();
}

export async function uploadCaptures(page: Page, names: string[]) {
  await page
    .getByLabel("Agregar capturas")
    .setInputFiles(names.map((name) => pngFile(name)));
  for (const name of names) {
    await expect(page.getByRole("button", { name: new RegExp(name.replace(".png", "")) })).toBeVisible();
  }
}

export async function dragOnImage(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  const image = page.locator(".canvas-image");
  await expect(image).toBeVisible();
  const box = await image.boundingBox();
  if (!box) throw new Error("No se pudo medir la imagen del lienzo.");
  await page.mouse.move(box.x + box.width * from.x, box.y + box.height * from.y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * to.x, box.y + box.height * to.y, { steps: 8 });
  await page.mouse.up();
}
