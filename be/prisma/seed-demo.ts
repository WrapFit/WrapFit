import { readFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Prisma, PrismaClient, Role, SubscriptionTier } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { caliperOf, type CanvasElement, checkBox, generateDielinePieces } from '@wrapfit/shared';

// Only @wrapfit/shared and Prisma: the production image has `prisma/` and `dist/`, not `src/` (be/Dockerfile), and a
// failing seed stops the backend container from starting.

/**
 * Demo account of the CP4 live demo (docs/17 S8, §5): a verified MAKER on the Free plan with export credits and the
 * candle jar project of the script, its logo already on the front panel. Created only when SEED_DEMO_PASSWORD is set.
 * Runs on every start of the backend container, so every step is idempotent: the project and the logo are made once,
 * and the credits are topped up to SEED_DEMO_CREDITS (a rehearsal that spent them gets them back on the next deploy).
 */

const PROJECT_TITLE = 'Hũ nến thơm Mộc An';
const CREDIT_NOTE = 'Tài khoản demo CP4 (seed)';
const LOGO_FILE = join(__dirname, 'assets', 'demo-candle-logo.svg');
const DEFAULT_CREDITS = 5;

/** The candle jar of the demo script: 80 × 80 × 95 mm, 350 g (lock bottom FEFCO 0215), Ivory 300 GSM. */
const GSM = 300;
const DIMENSIONS = { length: 80, width: 80, height: 95, paperThickness: caliperOf(GSM), giftWeight: 350 };
const MATERIAL = { type: 'ivory', gsm: GSM, caliper: caliperOf(GSM), finish: 'matte' };

export async function seedDemo(prisma: PrismaClient): Promise<void> {
  const password = process.env.SEED_DEMO_PASSWORD;
  if (!password) return;
  const email = (process.env.SEED_DEMO_EMAIL || 'demo@wrapfit.vn').toLowerCase();
  const credits = Number(process.env.SEED_DEMO_CREDITS || DEFAULT_CREDITS);

  // Same rule as the admin: never take over (and verify) an account somebody registered with this address.
  const existing = await prisma.user.findUnique({ where: { email }, select: { role: true } });
  if (existing && existing.role !== Role.MAKER) {
    console.warn(`Skipped demo account: ${email} already belongs to a ${existing.role} account (set SEED_DEMO_EMAIL)`);
    return;
  }
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      emailVerifiedAt: new Date(),
      fullName: process.env.SEED_DEMO_NAME || 'Chị Linh (demo)',
      shopName: 'Nến thơm Mộc An',
      role: Role.MAKER,
      subscriptionTier: SubscriptionTier.FREE,
      passwordHash: await bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS ?? 10)),
    },
  });

  await topUpCredits(prisma, user.id, credits);
  await ensureProject(prisma, user.id);
  console.log(`Seeded demo account: ${email}`);
}

/** Adds an ADMIN lot (no expiry) so the usable balance is at least `target`. */
async function topUpCredits(prisma: PrismaClient, userId: string, target: number): Promise<void> {
  const now = new Date();
  const { _sum } = await prisma.creditLot.aggregate({
    where: { userId, kind: 'EXPORT', remaining: { gt: 0 }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    _sum: { remaining: true },
  });
  const missing = target - (_sum.remaining ?? 0);
  if (missing <= 0) return;
  await prisma.creditLot.create({
    data: { userId, kind: 'EXPORT', source: 'ADMIN', quantity: missing, remaining: missing, expiresAt: null, note: CREDIT_NOTE },
  });
  console.log(`Demo account: +${missing} export credits`);
}

async function ensureProject(prisma: PrismaClient, userId: string): Promise<void> {
  const has = await prisma.packagingProject.count({ where: { userId, title: PROJECT_TITLE, status: { not: 'DELETED' } } });
  if (has > 0) return;
  const template = await prisma.boxTemplate.findUnique({ where: { id: 'tuck-top' }, select: { formulaVersion: true } });
  if (!template) throw new Error('Seed the box templates before the demo account');

  const logo = await uploadLogo(prisma, userId);
  const logoKey = logo?.key;
  // On the front panel (80 × 95 mm), centred, well inside the 3 mm safe margin; Auto-Fix has nothing to move.
  const elements: CanvasElement[] = logoKey
    ? [{ id: randomUUID(), type: 'logo', panelId: 'panel_front', x: 20, y: 22, width: 40, height: 40, rotation: 0, content: logoKey }]
    : [];
  const canvasState = { elements, backgroundPattern: null, materialTheme: 'ivory' };
  // The FitCheck ProjectsService.create saves (project-fitcheck.ts), so the dashboard card shows its score.
  const fitCheck = checkBox(generateDielinePieces('tuck-top', DIMENSIONS, template.formulaVersion), elements);

  await prisma.$transaction(async (tx) => {
    const project = await tx.packagingProject.create({
      data: {
        userId,
        templateId: 'tuck-top',
        formulaVersion: template.formulaVersion,
        title: PROJECT_TITLE,
        dimensions: DIMENSIONS,
        materialSpec: MATERIAL,
        canvasState: canvasState as unknown as Prisma.InputJsonValue,
        fitcheckState: fitCheck as unknown as Prisma.InputJsonValue,
        fitcheckScore: fitCheck.score,
        tags: ['nen-thom', 'demo'],
      },
    });
    if (logo) {
      // What syncProjectFileRefs records for a canvas showing this upload.
      await tx.storedFile.update({ where: { id: logo.id }, data: { projectId: project.id } });
      await tx.projectFileRef.create({ data: { projectId: project.id, storedFileId: logo.id } });
    }
    await tx.productEvent.create({
      data: { userId, projectId: project.id, type: 'PROJECT_CREATED', payload: { templateId: 'tuck-top', source: 'new' } },
    });
  });
  console.log(`Demo account: project "${PROJECT_TITLE}"${logoKey ? ' with its logo' : ' (no logo: storage is not configured)'}`);
}

/**
 * Puts the logo in the public bucket the way an upload of the studio lands there (`users/<id>/logo/<uuid>.svg`, a
 * confirmed stored_files row). Null while storage is not configured: the project is then made without it.
 */
async function uploadLogo(prisma: PrismaClient, userId: string): Promise<{ id: string; key: string } | null> {
  const bucket = process.env.STORAGE_BUCKET;
  if (!bucket) return null;
  const client = new S3Client({
    region: process.env.STORAGE_REGION || 'auto',
    endpoint: process.env.STORAGE_ENDPOINT || undefined,
    forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE === 'true',
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY ?? '',
    },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  const body = readFileSync(LOGO_FILE);
  const key = `users/${userId}/logo/${randomUUID()}.svg`;
  // SVG is download-only on the CDN domain (storage.rules.ts DOWNLOAD_ONLY_TYPES); <img> and the worker still read it.
  await client.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: 'image/svg+xml', ContentDisposition: 'attachment' }),
  );
  return prisma.storedFile.create({
    data: { userId, key, purpose: 'LOGO', contentType: 'image/svg+xml', size: body.length, confirmedAt: new Date() },
    select: { id: true, key: true },
  });
}
