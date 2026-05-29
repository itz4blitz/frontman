import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    include: [
      "tests/helpers/**/*.test.ts",
      "tests/helpers/**/*.integration.test.ts",
    ],
    sequence: { concurrent: false },
  },
});
