/**
 * Plan, xu wallet, export credits, payments and export access of the offline demo. Payments are VietQR on a sample
 * account and are confirmed by the "Giả lập đã thanh toán" button (PAYMENT_SIMULATION), which grants what was bought.
 */

import QRCode from "qrcode";
import {
  customXuError,
  customXuPriceVnd,
  ENTITLEMENTS,
  EXPORT_PACKS,
  exportLotExpiresAt,
  isExportPackId,
  isXuPackId,
  PAYMENT_TERMS_VERSION,
  PRO_MONTH,
  proPeriodEnd,
  XU_PACKS,
  xuAllowancePeriod,
} from "@wrapfit/shared";
import type { BillingSummary, Payment, PaymentPurpose, SubscriptionTier, XuHistoryEntry, XuReport } from "@/types/api";
import { badRequest, conflict, currentUser, cursorPage, MockHttpError, notFound, requireAdmin, type Handler } from "../http";
import { db, newId, nowIso, save, type MockLot, type MockPayment, type MockUser } from "../store";
import { ownProject } from "./projects";

const PAYMENT_MINUTES = 15;
const SAMPLE_BANK = { bankBin: "970422", bankName: "MB Bank", accountNo: "0000000000", accountName: "WRAPFIT DEMO" };

// ---------------------------------------------------------------- plan and wallets

const isLive = (lot: MockLot, now = Date.now()) => lot.remaining > 0 && (!lot.expiresAt || new Date(lot.expiresAt).getTime() > now);

function activeSubscription(user: MockUser) {
  const now = Date.now();
  return db()
    .subscriptions.filter((s) => s.userId === user.id && new Date(s.currentPeriodStart).getTime() <= now && now < new Date(s.currentPeriodEnd).getTime())
    .sort((a, b) => b.currentPeriodEnd.localeCompare(a.currentPeriodEnd))[0];
}

/** Plan in use, like `resolvePlan` of the API; a paid tier set by hand (seed, admin) stays without a subscription. */
export function tierOf(user: MockUser): SubscriptionTier {
  const subscription = activeSubscription(user);
  if (subscription) return subscription.plan;
  const anySubscription = db().subscriptions.some((s) => s.userId === user.id);
  if (!anySubscription && (user.subscriptionTier === "STARTER" || user.subscriptionTier === "PRO_BUSINESS")) return user.subscriptionTier;
  const boughtExports = db().lots.some((l) => l.userId === user.id && l.kind === "EXPORT" && l.source === "PURCHASE" && isLive(l));
  return boughtExports ? "PAY_PER_EXPORT" : "FREE";
}

/** The allowance of the period is granted when the wallet is read, like the API. */
function ensureAllowance(user: MockUser) {
  const tier = tierOf(user);
  user.subscriptionTier = tier;
  const subscription = activeSubscription(user);
  const period = xuAllowancePeriod(
    tier,
    subscription ? { id: subscription.id, currentPeriodStart: new Date(subscription.currentPeriodStart), currentPeriodEnd: new Date(subscription.currentPeriodEnd) } : null,
  );
  if (!db().lots.some((l) => l.userId === user.id && l.periodKey === period.periodKey)) {
    db().lots.push({
      id: newId(),
      userId: user.id,
      kind: "XU",
      source: "PLAN_ALLOWANCE",
      quantity: period.quantity,
      remaining: period.quantity,
      expiresAt: period.expiresAt.toISOString(),
      createdAt: period.startsAt.toISOString(),
      periodKey: period.periodKey,
    });
  }
  return { tier, subscription, period };
}

const liveLots = (user: MockUser, kind: MockLot["kind"]) =>
  db()
    .lots.filter((l) => l.userId === user.id && l.kind === kind && isLive(l))
    .sort((a, b) => (a.expiresAt ?? "9").localeCompare(b.expiresAt ?? "9"));

