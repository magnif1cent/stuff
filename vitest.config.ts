import path from "node:path";
import { defineConfig } from "vitest/config";

// Scoped to pure-logic unit tests only (src/lib) -- no React/DOM environment
// needed, and no reason yet to reach for a heavier setup (jsdom, etc.) until
// a test actually needs one. The one thing tests do need is the same `@/*`
// alias tsconfig.json declares, so test files can import the same way the
// app does instead of relative paths.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/lib/**/*.test.ts"],
  },
});
