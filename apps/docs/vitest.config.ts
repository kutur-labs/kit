import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["src/demos/*.test.ts"] },
});
