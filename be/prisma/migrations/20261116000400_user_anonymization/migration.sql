-- docs/25 item 3: an admin deleting a user with financial history (any payment, any order, a purchased credit lot, a
-- subscription, or a bank transaction they resolved) anonymizes the row instead. `anonymized_at` records when.
ALTER TABLE "users" ADD COLUMN "anonymized_at" TIMESTAMPTZ(3);

-- An anonymized account has no way to sign in (no password, no Google id) and stays inactive for good.
ALTER TABLE "users" DROP CONSTRAINT "chk_users_sign_in_method";
ALTER TABLE "users" ADD CONSTRAINT "chk_users_sign_in_method"
  CHECK ("password_hash" IS NOT NULL OR "google_id" IS NOT NULL OR "anonymized_at" IS NOT NULL);
ALTER TABLE "users" ADD CONSTRAINT "chk_users_anonymized"
  CHECK ("anonymized_at" IS NULL OR ("is_active" = false AND "password_hash" IS NULL AND "google_id" IS NULL));

-- Backstop: a stray hard delete of such a user fails instead of cascading into money records. The hard-delete path
-- (UsersService.remove) only runs for users without that history, and deletes their free credit lots itself first.
ALTER TABLE "payments" DROP CONSTRAINT "payments_user_id_fkey";
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "orders" DROP CONSTRAINT "orders_user_id_fkey";
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "credit_lots" DROP CONSTRAINT "credit_lots_user_id_fkey";
ALTER TABLE "credit_lots" ADD CONSTRAINT "credit_lots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_user_id_fkey";
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "bank_transactions" DROP CONSTRAINT "bank_transactions_resolved_by_fkey";
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
