import { Injectable, Logger } from '@nestjs/common';
import { Prisma, ProductEventType } from '@prisma/client';
import { PrismaService } from '../shared/prisma';

/** Two heartbeats of the same project closer than this count once (two open tabs, a retried request). */
export const STUDIO_HEARTBEAT_MIN_GAP_MS = 50_000;

export interface ProductEventInput {
  userId: string | null;
  projectId: string | null;
  payload?: Prisma.InputJsonObject;
}

/**
 * Writes the product events behind the analytics dashboard (docs/17 S7). Recording never fails the action that
 * caused it: a lost event is better than a refused export or a project that was not created.
 */
@Injectable()
export class ProductEventsService {
  private readonly logger = new Logger(ProductEventsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(type: ProductEventType, event: ProductEventInput): Promise<void> {
    try {
      await this.prisma.productEvent.create({
        data: { type, userId: event.userId, projectId: event.projectId, payload: event.payload ?? {} },
      });
    } catch (error) {
      this.logger.warn(`Could not record ${type}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /** STUDIO_ACTIVE heartbeat; false when one of the same project and user arrived less than 50 s ago. */
  async recordStudioActivity(userId: string, projectId: string, seconds: number): Promise<boolean> {
    const recent = await this.prisma.productEvent.findFirst({
      where: {
        projectId,
        userId,
        type: 'STUDIO_ACTIVE',
        createdAt: { gt: new Date(Date.now() - STUDIO_HEARTBEAT_MIN_GAP_MS) },
      },
      select: { id: true },
    });
    if (recent) return false;
    await this.record('STUDIO_ACTIVE', { userId, projectId, payload: { seconds } });
    return true;
  }
}
