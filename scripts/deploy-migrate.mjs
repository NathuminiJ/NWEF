import { spawnSync } from 'node:child_process';

/**
 * Vercel-only prebuild step.
 *
 * Attempts to apply Prisma migrations during deployment so a newly created
 * hosted database gets its tables automatically. Failures are logged but do
 * not stop the build — the site must stay reachable so runtime errors can
 * still explain what needs fixing. Local builds always skip this step.
 */
const isVercel = process.env.VERCEL === '1';

if (!isVercel) {
  console.log('[deploy] local build — skipping automatic database migration');
  process.exit(0);
}

if (!process.env.DATABASE_URL?.trim()) {
  console.warn('[deploy] DATABASE_URL is not set; skipping automatic migration.');
  process.exit(0);
}

function run(command, args, label) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
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

console.log('[deploy] applying Prisma migrations to the hosted database');
const migrated = run(npx, ['prisma', 'migrate', 'deploy'], 'Prisma migration');
if (!migrated) {
  console.warn('[deploy] check DATABASE_URL in Vercel → Settings → Environment Variables.');
}

if (process.env.SEED_ON_DEPLOY === 'true') {
  console.log('[deploy] seeding staff accounts and budget envelopes');
  run(npx, ['tsx', 'prisma/seed.ts'], 'Seed');
}
