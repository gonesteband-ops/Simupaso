import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { unzipSync } from "fflate";
import { projectSchema } from "../../src/contract/project-schema";
import { createScorm12Package } from "../../src/exporter/create-scorm12-package";
import { decodePlayerBundle } from "../../src/exporter/player-bundle";

const repositoryRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const localOrigin = "http://127.0.0.1:4173";

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(resolve(repositoryRoot, path), "utf8"));
}

function createCompiledFixturePackage() {
  const project = projectSchema.parse(readJson("src/fixtures/project.json"));
  const assets = project.assets.map((asset) => ({
    id: asset.id,
    file: asset.file,
    mime: asset.mime,
    bytes: readFileSync(resolve(repositoryRoot, "src/fixtures", asset.file)),
  }));
  const playerBundle = decodePlayerBundle(readJson("src/exporter/player-bundle.json"));
  const output = createScorm12Package({ project, assets, playerBundle });
  return { output, files: unzipSync(output.bytes) };
}

function contentType(path: string): string {
  if (path.endsWith(".html")) return "text/html; charset=utf-8";
  if (path.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (path.endsWith(".css")) return "text/css; charset=utf-8";
  if (path.endsWith(".json")) return "application/json; charset=utf-8";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".xml")) return "application/xml; charset=utf-8";
  return "application/octet-stream";
}

test("el ZIP con el reproductor compilado funciona sin recursos externos", async ({
  page,
}) => {
  const { output, files } = createCompiledFixturePackage();
  const externalRequests: string[] = [];
  expect(output.fileName).toMatch(/^simulador-.+\.zip$/);
  expect(Object.keys(files)).toContain("index.html");
  expect(Object.keys(files)).toContain("imsmanifest.xml");
  expect(Object.keys(files)).toContain("player/assets/player.js");

  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== localOrigin) {
      externalRequests.push(url.href);
      await route.abort();
      return;
    }
    if (!url.pathname.startsWith("/demo-scorm/")) {
      await route.continue();
      return;
    }
    const archivePath = decodeURIComponent(url.pathname.slice("/demo-scorm/".length));
    const file = files[archivePath];
    if (!file) {
      await route.fulfill({ status: 404, body: `No existe ${archivePath}` });
      return;
    }
    await route.fulfill({ body: Buffer.from(file), contentType: contentType(archivePath) });
  });
  await page.goto("/demo-scorm/index.html");

  await expect(page.getByRole("heading", { name: "Ingreso de demostración" })).toBeVisible();
  await page.getByLabel("Usuario ficticio").fill("alumno-demo");
  await page.getByLabel("Usuario ficticio").press("Enter");
  await page.getByLabel("Contraseña simulada").fill("clave-temporal-9182");
  await page.getByLabel("Contraseña simulada").press("Enter");
  await page.getByRole("button", { name: "Zona de interacción 1" }).click();
  await page.getByLabel("RUT de prueba").fill("876543214");
  await page.getByLabel("RUT de prueba").press("Enter");
  await page.getByRole("button", { name: "Zona de interacción 1" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByRole("heading", { name: "Simulación completada" })).toBeVisible();
  expect(externalRequests).toEqual([]);
});
