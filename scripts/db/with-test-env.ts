/**
 * Run a Prisma CLI command against the dedicated integration-test database.
 *
 *   tsx scripts/db/with-test-env.ts prisma migrate deploy
 *   tsx scripts/db/with-test-env.ts prisma db seed
 *
 * It injects `DATABASE_URL` / `DIRECT_URL` pointing at `sidhkofed_test` into the child process,
 * then runs `npx <command>`. Because `src/config` (and Prisma's own CLI) load `.env` with
 * dotenv — which never OVERRIDES an already-set variable — the injected test URL wins while
 * every other variable (JWT secret, seed super-admin, storage URL, …) is still read from `.env`.
 * This is the guard that keeps test runs off the development/remote database without duplicating
 * the whole environment.
 *
 * The URL is pinned to match vitest.config.ts; override with `TEST_DATABASE_URL` if your local
 * Postgres differs.
 */
import { execSync } from 'node:child_process';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://test:test@localhost:5432/sidhkofed_test?schema=public';

const command = process.argv.slice(2).join(' ').trim();
if (!command) {
  // eslint-disable-next-line no-console
  console.error('usage: tsx scripts/db/with-test-env.ts <prisma command>');
  process.exit(1);
}

// Safety net: never let this wrapper touch a non-test database by mistake.
if (!/sidhkofed_test/.test(TEST_DATABASE_URL)) {
  // eslint-disable-next-line no-console
  console.error(`Refusing to run: TEST_DATABASE_URL does not target a *_test database (${TEST_DATABASE_URL}).`);
  process.exit(1);
}

// eslint-disable-next-line no-console
console.log(`> ${command}  (against sidhkofed_test)`);
execSync(`npx ${command}`, {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL, DIRECT_URL: TEST_DATABASE_URL },
});
