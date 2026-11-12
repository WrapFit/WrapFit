/**
 * Data of the offline demo (`OFFLINE_DEMO`: a Vercel build without a backend). Everything the API would keep in
 * PostgreSQL lives here, seeded from the demo data and saved in this browser's localStorage, so a visitor can sign up,
 * design, pay (simulated), order and see it all again after a reload. Nothing leaves the browser.
 */

import type { BankTransaction } from "@/api/admin/bank-transactions";
import { DEMO_COLLECTIONS, DEMO_ORDERS, DEMO_PROJECTS, DEMO_USERS, getDemoProjectDetail } from "@/features/dashboard/demoData";
import type {
  AiImageJob,
  BillingDetails,
  Collection,
  CreditLot,
  ExportJob,
  Payment,
  ProjectDetail,
  SafeUser,
  SampleOrder,
  SnapshotSummary,
  UnboxingConfig,
  XuHistoryEntry,
} from "@/types/api";

const STORAGE_KEY = "wrapfit_mock_db_v1";

export interface MockUser extends SafeUser {
  /** Plain text: a demo account in one browser, never a real password store. Absent = any password works. */
  password?: string;
  isDemo: boolean;
}

export interface MockProject extends ProjectDetail {
  ownerId: string;
}

export interface MockSnapshot extends SnapshotSummary {
  projectId: string;
  state: Pick<ProjectDetail, "canvasState" | "dimensions" | "materialSpec" | "formulaVersion">;
}

export interface MockCollection extends Collection {
  ownerId: string;
}

export interface MockPayment extends Payment {
  userId: string;
}

export interface MockLot extends CreditLot {
  userId: string;
  kind: "EXPORT" | "XU";
  /** Allowance lots: one per plan period. */
  periodKey?: string;
}

export interface MockSpend {
  id: string;
  userId: string;
  quantity: number;
  reason: NonNullable<XuHistoryEntry["reason"]>;
  refId: string | null;
  refundedAt: string | null;
  createdAt: string;
}

export interface MockSubscription {
  id: string;
  userId: string;
  plan: "STARTER" | "PRO_BUSINESS";
  currentPeriodStart: string;
  currentPeriodEnd: string;
}

