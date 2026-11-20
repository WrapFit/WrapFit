import { OrderStatus, Prisma, Role } from '@prisma/client';

/**
 * Lifecycle of a sample print order. An order is placed as PENDING_PAYMENT; the payment (S5, or an admin by hand)
 * moves it to PAID; the print shop then prints, ships and delivers it. It can be cancelled only before printing.
 */
export const ORDER_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  PENDING_PAYMENT: [OrderStatus.PAID, OrderStatus.CANCELLED],
  PAID: [OrderStatus.IN_PRODUCTION, OrderStatus.CANCELLED],
  IN_PRODUCTION: [OrderStatus.SHIPPED],
  SHIPPED: [OrderStatus.DELIVERED],
  DELIVERED: [],
  CANCELLED: [],
};

/** Steps a print shop account may take on its own orders: the production steps. Payment and cancelling stay with ADMIN. */
const PRINT_SHOP_TARGETS: readonly OrderStatus[] = [OrderStatus.IN_PRODUCTION, OrderStatus.SHIPPED, OrderStatus.DELIVERED];

export const canTransition = (from: OrderStatus, to: OrderStatus): boolean => ORDER_TRANSITIONS[from].includes(to);

export const roleMaySet = (role: Role, to: OrderStatus): boolean =>
  role === Role.ADMIN || (role === Role.PRINT_SHOP && PRINT_SHOP_TARGETS.includes(to));

/** Timestamp column written when an order enters a status. */
export const STATUS_TIMESTAMP: Partial<Record<OrderStatus, 'paidAt' | 'shippedAt' | 'deliveredAt' | 'cancelledAt'>> = {
  PAID: 'paidAt',
  SHIPPED: 'shippedAt',
  DELIVERED: 'deliveredAt',
  CANCELLED: 'cancelledAt',
};

/**
 * Orders that still need the design of their project (docs-old/30 item 4, Q2): waiting for payment, paid, in production.
 * A project such an order holds cannot be deleted permanently, by hand or by the trash purge: the print shop would
 * lose the design and its print files, and a pending order could still be paid (`markPaid` does not look at the
 * project). Once the order is shipped, delivered or cancelled the project may go.
 */
export const ORDER_STATUSES_HOLDING_DESIGN: readonly OrderStatus[] = [
  OrderStatus.PENDING_PAYMENT,
  OrderStatus.PAID,
  OrderStatus.IN_PRODUCTION,
];

/** SQL condition: no order in ORDER_STATUSES_HOLDING_DESIGN holds the project whose id is `projectId` (a column). */
export const noOrderHoldsDesign = (projectId: Prisma.Sql): Prisma.Sql => Prisma.sql`NOT EXISTS (
  SELECT 1 FROM order_items i JOIN orders o ON o.id = i.order_id
  WHERE i.project_id = ${projectId} AND o.status::text = ANY(${[...ORDER_STATUSES_HOLDING_DESIGN]}::text[]))`;
