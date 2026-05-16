import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/*.test.*",
      ],
      // Realistic short-term floor (~3.8% current line coverage). Ratchet
      // upward quarterly as the critical-path test backlog lands. See
      // docs/audits/2026-05-15-code-quality.md appendix A.
      thresholds: {
        lines: 3,
        branches: 50,
        functions: 30,
        statements: 3,
      },
    },
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
