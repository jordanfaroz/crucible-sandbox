import { defineConfig } from "vite";

export default defineConfig({
  // Relative base so the built assets resolve under a GitHub Pages project
  // sub-path (https://<user>.github.io/<repo>/) as well as at the root.
  base: "./",
  server: { port: 5173, open: true },
  build: { target: "es2020" },
});