export interface MockEvent {
  type: string;
  userId: string;
  projectId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface MockDb {
  version: 1;
  /** Who is signed in; null after a sign-out. */
  sessionUserId: string | null;
  users: MockUser[];
  projects: MockProject[];
  snapshots: MockSnapshot[];
  collections: MockCollection[];
  payments: MockPayment[];
  lots: MockLot[];
  spends: MockSpend[];
  subscriptions: MockSubscription[];
  orders: SampleOrder[];
  exportJobs: ExportJob[];
  billingDetails: Record<string, BillingDetails>;
  unboxing: Record<string, UnboxingConfig>;
  aiJobs: (AiImageJob & { userId: string })[];
  likes: Record<string, boolean>;
  events: MockEvent[];
  bankTransactions: BankTransaction[];
  storage: Record<string, { usedBytes: number; fileCount: number }>;
}

export const DEMO_USER_ID = DEMO_USERS[0].id;

const iso = (ms: number) => new Date(ms).toISOString();
const DAY = 86_400_000;

function seed(): MockDb {
  const now = Date.now();
  const users: MockUser[] = DEMO_USERS.map((user) => ({ ...user, isDemo: false }));
  const projects: MockProject[] = DEMO_PROJECTS.map((summary) => ({
    ...getDemoProjectDetail(summary.id),
    formulaVersion: 3,
    latestFormulaVersion: 3,
    ownerId: DEMO_USER_ID,
  }));
  const collections: MockCollection[] = DEMO_COLLECTIONS.map((collection) => ({ ...collection, ownerId: DEMO_USER_ID }));
  const orders: SampleOrder[] = DEMO_ORDERS.map((order) => ({
    ...order,
    orderStatus: order.status.toUpperCase() as SampleOrder["orderStatus"],
    subtotalVnd: order.totalVnd,
    shippingVnd: 0,
    discountVnd: 0,
    paidAt: order.createdAt,
    items: [{ projectId: order.projectId, projectTitle: order.projectTitle, quantity: order.quantity, lineTotalVnd: order.totalVnd ?? 0 }],
  }));
  const paid = (id: string, purpose: Payment["purpose"], amountVnd: number, daysAgo: number, extra: Partial<Payment> = {}): MockPayment => ({
    id,
    userId: DEMO_USER_ID,
    purpose,
    status: "PAID",
    provider: "VIETQR",
    confirmedVia: "SEPAY_WEBHOOK",
    amountVnd,
    reference: `WF${id.slice(-6).toUpperCase()}`,
    expiresAt: iso(now - daysAgo * DAY + 15 * 60_000),
    paidAt: iso(now - daysAgo * DAY + 2 * 60_000),
    createdAt: iso(now - daysAgo * DAY),
    credits: null,
    xu: null,
    orderId: null,
    vietqr: null,
    ...extra,
  });
  const payments = [
    paid("pay-seed-xu1050", "XU_1050", 100_000, 9, { xu: 1_050 }),
    paid("pay-seed-exp005", "EXPORT_5", 79_000, 20, { credits: 5 }),
  ];
  const lots: MockLot[] = [
    {
      id: "lot-seed-xu1050",
      userId: DEMO_USER_ID,
      kind: "XU",
      source: "PURCHASE",
      quantity: 1_050,
      remaining: 910,
      expiresAt: iso(now + 356 * DAY),
      createdAt: iso(now - 9 * DAY),
    },
    {
      id: "lot-seed-exp005",
      userId: DEMO_USER_ID,
      kind: "EXPORT",
      source: "PURCHASE",
      quantity: 5,
      remaining: 3,
      expiresAt: iso(now + 345 * DAY),
      createdAt: iso(now - 20 * DAY),
    },
  ];
  const spends: MockSpend[] = [
    { id: "spend-seed-1", userId: DEMO_USER_ID, quantity: 65, reason: "AI_PATTERN", refId: null, refundedAt: null, createdAt: iso(now - 6 * DAY) },
    { id: "spend-seed-2", userId: DEMO_USER_ID, quantity: 40, reason: "AI_IMAGE", refId: null, refundedAt: null, createdAt: iso(now - 4 * DAY) },
    { id: "spend-seed-3", userId: DEMO_USER_ID, quantity: 35, reason: "AI_TOOL", refId: null, refundedAt: null, createdAt: iso(now - 2 * DAY) },
  ];
  const subscriptions: MockSubscription[] = [
    { id: "sub-seed-demo", userId: DEMO_USER_ID, plan: "PRO_BUSINESS", currentPeriodStart: iso(now - 5 * DAY), currentPeriodEnd: iso(now + 25 * DAY) },
  ];
  const bankTransactions: BankTransaction[] = [
    bankTx("btx-seed-1", 100_000, `WF${"pay-seed-xu1050".slice(-6).toUpperCase()} nap xu`, "MATCHED", null, now - 9 * DAY),
    bankTx("btx-seed-2", 45_000, "chuyen tien hop mau", "UNMATCHED", "NO_REFERENCE", now - DAY),
    bankTx("btx-seed-3", 19_000, "WFQ7K2ZP mua luot xuat", "UNMATCHED", "NOT_FOUND", now - 3 * 3_600_000),
  ];
  return {
    version: 1,
    sessionUserId: DEMO_USER_ID,
    users,
    projects,
    snapshots: [],
    collections,
    payments,
    lots,
    spends,
    subscriptions,
    orders,
    exportJobs: [],
    billingDetails: {},
    unboxing: {},
    aiJobs: [],
    likes: {},
    events: [],
    bankTransactions,
    storage: { [DEMO_USER_ID]: { usedBytes: 4_718_592, fileCount: 3 } },
  };
}

function bankTx(
  id: string,
  amountVnd: number,
  content: string,
  status: BankTransaction["status"],
  unmatchedReason: BankTransaction["unmatchedReason"],
  at: number,
): BankTransaction {
  const reference = /WF[0-9A-Z]{6}/.exec(content)?.[0] ?? null;
  return {
    id,
    externalId: `SEPAY-${id.slice(-4).toUpperCase()}`,
    gateway: "MBBank",
    accountNo: "0000000000",
    amountVnd,
    content,
    bankReference: `FT${String(at).slice(-10)}`,
    extractedReference: reference,
    transactionAt: iso(at),
    status,
    unmatchedReason,
    resolvedBy: null,
    resolvedNote: null,
    createdAt: iso(at),
    payment: null,
  };
}

let cache: MockDb | null = null;
let warnedQuota = false;

/** The demo database of this browser (seeded on first use). */
export function db(): MockDb {
  if (cache) return cache;
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    const parsed = raw ? (JSON.parse(raw) as MockDb) : null;
    cache = parsed?.version === 1 ? parsed : seed();
  } catch {
    cache = seed();
  }
  return cache;
}

/** Keeps the changes of a request. When the browser refuses (quota, private mode) they stay for this tab only. */
export function save(): void {
  if (!cache || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch (error) {
    if (!warnedQuota) console.warn("[Demo] Không lưu được dữ liệu demo vào trình duyệt, thay đổi chỉ còn trong tab này.", error);
    warnedQuota = true;
  }
}

/**
 * Who the demo API answers for. The app calls it whenever it signs a user in or out on its own (the quick demo
 * accounts of the sign-in page, the admin console of the demo), so the pages and the API agree on the user.
 */
export function setMockSession(userId: string | null): void {
  const state = db();
  if (userId !== null && !state.users.some((u) => u.id === userId)) return;
  if (state.sessionUserId === userId) return;
  state.sessionUserId = userId;
  save();
}

/** Starts the demo over with the seed data. */
export function resetMockDb(): void {
  cache = seed();
  save();
}

let counter = 0;
/** A UUID-like id (v4 when the browser has crypto.randomUUID). */
export function newId(prefix = ""): string {
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(16)}-${(counter++).toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
  return prefix ? `${prefix}-${uuid}` : uuid;
}

export const nowIso = () => new Date().toISOString();
