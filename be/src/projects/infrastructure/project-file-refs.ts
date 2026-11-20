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
 *
 * One recompute per project at a time: it locks the project row first (`lockProjectForRefs`). The statement reads the
 * canvas, the snapshots and the unfinished exports as committed when it starts, so two transactions that each changed
 * one of them and recomputed side by side would each miss the other's change (two failed exports of one image both
 * kept it). After the lock, the second one starts once the first has committed.
 */
export async function syncProjectFileRefs(tx: Prisma.TransactionClient, projectId: string): Promise<void> {
  await lockProjectForRefs(tx, projectId);
  await tx.$executeRaw`
    WITH canvases AS (
      SELECT p.canvas_state AS canvas FROM packaging_projects p WHERE p.id = ${projectId}::uuid
      UNION ALL
      SELECT s.canvas_state FROM project_snapshots s WHERE s.project_id = ${projectId}::uuid
      UNION ALL
      -- The design an unfinished export renders (docs-old/30 item 1): its files must outlive a save that drops them.
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

/**
 * Locks the project row against other recomputes of its refs (FOR NO KEY UPDATE: a foreign key check, such as a
 * snapshot or an order line being written, does not wait for it). A transaction that changes other rows of the project
 * (an export job, a snapshot) and then recomputes calls this first: the project row before the others, in every path,
 * so two of them cannot each hold what the other waits for. A no-op when the row is already locked as strongly.
 */
export async function lockProjectForRefs(tx: Prisma.TransactionClient, projectId: string): Promise<void> {
  await tx.$executeRaw`SELECT 1 FROM packaging_projects WHERE id = ${projectId}::uuid FOR NO KEY UPDATE`;
}
