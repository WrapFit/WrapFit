-- Library assets imported by admins from licensed sources (stickers, labels, illustrations, backgrounds, icons).
CREATE TYPE "LibraryAssetCategory" AS ENUM ('STICKER', 'LABEL', 'ILLUSTRATION', 'BACKGROUND', 'ICON');

CREATE TABLE "library_assets" (
    "id" UUID NOT NULL,
    "category" "LibraryAssetCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "stored_file_id" UUID NOT NULL,
    "file_key" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "is_vector" BOOLEAN NOT NULL DEFAULT false,
    "width_px" INTEGER,
    "height_px" INTEGER,
    "max_print_mm" DOUBLE PRECISION,
    "license" TEXT NOT NULL,
    "source_url" TEXT,
    "attribution" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "occasions" "Occasion"[] DEFAULT ARRAY[]::"Occasion"[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "library_assets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "library_assets_stored_file_id_key" ON "library_assets"("stored_file_id");
CREATE INDEX "library_assets_is_active_category_idx" ON "library_assets"("is_active", "category");

-- A file in the library is never deleted by the cleanup of unused uploads, nor with its uploader's account.
ALTER TABLE "library_assets" ADD CONSTRAINT "library_assets_stored_file_id_fkey" FOREIGN KEY ("stored_file_id") REFERENCES "stored_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
