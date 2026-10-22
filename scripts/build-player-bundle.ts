import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

type PlayerBundleEntry = {
  path: string;
  bytesBase64: string;
};

const repositoryRoot = resolve(import.meta.dirname, "..");
const playerBuild = resolve(repositoryRoot, "dist/player");
const target = resolve(repositoryRoot, "src/exporter/player-bundle.json");

function collectFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? collectFiles(path) : [path];
  });
}

const files = collectFiles(playerBuild)
  .map((absolutePath) => ({
    path: relative(playerBuild, absolutePath).split(sep).join("/"),
    bytesBase64: readFileSync(absolutePath).toString("base64"),
  }))
  .sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));

if (!files.some((file) => file.path === "index.html")) {
  throw new Error(`El build del player no contiene index.html: ${playerBuild}`);
}

mkdirSync(resolve(target, ".."), { recursive: true });
writeFileSync(target, `${JSON.stringify(files, null, 2)}\n`);
console.log(`Bundle del player generado: ${target} (${files.length} archivos).`);
