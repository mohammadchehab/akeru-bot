import { defineConfig } from "vite-plus";

// One stack serves every journey in a file, so files run one at a time and
// each gets time to boot the dev server.
export default defineConfig({
  test: {
    include: ["journeys/**/*.e2e.ts"],
    fileParallelism: false,
    hookTimeout: 240_000,
    testTimeout: 120_000,
  },
});
