import { defineConfig } from "vite";

export default defineConfig({
  root: "src",
  base: "./",
  publicDir: "../public",
  build: {
    outDir: "../dist",
    target: "ES2020",
  },
});
