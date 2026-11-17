import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { DesignComment, ProjectReview } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../shared/prisma';
import { toClientCanvas } from '../storage';
import type { ApproveDto, CreateCommentDto, GuestCommentDto } from './dto/review.dto';

/**
 * A design holds at most this many comments through its review link (a guest cannot flood it), and as many of the
 * owner's own comments (counted apart: reviewers never use up the owner's room to answer).
 */
export const MAX_COMMENTS_PER_PROJECT = 500;
/** Both shares: every comment a design can hold is shown. */
const MAX_COMMENTS_SHOWN = 2 * MAX_COMMENTS_PER_PROJECT;
/** Review tokens: 24 URL-safe characters (144 random bits). */
const TOKEN = /^[A-Za-z0-9_-]{24}$/;

export interface CommentView {
  id: string;
  authorName: string;
  /** Written by the owner in the studio (not through the link). */
  byOwner: boolean;
  body: string;
  panelId: string | null;
  x: number | null;
  y: number | null;
  resolved: boolean;
  createdAt: Date;
}

export interface ApprovalView {
  approvedAt: Date;
  approvedBy: string;
  approvedVersion: number;
  /** The approved version is the current one: "Đã duyệt in". False: the design changed after it was approved. */
  current: boolean;
}

export interface ReviewState {
  token: string | null;
  approval: ApprovalView | null;
  comments: CommentView[];
}

const newToken = () => randomBytes(18).toString('base64url');

const toComment = (c: DesignComment): CommentView => ({
  id: c.id,
  authorName: c.authorName,
  byOwner: c.authorUserId !== null,
  body: c.body,
  panelId: c.panelId,
  x: c.x,
  y: c.y,
  resolved: c.resolvedAt !== null,
  createdAt: c.createdAt,
});

export const approvalOf = (review: Pick<ProjectReview, 'approvedAt' | 'approvedBy' | 'approvedVersion'> | null, version: number): ApprovalView | null =>
  review?.approvedAt && review.approvedBy && review.approvedVersion !== null
    ? { approvedAt: review.approvedAt, approvedBy: review.approvedBy, approvedVersion: review.approvedVersion, current: review.approvedVersion === version }
    : null;

/**
 * Design review (docs/23 S23): a secret link the owner sends to a customer or a print shop, who comment on the design
 * and approve it for print without an account; the owner reads and resolves the comments in the studio.
 */
