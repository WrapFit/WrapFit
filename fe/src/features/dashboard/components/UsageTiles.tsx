"use client";

import Link from "next/link";
import React, { useId } from "react";
import { ErrorState } from "@/components/common/StatusViews";
import { ROUTES, TIER_LABELS } from "@/constants";
import { formatBytes, formatCount } from "../format";
import { useAiUsage, usagePercent, useStorageUsage } from "../useUsage";

const TILE =
  "p-6 rounded-3xl bg-white border border-[#e8ded0]/80 shadow-soft flex flex-col gap-4 min-h-[220px] justify-between";

/** Emerald while there is room, amber past 80 %, coral past 95 %: the quota is about to block uploads. */
function meterColor(percent: number): string {
  if (percent >= 95) return "bg-[#EE5253]";
  return percent >= 80 ? "bg-amber-500" : "bg-emerald-600";
}

function Meter({ percent, label }: { percent: number; label: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      className="w-full h-2 rounded-full bg-stone-100 overflow-hidden"
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
      <div className="w-12 h-12 rounded-2xl bg-stone-100 animate-pulse motion-reduce:animate-none" />
      <div className="h-6 w-1/2 rounded-full bg-stone-100 animate-pulse motion-reduce:animate-none" />
      <div className="h-2 w-full rounded-full bg-stone-100 animate-pulse motion-reduce:animate-none" />
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
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-700">
          <span aria-hidden="true" className="material-symbols-outlined text-[24px]">
            cloud_done
          </span>
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 text-[11px] font-['JetBrains_Mono'] font-bold">
          {TIER_LABELS[tier]}
        </span>
      </div>
      <div className="space-y-2">
        <h3 id={titleId} className="font-['Playfair_Display'] text-lg font-bold text-[#122e20]">
          Dung lượng lưu trữ
        </h3>
        <p className="font-['JetBrains_Mono'] text-xl font-semibold text-[#122e20]">
          {formatBytes(usedBytes)}{" "}
          <span className="text-sm font-medium text-stone-500">/ {formatBytes(quotaBytes)}</span>
        </p>
        <Meter percent={percent} label="Dung lượng đã dùng" />
        <div className="flex items-center justify-between text-[11px] font-['JetBrains_Mono'] text-stone-500">
          <span>Đã dùng {PERCENT.format(percent)}%</span>
          <span>{formatCount(fileCount)} tệp</span>
        </div>
      </div>
      <Link
        href={ROUTES.settings}
        className="self-start min-h-[44px] flex items-center gap-1 text-xs font-semibold text-[#122e20] hover:underline underline-offset-2"
      >
        <span>Quản lý dung lượng</span>
        <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
          arrow_forward
        </span>
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
        <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-700">
          <span aria-hidden="true" className="material-symbols-outlined text-[24px]">
            auto_awesome
          </span>
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 text-[11px] font-['JetBrains_Mono'] font-bold">
          {TIER_LABELS[tier]}
        </span>
      </div>
      <div className="space-y-2">
        <h3 id={titleId} className="font-['Playfair_Display'] text-lg font-bold text-[#122e20]">
          Hoa văn AI trong 24 giờ
        </h3>
        {aiEnabled ? (
          <>
            <p className="font-['JetBrains_Mono'] text-xl font-semibold text-[#122e20]">
              {formatCount(used)}{" "}
              <span className="text-sm font-medium text-stone-500">/ {formatCount(limit)} lượt</span>
            </p>
            <Meter percent={usagePercent(used, limit)} label="Lượt AI đã dùng" />
            <p className="text-[11px] font-['JetBrains_Mono'] text-stone-500">
              {left > 0 ? `Còn ${formatCount(left)} lượt` : "Đã hết lượt, thử lại sau 24 giờ"}
            </p>
          </>
        ) : (
          <>
            <p className="font-['JetBrains_Mono'] text-xl font-semibold text-[#122e20]">Không giới hạn</p>
            <p className="text-xs text-stone-500 leading-relaxed">
              Hoa văn đang được tạo bằng bộ sinh có sẵn của WrapFit, không tính lượt.
            </p>
          </>
        )}
      </div>
      <p className="text-[11px] text-stone-500">Tạo hoa văn trong 3D Studio, mục Hoa văn AI.</p>
    </section>
  );
}
