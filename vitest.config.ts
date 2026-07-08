import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(root, "artifacts/ecg-insight"),
    },
  },
  test: {
    environment: "happy-dom",
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"],
    testTimeout: 15_000,
    coverage: {
      provider: "v8",
      reportsDirectory: "test-results/coverage",
      reporter: ["text", "json-summary", "json", "html"],
      include: [
        "artifacts/ecg-insight/components/ecg/viewer/**/*.ts",
        "artifacts/ecg-insight/hooks/**/*.ts",
        "server/src/modules/medical-intelligence/**/*.ts",
      ],
      exclude: [
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/index.ts",
        "**/types.ts",
        "**/*.d.ts",
      ],
      thresholds: {
        lines: 0,
        branches: 0,
        functions: 0,
        statements: 0,
      },
    },
  },
});
