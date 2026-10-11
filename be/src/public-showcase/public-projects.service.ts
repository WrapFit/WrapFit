import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import type { Redis } from 'ioredis';
import { PROJECT_FORKED, ProjectForkedEvent } from '../common';
import { PrismaService } from '../shared/prisma';
import { isFirstView, REDIS, Viewer } from '../shared/redis';
import { ProjectsService } from '../projects';
import type { ProjectDetail } from '../projects';
import { assetUrl, toClientCanvas } from '../storage';
import { authorSelect, presentAuthor } from '../users';

const publicSelect = {
  id: true,
  userId: true,
  status: true,
  visibility: true,
  allowFork: true,
  slug: true,
  title: true,
  template: { select: { id: true, name: true } },
  dimensions: true,
  materialSpec: true,
  canvasState: true,
  thumbnailKey: true,
  tags: true,
  occasion: true,
  industry: true,
  viewsCount: true,
  likesCount: true,
  createdAt: true,
  updatedAt: true,
  user: { select: authorSelect },
  forkedFrom: {
    select: { slug: true, title: true, status: true, visibility: true, user: { select: authorSelect } },
  },
} satisfies Prisma.PackagingProjectSelect;

type PublicRow = Prisma.PackagingProjectGetPayload<{ select: typeof publicSelect }>;

/** Shared projects are visible through their slug unless they are PRIVATE or in the trash. */
const isShared = (project: { status: string; visibility: string }) =>
  project.status !== 'DELETED' && project.visibility !== 'PRIVATE';

export interface LikeState {
  liked: boolean;
  likesCount: number;
}

/**
 * Public page `/p/<slug>` (UC-09, UC-10 embed), remix (UC-11) and likes. PUBLIC and UNLISTED projects are
 * reachable by slug; everything else answers 404 so private slugs cannot be probed.
 */
@Injectable()
export class PublicProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
    private readonly events: EventEmitter2,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  /**
   * Read-only view. Counts a view unless the owner looks at their own project, once per viewer every
   * VIEW_DEDUP_SECONDS (the count orders the community hub). `countView: false` only reads: the frontend server
   * renders the page without the visitor's cookie, so the browser's own request is the one that counts.
   */
  async view(slug: string, viewerId?: string, client: Omit<Viewer, 'userId'> = {}, countView = true) {
    const project = await this.findShared(slug);
    const isOwner = project.userId === viewerId;
    const counts = countView && !isOwner && (await isFirstView(this.redis, `project:${project.id}`, { ...client, userId: viewerId }));

    const [viewsCount, liked] = await Promise.all([
      counts ? this.incrementViews(project.id) : project.viewsCount,
      viewerId ? this.hasLiked(viewerId, project.id) : false,
    ]);

    // An UNLISTED source must not leak its secret link through its remixes.
    const source = project.forkedFrom && isShared(project.forkedFrom) && project.forkedFrom.visibility === 'PUBLIC'
      ? { slug: project.forkedFrom.slug, title: project.forkedFrom.title, author: presentAuthor(project.forkedFrom.user) }
      : null;

    return {
      slug: project.slug,
      title: project.title,
      visibility: project.visibility,
      allowFork: project.allowFork,
      template: project.template,
      dimensions: project.dimensions,
      materialSpec: project.materialSpec,
      canvasState: toClientCanvas(project.canvasState as never),
      thumbnailUrl: assetUrl(project.thumbnailKey),
      tags: project.tags,
      occasion: project.occasion,
      industry: project.industry,
      viewsCount,
      likesCount: project.likesCount,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      author: presentAuthor(project.user),
      forkedFrom: source,
      viewer: { isOwner, liked },
    };
  }

  /** 1-Click Remix: copies the design into the caller's workspace and notifies the author. */
  async fork(slug: string, userId: string): Promise<ProjectDetail> {
    const source = await this.findShared(slug);
    if (!source.allowFork && source.userId !== userId) {
      throw new ForbiddenException('The author does not allow remixing this design');
    }

    const fork = await this.projects.fork(source.id, userId);
    if (source.userId !== userId) {
      const event: ProjectForkedEvent = {
        sourceProjectId: source.id,
        sourceOwnerId: source.userId,
        forkProjectId: fork.id,
        forkedById: userId,
      };
      this.events.emit(PROJECT_FORKED, event);
    }
    return fork;
  }

  /** Idempotent: liking twice keeps one like (`@@unique([userId, projectId])`). */
  async like(slug: string, userId: string): Promise<LikeState> {
    const project = await this.findShared(slug);
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.projectLike.createMany({
        data: [{ userId, projectId: project.id }],
        skipDuplicates: true,
      });
      const likesCount = count ? await this.addLikes(tx, project.id, 1) : await this.likesOf(tx, project.id);
      return { liked: true, likesCount };
    });
  }

  /** Idempotent as well. */
  async unlike(slug: string, userId: string): Promise<LikeState> {
    const project = await this.findShared(slug);
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.projectLike.deleteMany({ where: { userId, projectId: project.id } });
      const likesCount = count ? await this.addLikes(tx, project.id, -1) : await this.likesOf(tx, project.id);
      return { liked: false, likesCount };
    });
  }

  private async findShared(slug: string): Promise<PublicRow> {
    const project = await this.prisma.packagingProject.findUnique({ where: { slug }, select: publicSelect });
    if (!project || !isShared(project)) throw new NotFoundException('Project not found');
    return project;
  }

  private async hasLiked(userId: string, projectId: string): Promise<boolean> {
    const like = await this.prisma.projectLike.findUnique({
      where: { userId_projectId: { userId, projectId } },
      select: { id: true },
    });
    return like !== null;
  }

  // Counters are updated with raw SQL: a Prisma `update` would also bump `updated_at` (@updatedAt), which would
  // reorder the owner's dashboard every time someone views or likes the project.
  private async incrementViews(projectId: string): Promise<number> {
    const [row] = await this.prisma.$queryRaw<{ views_count: number }[]>`
      UPDATE packaging_projects SET views_count = views_count + 1
      WHERE id = ${projectId}::uuid RETURNING views_count`;
    return row.views_count;
  }

  private async addLikes(tx: Prisma.TransactionClient, projectId: string, delta: 1 | -1): Promise<number> {
    const [row] = await tx.$queryRaw<{ likes_count: number }[]>`
      UPDATE packaging_projects SET likes_count = GREATEST(likes_count + ${delta}, 0)
      WHERE id = ${projectId}::uuid RETURNING likes_count`;
    return row.likes_count;
  }

  private async likesOf(tx: Prisma.TransactionClient, projectId: string): Promise<number> {
    const row = await tx.packagingProject.findUniqueOrThrow({ where: { id: projectId }, select: { likesCount: true } });
    return row.likesCount;
  }
}