const balanceOf = (user: MockUser, kind: MockLot["kind"]) => liveLots(user, kind).reduce((sum, lot) => sum + lot.remaining, 0);

const lotView = ({ userId, kind, periodKey, ...lot }: MockLot) => {
  void userId;
  void kind;
  void periodKey;
  return lot;
};

export function xuWallet(user: MockUser) {
  const { period } = ensureAllowance(user);
  return {
    balance: balanceOf(user, "XU"),
    lots: liveLots(user, "XU").map(lotView),
    allowance: { perPeriod: period.quantity, periodKey: period.periodKey, resetsAt: period.endsAt.toISOString() },
  };
}

/** Spends xu from the lots that expire first; 402 INSUFFICIENT_CREDITS (kind XU) when short. */
export function spendXu(user: MockUser, cost: number, reason: NonNullable<XuHistoryEntry["reason"]>, refId: string | null): number {
  ensureAllowance(user);
  const balance = balanceOf(user, "XU");
  if (cost > balance) {
    throw new MockHttpError(402, "Không đủ xu.", { code: "INSUFFICIENT_CREDITS", kind: "XU", balance, cost });
  }
  let left = cost;
  for (const lot of liveLots(user, "XU")) {
    const take = Math.min(lot.remaining, left);
    lot.remaining -= take;
    left -= take;
    if (left === 0) break;
  }
  if (cost > 0) db().spends.push({ id: newId(), userId: user.id, quantity: cost, reason, refId, refundedAt: null, createdAt: nowIso() });
  return balance - cost;
}

function grantLot(userId: string, kind: MockLot["kind"], source: MockLot["source"], quantity: number, expiresAt: string | null) {
  db().lots.push({ id: newId(), userId, kind, source, quantity, remaining: quantity, expiresAt, createdAt: nowIso() });
}

const billingMe: Handler = (): BillingSummary => {
  const user = currentUser();
  const xu = xuWallet(user);
  const { tier, subscription } = ensureAllowance(user);
  const lastSubscription =
    subscription ?? db().subscriptions.filter((s) => s.userId === user.id).sort((a, b) => b.currentPeriodEnd.localeCompare(a.currentPeriodEnd))[0];
  save();
  return {
    tier,
    exportCredits: {
      balance: balanceOf(user, "EXPORT"),
      lots: liveLots(user, "EXPORT").map((lot) => ({ ...lotView(lot), source: lot.source === "ADMIN" ? "ADMIN" : "PURCHASE" })),
    },
    subscription: lastSubscription
      ? {
          plan: lastSubscription.plan,
          status: subscription ? "ACTIVE" : "EXPIRED",
          currentPeriodStart: lastSubscription.currentPeriodStart,
          currentPeriodEnd: lastSubscription.currentPeriodEnd,
        }
      : null,
    xu,
    paymentSimulation: true,
    isDemo: false,
  };
};

// ---------------------------------------------------------------- payments

function paymentView(payment: MockPayment): Payment {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { userId, ...rest } = payment;
  return { ...rest, vietqr: payment.status === "PENDING" ? payment.vietqr : null, vnpay: null };
}

function ownPayment(id: string): MockPayment {
  const user = currentUser();
  const payment = db().payments.find((p) => p.id === id && p.userId === user.id);
  if (!payment) throw notFound("Không tìm thấy thanh toán.");
  if (payment.status === "PENDING" && new Date(payment.expiresAt).getTime() < Date.now()) payment.status = "EXPIRED";
  return payment;
}

const REFERENCE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newReference = () => `WF${Array.from({ length: 6 }, () => REFERENCE_CHARS[Math.floor(Math.random() * REFERENCE_CHARS.length)]).join("")}`;

