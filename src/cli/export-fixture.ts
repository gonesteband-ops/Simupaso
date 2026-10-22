import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { projectSchema } from "../contract/project-schema";
import { createScorm12Package } from "../exporter/create-scorm12-package";
import { decodePlayerBundle } from "../exporter/player-bundle";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));

function parseArguments(args: string[]): { outputPath: string; bundlePath: string } {
  let outputPath: string | undefined;
  let bundlePath = resolve(repositoryRoot, "src/exporter/player-bundle.json");
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--out") {
      outputPath = args[index + 1];
      index += 1;
    } else if (argument === "--bundle") {
      bundlePath = resolve(args[index + 1] ?? "");
      index += 1;
    } else {
      throw new Error(`Argumento desconocido: ${argument}`);
    }
  }
  if (!outputPath) {
    throw new Error("Falta la ruta de salida. Uso: package:demo -- --out <archivo.zip> [--bundle <archivo.json>].");
  }
  if (outputPath.startsWith("--")) {
    throw new Error("La ruta de --out está vacía.");
  }
  return {
    outputPath: resolve(outputPath),
    bundlePath,
  };
}

function loadPlayerBundle(path: string) {
  try {
    return decodePlayerBundle(JSON.parse(readFileSync(path, "utf8")));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`No se pudo leer el bundle "${path}": ${message}`);
  }
}

function main(): void {
  const { outputPath, bundlePath } = parseArguments(process.argv.slice(2));
  const fixturePath = resolve(repositoryRoot, "src/fixtures/project.json");
  const project = projectSchema.parse(JSON.parse(readFileSync(fixturePath, "utf8")));
  const assets = project.assets.map((asset) => ({
    id: asset.id,
    file: asset.file,
    mime: asset.mime,
    bytes: readFileSync(resolve(repositoryRoot, "src/fixtures", asset.file)),
  }));
  const output = createScorm12Package({
    project,
    assets,
    playerBundle: loadPlayerBundle(bundlePath),
  });
  mkdirSync(resolve(outputPath, ".."), { recursive: true });
  writeFileSync(outputPath, output.bytes);
  console.log(`Paquete creado: ${outputPath} (${output.fileName})`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`No se pudo generar el paquete SCORM: ${message}`);
  process.exitCode = 1;
}
