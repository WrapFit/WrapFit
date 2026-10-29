// Gives the analytics dashboard (docs/17 S7) the projects and print exports made before product events existed:
// one PROJECT_CREATED per project and one EXPORT_COMPLETED per completed export job, dated like the original rows.
//
//   npm --workspace=be run db:backfill-events -- [--dry-run]
//
// Run it by hand once after the migration 20261030000700_product_events. Running it again adds nothing: a project that
// already has a PROJECT_CREATED event, or a job whose id is in an EXPORT_COMPLETED event, is skipped. Older data has
// no studio heartbeats, so its box creation time stays empty (decision M8); FitCheck errors prevented before the
// migration are not known either.
import { PrismaClient } from '@prisma/client';

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const prisma = new PrismaClient();
  try {
    const [{ projects, exports }] = await prisma.$queryRaw<{ projects: number; exports: number }[]>`
      SELECT
        (SELECT count(*)::int FROM packaging_projects p
          WHERE NOT EXISTS (SELECT 1 FROM product_events e WHERE e.type = 'PROJECT_CREATED' AND e.project_id = p.id)
        ) AS projects,
        (SELECT count(*)::int FROM export_jobs j
          WHERE j.status = 'COMPLETED'
            AND NOT EXISTS (SELECT 1 FROM product_events e WHERE e.type = 'EXPORT_COMPLETED' AND e.payload->>'exportJobId' = j.id::text)
        ) AS exports`;
    if (dryRun) {
      console.log(`--dry-run: ${projects} PROJECT_CREATED và ${exports} EXPORT_COMPLETED sẽ được thêm.`);
      return;
    }

    const [createdProjects, createdExports] = await prisma.$transaction([
      prisma.$executeRaw`
        INSERT INTO product_events (id, user_id, project_id, type, payload, created_at)
        SELECT gen_random_uuid(), p.user_id, p.id, 'PROJECT_CREATED',
               jsonb_build_object('templateId', p.template_id, 'source', 'backfill'), p.created_at
        FROM packaging_projects p
        WHERE NOT EXISTS (SELECT 1 FROM product_events e WHERE e.type = 'PROJECT_CREATED' AND e.project_id = p.id)`,
      // An export job has no watermark flag: every export before billing (docs/17 S2) was a clean file.
      prisma.$executeRaw`
        INSERT INTO product_events (id, user_id, project_id, type, payload, created_at)
        SELECT gen_random_uuid(), p.user_id, j.project_id, 'EXPORT_COMPLETED',
               jsonb_build_object('exportJobId', j.id, 'fileType', j.file_type, 'watermarked', false),
               coalesce(j.completed_at, j.created_at)
        FROM export_jobs j
        JOIN packaging_projects p ON p.id = j.project_id
        WHERE j.status = 'COMPLETED'
          AND NOT EXISTS (SELECT 1 FROM product_events e WHERE e.type = 'EXPORT_COMPLETED' AND e.payload->>'exportJobId' = j.id::text)`,
    ]);
    console.log(`Đã thêm ${createdProjects} PROJECT_CREATED và ${createdExports} EXPORT_COMPLETED.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