/** Amount and what a purpose buys. */
function priceOf(purpose: PaymentPurpose, xu: number | undefined, orderId: string | undefined, user: MockUser) {
  if (isExportPackId(purpose)) return { amountVnd: EXPORT_PACKS[purpose].priceVnd, credits: EXPORT_PACKS[purpose].credits, xu: null };
  if (isXuPackId(purpose)) return { amountVnd: XU_PACKS[purpose].priceVnd, credits: null, xu: XU_PACKS[purpose].xu };
  if (purpose === "XU_CUSTOM") {
    const error = xu === undefined ? "Cần nhập số xu muốn nạp." : customXuError(xu);
    if (error) throw badRequest(error);
    return { amountVnd: customXuPriceVnd(xu!), credits: null, xu: xu! };
  }
  if (purpose === "PRO_MONTH") return { amountVnd: PRO_MONTH.priceVnd, credits: null, xu: null };
  if (purpose === "SAMPLE_ORDER") {
    const order = db().orders.find((o) => o.id === orderId && o.userId === user.id);
    if (!order) throw notFound("Không tìm thấy đơn in mẫu.");
    if (order.orderStatus !== "PENDING_PAYMENT") throw conflict("Đơn này không còn chờ thanh toán.");
    return { amountVnd: order.totalVnd ?? 0, credits: null, xu: null };
  }
  throw badRequest("Mục thanh toán không hợp lệ.");
}

