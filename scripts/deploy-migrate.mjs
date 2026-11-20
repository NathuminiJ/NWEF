import { spawnSync } from 'node:child_process';

/**
 * Prebuild step. Always regenerates the Prisma client from the committed
 * schema so new fields are available to TypeScript during `next build`.
 *
 * On Vercel it also attempts to apply migrations and seed staff/budget data.
 * Failures are logged but do not stop the build — the site must stay reachable
 * so runtime errors can still explain what needs fixing.
 */
const isVercel = process.env.VERCEL === '1';

function run(command, args, label, env = process.env) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env,
  });
  if (result.error) {
    console.warn(`[deploy] ${label} could not start:`, result.error.message);
    return false;
  }
  if (result.status !== 0) {
    console.warn(`[deploy] ${label} exited with status ${result.status}; continuing build.`);
    return false;
  }
  return true;
}

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

if (!isVercel) {
  console.log('[deploy] local build — skipping automatic database migration');
  process.exit(0);
}

console.log('[deploy] generating Prisma client from the committed schema');
if (!run(npx, ['prisma', 'generate'], 'Prisma generate')) {
  console.error('[deploy] Prisma client generation failed; aborting build.');
  process.exit(1);
}

if (!process.env.DATABASE_URL?.trim()) {
  console.warn('[deploy] DATABASE_URL is not set; skipping automatic migration.');
  process.exit(0);
}

console.log('[deploy] applying Prisma migrations to the hosted database');
// Neon recommends a direct (non-pooler) connection for CLI migrations. When
// DIRECT_URL is provided, use it for this command while the app keeps using
// the pooled DATABASE_URL.
const migrationEnv = process.env.DIRECT_URL?.trim()
  ? { ...process.env, DATABASE_URL: process.env.DIRECT_URL }
  : process.env;
const migrated = run(npx, ['prisma', 'migrate', 'deploy'], 'Prisma migration', migrationEnv);
if (!migrated) {
  console.warn('[deploy] check DATABASE_URL in Vercel → Settings → Environment Variables.');
}

if (process.env.SEED_ON_DEPLOY !== 'false') {
  console.log('[deploy] seeding staff accounts and budget envelopes');
  run(npx, ['tsx', 'prisma/seed.ts'], 'Seed');
}
