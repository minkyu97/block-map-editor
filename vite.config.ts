import { defineConfig } from "vite";

export default defineConfig({
  root: "src",
  base: "./",
  build: {
    outDir: "../dist",
    target: "ES2020",
    assetsDir: "assets",
  },
});
