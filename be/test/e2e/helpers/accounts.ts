import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../../src/shared/prisma';

export const TEST_PASSWORD = 'Passw0rd123';

/** `wf_access=...` pair of a Set-Cookie header, ready for a `Cookie` request header. */
export const accessCookie = (setCookie: string[]) =>
  setCookie.find((line) => line.startsWith('wf_access='))!.split(';')[0];

/**
 * A signed-in account for tests: registers, marks the email verified directly in the database (the emailed link
 * itself is covered by auth.e2e-spec.ts), then signs in with the password.
 */
export async function signUp(
  app: INestApplication,
  email: string,
  fullName?: string,
): Promise<{ id: string; cookie: string; setCookie: string[] }> {
  const api = () => request(app.getHttpServer());
  await api().post('/api/auth/register').send({ email, password: TEST_PASSWORD, fullName }).expect(201);
  const { id } = await app.get(PrismaService).user.update({ where: { email }, data: { emailVerifiedAt: new Date() } });

  const login = await api().post('/api/auth/login').send({ email, password: TEST_PASSWORD }).expect(200);
  const setCookie = login.headers['set-cookie'] as unknown as string[];
  return { id, cookie: accessCookie(setCookie), setCookie };
}

/**
 * Uploads a small PNG like the browser does (pre-signed PUT to the local SeaweedFS) and returns its public URL, the
 * value a client puts in `thumbnailUrl`, `avatarUrl`, `logoUrl` or a canvas element.
 */
export function uploadPng(
  app: INestApplication,
  cookie: string,
  purpose: 'LOGO' | 'IMAGE' | 'THUMBNAIL' | 'AVATAR',
  projectId?: string,
): Promise<string> {
  return upload(app, cookie, purpose, 'image/png', projectId);
}

/**
 * Uploads a font file the same way: the value of `style.fontUrl` or of a `customFonts` entry. The bytes are not a real
 * font (saving a canvas does not open the file; POST /storage/fonts/inspect would refuse it).
 */
export function uploadFont(app: INestApplication, cookie: string): Promise<string> {
  return upload(app, cookie, 'FONT', 'font/ttf');
}

async function upload(
  app: INestApplication,
  cookie: string,
  purpose: 'LOGO' | 'IMAGE' | 'THUMBNAIL' | 'AVATAR' | 'FONT',
  contentType: string,
  projectId?: string,
): Promise<string> {
  const size = 64;
  const ticket = (
    await request(app.getHttpServer())
      .post('/api/storage/presigned-upload')
      .set('Cookie', cookie)
      .send({ purpose, contentType, size, projectId })
      .expect(200)
  ).body as { uploadUrl: string; headers: Record<string, string>; fileUrl: string };
  // Cast: the DOM `BodyInit` typing does not accept Node's typed arrays, although fetch does.
  const body = new Uint8Array(size).fill(7) as unknown as RequestInit['body'];
  const put = await fetch(ticket.uploadUrl, { method: 'PUT', headers: ticket.headers, body });
  if (!put.ok) throw new Error(`Upload failed: ${put.status}`);
  return ticket.fileUrl;
}
