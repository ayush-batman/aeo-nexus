import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'edge-runtime',
    include: ['tests/convex/**/*.spec.ts'],
    testTimeout: 15_000,
  },
});
