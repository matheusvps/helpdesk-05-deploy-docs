import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // Each test file gets its own in-memory database, migrated in test/setup.ts.
    env: { DATABASE_PATH: ':memory:', JWT_SECRET: 'test-secret' },
    setupFiles: ['test/setup.ts'],
  },
});
