import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

/**
 * Vitest configuration.
 *
 * - `@/*` resolves to `src/*` to mirror the tsconfig path alias.
 * - `test.env` injects a minimal, valid environment so `src/config` (which validates
 *   env at import and exits on a missing required var) loads cleanly under test.
 *   Integration suites under `tests/` self-skip unless `RUN_INTEGRATION=1` and a real
 *   DATABASE_URL/REDIS_URL are reachable; unit suites mock Prisma/Redis.
 */
export default defineConfig({
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/sidhkofed_test?schema=public',
      REDIS_URL: 'redis://localhost:6379',
      JWT_SECRET: 'test_jwt_secret_at_least_32_characters_long_xx',
      JWT_ACCESS_TTL: '900',
      JWT_REFRESH_TTL: '2592000',
      PUBLIC_WEBSITE_URL: 'http://localhost:3000',
      STORAGE_PUBLIC_BASE_URL: 'http://localhost:4000/files',
      IP_HASH_SALT: 'test_ip_hash_salt_value',
    },
  },
});
