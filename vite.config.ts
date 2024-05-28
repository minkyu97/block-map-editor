import { defineConfig } from "vite";

export default defineConfig({
  root: "src",
  build: {
    outDir: "../dist",
    target: "ES2020",
    assetsDir: "assets",
  },
});
