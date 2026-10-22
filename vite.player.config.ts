import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

const playerRoot = fileURLToPath(new URL("./src/player", import.meta.url));

export default defineConfig({
  root: playerRoot,
  base: "./",
  build: {
    outDir: fileURLToPath(new URL("./dist/player", import.meta.url)),
    emptyOutDir: true,
    rollupOptions: {
      input: fileURLToPath(new URL("./src/player/index.html", import.meta.url)),
      output: {
        entryFileNames: "assets/player.js",
        chunkFileNames: "assets/chunks/[name].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});
