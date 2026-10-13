"use client";

import { ArrowRight, Cloud, Sparkles } from "lucide-react";
import Link from "next/link";
import React, { useId } from "react";
import { ErrorState } from "@/components/common/StatusViews";
import { ROUTES, TIER_LABELS } from "@/constants";
import { formatBytes, formatCount } from "../format";
import { useAiUsage, usagePercent, useStorageUsage } from "../useUsage";

const TILE = "flex min-h-[200px] flex-col justify-between gap-4 rounded-2xl border border-library-line bg-white p-5 sm:p-6";

/** Green while there is room, amber past 80 %, red past 95 %: the quota is about to block uploads. */
function meterColor(percent: number): string {
  if (percent >= 95) return "bg-red-500";
  return percent >= 80 ? "bg-amber-500" : "bg-library-accent";
}

function Meter({ percent, label }: { percent: number; label: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      className="h-2 w-full overflow-hidden rounded-full bg-library-panel"
    >
      <div
        className={`h-full rounded-full transition-[width] duration-700 ${meterColor(percent)}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function TileSkeleton() {
  return (
    <div aria-hidden="true" className={TILE}>
      <div className="size-10 animate-pulse rounded-xl bg-library-tile motion-reduce:animate-none" />
      <div className="h-6 w-1/2 animate-pulse rounded bg-library-tile motion-reduce:animate-none" />
      <div className="h-2 w-full animate-pulse rounded-full bg-library-tile motion-reduce:animate-none" />
    </div>
  );
}

const PERCENT = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

/** `GET /storage/usage`: what my uploads and exports take, against the quota of my plan. */
export function StorageUsageTile() {
  const usage = useStorageUsage();
  const titleId = useId();

  if (usage.isPending) return <TileSkeleton />;
  if (usage.isError) {
    return (
      <ErrorState
        error={usage.error}
        title="Không tải được dung lượng"
        onRetry={() => void usage.refetch()}
        retrying={usage.isFetching}
      />
    );
  }

  const { usedBytes, quotaBytes, fileCount, tier } = usage.data;
  const percent = usagePercent(usedBytes, quotaBytes);
  return (
    <section aria-labelledby={titleId} className={TILE}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-library-accent-mist text-library-accent">
          <Cloud className="size-5" aria-hidden />
        </div>
        <span className="rounded-md bg-library-panel px-2 py-1 text-xs font-medium text-library-sub">
          {TIER_LABELS[tier]}
        </span>
      </div>
      <div className="space-y-2">
        <h3 id={titleId} className="text-lg font-medium text-library-ink">
          Dung lượng lưu trữ
        </h3>
        <p className="text-2xl font-medium text-library-ink">
          {formatBytes(usedBytes)}{" "}
          <span className="text-sm font-normal text-library-muted">/ {formatBytes(quotaBytes)}</span>
        </p>
        <Meter percent={percent} label="Dung lượng đã dùng" />
        <div className="flex items-center justify-between text-xs text-library-sub">
          <span>Đã dùng {PERCENT.format(percent)}%</span>
          <span>{formatCount(fileCount)} tệp</span>
        </div>
      </div>
      <Link
        href={ROUTES.settings}
        className="inline-flex min-h-[44px] items-center gap-1 self-start text-sm font-medium text-library-accent underline-offset-4 hover:underline"
      >
        Quản lý dung lượng
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </section>
  );
}

/** `GET /ai/usage`: AI pattern generations in the last 24 hours. */
export function AiUsageTile() {
  const usage = useAiUsage();
  const titleId = useId();

  if (usage.isPending) return <TileSkeleton />;
  if (usage.isError) {
    return (
      <ErrorState
        error={usage.error}
        title="Không tải được lượt AI"
        onRetry={() => void usage.refetch()}
        retrying={usage.isFetching}
      />
    );
  }

  const { used, limit, aiEnabled, tier } = usage.data;
  const left = Math.max(0, limit - used);
  return (
    <section aria-labelledby={titleId} className={TILE}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-library-accent-mist text-library-accent">
          <Sparkles className="size-5" aria-hidden />
        </div>
        <span className="rounded-md bg-library-panel px-2 py-1 text-xs font-medium text-library-sub">
          {TIER_LABELS[tier]}
        </span>
      </div>
      <div className="space-y-2">
        <h3 id={titleId} className="text-lg font-medium text-library-ink">
          Hoa văn AI trong 24 giờ
        </h3>
        {aiEnabled ? (
          <>
            <p className="text-2xl font-medium text-library-ink">
              {formatCount(used)}{" "}
              <span className="text-sm font-normal text-library-muted">/ {formatCount(limit)} lượt</span>
            </p>
            <Meter percent={usagePercent(used, limit)} label="Lượt AI đã dùng" />
            <p className="text-xs text-library-sub">
              {left > 0 ? `Còn ${formatCount(left)} lượt` : "Đã hết lượt, thử lại sau 24 giờ"}
            </p>
          </>
        ) : (
          <>
            <p className="text-2xl font-medium text-library-ink">Không giới hạn</p>
            <p className="text-sm leading-relaxed text-library-sub">
              Hoa văn đang được tạo bằng bộ sinh có sẵn của WrapFit, không tính lượt.
            </p>
          </>
        )}
      </div>
      <p className="text-xs text-library-muted">Tạo hoa văn trong studio, mục Hoa văn AI.</p>
    </section>
  );
}