const createPayment: Handler = async ({ body }) => {
  const user = currentUser();
  if (body.termsVersion !== PAYMENT_TERMS_VERSION) throw badRequest("Bạn cần đọc và đồng ý điều khoản thanh toán hiện hành trước khi thanh toán.");
  const purpose = body.purpose as PaymentPurpose;
  const orderId = body.orderId as string | undefined;
  // A sample order already waiting for payment gets its QR again.
  if (purpose === "SAMPLE_ORDER") {
    const waiting = db().payments.find(
      (p) => p.userId === user.id && p.orderId === orderId && p.status === "PENDING" && new Date(p.expiresAt).getTime() > Date.now(),
    );
    if (waiting) return paymentView(waiting);
  }
  const { amountVnd, credits, xu } = priceOf(purpose, body.xu as number | undefined, orderId, user);
  const reference = newReference();
  const payload = `VietQR demo|${SAMPLE_BANK.bankBin}|${SAMPLE_BANK.accountNo}|${amountVnd}|${reference}`;
  const qrSvg = await QRCode.toString(payload, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
  const now = Date.now();
  const payment: MockPayment = {
    id: newId(),
    userId: user.id,
    purpose,
    status: "PENDING",
    provider: "VIETQR",
    confirmedVia: null,
    amountVnd,
    reference,
    expiresAt: new Date(now + PAYMENT_MINUTES * 60_000).toISOString(),
    paidAt: null,
    createdAt: new Date(now).toISOString(),
    credits,
    xu,
    orderId: orderId ?? null,
    vietqr: { payload, qrSvg, ...SAMPLE_BANK, sample: true },
  };
  db().payments.push(payment);
  if (purpose === "SAMPLE_ORDER") {
    const order = db().orders.find((o) => o.id === orderId);
    if (order) order.paymentId = payment.id;
  }
  save();
  return paymentView(payment);
};

/** Marks a payment paid and grants what it bought, once. */
function settle(payment: MockPayment, via: NonNullable<Payment["confirmedVia"]>) {
  if (payment.status === "PAID") return;
  const now = new Date();
  payment.status = "PAID";
  payment.paidAt = now.toISOString();
  payment.confirmedVia = via;
  const expires = exportLotExpiresAt(now).toISOString();
  if (payment.credits) grantLot(payment.userId, "EXPORT", "PURCHASE", payment.credits, expires);
  if (payment.xu) grantLot(payment.userId, "XU", "PURCHASE", payment.xu, expires);
  if (payment.purpose === "PRO_MONTH") {
    const current = db()
      .subscriptions.filter((s) => s.userId === payment.userId && new Date(s.currentPeriodEnd) > now)
      .sort((a, b) => b.currentPeriodEnd.localeCompare(a.currentPeriodEnd))[0];
    const start = current ? new Date(current.currentPeriodEnd) : now;
    db().subscriptions.push({
      id: newId(),
      userId: payment.userId,
      plan: "STARTER",
      currentPeriodStart: start.toISOString(),
      currentPeriodEnd: proPeriodEnd(start).toISOString(),
    });
  }
  if (payment.purpose === "SAMPLE_ORDER") {
    const order = db().orders.find((o) => o.id === payment.orderId);
    if (order) {
      order.orderStatus = "PAID";
      order.status = "paid";
      order.paidAt = payment.paidAt;
      order.paymentId = payment.id;
      order.updatedAt = payment.paidAt!;
    }
  }
  const user = db().users.find((u) => u.id === payment.userId);
  if (user) user.subscriptionTier = tierOf(user);
}

const simulateConfirm: Handler = ({ params }) => {
  const payment = ownPayment(params.id);
  if (payment.status !== "PENDING" && payment.status !== "PAID") throw conflict("Thanh toán đã hết hạn hoặc bị huỷ.");
  settle(payment, "SIMULATION");
  save();
  return paymentView(payment);
};

/** The bank "reports" a transfer: it shows on the admin reconciliation page like a SePay webhook. */
const simulateTransfer: Handler = ({ params, body }) => {
  const payment = ownPayment(params.id);
  if (payment.status !== "PENDING") throw conflict("Thanh toán không còn chờ chuyển khoản.");
  const scenario = (body.scenario as string) ?? "exact";
  const amountVnd = scenario === "underpaid" ? Math.max(1_000, Math.round(payment.amountVnd / 2)) : payment.amountVnd;
  const content = scenario === "no_reference" ? "chuyen khoan wrapfit" : `${payment.reference} thanh toan`;
  const now = nowIso();
  const user = currentUser();
  const matched = scenario === "exact";
  db().bankTransactions.push({
    id: newId(),
    externalId: `SEPAY-MOCK-${Date.now().toString(36).toUpperCase()}`,
    gateway: "MBBank",
    accountNo: SAMPLE_BANK.accountNo,
    amountVnd,
    content,
    bankReference: `FT${Date.now().toString().slice(-10)}`,
    extractedReference: scenario === "no_reference" ? null : payment.reference,
    transactionAt: now,
    status: matched ? "MATCHED" : "UNMATCHED",
    unmatchedReason: matched ? null : scenario === "underpaid" ? "AMOUNT_MISMATCH" : "NO_REFERENCE",
    resolvedBy: null,
    resolvedNote: null,
    createdAt: now,
    payment: matched ? bankPaymentOf(payment, user.email) : null,
  });
  if (matched) settle(payment, "SEPAY_WEBHOOK");
  save();
  return paymentView(payment);
};

export const bankPaymentOf = (payment: MockPayment, userEmail: string) => ({
  id: payment.id,
  reference: payment.reference,
  amountVnd: payment.amountVnd,
  status: payment.status,
  purpose: payment.purpose,
  provider: payment.provider,
  expiresAt: payment.expiresAt,
  userEmail,
});

export { settle as settlePayment };

const listPayments: Handler = ({ query }) => {
  const user = currentUser();
  for (const payment of db().payments) {
    if (payment.status === "PENDING" && new Date(payment.expiresAt).getTime() < Date.now()) payment.status = "EXPIRED";
  }
  const page = cursorPage(db().payments.filter((p) => p.userId === user.id), query);
  return {
    entries: page.entries.map((p) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { vietqr, vnpay, ...entry } = paymentView(p);
      return entry;
    }),
    nextBefore: page.nextBefore,
  };
};

