/** Guarded lifecycle/export tooling for the isolated full fixture database. */
import { createHash, randomUUID } from 'node:crypto';
import { gunzipSync, gzipSync } from 'node:zlib';
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const DEFAULT_URL = 'postgresql://postgres:sa3421@127.0.0.1:5432/sidhkofed_seed?schema=public';
const databaseUrl = process.env.SEED_DATABASE_URL ?? DEFAULT_URL;
const parsed = new URL(databaseUrl);
const database = parsed.pathname.replace(/^\//, '');
const user = decodeURIComponent(parsed.username || 'sidhkofed');
const password = decodeURIComponent(parsed.password);
const transport = process.env.FIXTURE_DB_TRANSPORT ?? 'host';
const adminUser = process.env.POSTGRES_ADMIN_USER ?? (transport === 'host' ? user : 'sidhkofed');
const container = process.env.POSTGRES_CONTAINER ?? 'sidhkofed-postgres';
const postgresBin = process.env.POSTGRES_BIN ?? 'C:\\Program Files\\PostgreSQL\\18\\bin';
const psqlExecutable = transport === 'host' ? path.join(postgresBin, 'psql.exe') : 'docker';
const storageRoot = path.resolve(process.env.FIXTURE_STORAGE_ROOT ?? 'storage/seed-fixtures');
const artifactDir = path.resolve('artifacts/seed');
const dumpFile = path.join(artifactDir, 'sidhkofed-seed.sql.gz');
const mediaFile = path.join(artifactDir, 'sidhkofed-seed-media.tar.gz');
const manifestFile = path.join(artifactDir, 'manifest.json');

if (!/^[a-z0-9_]+$/i.test(database) || !database.endsWith('_seed')) {
  throw new Error(`Refusing fixture operation: database must end in _seed (received ${database || '<empty>'}).`);
}
if (!/^[a-z_][a-z0-9_]*$/i.test(user) || !/^[a-z_][a-z0-9_]*$/i.test(adminUser)) {
  throw new Error('Refusing fixture operation: PostgreSQL role names must be simple identifiers.');
}

function run(command: string, args: string[], options: { env?: NodeJS.ProcessEnv; capture?: boolean } = {}): string {
  const result = execFileSync(command, args, {
    cwd: path.resolve('.'),
    env: options.env ?? process.env,
    encoding: options.capture ? 'utf8' : undefined,
    stdio: options.capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
  });
  return typeof result === 'string' ? result.trim() : '';
}

function psql(targetDb: string, sql: string, capture = false, login = user): string {
  if (transport === 'host') {
    return run(psqlExecutable, ['-v', 'ON_ERROR_STOP=1', '-h', parsed.hostname, '-p', parsed.port || '5432', '-U', login, '-d', targetDb, '-At', '-c', sql], {
      capture,
      env: { ...process.env, PGPASSWORD: password },
    });
  }
  return run('docker', ['exec', container, 'psql', '-v', 'ON_ERROR_STOP=1', '-U', login, '-d', targetDb, '-At', '-c', sql], { capture });
}

async function createDatabase(dropFirst: boolean): Promise<void> {
  psql('postgres', `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='${user}') THEN
      CREATE ROLE ${user} WITH LOGIN PASSWORD '${password.replace(/'/g, "''")}' CREATEDB;
    ELSE
      ALTER ROLE ${user} WITH LOGIN PASSWORD '${password.replace(/'/g, "''")}' CREATEDB;
    END IF;
  END $$;`, false, adminUser);
  if (dropFirst) {
    psql('postgres', `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${database}' AND pid <> pg_backend_pid();`, false, adminUser);
    psql('postgres', `DROP DATABASE IF EXISTS ${database};`, false, adminUser);
  }
  const exists = psql('postgres', `SELECT 1 FROM pg_database WHERE datname='${database}';`, true, adminUser) === '1';
  if (!exists) psql('postgres', `CREATE DATABASE ${database} OWNER ${user};`, false, adminUser);
  console.log(`${dropFirst ? 'Reset' : 'Ready'}: ${database}`);
}

async function migrate(): Promise<void> {
  const prismaCli = path.resolve('node_modules/prisma/build/index.js');
  try {
    run(process.execPath, [prismaCli, 'migrate', 'deploy'], { env: { ...process.env, DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl } });
  } catch {
    console.warn('Prisma schema engine unavailable; applying checked-in migrations with fixture-only psql fallback.');
    await migrateWithPsql();
  }
}

async function migrateWithPsql(): Promise<void> {
  psql(database, `CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    id VARCHAR(36) PRIMARY KEY,
    checksum VARCHAR(64) NOT NULL,
    finished_at TIMESTAMPTZ,
    migration_name VARCHAR(255) NOT NULL,
    logs TEXT,
    rolled_back_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    applied_steps_count INTEGER NOT NULL DEFAULT 0
  );`);
  const migrationRoot = path.resolve('prisma/migrations');
  const directories = (await readdir(migrationRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const applied = new Set(psql(database, 'SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL;', true).split(/\r?\n/).filter(Boolean));
  for (const name of directories) {
    if (applied.has(name)) continue;
    const file = path.join(migrationRoot, name, 'migration.sql');
    const sql = await readFile(file);
    const checksum = createHash('sha256').update(sql).digest('hex');
    const containerFile = `/tmp/${name}.sql`;
    try {
      if (transport === 'host') {
        run(psqlExecutable, ['-v', 'ON_ERROR_STOP=1', '-h', parsed.hostname, '-p', parsed.port || '5432', '-U', user, '-d', database, '-f', file], { env: { ...process.env, PGPASSWORD: password } });
      } else {
        run('docker', ['cp', file, `${container}:${containerFile}`]);
        run('docker', ['exec', container, 'psql', '-v', 'ON_ERROR_STOP=1', '-U', user, '-d', database, '-f', containerFile]);
      }
      psql(database, `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count) VALUES ('${randomUUID()}', '${checksum}', now(), '${name}', 1);`);
    } finally {
      if (transport !== 'host') run('docker', ['exec', container, 'rm', '-f', containerFile]);
    }
    console.log(`Applied migration ${name}`);
  }
}

async function seed(): Promise<void> {
  process.env.DATABASE_URL = databaseUrl;
  process.env.DIRECT_URL = databaseUrl;
  process.env.FIXTURE_STORAGE_ROOT = storageRoot;
  const fixtures = await import('../../prisma/seed/fixtures');
  try {
    await fixtures.seedFixtures();
  } finally {
    await fixtures.disconnectFixtures();
  }
}

const expectedMinimums: Record<string, number> = {
  media_assets: 40,
  galleries: 10,
  gallery_images: 30,
  videos: 10,
  institutions: 12,
  programme_schemes: 10,
  toolkits: 10,
  toolkit_items: 30,
  documents: 18,
  events: 24,
  event_news: 12,
  official_communications: 12,
  tenders: 12,
  procurement_updates: 12,
  pages: 12,
  menu_items: 24,
  faqs: 12,
  digital_services: 10,
  institutional_memberships: 20,
  enquiries: 15,
  dashboard_reports: 13,
  dashboard_datasets: 13,
  dashboard_metrics: 52,
  event_field_definitions: 12,
  audit_logs: 36,
  media_usages: 46,
};

function tableCounts(): Record<string, number> {
  const names = Object.keys(expectedMinimums).join("','");
  const rows = psql(database, `SELECT relname || '=' || n_live_tup FROM pg_stat_user_tables WHERE relname IN ('${names}') ORDER BY relname;`, true);
  const counts: Record<string, number> = {};
  for (const line of rows.split(/\r?\n/).filter(Boolean)) {
    const [name, count] = line.split('=');
    counts[name] = Number(count);
  }
  return counts;
}

function exactCounts(targetDatabase = database): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const table of Object.keys(expectedMinimums)) {
    counts[table] = Number(psql(targetDatabase, `SELECT COUNT(*) FROM ${table};`, true));
  }
  return counts;
}

function assertCounts(counts: Record<string, number>): void {
  const failures = Object.entries(expectedMinimums).filter(([table, minimum]) => (counts[table] ?? 0) < minimum);
  if (failures.length) throw new Error(`Fixture count verification failed: ${failures.map(([t, n]) => `${t}<${n}`).join(', ')}`);
}

async function sha256(file: string): Promise<string> {
  return createHash('sha256').update(await readFile(file)).digest('hex');
}

async function exportArtifacts(): Promise<void> {
  assertCounts(exactCounts());
  await mkdir(artifactDir, { recursive: true });
  if (transport === 'host') {
    const plainDump = path.join(artifactDir, 'sidhkofed-seed.sql');
    run(path.join(postgresBin, 'pg_dump.exe'), ['-h', parsed.hostname, '-p', parsed.port || '5432', '-U', user, '-d', database, '--clean', '--if-exists', '--no-owner', '--no-privileges', '-f', plainDump], { env: { ...process.env, PGPASSWORD: password } });
    await writeFile(dumpFile, gzipSync(await readFile(plainDump), { level: 9 }));
    const { unlink } = await import('node:fs/promises');
    await unlink(plainDump);
  } else {
    const containerDump = '/tmp/sidhkofed-seed.sql.gz';
    run('docker', ['exec', container, 'sh', '-c', `pg_dump -U ${user} -d ${database} --clean --if-exists --no-owner --no-privileges | gzip -9 > ${containerDump}`]);
    run('docker', ['cp', `${container}:${containerDump}`, dumpFile]);
    run('docker', ['exec', container, 'rm', '-f', containerDump]);
  }
  run('tar', ['-czf', mediaFile, '-C', storageRoot, '.']);
  const counts = exactCounts();
  const manifest = {
    generated_at: new Date().toISOString(),
    database,
    schema_migration: psql(database, 'SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1;', true),
    files: {
      database_dump: { name: path.basename(dumpFile), bytes: (await stat(dumpFile)).size, sha256: await sha256(dumpFile) },
      media_archive: { name: path.basename(mediaFile), bytes: (await stat(mediaFile)).size, sha256: await sha256(mediaFile) },
    },
    expected_minimums: expectedMinimums,
    row_counts: counts,
    limitations: ['success_stories_not_implemented', 'homepage_is_aggregated', 'search_vectors_are_database_generated'],
  };
  await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`Exported fixture artifacts to ${artifactDir}`);
}

