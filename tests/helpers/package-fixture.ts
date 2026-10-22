import { readFileSync } from "node:fs";
import { projectSchema } from "../../src/contract/project-schema";
import { decodePlayerBundle, type PlayerBundle } from "../../src/exporter/player-bundle";
import type { ScormPackageInput } from "../../src/exporter/create-scorm12-package";

const fixture = JSON.parse(
  readFileSync(new URL("../../src/fixtures/project.json", import.meta.url), "utf8"),
);
const project = projectSchema.parse(fixture);

export const samplePlayerBundle: PlayerBundle = [
  {
    path: "index.html",
    bytes: new TextEncoder().encode(
      '<!doctype html><html><head><link rel="stylesheet" href="./assets/player.css"></head><body><div id="app"></div><script type="module" src="./assets/player.js"></script></body></html>',
    ),
  },
  {
    path: "assets/player.css",
    bytes: new TextEncoder().encode("body{margin:0}"),
  },
  {
    path: "assets/player.js",
    bytes: new TextEncoder().encode('document.body.dataset.ready="true";'),
  },
];

export function samplePackageInput(): ScormPackageInput {
  return {
    project,
    assets: project.assets.map((asset) => ({
      id: asset.id,
      file: asset.file,
      mime: asset.mime,
      bytes: readFileSync(new URL(`../../src/fixtures/${asset.file}`, import.meta.url)),
    })),
    playerBundle: samplePlayerBundle.map((entry) => ({
      ...entry,
      bytes: new Uint8Array(entry.bytes),
    })),
  };
}

export function compiledPlayerBundle(): PlayerBundle {
  const stored = JSON.parse(
    readFileSync(
      new URL("../../src/exporter/player-bundle.json", import.meta.url),
      "utf8",
    ),
  );
  return decodePlayerBundle(stored);
}
