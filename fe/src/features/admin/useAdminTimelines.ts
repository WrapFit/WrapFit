"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { BANK_TX_KEY, listBankTransactions, type BankTransaction } from "@/api/admin/bank-transactions";
import { getAnalyticsSummary } from "@/api/analytics";
import { dayKeyOf, lastDays, type TimelineBucket, type TimelineEvent } from "@/components/workspace/AdminTimeline";
import { formatVnd } from "@/features/pricing";

/** Admin overviews refresh themselves this often. */
export const ADMIN_TIMELINE_REFRESH_S = 30;

const REASONS: Record<string, string> = {
  NO_REFERENCE: "thiếu mã WF…",
  NOT_FOUND: "mã không tồn tại",
  AMOUNT_MISMATCH: "sai số tiền",
  EXPIRED: "mã đã hết hạn",
  ALREADY_PAID: "thanh toán đã trả",
};

/** A bank transfer as an event of the activity strip. */
function bankEvent(tx: BankTransaction): TimelineEvent {
  const amount = formatVnd(tx.amountVnd);
  if (tx.status === "MATCHED") return { id: tx.id, at: tx.transactionAt, tone: "good", title: `Tiền về ${amount}, tự khớp`, detail: tx.payment?.reference ?? tx.content };
  if (tx.status === "RESOLVED") return { id: tx.id, at: tx.transactionAt, tone: "info", title: `Admin đã gán ${amount}`, detail: tx.payment?.reference ?? tx.content };
  if (tx.status === "IGNORED") return { id: tx.id, at: tx.transactionAt, tone: "info", title: `Đã bỏ qua ${amount}`, detail: tx.resolvedNote ?? tx.content };
  return {
    id: tx.id,
    at: tx.transactionAt,
    tone: "warning",
    title: `Chưa khớp ${amount}${tx.unmatchedReason ? `: ${REASONS[tx.unmatchedReason] ?? tx.unmatchedReason}` : ""}`,
    detail: tx.content,
  };
}

/** Money in per day over the last `days` days and the latest transfers, from the 100 newest bank transactions. */
export function useBankTimeline(days = 14) {
  const query = useQuery({
    queryKey: [...BANK_TX_KEY, "timeline"],
    queryFn: () => listBankTransactions({ limit: 100 }),
    refetchInterval: ADMIN_TIMELINE_REFRESH_S * 1000,
  });
  const data = useMemo(() => {
    const buckets: TimelineBucket[] = lastDays(days);
    const byKey = new Map(buckets.map((b) => [b.key, b]));
    for (const tx of query.data?.entries ?? []) {
      const bucket = byKey.get(dayKeyOf(tx.transactionAt));
      if (bucket) bucket.value += tx.amountVnd;
    }
    const events = (query.data?.entries ?? []).map(bankEvent);
    const unmatched = (query.data?.entries ?? []).filter((tx) => tx.status === "UNMATCHED").length;
    return { buckets, events, unmatched };
  }, [query.data, days]);
  return { ...data, query };
}

/** Boxes created per day by every user (anonymous totals of `GET /analytics/summary?scope=global`). */
export function useBoxesTimeline(days: 7 | 30 = 30) {
  const query = useQuery({
    queryKey: ["admin", "analytics", "global", days],
    queryFn: () => getAnalyticsSummary("global", days),
    refetchInterval: ADMIN_TIMELINE_REFRESH_S * 1000,
  });
  const buckets = useMemo<TimelineBucket[]>(() => {
    const base = lastDays(days);
    const counts = new Map(query.data?.boxes.byDay.map((d) => [d.date, d.count]) ?? []);
    return base.map((b) => ({ ...b, value: counts.get(b.key) ?? 0 }));
  }, [query.data, days]);
  return { buckets, query };
}
