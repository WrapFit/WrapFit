import { OrderStatus, Role } from '@prisma/client';

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
