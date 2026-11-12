import { PrismaService } from '../../../src/shared/prisma';

/**
 * A paid print order holding the current version of the design: what unlocks its print file (the cart flow).
 * Returns the order id; orders do not go with their user, so delete them in afterAll.
 */
export const createPaidOrder = async (prisma: PrismaService, userId: string, projectId: string, run: number): Promise<string> => {
  const stored = await prisma.packagingProject.findUniqueOrThrow({ where: { id: projectId } });
  // WF-<4 digits>-<4 digits> (CHECK): a year far ahead and random digits keep it apart from real orders.
  const code = `WF-9${String(run % 1000).padStart(3, '0')}-${String(Math.floor(Math.random() * 10_000)).padStart(4, '0')}`;
  const order = await prisma.order.create({
    data: {
      orderCode: code,
      userId,
      printShopId: 'ps-sg-01',
      recipientName: 'E2E',
      recipientPhone: '0900000000',
      shippingAddress: 'E2E',
      subtotalVnd: 49_000,
      totalVnd: 49_000,
      status: 'PAID',
      paidAt: new Date(),
      items: {
        create: {
          projectId,
          projectVersion: stored.version,
          projectTitle: stored.title,
          structure: stored.templateId,
          dimensions: stored.dimensions as never,
          paperStock: 'ivory-300',
          quantity: 1,
          unitPriceVnd: 49_000,
          lineTotalVnd: 49_000,
        },
      },
    },
    select: { id: true },
  });
  return order.id;
};
