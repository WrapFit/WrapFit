-- AI tools on uploaded images (docs/23 S20): a tool job may work on an upload of the user instead of an AI image.
ALTER TABLE "ai_image_jobs" ADD COLUMN "source_file_id" UUID;

CREATE INDEX "ai_image_jobs_source_file_id_idx" ON "ai_image_jobs"("source_file_id");

ALTER TABLE "ai_image_jobs" ADD CONSTRAINT "ai_image_jobs_source_file_id_fkey" FOREIGN KEY ("source_file_id") REFERENCES "stored_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
