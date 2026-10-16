"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarClock, CheckCircle2, CircleAlert, CircleX, Globe, History, RefreshCw } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { getHealth } from "@/api/common";
import { Container } from "@/components/landing";
import { Card, EmailCapture, PageHero, SampleBadge, Section, SitePage } from "@/components/site";
import type { HealthStatus } from "@/types/api";
import { cn } from "@/utils/helpers";

type State = "up" | "degraded" | "down" | "checking";

interface Component {
  name: string;
  description: string;
  state: State;
}

/** One check of `GET /health`, kept for the bars of this visit. */
interface Sample {
  at: number;
  ok: boolean;
  /** Every component answered "up". */
  full: boolean;
}

const POLL_MS = 30_000;
const MAX_SAMPLES = 60;

/** What each answer of the health probe means for the people using WrapFit (be/src/base/health). */
function componentsOf(health: HealthStatus | undefined, failed: boolean): Component[] {
  const of = (value: "up" | "down" | undefined): State => (failed ? "down" : !health ? "checking" : value === "up" ? "up" : "down");
  return [
    { name: "Trang web & studio", description: "Giao diện, khuôn 2D và hộp 3D (chạy trong trình duyệt)", state: "up" },
    { name: "API & tài khoản", description: "Đăng nhập, lưu dự án, thư viện mẫu", state: failed ? "down" : health ? "up" : "checking" },
    { name: "Cơ sở dữ liệu", description: "Dự án, phiên bản, đơn in", state: of(health?.database) },
    { name: "Hàng đợi xuất file & email", description: "Xếp hàng file in PDF/SVG/DXF và email xác nhận", state: of(health?.redis) },
    { name: "Máy xuất file in", description: "Dựng file in CMYK tách lớp", state: of(health?.worker) },
  ];
}

const STATE_LABEL: Record<State, string> = { up: "Hoạt động", degraded: "Suy giảm", down: "Gián đoạn", checking: "Đang kiểm tra" };
const STATE_STYLE: Record<State, string> = {
  up: "bg-fpt-orange-light text-fpt-orange-ink",
  degraded: "bg-warning-bg text-warning-fg",
  down: "bg-danger-bg text-danger-fg",
  checking: "bg-landing-tile text-landing-muted",
};

/**
 * `/status`: live state of the platform from the public probe `GET /health` (database, Redis, export worker), checked
 * every 30 seconds. There is no monitoring history in the API yet: the bars show the checks of this visit, and the
 * past incidents and the maintenance plan are labelled as such.
 */
