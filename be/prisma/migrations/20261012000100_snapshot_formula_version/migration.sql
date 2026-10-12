-- Formula version of the project when the snapshot was taken (docs/12 Phase 8, 8.10): restoring the snapshot puts it
-- back, which undoes a formula upgrade. NULL for older snapshots: a restore keeps the current version.
ALTER TABLE "project_snapshots" ADD COLUMN "formula_version" INTEGER;
ALTER TABLE "project_snapshots" ADD CONSTRAINT "chk_project_snapshots_formula_version" CHECK ("formula_version" IS NULL OR "formula_version" >= 1);