async function verify(): Promise<void> {
  // Re-run twice to prove fixture idempotency, then compare exact counts.
  await seed();
  const before = exactCounts();
  await seed();
  const after = exactCounts();
  assertCounts(after);
  const changed = Object.keys(expectedMinimums).filter((table) => before[table] !== after[table]);
  if (changed.length) throw new Error(`Idempotency verification failed for: ${changed.join(', ')}`);
  const orphanChecks = [
    ['event_documents', 'events', 'event_id'],
    ['event_documents', 'documents', 'document_id'],
    ['gallery_images', 'media_assets', 'media_id'],
    ['dashboard_metrics', 'dashboard_reports', 'report_id'],
  ] as const;
  for (const [child, parent, fk] of orphanChecks) {
    const parentId = parent === 'media_assets' ? 'id' : 'id';
    const count = Number(psql(database, `SELECT COUNT(*) FROM ${child} c LEFT JOIN ${parent} p ON p.${parentId}=c.${fk} WHERE p.id IS NULL;`, true));
    if (count !== 0) throw new Error(`Orphan check failed: ${child}.${fk} -> ${parent}`);
  }
  for (const filename of ['lac-training.png', 'honey-cooperative.png', 'sample-publication.pdf', 'dashboard-dataset.csv', 'dashboard-dataset.xlsx']) {
    await stat(path.join('prisma/seed/assets', filename));
  }
  console.log('Fixture verification passed (counts, idempotency, relationships, and source assets).');
}

