import { spawnSync } from 'node:child_process';

/**
 * Vercel-only prebuild step.
 *
 * Applies the Prisma migrations during deployment so a newly created hosted
 * database gets its tables automatically. Local builds skip this so developers
 * do not need a running database just to compile the app.
 */
const isVercel = process.env.VERCEL === '1';

if (!isVercel) {
  console.log('[deploy] local build — skipping automatic database migration');
  process.exit(0);
}

if (!process.env.DATABASE_URL?.trim()) {
  console.error('[deploy] DATABASE_URL is not set. Add it in Vercel → Settings → Environment Variables.');
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log('[deploy] applying Prisma migrations to the hosted database');
run(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['prisma', 'migrate', 'deploy']);

if (process.env.SEED_ON_DEPLOY === 'true') {
  console.log('[deploy] seeding staff accounts and budget envelopes');
  run(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['tsx', 'prisma/seed.ts']);
}
