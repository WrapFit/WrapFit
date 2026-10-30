// Loaded by jest before the test files (and therefore before ConfigModule reads the environment).
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// Fake Google credentials enable the OAuth routes; the e2e tests never reach Google itself.
process.env.GOOGLE_CLIENT_ID = 'e2e-client-id.apps.googleusercontent.com';
process.env.GOOGLE_CLIENT_SECRET = 'e2e-client-secret';
process.env.GOOGLE_CALLBACK_URL = 'http://localhost:8080/api/auth/google/callback';
process.env.FRONTEND_URL = 'http://frontend.e2e';
// A list (not "*") turns the CSRF origin check on, like production.
process.env.CORS_ORIGINS = 'http://localhost:3000';

// Object storage: the local SeaweedFS of docker-compose.yml (`docker compose up -d seaweedfs storage-init`), on the
// host port compose publishes it: STORAGE_PORT from the environment or the repository's .env (compose reads the same
// file), else 8333. Values already present in the environment (CI, another S3) win.
function composeStoragePort(): string {
  if (process.env.STORAGE_PORT) return process.env.STORAGE_PORT;
  const composeEnv = join(__dirname, '..', '..', '.env');
  const line = existsSync(composeEnv) ? /^STORAGE_PORT=(\d+)\s*$/m.exec(readFileSync(composeEnv, 'utf8')) : null;
  return line?.[1] ?? '8333';
}
const storageOrigin = `http://localhost:${composeStoragePort()}`;
const storageDefaults: Record<string, string> = {
  STORAGE_ENDPOINT: storageOrigin,
  STORAGE_REGION: 'us-east-1',
  STORAGE_BUCKET: 'wrapfit',
  STORAGE_PRIVATE_BUCKET: 'wrapfit-private',
  STORAGE_ACCESS_KEY_ID: 'wrapfit-dev-access',
  STORAGE_SECRET_ACCESS_KEY: 'wrapfit-dev-secret-change-me',
  STORAGE_PUBLIC_URL: `${storageOrigin}/wrapfit`,
  STORAGE_FORCE_PATH_STYLE: 'true',
};
for (const [key, value] of Object.entries(storageDefaults)) process.env[key] ??= value;

// Never call the paid Claude API from tests: the AI module falls back to its procedural generator.
process.env.ANTHROPIC_API_KEY = '';

// The simulate button of the VietQR checkout (docs/17 M6) is on for e2e; payments.e2e-spec.ts also boots an app with
// it off to check the 404.
process.env.PAYMENT_SIMULATION = 'true';