async function restoreVerify(): Promise<void> {
  const verifyDatabase = 'sidhkofed_verify_seed';
  if (!verifyDatabase.endsWith('_seed')) throw new Error('Verification database safety guard failed.');
  await stat(dumpFile);
  await stat(mediaFile);
  psql('postgres', `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${verifyDatabase}' AND pid <> pg_backend_pid();`, false, adminUser);
  psql('postgres', `DROP DATABASE IF EXISTS ${verifyDatabase};`, false, adminUser);
  psql('postgres', `CREATE DATABASE ${verifyDatabase} OWNER ${user};`, false, adminUser);
  const verifyRoot = path.resolve('tmp/seed-restore-verify');
  const plainSql = path.join(verifyRoot, 'restore.sql');
  const mediaRoot = path.join(verifyRoot, 'media');
  await rm(verifyRoot, { recursive: true, force: true });
  await mkdir(mediaRoot, { recursive: true });
  try {
    await writeFile(plainSql, gunzipSync(await readFile(dumpFile)));
    run(psqlExecutable, ['-v', 'ON_ERROR_STOP=1', '-h', parsed.hostname, '-p', parsed.port || '5432', '-U', user, '-d', verifyDatabase, '-f', plainSql], { env: { ...process.env, PGPASSWORD: password } });
    const restoredCounts = exactCounts(verifyDatabase);
    assertCounts(restoredCounts);
    const manifest = JSON.parse(await readFile(manifestFile, 'utf8')) as { row_counts: Record<string, number> };
    const mismatches = Object.keys(expectedMinimums).filter((table) => restoredCounts[table] !== manifest.row_counts[table]);
    if (mismatches.length) throw new Error(`Restored database count mismatch: ${mismatches.join(', ')}`);
    run('tar', ['-xzf', mediaFile, '-C', mediaRoot]);
    const fixtureDir = path.join(mediaRoot, 'media', 'fixtures');
    const restoredMedia = await readdir(fixtureDir);
    if (restoredMedia.length !== 40) throw new Error(`Expected 40 restored media objects, found ${restoredMedia.length}.`);
    console.log('Restore verification passed (fresh database, manifest counts, and 40 media objects).');
  } finally {
    await rm(verifyRoot, { recursive: true, force: true });
    psql('postgres', `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${verifyDatabase}' AND pid <> pg_backend_pid();`, false, adminUser);
    psql('postgres', `DROP DATABASE IF EXISTS ${verifyDatabase};`, false, adminUser);
  }
}

