-- Analytics dashboard (docs/17 S7): append-only product events. Rows outlive their user and project (SET NULL), so the
-- totals of WrapFit do not shrink when someone deletes a project.
CREATE TYPE "ProductEventType" AS ENUM ('PROJECT_CREATED', 'EXPORT_BLOCKED_FITCHECK', 'AUTO_FIX_APPLIED', 'EXPORT_COMPLETED', 'STUDIO_ACTIVE');

CREATE TABLE "product_events" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "project_id" UUID,
    "type" "ProductEventType" NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_events_type_created_at_idx" ON "product_events"("type", "created_at");
CREATE INDEX "product_events_user_id_type_created_at_idx" ON "product_events"("user_id", "type", "created_at");
CREATE INDEX "product_events_project_id_type_idx" ON "product_events"("project_id", "type");

ALTER TABLE "product_events" ADD CONSTRAINT "product_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "product_events" ADD CONSTRAINT "product_events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "packaging_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
