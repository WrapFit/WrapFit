import { PrismaClient, Role, SubscriptionTier } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { CURRENT_FORMULA_VERSION } from '@wrapfit/shared';
import { boxTemplates, designTemplates } from './seed-data';

const prisma = new PrismaClient();

async function main() {
  for (const template of boxTemplates) {
    await prisma.boxTemplate.upsert({ where: { id: template.id }, update: template, create: template });
  }
  console.log(`Seeded ${boxTemplates.length} box templates`);

  for (const { id, usesCount: _keepCount, ...design } of designTemplates) {
    // Never reset the usage counter of an existing template.
    await prisma.designTemplate.upsert({ where: { id }, update: design, create: { id, ...design } });
  }
  console.log(`Seeded ${designTemplates.length} curated design templates`);

  // The container runs this seed on every start: never create an admin with the well-known default password in production.
  const isProduction = process.env.NODE_ENV === 'production';
  const password = process.env.SEED_ADMIN_PASSWORD || (isProduction ? undefined : 'Admin@12345');
  if (!password) {
    console.log('Skipped admin + demo data (set SEED_ADMIN_PASSWORD to create an admin in production)');
    return;
  }

  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@wrapfit.vn').toLowerCase();
  // Anyone may have registered this address before the operator set SEED_ADMIN_PASSWORD: never verify (and so open)
  // such an account, and never make it an admin. The operator picks another address or deletes that account.
  const existing = await prisma.user.findUnique({ where: { email }, select: { role: true } });
  if (existing && existing.role !== Role.ADMIN) {
    console.warn(`Skipped admin + demo data: ${email} already belongs to a ${existing.role} account (set SEED_ADMIN_EMAIL)`);
    return;
  }
  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      emailVerifiedAt: new Date(),
      fullName: 'WrapFit Admin',
      shopName: 'WrapFit Studio',
      role: Role.ADMIN,
      subscriptionTier: SubscriptionTier.PRO_BUSINESS,
      passwordHash: await bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS ?? 10)),
    },
  });
  // The operator chose this address: it counts as verified (accounts sign in only with a verified email), also for
  // an admin created before email verification existed.
  await prisma.user.updateMany({ where: { id: admin.id, emailVerifiedAt: null }, data: { emailVerifiedAt: new Date() } });
  console.log(`Seeded admin user: ${admin.email}`);

  if (isProduction) return;

  const hasCollection = await prisma.projectCollection.count({ where: { userId: admin.id } });
  if (hasCollection === 0) {
    await prisma.projectCollection.create({
      data: {
        userId: admin.id,
        title: 'Bộ Hộp Quà Tết Bính Ngọ 2026',
        description: 'Bộ sưu tập mẫu được tạo bởi seed script.',
        colorTag: '#C0392B',
        projects: {
          create: {
            userId: admin.id,
            templateId: 'tuck-top',
            // The formulas the box templates get above, like a project created in the studio.
            formulaVersion: CURRENT_FORMULA_VERSION,
            title: 'Hộp Nến Thơm Tinh Dầu',
            visibility: 'PUBLIC',
            dimensions: { length: 120, width: 80, height: 60, paperThickness: 0.4 },
            materialSpec: { type: 'kraft', gsm: 300, caliper: 0.4, finish: 'matte' },
            canvasState: { elements: [] },
            tags: ['nen-thom', 'tet'],
          },
        },
      },
    });
    console.log('Seeded demo collection + project');
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