const xuHistory: Handler = ({ query }) => {
  const user = currentUser();
  ensureAllowance(user);
  const type = query.get("type");
  const from = query.get("from");
  const to = query.get("to");
  const grants: XuHistoryEntry[] = db()
    .lots.filter((l) => l.userId === user.id && l.kind === "XU")
    .map((l) => ({ type: "GRANT", id: l.id, quantity: l.quantity, source: l.source, reason: null, refId: null, refundedAt: null, expiresAt: l.expiresAt, createdAt: l.createdAt }));
  const spends: XuHistoryEntry[] = db()
    .spends.filter((s) => s.userId === user.id)
    .map((s) => ({ type: "SPEND", id: s.id, quantity: -s.quantity, source: null, reason: s.reason, refId: s.refId, refundedAt: s.refundedAt, expiresAt: null, createdAt: s.createdAt }));
  const rows = [...grants, ...spends]
    .filter((e) =>
      type === "grant" ? e.type === "GRANT" && e.source !== "ADMIN" : type === "spend" ? e.type === "SPEND" && e.reason !== "ADMIN_ADJUSTMENT" : type === "adjust" ? e.source === "ADMIN" || e.reason === "ADMIN_ADJUSTMENT" : true,
    )
    .filter((e) => (!from || e.createdAt >= from) && (!to || e.createdAt <= `${to}T23:59:59.999Z`));
  save();
  return cursorPage(rows, query);
};

const getBillingDetails: Handler = () => db().billingDetails[currentUser().id] ?? { company: "", taxCode: "", email: "" };

const putBillingDetails: Handler = ({ body }) => {
  const details = { company: String(body.company ?? ""), taxCode: String(body.taxCode ?? ""), email: String(body.email ?? "") };
  db().billingDetails[currentUser().id] = details;
  save();
  return details;
};

// ---------------------------------------------------------------- export access (print files need a paid order)

/** A paid (or later) sample order holding the current version of the design unlocks its print files. */
function paidOrderHolds(projectId: string, version: number): boolean {
  return db().orders.some(
    (order) =>
      order.orderStatus !== "PENDING_PAYMENT" &&
      order.orderStatus !== "CANCELLED" &&
      ((order.items ?? []) as { projectId: string | null; projectVersion?: number }[]).some(
        (item) => item.projectId === projectId && (item.projectVersion === undefined || item.projectVersion === version),
      ),
  );
}

const exportAccess: Handler = ({ params }) => {
  const project = ownProject(params.id);
  const user = currentUser();
  const unlocked = paidOrderHolds(project.id, project.version);
  return { mode: ENTITLEMENTS[tierOf(user)].export.mode, unlocked, unlockExpiresAt: null, balance: balanceOf(user, "EXPORT") };
};

/**
 * No export worker without a backend: a paid design answers 503 and the export dialog builds the files in the browser
 * (the same renderers as the worker). An unpaid one answers 402 like the API.
 */
const startExport: Handler = ({ params }) => {
  const project = ownProject(params.id);
  if (!paidOrderHolds(project.id, project.version)) {
    throw new MockHttpError(402, "File in được mở khi bạn đặt và thanh toán đơn in của thiết kế này.", { code: "ORDER_PAYMENT_REQUIRED" });
  }
  throw new MockHttpError(503, "Bản demo dựng file in ngay trên trình duyệt.");
};

// ---------------------------------------------------------------- admin

const grantCredits: Handler = ({ params, body }) => {
  requireAdmin();
  const user = db().users.find((u) => u.id === params.id);
  if (!user) throw notFound("Không tìm thấy tài khoản.");
  const quantity = Number(body.quantity);
  if (!Number.isInteger(quantity) || quantity === 0) throw badRequest("Số lượng phải là số nguyên khác 0.");
  const kind = body.kind === "XU" ? "XU" : "EXPORT";
  const days = Number(body.expiresInDays);
  const expiresAt = days > 0 ? new Date(Date.now() + days * 86_400_000).toISOString() : null;
  if (quantity > 0) grantLot(user.id, kind, "ADMIN", quantity, expiresAt);
  else if (kind === "XU") spendXu(user, -quantity, "ADMIN_ADJUSTMENT", null);
  save();
};

