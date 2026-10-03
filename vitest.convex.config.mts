import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'edge-runtime',
    include: ['tests/convex/**/*.spec.ts'],
    // Scheduled-workflow tests use fake timers and must not compete with a
    // machine-sized pool of concurrent workers on a busy development host.
    maxWorkers: 4,
    testTimeout: 15_000,
  },
});
