import { LedgerEntryType, Prisma } from '@prisma/client';

/**
 * Entries of the print-order ledger (docs/19 A.8), written in the transaction that moves the order, so the money and
 * the status never disagree. `ledger_entries` is append-only (trigger) and `key` is unique: a step that runs twice
 * (a webhook resent, a retried request) posts nothing the second time.
 */
type LedgerOrder = Pick<
  Prisma.OrderGetPayload<object>,
  'id' | 'printShopId' | 'totalVnd' | 'platformFeeVnd' | 'shopPayableVnd' | 'paymentId'
>;

const entry = (order: LedgerOrder, type: LedgerEntryType, amountVnd: number, extra: Partial<Prisma.LedgerEntryCreateManyInput> = {}) => ({
  key: `order:${order.id}:${type}`,
  type,
  amountVnd,
  orderId: order.id,
  printShopId: order.printShopId,
  ...extra,
});

/** The customer paid: WrapFit now holds the total for the shop and itself. */
export async function postOrderPaid(tx: Prisma.TransactionClient, order: LedgerOrder, paymentId: string): Promise<void> {
  if (order.totalVnd <= 0) return;
  await tx.ledgerEntry.createMany({
    data: [entry(order, LedgerEntryType.CUSTOMER_PAYMENT, order.totalVnd, { paymentId })],
    skipDuplicates: true,
  });
}

/**
 * The boxes were delivered: the platform fee becomes WrapFit's revenue and the rest is owed to the shop. Phase 1 posts
 * them on delivery; the claim window of docs/19 BR-A11 (posting on COMPLETED) comes with the production orders.
 */
export async function postOrderDelivered(tx: Prisma.TransactionClient, order: LedgerOrder): Promise<void> {
  const data = [
    ...(order.platformFeeVnd > 0 ? [entry(order, LedgerEntryType.PLATFORM_FEE, order.platformFeeVnd)] : []),
    ...(order.shopPayableVnd > 0 ? [entry(order, LedgerEntryType.SHOP_PAYABLE, order.shopPayableVnd)] : []),
  ];
  if (data.length) await tx.ledgerEntry.createMany({ data, skipDuplicates: true });
}