@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- owner (behind ProjectOwnerGuard)

  async state(projectId: string): Promise<ReviewState> {
    const [project, review, comments] = await Promise.all([
      this.prisma.packagingProject.findUniqueOrThrow({ where: { id: projectId }, select: { version: true } }),
      this.prisma.projectReview.findUnique({ where: { projectId } }),
      this.prisma.designComment.findMany({ where: { projectId }, orderBy: { createdAt: 'asc' }, take: MAX_COMMENTS_SHOWN }),
    ]);
    return { token: review?.token ?? null, approval: approvalOf(review, project.version), comments: comments.map(toComment) };
  }

  /** Creates the link, or replaces it with a new one (the old link stops working; the approval is kept). */
  async openLink(projectId: string): Promise<ReviewState> {
    const token = newToken();
    await this.prisma.projectReview.upsert({ where: { projectId }, create: { projectId, token }, update: { token } });
    return this.state(projectId);
  }

  /** Turns the link off: nobody can open it any more. */
  async closeLink(projectId: string): Promise<ReviewState> {
    await this.prisma.projectReview.updateMany({ where: { projectId }, data: { token: null } });
    return this.state(projectId);
  }

  async addOwnerComment(projectId: string, userId: string, dto: CreateCommentDto): Promise<CommentView> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { shopName: true, fullName: true } });
    await this.assertRoom(projectId, true);
    const comment = await this.prisma.designComment.create({
      data: { projectId, authorUserId: userId, authorName: user.shopName || user.fullName || 'Chủ thiết kế', ...this.place(dto) },
    });
    return toComment(comment);
  }

  async resolve(projectId: string, commentId: string, resolved: boolean): Promise<CommentView> {
    await this.ownComment(projectId, commentId);
    const comment = await this.prisma.designComment.update({ where: { id: commentId }, data: { resolvedAt: resolved ? new Date() : null } });
    return toComment(comment);
  }

  async removeComment(projectId: string, commentId: string): Promise<void> {
    await this.ownComment(projectId, commentId);
    await this.prisma.designComment.delete({ where: { id: commentId } });
  }

  // ---- reviewer (public, by token)

  /** What the review page shows: the design as saved, the comments and the approval. 404 for an unknown or closed link. */
  async publicView(token: string) {
    const { project, review } = await this.byToken(token);
    const comments = await this.prisma.designComment.findMany({ where: { projectId: project.id }, orderBy: { createdAt: 'asc' }, take: MAX_COMMENTS_SHOWN });
    return {
      title: project.title,
      structure: project.templateId,
      formulaVersion: project.formulaVersion,
      version: project.version,
      dimensions: project.dimensions,
      materialSpec: project.materialSpec,
      canvasState: toClientCanvas(project.canvasState as never),
      approval: approvalOf(review, project.version),
      comments: comments.map(toComment),
    };
  }

  async addGuestComment(token: string, dto: GuestCommentDto): Promise<CommentView> {
    const { project } = await this.byToken(token);
    await this.assertRoom(project.id, false);
    const comment = await this.prisma.designComment.create({ data: { projectId: project.id, authorName: dto.authorName, ...this.place(dto) } });
    return toComment(comment);
  }

  /** "Duyệt in": approves the version the reviewer saw; 409 when the design was saved again meanwhile. */
  async approve(token: string, dto: ApproveDto): Promise<ApprovalView> {
    const { project, review } = await this.byToken(token);
    if (dto.version !== project.version) {
      throw new ConflictException({ code: 'DESIGN_CHANGED', message: 'Thiết kế vừa được sửa, hãy tải lại trang và xem bản mới trước khi duyệt' });
    }
    const updated = await this.prisma.projectReview.update({
      where: { id: review.id },
      data: { approvedAt: new Date(), approvedBy: dto.name, approvedVersion: project.version },
    });
    return approvalOf(updated, project.version)!;
  }

  // ---- helpers

  private place(dto: CreateCommentDto) {
    const pinned = dto.panelId !== undefined && dto.x !== undefined && dto.y !== undefined;
    return { body: dto.body, panelId: dto.panelId ?? null, x: pinned ? dto.x! : null, y: pinned ? dto.y! : null };
  }

  /**
   * Comments through the link and the owner's own comments are capped apart, so reviewers who fill their share never
   * stop the owner from answering them.
   * shortcut: count, then write (no lock): requests at the same moment can each pass the check and go a few rows over
   * the cap. Fine for a bound against flooding; take an advisory lock per project if the cap must be exact.
   */
  private async assertRoom(projectId: string, byOwner: boolean) {
    const where = { projectId, authorUserId: byOwner ? { not: null } : null };
    if ((await this.prisma.designComment.count({ where })) >= MAX_COMMENTS_PER_PROJECT) {
      throw new BadRequestException({ code: 'TOO_MANY_COMMENTS', message: 'Thiết kế đã có quá nhiều góp ý, hãy xóa bớt góp ý đã xử lý' });
    }
  }

  private async ownComment(projectId: string, commentId: string) {
    const comment = await this.prisma.designComment.findFirst({ where: { id: commentId, projectId }, select: { id: true } });
    if (!comment) throw new NotFoundException('Comment not found');
  }

  private async byToken(token: string) {
    const review = TOKEN.test(token)
      ? await this.prisma.projectReview.findUnique({
          where: { token },
          include: {
            project: {
              select: {
                id: true,
                title: true,
                status: true,
                templateId: true,
                formulaVersion: true,
                version: true,
                dimensions: true,
                materialSpec: true,
                canvasState: true,
              },
            },
          },
        })
      : null;
    if (!review || review.project.status === 'DELETED') throw new NotFoundException('Review link not found');
    return { review, project: review.project };
  }
}