async function restoreArtifacts(): Promise<void> {
  await stat(dumpFile);
  await stat(mediaFile);
  await createDatabase(true);
  const restoreRoot = path.resolve('tmp/seed-restore');
  const plainSql = path.join(restoreRoot, 'restore.sql');
  await rm(restoreRoot, { recursive: true, force: true });
  await mkdir(restoreRoot, { recursive: true });
  try {
    await writeFile(plainSql, gunzipSync(await readFile(dumpFile)));
    run(psqlExecutable, ['-v', 'ON_ERROR_STOP=1', '-h', parsed.hostname, '-p', parsed.port || '5432', '-U', user, '-d', database, '-f', plainSql], { env: { ...process.env, PGPASSWORD: password } });
    await rm(storageRoot, { recursive: true, force: true });
    await mkdir(storageRoot, { recursive: true });
    run('tar', ['-xzf', mediaFile, '-C', storageRoot]);
    assertCounts(exactCounts());
    console.log(`Restored ${database} and fixture media from artifacts/seed.`);
  } finally {
    await rm(restoreRoot, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  const command = process.argv[2];
  switch (command) {
    case 'create': await createDatabase(false); break;
    case 'reset': await createDatabase(true); break;
    case 'migrate': await migrate(); break;
    case 'seed': await seed(); break;
    case 'setup': await createDatabase(false); await migrate(); await seed(); break;
    case 'export': await exportArtifacts(); break;
    case 'verify': await verify(); break;
    case 'restore': await restoreArtifacts(); break;
    case 'restore-verify': await restoreVerify(); break;
    default: throw new Error('Usage: fixture-db.ts create|reset|migrate|seed|setup|export|verify|restore|restore-verify');
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
