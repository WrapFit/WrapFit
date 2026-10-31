-- AI images paid with xu (docs/19 S2): one row per request (text-to-image or a tool on one AI image), one row per
-- image it produced. The xu of a job are debited in the transaction that creates it and refunded once if it fails.

-- CreateEnum
CREATE TYPE "AiImageJobKind" AS ENUM ('GENERATE', 'UPSCALE', 'REMOVE_BG', 'VECTORIZE');

-- CreateEnum
CREATE TYPE "AiImageJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "ai_image_jobs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" "AiImageJobKind" NOT NULL,
    "model_key" TEXT NOT NULL,
    "prompt" TEXT,
    "prompt_en" TEXT,
    "aspect_ratio" TEXT,
    "allow_text" BOOLEAN NOT NULL DEFAULT false,
    "num_images" INTEGER NOT NULL DEFAULT 1,
    "source_output_id" UUID,
    "xu_cost" INTEGER NOT NULL,
    "est_cost_usd" DECIMAL(10,4) NOT NULL,
    "status" "AiImageJobStatus" NOT NULL DEFAULT 'PENDING',
    "client_request_id" UUID,
    "debit_operation_id" UUID NOT NULL,
    "provider_request_id" TEXT,
    "error_log" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(3),

    CONSTRAINT "ai_image_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_image_outputs" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "stored_file_id" UUID NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "keep_until" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_image_outputs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_image_jobs_user_id_created_at_idx" ON "ai_image_jobs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_image_jobs_status_created_at_idx" ON "ai_image_jobs"("status", "created_at");

-- CreateIndex
CREATE INDEX "ai_image_jobs_created_at_idx" ON "ai_image_jobs"("created_at");

-- CreateIndex
CREATE INDEX "ai_image_jobs_source_output_id_idx" ON "ai_image_jobs"("source_output_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_image_jobs_user_id_client_request_id_key" ON "ai_image_jobs"("user_id", "client_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_image_outputs_stored_file_id_key" ON "ai_image_outputs"("stored_file_id");

-- CreateIndex
CREATE INDEX "ai_image_outputs_job_id_idx" ON "ai_image_outputs"("job_id");

-- AddForeignKey
ALTER TABLE "ai_image_jobs" ADD CONSTRAINT "ai_image_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_image_jobs" ADD CONSTRAINT "ai_image_jobs_source_output_id_fkey" FOREIGN KEY ("source_output_id") REFERENCES "ai_image_outputs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_image_outputs" ADD CONSTRAINT "ai_image_outputs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "ai_image_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_image_outputs" ADD CONSTRAINT "ai_image_outputs_stored_file_id_fkey" FOREIGN KEY ("stored_file_id") REFERENCES "stored_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- CHECK constraints
ALTER TABLE "ai_image_jobs"
  ADD CONSTRAINT "chk_ai_image_jobs_xu_cost" CHECK ("xu_cost" > 0),
  ADD CONSTRAINT "chk_ai_image_jobs_est_cost" CHECK ("est_cost_usd" >= 0),
  ADD CONSTRAINT "chk_ai_image_jobs_num_images" CHECK ("num_images" BETWEEN 1 AND 10),
  -- A generation has a prompt; a tool run works on an image (until that image is deleted: SET NULL).
  ADD CONSTRAINT "chk_ai_image_jobs_prompt" CHECK ("kind" <> 'GENERATE' OR "prompt" IS NOT NULL),
  ADD CONSTRAINT "chk_ai_image_jobs_finished" CHECK (("status" = 'COMPLETED') = ("completed_at" IS NOT NULL));
ALTER TABLE "ai_image_outputs"
  ADD CONSTRAINT "chk_ai_image_outputs_size" CHECK (("width" IS NULL OR "width" > 0) AND ("height" IS NULL OR "height" > 0));