export default function StatusPage() {
  const health = useQuery({ queryKey: ["status", "health"], queryFn: getHealth, refetchInterval: POLL_MS, retry: false });
  const [samples, setSamples] = useState<Sample[]>([]);
  const lastAt = useRef(0);

  useEffect(() => {
    const at = Math.max(health.dataUpdatedAt, health.errorUpdatedAt);
    if (!at || at === lastAt.current) return;
    lastAt.current = at;
    const ok = !health.isError && Boolean(health.data);
    const full = ok && health.data!.database === "up" && health.data!.redis === "up" && health.data!.worker === "up";
    setSamples((current) => [...current, { at, ok, full }].slice(-MAX_SAMPLES));
  }, [health.dataUpdatedAt, health.errorUpdatedAt, health.isError, health.data]);

  const components = componentsOf(health.data, health.isError);
  const down = components.filter((c) => c.state === "down");
  const overall: State = health.isLoading ? "checking" : down.length === 0 ? "up" : down.some((c) => c.name === "API & tài khoản" || c.name === "Cơ sở dữ liệu") ? "down" : "degraded";
  const okShare = samples.length ? (samples.filter((s) => s.ok).length / samples.length) * 100 : null;
  const updated = health.dataUpdatedAt || health.errorUpdatedAt;

  return (
    <SitePage>
      <PageHero
        title="Trạng thái hệ thống"
        subtitle="WrapFit có đang hoạt động không?"
        lead="Kiểm tra trực tiếp API, cơ sở dữ liệu và máy xuất file in của WrapFit, tự làm mới mỗi 30 giây."
      />

      <Container className="flex flex-col gap-6 pb-6">
        <div className={cn("flex flex-col gap-4 rounded-card p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8", overall === "up" ? "bg-landing-green-night text-white" : overall === "checking" ? "bg-white ring-1 ring-landing-ink/10" : overall === "degraded" ? "bg-warning-bg text-amber-950" : "bg-danger text-white")}>
          <div className="flex items-center gap-4">
            <StateIcon state={overall} className="size-10" />
            <div>
              <p className="font-landing-heading text-2xl font-bold">
                {overall === "up" ? "Mọi hệ thống hoạt động bình thường" : overall === "checking" ? "Đang kiểm tra hệ thống…" : overall === "degraded" ? "Xuất file in đang chậm hoặc tạm dừng" : "WrapFit đang gián đoạn"}
              </p>
              <p className={cn("text-sm", overall === "up" ? "text-white/80" : "opacity-80")}>
                {overall === "degraded" ? "Bạn vẫn thiết kế và lưu dự án được; file in sẽ được xử lý khi hàng đợi hoạt động lại." : overall === "down" ? "Dự án chưa lưu vẫn nằm trong trình duyệt của bạn. Chúng tôi đang khắc phục." : "Dữ liệu từ /api/health của máy chủ WrapFit."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => health.refetch()}
            className={cn("inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold", overall === "up" || overall === "down" ? "bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20" : "bg-white text-landing-ink ring-1 ring-landing-line")}
          >
            <RefreshCw className={cn("size-4", health.isFetching && "animate-spin motion-reduce:animate-none")} aria-hidden />
            Kiểm tra lại
          </button>
        </div>

        <Card className="p-0">
          <ul className="divide-y divide-landing-line/60">
            {components.map((component) => (
              <li key={component.name} className="flex items-center justify-between gap-4 px-6 py-4">
                <div className="min-w-0">
                  <p className="font-semibold">{component.name}</p>
                  <p className="text-sm text-landing-muted">{component.description}</p>
                </div>
                <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", STATE_STYLE[component.state])}>
                  <StateIcon state={component.state} className="size-3.5" />
                  {STATE_LABEL[component.state]}
                </span>
              </li>
            ))}
          </ul>
          <p className="border-t border-landing-line/60 px-6 py-3 text-xs text-landing-muted" aria-live="polite">
            {updated ? `Kiểm tra lúc ${new Date(updated).toLocaleTimeString("vi-VN")}` : "Đang kiểm tra…"}
          </p>
        </Card>
      </Container>

      <Section title="Thời gian hoạt động" lead="Mỗi vạch là một lần kiểm tra trong lượt truy cập này. Lịch sử 90 ngày sẽ có khi hệ thống giám sát được bật.">
        <Card>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-landing-muted">Tỷ lệ phản hồi trong phiên</p>
              <p className="font-landing-heading text-4xl font-bold tracking-tight">{okShare === null ? "—" : `${okShare.toFixed(okShare === 100 ? 0 : 1)}%`}</p>
            </div>
            <p className="text-sm text-landing-muted">{samples.length} lần kiểm tra · mỗi 30 giây</p>
          </div>
          <div className="mt-5 flex h-10 items-end gap-[3px]" role="img" aria-label={`${samples.filter((s) => s.ok).length} trên ${samples.length} lần kiểm tra thành công`}>
            {Array.from({ length: MAX_SAMPLES }, (_, i) => {
              const sample = samples[i - (MAX_SAMPLES - samples.length)];
              return (
                <span
                  key={i}
                  title={sample ? new Date(sample.at).toLocaleTimeString("vi-VN") : undefined}
                  className={cn("h-full flex-1 rounded-full", !sample ? "bg-landing-tile" : !sample.ok ? "bg-danger" : sample.full ? "bg-fpt-orange" : "bg-warning")}
                />
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-landing-muted">
            <Legend className="bg-fpt-orange" label="Hoạt động đủ" />
            <Legend className="bg-warning" label="Suy giảm (xuất file)" />
            <Legend className="bg-danger" label="Không phản hồi" />
          </div>
        </Card>
      </Section>

      <Section title="Sự cố & bảo trì">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card>
            <div className="flex items-center gap-2">
              <History className="size-5 text-fpt-orange-ink" aria-hidden />
              <h3 className="font-landing-heading text-lg font-bold">Lịch sử sự cố</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-landing-muted">
              Chưa ghi nhận sự cố nào từ khi mở bản thử nghiệm. Khi có sự cố, diễn biến và nguyên nhân sẽ được đăng tại đây, cập nhật từng bước cho đến khi khắc phục xong.
            </p>
          </Card>
          <Card>
            <div className="flex flex-wrap items-center gap-2">
              <CalendarClock className="size-5 text-fpt-orange-ink" aria-hidden />
              <h3 className="font-landing-heading text-lg font-bold">Bảo trì theo lịch</h3>
              <SampleBadge />
            </div>
            <ul className="mt-3 flex flex-col gap-3 text-sm">
              <li className="rounded-2xl bg-landing-canvas p-4">
                <p className="font-semibold">Nâng cấp máy chủ xuất file in</p>
                <p className="text-landing-muted">Chủ nhật 25/10/2026, 01:00–02:00 · Xuất file tạm dừng, thiết kế vẫn hoạt động.</p>
              </li>
            </ul>
          </Card>
        </div>
      </Section>

      <Section title="Nhận thông báo khi có sự cố" className="pb-16">
        <Card className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm leading-relaxed text-landing-muted">
              Chúng tôi gửi email khi có sự cố ảnh hưởng đến việc lưu dự án hoặc xuất file, và khi đã khắc phục xong.
            </p>
            <p className="mt-3 inline-flex items-center gap-2 text-xs text-landing-muted">
              <Globe className="size-4" aria-hidden /> Trang trạng thái sẽ chuyển sang tên miền riêng status.wrapfit.vn, vẫn xem được khi trang chính gián đoạn.
            </p>
          </div>
          <EmailCapture list="status" cta="Đăng ký nhận tin" done="Đã ghi nhận email trên thiết bị này. Thông báo sự cố sẽ gửi khi hệ thống email giám sát được bật." />
        </Card>
      </Section>
    </SitePage>
  );
}

function StateIcon({ state, className }: { state: State; className?: string }) {
  if (state === "up") return <CheckCircle2 className={className} aria-hidden />;
  if (state === "down") return <CircleX className={className} aria-hidden />;
  if (state === "degraded") return <CircleAlert className={className} aria-hidden />;
  return <RefreshCw className={cn(className, "animate-spin motion-reduce:animate-none")} aria-hidden />;
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-2.5 rounded-full", className)} aria-hidden />
      {label}
    </span>
  );
}
