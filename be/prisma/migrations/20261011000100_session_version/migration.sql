-- Signing out everywhere takes effect at once. Access tokens are stateless JWTs: revoking the refresh tokens alone
-- left them usable until they expired (up to 15 minutes). Tokens now carry the account's session version (claim
-- `sv`); revoking every session increments it, and the API refuses a token with an older number.
ALTER TABLE "users" ADD COLUMN "session_version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD CONSTRAINT "chk_users_session_version" CHECK ("session_version" >= 0);
