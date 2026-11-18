import { Prisma } from '@prisma/client';

/**
 * Recomputes which uploads a project shows: every file reference of its canvas, of all its snapshots and of the design
 * of its unfinished exports (canvases store upload keys, see storage/asset-keys.ts). Call it in the transaction that
 * changed one of them, so the refs always match what is stored. One statement; keys without a stored_files row are
 * ignored.
 *
 * The file sources must stay the same as `fileReferences()` in storage/asset-keys.ts: `content` of the file elements
 * (logo, image, pattern), `style.fontUrl` of any element, and `url` of each `customFonts` entry. A source missing here
 * lets the daily maintenance (`StorageService.dropUnusedUploads`) delete a file the design still uses.
 */
export async function syncProjectFileRefs(tx: Prisma.TransactionClient, projectId: string): Promise<void> {
  await tx.$executeRaw`
    WITH canvases AS (
      SELECT p.canvas_state AS canvas FROM packaging_projects p WHERE p.id = ${projectId}::uuid
      UNION ALL
      SELECT s.canvas_state FROM project_snapshots s WHERE s.project_id = ${projectId}::uuid
      UNION ALL
      -- The design an unfinished export renders (docs/30 item 1): its files must outlive a save that drops them.
      SELECT j.design -> 'canvasState' FROM export_jobs j
      WHERE j.project_id = ${projectId}::uuid AND j.status IN ('PENDING', 'PROCESSING') AND j.design IS NOT NULL
    ),
    shown AS (
      SELECT f.id
      FROM (${canvasFileKeys(Prisma.sql`canvases`)}) keys
      JOIN stored_files f ON f.key = keys.key
    ),
    removed AS (
      DELETE FROM project_file_refs r
      WHERE r.project_id = ${projectId}::uuid AND r.stored_file_id NOT IN (SELECT id FROM shown)
    )
    INSERT INTO project_file_refs (project_id, stored_file_id)
    SELECT ${projectId}::uuid, id FROM shown
    ON CONFLICT DO NOTHING`;
}

/**
 * `SELECT key` of every file reference of the canvases in `source` (a relation with a jsonb column `canvas`). The
 * backfill migration 20261118000100_font_file_refs repeats this query for every project.
 */
function canvasFileKeys(source: Prisma.Sql): Prisma.Sql {
  const elements = Prisma.sql`jsonb_array_elements(
    CASE WHEN jsonb_typeof(c.canvas -> 'elements') = 'array' THEN c.canvas -> 'elements' ELSE '[]'::jsonb END) e`;
  return Prisma.sql`
    SELECT e ->> 'content' AS key FROM ${source} c, ${elements} WHERE e ->> 'type' IN ('logo', 'image', 'pattern')
    UNION
    SELECT e -> 'style' ->> 'fontUrl' FROM ${source} c, ${elements}
    UNION
    SELECT font ->> 'url' FROM ${source} c, jsonb_array_elements(
      CASE WHEN jsonb_typeof(c.canvas -> 'customFonts') = 'array' THEN c.canvas -> 'customFonts' ELSE '[]'::jsonb END) font`;
}
