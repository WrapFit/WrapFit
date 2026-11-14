-- Design review link and comments (docs/23 S23).
CREATE TABLE "project_reviews" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "token" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMPTZ(3),
    "approved_by" TEXT,
    "approved_version" INTEGER,

    CONSTRAINT "project_reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "design_comments" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "author_user_id" UUID,
    "author_name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "panel_id" TEXT,
    "x" DOUBLE PRECISION,
    "y" DOUBLE PRECISION,
    "resolved_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "design_comments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "project_reviews_project_id_key" ON "project_reviews"("project_id");
CREATE UNIQUE INDEX "project_reviews_token_key" ON "project_reviews"("token");
CREATE INDEX "design_comments_project_id_created_at_idx" ON "design_comments"("project_id", "created_at");
CREATE INDEX "design_comments_author_user_id_idx" ON "design_comments"("author_user_id");

ALTER TABLE "project_reviews" ADD CONSTRAINT "project_reviews_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "packaging_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "design_comments" ADD CONSTRAINT "design_comments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "packaging_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "design_comments" ADD CONSTRAINT "design_comments_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