const xuReport: Handler = ({ query }): XuReport => {
  requireAdmin();
  const month = query.get("month") ?? new Date().toISOString().slice(0, 7);
  const from = `${month}-01T00:00:00.000Z`;
  const [y, m] = month.split("-").map(Number);
  const to = new Date(Date.UTC(y, m, 1)).toISOString();
  const inMonth = (at: string) => at >= from && at < to;
  const lots = db().lots.filter((l) => l.kind === "XU" && inMonth(l.createdAt));
  const sources = ["PLAN_ALLOWANCE", "PURCHASE", "ADMIN"] as const;
  const issued = sources.map((source) => {
    const rows = lots.filter((l) => l.source === source);
    const xu = rows.reduce((sum, l) => sum + l.quantity, 0);
    return { source, xu, lots: rows.length, valueVnd: source === "PURCHASE" ? xu * 95 : 0 };
  });
  const spends = db().spends.filter((s) => inMonth(s.createdAt));
  const reasons = ["AI_IMAGE", "AI_PATTERN", "AI_TOOL", "EXPORT_UNLOCK", "ADMIN_ADJUSTMENT"] as const;
  const spent = reasons
    .map((reason) => {
      const rows = spends.filter((s) => s.reason === reason);
      const xu = rows.reduce((sum, s) => sum + s.quantity, 0);
      return { reason, xu, operations: rows.length, revenueVnd: xu * 95 };
    })
    .filter((row) => row.xu > 0);
  const recognizedRevenueVnd = spent.reduce((sum, row) => sum + row.revenueVnd, 0);
  const providerCostVnd = Math.round(recognizedRevenueVnd * 0.32);
  const outstandingXu = db().lots.filter((l) => l.kind === "XU" && l.source === "PURCHASE" && isLive(l)).reduce((sum, l) => sum + l.remaining, 0);
  return {
    month,
    from,
    to,
    usdVndRate: 26_000,
    issued,
    spent,
    refundedXu: 0,
    recognizedRevenueVnd,
    expired: { xu: 0, valueVnd: 0 },
    outstanding: { xu: outstandingXu, valueVnd: outstandingXu * 95 },
    providerCost: providerCostVnd ? [{ kind: "IMAGE", model: "flux2-klein", jobs: spends.length, xu: spent.reduce((s, r) => s + r.xu, 0), costUsd: providerCostVnd / 26_000, costVnd: providerCostVnd }] : [],
    providerCostVnd,
    grossMarginVnd: recognizedRevenueVnd - providerCostVnd,
    grossMarginRate: recognizedRevenueVnd ? (recognizedRevenueVnd - providerCostVnd) / recognizedRevenueVnd : null,
    spentListValueVnd: spent.reduce((sum, row) => sum + row.xu * 100, 0),
  };
};

export const billingRoutes: [string, string, Handler][] = [
  ["GET", "/billing/me", billingMe],
  ["GET", "/billing/details", getBillingDetails],
  ["PUT", "/billing/details", putBillingDetails],
  ["GET", "/billing/xu/history", xuHistory],
  ["GET", "/payments", listPayments],
  ["POST", "/payments", createPayment],
  // VNPay needs its sandbox and a signed return: never reached in the demo (accounts pay by VietQR).
  ["GET", "/payments/vnpay/return", () => ({ result: "invalid", payment: null })],
  ["GET", "/payments/:id", ({ params }) => {
    const payment = ownPayment(params.id);
    save();
    return paymentView(payment);
  }],
  ["POST", "/payments/:id/simulate-confirm", simulateConfirm],
  ["POST", "/payments/:id/simulate-transfer", simulateTransfer],
  ["GET", "/projects/:id/exports/access", exportAccess],
  ["POST", "/projects/:id/exports", startExport],
  ["GET", "/projects/:id/exports", ({ params }) => {
    ownProject(params.id);
    return [];
  }],
  ["POST", "/admin/users/:id/credits", grantCredits],
  ["GET", "/admin/analytics/xu", xuReport],
];
