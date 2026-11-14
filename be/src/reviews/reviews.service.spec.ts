import type { PrismaService } from '../shared/prisma';
import { approvalOf, MAX_COMMENTS_PER_PROJECT, ReviewsService } from './reviews.service';

const TOKEN = 'abcdefghijklmnopqrstuvwx';
const at = new Date('2026-11-15T08:00:00Z');

describe('ReviewsService (docs/23 S23)', () => {
  let prisma: {
    packagingProject: { findUniqueOrThrow: jest.Mock };
    projectReview: { findUnique: jest.Mock; upsert: jest.Mock; updateMany: jest.Mock; update: jest.Mock };
    designComment: { findMany: jest.Mock; create: jest.Mock; count: jest.Mock; findFirst: jest.Mock; update: jest.Mock; delete: jest.Mock };
    user: { findUniqueOrThrow: jest.Mock };
  };
  let service: ReviewsService;
  const project = {
    id: 'p1',
    title: 'Hộp nến',
    status: 'DRAFT',
    templateId: 'tuck-top',
    formulaVersion: 3,
    version: 7,
    dimensions: { length: 90, width: 90, height: 110, paperThickness: 0.42 },
    materialSpec: { type: 'ivory' },
    canvasState: { elements: [] },
  };
  const review = { id: 'r1', projectId: 'p1', token: TOKEN, approvedAt: null, approvedBy: null, approvedVersion: null, project };

  beforeEach(() => {
    prisma = {
      packagingProject: { findUniqueOrThrow: jest.fn().mockResolvedValue({ version: 7 }) },
      projectReview: {
        findUnique: jest.fn().mockResolvedValue(review),
        upsert: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn(async ({ data }) => ({ ...review, ...data })),
      },
      designComment: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(async ({ data }) => ({ id: 'c1', createdAt: at, resolvedAt: null, authorUserId: null, panelId: null, x: null, y: null, ...data })),
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue({ id: 'c1' }),
        update: jest.fn(async ({ data }) => ({ id: 'c1', projectId: 'p1', authorUserId: null, authorName: 'An', body: 'x', panelId: null, x: null, y: null, createdAt: at, ...data })),
        delete: jest.fn(),
      },
      user: { findUniqueOrThrow: jest.fn().mockResolvedValue({ shopName: 'Tiệm Nến Mây', fullName: 'Lan' }) },
    };
    service = new ReviewsService(prisma as unknown as PrismaService);
  });

  it('approval is current only for the version that was approved', () => {
    expect(approvalOf(null, 7)).toBeNull();
    expect(approvalOf({ approvedAt: at, approvedBy: 'Xưởng in Minh', approvedVersion: 7 }, 7)).toMatchObject({ current: true });
    expect(approvalOf({ approvedAt: at, approvedBy: 'Xưởng in Minh', approvedVersion: 6 }, 7)).toMatchObject({ current: false, approvedVersion: 6 });
  });

  it('creates or replaces the link with a fresh 24-character token, and turns it off', async () => {
    await service.openLink('p1');
    const { create, update } = prisma.projectReview.upsert.mock.calls[0][0];
    expect(create.token).toMatch(/^[A-Za-z0-9_-]{24}$/);
    expect(update.token).toBe(create.token);
    await service.closeLink('p1');
    expect(prisma.projectReview.updateMany).toHaveBeenCalledWith({ where: { projectId: 'p1' }, data: { token: null } });
  });

  it('shows the reviewer the saved design, never a closed, malformed or trashed link', async () => {
    const view = await service.publicView(TOKEN);
    expect(view).toMatchObject({ title: 'Hộp nến', structure: 'tuck-top', version: 7, approval: null, comments: [] });
    await expect(service.publicView('short')).rejects.toMatchObject({ status: 404 });
    prisma.projectReview.findUnique.mockResolvedValueOnce(null);
    await expect(service.publicView(TOKEN)).rejects.toMatchObject({ status: 404 });
    prisma.projectReview.findUnique.mockResolvedValueOnce({ ...review, project: { ...project, status: 'DELETED' } });
    await expect(service.publicView(TOKEN)).rejects.toMatchObject({ status: 404 });
  });

  it('takes a guest comment with a name, pinned only when the point is complete', async () => {
    const pinned = await service.addGuestComment(TOKEN, { authorName: 'Chị Hoa', body: 'Logo to hơn chút', panelId: 'panel_front', x: 20, y: 30 });
    expect(pinned).toMatchObject({ authorName: 'Chị Hoa', byOwner: false, panelId: 'panel_front', x: 20, y: 30, resolved: false });
    await service.addGuestComment(TOKEN, { authorName: 'Chị Hoa', body: 'Màu nền?', panelId: 'panel_front', x: 20 });
    expect(prisma.designComment.create.mock.calls[1][0].data).toMatchObject({ panelId: 'panel_front', x: null, y: null });
    prisma.designComment.count.mockResolvedValueOnce(MAX_COMMENTS_PER_PROJECT);
    await expect(service.addGuestComment(TOKEN, { authorName: 'Spam', body: 'x' })).rejects.toMatchObject({ status: 400 });
  });

  it('signs the owner comments with the shop name', async () => {
    const comment = await service.addOwnerComment('p1', 'u1', { body: 'Đã sửa' });
    expect(prisma.designComment.create.mock.calls[0][0].data).toMatchObject({ authorUserId: 'u1', authorName: 'Tiệm Nến Mây' });
    expect(comment.byOwner).toBe(true);
  });

  it('approves the version the reviewer saw, and refuses one that changed meanwhile', async () => {
    const approval = await service.approve(TOKEN, { name: 'Xưởng in Minh', version: 7 });
    expect(approval).toMatchObject({ approvedBy: 'Xưởng in Minh', approvedVersion: 7, current: true });
    await expect(service.approve(TOKEN, { name: 'Xưởng in Minh', version: 6 })).rejects.toMatchObject({ status: 409 });
  });

  it('resolves and deletes only comments of the project', async () => {
    expect(await service.resolve('p1', 'c1', true)).toMatchObject({ resolved: true });
    prisma.designComment.findFirst.mockResolvedValueOnce(null);
    await expect(service.removeComment('p1', 'other')).rejects.toMatchObject({ status: 404 });
    expect(prisma.designComment.delete).not.toHaveBeenCalled();
  });
});
