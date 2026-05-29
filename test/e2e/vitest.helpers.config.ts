import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "tests/helpers/**/*.test.ts",
      "tests/helpers/**/*.integration.test.ts",
    ],
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
    sequence: { concurrent: false },
  },
});
