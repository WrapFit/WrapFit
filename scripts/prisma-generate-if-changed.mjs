// Runs `prisma generate` only when be/prisma/schema.prisma changed since the
// last successful generate. On Windows a running API or worker locks the
// Prisma query engine DLL, so an unneeded generate would fail with EPERM.
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';

const schema = 'be/prisma/schema.prisma';
const marker = 'node_modules/.prisma/client/.wrapfit-schema-hash';

const hash = createHash('sha256')
  .update(readFileSync(schema, 'utf8').replace(/\r\n/g, '\n'))
  .digest('hex');

if (process.argv.includes('--mark')) {
  writeFileSync(marker, hash);
  process.exit(0);
}

if (existsSync(marker) && readFileSync(marker, 'utf8').trim() === hash) {
  console.log('[prisma] client is up to date, skipping generate');
  process.exit(0);
}

console.log('[prisma] schema changed, generating client');
try {
  execSync('npm --workspace=be run db:generate', { stdio: ['inherit', 'inherit', 'pipe'] });
  writeFileSync(marker, hash);
} catch (error) {
  const stderr = String(error?.stderr ?? '');
  process.stderr.write(stderr);
  // A running API / worker holds the query engine DLL, so only the copy of that (unchanged, same Prisma version)
  // binary fails; the client code and types were written before it. Accept that and let the watchers reload.
  const clientWritten =
    existsSync('node_modules/.prisma/client/index.js') &&
    statSync('node_modules/.prisma/client/index.js').mtimeMs > Date.now() - 120_000;
  if (/EPERM/.test(stderr) && /query_engine/.test(stderr) && clientWritten) {
    writeFileSync(marker, hash);
    console.log('[prisma] engine file was locked by a running process; client code updated, continuing');
    process.exit(0);
  }
  console.error(
    '\n[prisma] generate failed. If the error says EPERM, stop the running dev:be / dev:worker terminals and run this command again.\n',
  );
  process.exit(1);
}
