-- docs/25 S8 (finding 8): stored notification inbox. "Someone remixed your design" (PROJECT_REMIXED) and "your print
-- file is ready" (EXPORT_COMPLETED). Rows hold ids only: the remixer's name is read when the inbox is shown, so a
-- deleted or anonymized account leaves no name in anyone's inbox.
CREATE TYPE "NotificationType" AS ENUM ('PROJECT_REMIXED', 'EXPORT_COMPLETED');

CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "project_id" UUID NOT NULL,
    "actor_id" UUID,
    "count" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "read_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_notifications_count" CHECK ("count" >= 1)
);

-- Inbox, newest first, paged with the (created_at, id) cursor.
CREATE INDEX "notifications_user_id_created_at_id_idx" ON "notifications"("user_id", "created_at" DESC, "id" DESC);
-- Unread count, and the remix collapse rule (newest unread row of the same design).
CREATE INDEX "notifications_unread_idx" ON "notifications"("user_id", "project_id") WHERE "read_at" IS NULL;
-- Foreign keys: deleting a project or a user must not scan the table.
CREATE INDEX "notifications_project_id_idx" ON "notifications"("project_id");
CREATE INDEX "notifications_actor_id_idx" ON "notifications"("actor_id");

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "packaging_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
