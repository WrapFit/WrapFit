-- docs/30 item 1: an export job keeps the version and the design it was checked and paid for. The worker renders
-- `design` ({ title, templateId, formulaVersion, dimensions, canvasState }, canvas in stored form), never the project
-- as it is when the job runs. NULL on the jobs created before this migration (the worker falls back to the project).
ALTER TABLE "export_jobs" ADD COLUMN "project_version" INTEGER,
ADD COLUMN "design" JSONB;
