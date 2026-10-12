#!/usr/bin/env node
/**
 * Test data for the viewport audit (docs/12 Phase 7): rebuilt the same way every run, removed with --clean.
 *
 * Usage (backend, worker and Mailpit running; frontend dev server for the /api proxy):
 *   node fe/scripts/ui-fixtures.mjs           # clean, then create
 *   node fe/scripts/ui-fixtures.mjs --clean   # remove only
 * Options: --base-url=http://localhost:3000  --mailpit=http://localhost:8025
 *
 * Creates, owned by the seed admin (SEED_ADMIN_* of be/.env, or SHOT_PASSWORD): a folder, ACTIVE projects (PUBLIC with
 * an opened QR unboxing, UNLISTED without remix, one with a long title, one in the folder), an ARCHIVED and a DELETED
 * project, and a project pinned to formula version 1 (studio banner "Cập nhật lên công thức mới"; set in the database,
 * no API pins old formulas). Then a new MAKER account with no data, verified through the Mailpit email.
 * Writes ids, slugs and the MAKER credentials to fe/.page-shots/fixtures.json (git-ignored), read by page-shots.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { AppSession, backendEnv, FIXTURES_FILE, SHOTS_DIR, seedAdmin } from './lib/app-session.mjs';
import { FE_ROOT } from './stitch/lib/paths.mjs';

const args = process.argv.slice(2);
const option = (name, fallback) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? fallback;
const baseUrl = option('base-url', 'http://localhost:3000').replace(/\/+$/, '');
const mailpit = option('mailpit', 'http://localhost:8025').replace(/\/+$/, '');
const cleanOnly = args.includes('--clean');

const PREFIX = 'UI fixture · ';
const MAKER_EMAIL = 'ui-maker@wrapfit.test';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const admin = new AppSession(baseUrl);
const { email: adminEmail, password: adminPassword } = seedAdmin();
await admin.signIn(adminEmail, adminPassword);

async function listAll(path, query = {}) {
  const items = [];
  for (let page = 1; ; page++) {
    const result = await admin.request(path, { query: { ...query, page, limit: 100 } });
    items.push(...result.items);
    if (page >= result.meta.totalPages) return items;
  }
}

async function clean() {
  let removed = 0;
  for (const status of ['ACTIVE', 'ARCHIVED', 'DELETED']) {
    for (const project of await listAll('/projects', { status, q: PREFIX.trim() })) {
      if (!project.title.startsWith(PREFIX)) continue;
      if (status !== 'DELETED') await admin.request(`/projects/${project.id}/status`, { method: 'PATCH', json: { status: 'DELETED' } });
      await admin.request(`/projects/${project.id}`, { method: 'DELETE' });
      removed++;
    }
  }
  for (const collection of await admin.request('/collections')) {
    if (collection.title.startsWith(PREFIX)) {
      await admin.request(`/collections/${collection.id}`, { method: 'DELETE' });
      removed++;
    }
  }
  for (const user of await listAll('/users')) {
    if (user.email === MAKER_EMAIL) {
      await admin.request(`/users/${user.id}`, { method: 'DELETE' });
      removed++;
    }
  }
  if (fs.existsSync(FIXTURES_FILE)) fs.rmSync(FIXTURES_FILE);
  console.log(`Removed ${removed} fixture record(s)`);
}

/** Token of the newest verify-email message to `email` in Mailpit (the worker sends it a moment after sign-up). */
async function verificationToken(email, after) {
  for (let i = 0; i < 40; i++) {
    const list = await (await fetch(`${mailpit}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)).json();
    const message = list.messages?.find((m) => new Date(m.Created) >= after);
    if (message) {
      const full = await (await fetch(`${mailpit}/api/v1/message/${message.ID}`)).json();
      const token = full.Text.match(/verify-email\?token=([\w-]+)/)?.[1];
      if (token) return token;
    }
    await sleep(500);
  }
  throw new Error(`No verification email for ${email} in Mailpit (is the worker running?)`);
}

const box = (length, width, height) => ({ length, width, height, paperThickness: 0.35 });

/** Pins a project to older dieline formulas, straight in the database of `be/.env` (Prisma client of the backend). */
async function pinFormulaVersion(id, formulaVersion) {
  const { PrismaClient } = createRequire(path.join(FE_ROOT, '..', 'be', 'package.json'))('@prisma/client');
  const prisma = new PrismaClient({ datasourceUrl: backendEnv('DATABASE_URL') });
  try {
    await prisma.packagingProject.update({ where: { id }, data: { formulaVersion } });
  } finally {
    await prisma.$disconnect();
  }
}

async function project(title, templateId, dimensions, extra = {}) {
  return admin.request('/projects', { method: 'POST', json: { title: PREFIX + title, templateId, dimensions, ...extra } });
}

async function create() {
  const folder = await admin.request('/collections', {
    method: 'POST',
    json: { title: `${PREFIX}Quà Tết 2027`, description: 'Hộp quà Tết cho khách sỉ', colorTag: '#BC6C25' },
  });
  const publicProject = await project('Hộp trà Tết', 'tuck-top', box(120, 80, 60), { occasion: 'TET', industry: 'TEA_AGRI', tags: ['tet', 'tra'] });
  await admin.request(`/projects/${publicProject.id}/visibility`, { method: 'PATCH', json: { visibility: 'PUBLIC', allowFork: true } });
  const unboxing = await admin.request(`/projects/${publicProject.id}/unboxing`, {
    method: 'POST',
    json: { recipientName: 'Chị Lan', giftNote: 'Chúc chị năm mới an khang.\nCảm ơn chị đã đồng hành cùng tiệm cả năm qua!', particleEffect: 'hearts' },
  });
  const unlisted = await project('Hộp nến thơm (không cho remix)', 'lid-base', box(90, 90, 70), { industry: 'CANDLES' });
  await admin.request(`/projects/${unlisted.id}/visibility`, { method: 'PATCH', json: { visibility: 'UNLISTED', allowFork: false } });
  const longTitle = await project(
    'Hộp quà cưới phiên bản giới hạn có tên rất dài để kiểm tra chữ bị cắt trên thẻ dự án và trong tiêu đề trang',
    'sleeve-drawer', box(160, 110, 45), { occasion: 'WEDDING', collectionId: folder.id },
  );
  const inFolder = await project('Hộp gối trang sức', 'pillow', box(80, 50, 25), { industry: 'JEWELRY', collectionId: folder.id });
  const archived = await project('Hộp bánh trung thu (lưu trữ)', 'lid-base', box(180, 180, 60), { industry: 'BAKERY' });
  await admin.request(`/projects/${archived.id}/status`, { method: 'PATCH', json: { status: 'ARCHIVED' } });
  const trashed = await project('Hộp mỹ phẩm (thùng rác)', 'tuck-top', box(50, 50, 150), { industry: 'COSMETICS' });
  await admin.request(`/projects/${trashed.id}/status`, { method: 'PATCH', json: { status: 'DELETED' } });
  const oldFormula = await project('Hộp công thức cũ', 'tuck-top', box(120, 80, 60), { industry: 'TEA_AGRI' });
  await pinFormulaVersion(oldFormula.id, 1);

  // A new MAKER with no data: sign up, then follow the link of the verification email.
  const makerPassword = `Ui${crypto.randomBytes(9).toString('base64url')}7`;
  const before = new Date(Date.now() - 2000);
  const guest = new AppSession(baseUrl);
  await guest.request('/auth/register', { method: 'POST', json: { email: MAKER_EMAIL, password: makerPassword, fullName: 'Nguyễn Thị Thử Nghiệm' } });
  await guest.request('/auth/verify-email', { method: 'POST', json: { token: await verificationToken(MAKER_EMAIL, before) } });
  await new AppSession(baseUrl).signIn(MAKER_EMAIL, makerPassword);

  const fixtures = {
    createdAt: new Date().toISOString(),
    admin: { email: adminEmail },
    maker: { email: MAKER_EMAIL, password: makerPassword },
    folderId: folder.id,
    projects: {
      public: { id: publicProject.id, slug: publicProject.slug },
      unlisted: { id: unlisted.id, slug: unlisted.slug },
      longTitle: { id: longTitle.id, slug: longTitle.slug },
      inFolder: { id: inFolder.id, slug: inFolder.slug },
      archived: { id: archived.id },
      trashed: { id: trashed.id },
      oldFormula: { id: oldFormula.id },
    },
    unboxSlug: unboxing.slug,
  };
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
  fs.writeFileSync(FIXTURES_FILE, JSON.stringify(fixtures, null, 2));
  console.log(`Created 7 projects, 1 folder, 1 unboxing, MAKER ${MAKER_EMAIL}. Ids and slugs in ${FIXTURES_FILE}`);
}

await clean(); // also the records of an earlier or interrupted run
if (!cleanOnly) await create();
