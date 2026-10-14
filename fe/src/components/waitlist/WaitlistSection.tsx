"use client";

import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Copy,
  Gift,
  RefreshCw,
  Share2,
  Sparkles,
  Users,
} from "lucide-react";
import React, { useState } from "react";
import { GoiMascot } from "@/components/common/GoiMascot";
import { Container, Eyebrow, FeatureCard, Reveal, limeButton } from "@/components/landing";
import { cn } from "@/utils/helpers";
import { WaitlistSkeleton } from "./WaitlistSkeleton";

/** Initial sample waitlist members representing early artisan boutique applicants */
const MOCK_WAITLIST_ITEMS = [
  {
    rank: 1,
    name: "Tiệm Nến Thơm Mộc Nhiên",
    location: "Hà Nội",
    category: "Nến & Tinh dầu",
    perk: "Đã cấp quyền Beta Studio + 01 hộp mẫu kraft",
    status: "active",
    avatarBg: "bg-amber-100 text-amber-800",
  },
  {
    rank: 2,
    name: "Tiệm Bạc & Đá Quý An Nhiên",
    location: "TP. Hồ Chí Minh",
    category: "Trang sức cao cấp",
    perk: "Đã cấp quyền Beta Studio + Hộp gối bạc",
    status: "active",
    avatarBg: "bg-blue-100 text-blue-800",
  },
  {
    rank: 3,
    name: "Trà Shan Tuyết Cổ Thụ",
    location: "Hà Giang",
    category: "Trà & Nông sản",
    perk: "Đang kiểm định khuôn dao FitCheck™",
    status: "processing",
    avatarBg: "bg-emerald-100 text-emerald-800",
  },
  {
    rank: 4,
    name: "Xưởng Xà Bông Thảo Mộc Sapa",
    location: "Lào Cai",
    category: "Mỹ phẩm tự nhiên",
    perk: "Ưu tiên đợt 1 (Mở trong 2 ngày tới)",
    status: "queued",
    avatarBg: "bg-rose-100 text-rose-800",
  },
  {
    rank: 5,
    name: "Tiệm Bánh Artisan Florist",
    location: "Đà Nẵng",
    category: "Bánh ngọt & Quà Tết",
    perk: "Ưu tiên đợt 1 (Mở trong 2 ngày tới)",
    status: "queued",
    avatarBg: "bg-purple-100 text-purple-800",
  },
];

export interface WaitlistSectionProps {
  className?: string;
  /** Whether to show in standalone page mode */
  isStandalone?: boolean;
}

export function WaitlistSection({ className, isStandalone = false }: WaitlistSectionProps) {
  // Loading state toggle: default false, with quick preview switch
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("Mỹ phẩm & Nến thơm");
  const [submittedRank, setSubmittedRank] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // Trigger simulated loading
  const handleSimulateLoading = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1200);
  };

  // Handle waitlist signup
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setSubmittedRank(428); // Assigned position
    }, 1100);
  };

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText("https://wrapfit.vn/waitlist?ref=WF-428");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section
      id="waitlist"
      className={cn(
        "relative isolate overflow-hidden bg-landing-canvas py-14 lg:py-20",
        isStandalone && "min-h-[85vh] flex items-center",
        className
      )}
    >
      <Container>
        <div className="mx-auto max-w-6xl">
          {/* Section Header */}
          <div className="flex flex-col items-center text-center mb-10 lg:mb-14">
            <Reveal variant="text" className="flex flex-col items-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-stone-200/90 bg-white/90 px-3.5 py-1.5 shadow-soft-8 backdrop-blur-md mb-3">
                <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold tracking-wide text-stone-700 uppercase">
                  Early Access Beta · Đợt 1
                </span>
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-bold text-stone-600">
                  427 / 500 Suất
                </span>
              </div>

              <h2 className="font-landing-heading text-3xl font-bold tracking-tight text-landing-ink lg:text-4xl">
                Danh Sách Chờ Trải Nghiệm Sớm WrapFit
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-landing-muted lg:text-lg">
                Đăng ký để nhận quyền truy cập Studio 3D đầu tiên tại Việt Nam, thiết kế hộp quà vừa khít từng milimét và nhận tài trợ{" "}
                <strong className="text-stone-900 font-semibold">01 hộp in mẫu thử thực tế</strong> gửi tận nơi.
              </p>

              {/* Mode toggles for verifying the Skeleton Loading effect */}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsLoading((prev) => !prev)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all shadow-sm border",
                    isLoading
                      ? "bg-landing-ink text-white border-landing-ink ring-2 ring-landing-ink/20"
                      : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
                  )}
                  title="Bấm để bật/tắt hiển thị khung xương skeleton loader"
                >
                  <Sparkles className="size-3.5 text-amber-500" />
                  {isLoading ? "Đang bật Skeleton Loader" : "Xem hiệu ứng Skeleton Loading"}
                </button>

                <button
                  type="button"
                  onClick={handleSimulateLoading}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-medium text-stone-700 border border-stone-200 shadow-sm hover:bg-stone-50 transition-colors"
                  title="Mô phỏng tải lại dữ liệu trong 1.2s"
                >
                  <RefreshCw className={cn("size-3.5 text-blue-600", isLoading && "animate-spin")} />
                  Mô phỏng Tải lại (1.2s)
                </button>
              </div>
            </Reveal>
          </div>

          {/* Grid Layout: Left is Queue / Skeleton, Right is Join Waitlist Card */}
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-10">
            {/* Left Column (lg:col-span-7): The Waitlist Card or Skeleton */}
            <div className="lg:col-span-7 flex flex-col items-center lg:items-start w-full">
              {isLoading ? (
                /* The exact skeleton matching user's image media_1791984648163_807dc247.png */
                <WaitlistSkeleton className="w-full" rowCount={5} />
              ) : (
                /* Loaded Live Queue View */
                <div className="w-full max-w-xl flex flex-col gap-6">
                  {/* Top Header Section */}
                  <div className="flex flex-col gap-3">
                    {/* Icon + Title */}
                    <div className="flex items-center gap-3">
                      <div className="flex size-11 sm:size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1A362B] to-[#2D5A27] text-white shadow-soft-8 ring-1 ring-black/5">
                        <Gift className="size-6 text-landing-lime" />
                      </div>
                      <div>
                        <h3 className="font-landing-heading text-xl sm:text-2xl font-bold text-landing-ink">
                          Hàng Chờ Ưu Tiên (Live Queue)
                        </h3>
                        <p className="text-xs sm:text-sm text-landing-muted">
                          Cập nhật thời gian thực · Xét duyệt theo thứ tự đăng ký
                        </p>
                      </div>
                    </div>

                    {/* Subtitle description bar */}
                    <div className="flex items-center gap-2 text-xs text-stone-500">
                      <Clock className="size-3.5 text-stone-400" />
                      <span>Đợt xét duyệt kế tiếp: 08:00 sáng mai</span>
                    </div>

                    {/* Action Pill Button */}
                    <div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 border border-emerald-200/80">
                        <Users className="size-3.5" />
                        5 vị trí dẫn đầu hôm nay
                      </span>
                    </div>
                  </div>

                  {/* Main Card with 5 Rows */}
                  <div className="overflow-hidden rounded-2xl sm:rounded-3xl border border-stone-200/80 bg-white shadow-soft-8 divide-y divide-stone-100">
                    {MOCK_WAITLIST_ITEMS.map((item) => (
                      <div
                        key={item.rank}
                        className="flex items-center gap-3.5 p-3.5 sm:p-4 hover:bg-stone-50/70 transition-colors"
                      >
                        {/* Rank Badge / Avatar */}
                        <div
                          className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold",
                            item.avatarBg
                          )}
                        >
                          #{item.rank < 10 ? `0${item.rank}` : item.rank}
                        </div>

                        {/* Text columns */}
                        <div className="flex flex-1 flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-stone-900 truncate">
                              {item.name}
                            </span>
                            <span className="hidden sm:inline-block rounded bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-600 font-medium">
                              {item.category}
                            </span>
                          </div>
                          <p className="text-xs text-stone-500 truncate mt-0.5">
                            {item.perk} · <span className="text-stone-400">{item.location}</span>
                          </p>
                        </div>

                        {/* Status Chip */}
                        <div className="shrink-0">
                          {item.status === "active" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 border border-emerald-200/60">
                              <CheckCircle2 className="size-3" />
                              <span className="hidden sm:inline">Đã kích hoạt</span>
                            </span>
                          ) : item.status === "processing" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 border border-blue-200/60">
                              <Clock className="size-3" />
                              <span className="hidden sm:inline">Đang duyệt</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 border border-amber-200/60">
                              <Clock className="size-3" />
                              <span className="hidden sm:inline">Chờ đợt 1</span>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column (lg:col-span-5): Registration Form & Copilot Mascot */}
            <div className="lg:col-span-5 w-full">
              <div className="relative overflow-hidden rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-soft-16">
                {/* Subtle Kraft texture overlay */}
                <div className="absolute top-0 right-0 -mt-8 -mr-8 size-40 rounded-full bg-amber-500/5 blur-2xl pointer-events-none" />

                {submittedRank ? (
                  /* Success State after Signup */
                  <div className="flex flex-col items-center text-center py-4">
                    <div className="relative mb-4">
                      <GoiMascot
                        pose="celebration"
                        size={110}
                        bubbleText="Chúc mừng bạn! Gói đã ghi nhận vị trí ưu tiên."
                        bubblePlacement="top"
                        label="Bé Gói ăn mừng thành công"
                      />
                    </div>

                    <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 mb-2">
                      <CheckCircle2 className="size-3.5" />
                      Đăng Ký Thành Công!
                    </div>

                    <h4 className="font-landing-heading text-2xl font-bold text-stone-900">
                      Bạn đang ở vị trí #{submittedRank}
                    </h4>
                    <p className="mt-2 text-sm text-stone-600 max-w-sm">
                      Chúng tôi sẽ gửi email thông báo và mã kích hoạt gói in mẫu thử 01 hộp miễn phí đến{" "}
                      <strong className="text-stone-900">{email}</strong> ngay khi mở đợt Beta.
                    </p>

                    {/* Referral link card */}
                    <div className="mt-6 w-full rounded-2xl border border-stone-200 bg-stone-50 p-4 text-left">
                      <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                        Link giới thiệu nhận ưu tiên
                      </label>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Mỗi bạn bè tham gia qua link của bạn giúp bạn nhảy vọt 10 bậc!
                      </p>
                      <div className="mt-2.5 flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value="https://wrapfit.vn/waitlist?ref=WF-428"
                          aria-label="Link giới thiệu nhận ưu tiên"
                          className="flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-mono text-stone-700 outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleCopyLink}
                          className="inline-flex items-center gap-1 rounded-xl bg-landing-ink px-3 py-2 text-xs font-medium text-white hover:bg-stone-800 transition-colors"
                        >
                          {copied ? (
                            <>
                              <CheckCircle2 className="size-3.5 text-emerald-400" />
                              Đã chép
                            </>
                          ) : (
                            <>
                              <Copy className="size-3.5" />
                              Sao chép
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSubmittedRank(null)}
                      className="mt-6 text-xs text-stone-500 hover:text-stone-800 underline transition-colors"
                    >
                      Đăng ký email khác
                    </button>
                  </div>
                ) : (
                  /* Waitlist Form */
                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <Eyebrow className="text-stone-500">Quyền Lợi Đăng Ký Sớm</Eyebrow>
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/80">
                        Miễn phí 100%
                      </span>
                    </div>

                    <h3 className="font-landing-heading text-xl sm:text-2xl font-bold text-stone-900">
                      Gia Nhập Danh Sách Chờ Ngay
                    </h3>

                    <ul className="space-y-2 text-xs sm:text-sm text-stone-600 mb-1">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                        <span>Mở khóa trước toàn bộ 4 cấu trúc hộp & Studio 3D</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                        <span>Tài trợ 01 hộp mẫu thực tế gửi tận tay kiểm định</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                        <span>Trợ lý AI Bé Gói hỗ trợ FitCheck™ tự động sửa lỗi</span>
                      </li>
                    </ul>

                    {/* Email Input */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-stone-700">Email của bạn hoặc Shop</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tenban@gmail.com hoặc shop@domain.com"
                        className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:border-landing-ink focus:ring-2 focus:ring-landing-ink/10 transition-all"
                      />
                    </div>

                    {/* Industry / Category selector */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-stone-700">Ngành hàng bạn muốn làm hộp</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 outline-none focus:border-landing-ink focus:ring-2 focus:ring-landing-ink/10 transition-all cursor-pointer"
                      >
                        <option value="Mỹ phẩm & Nến thơm">Mỹ phẩm & Nến thơm</option>
                        <option value="Trang sức & Phụ kiện">Trang sức & Phụ kiện</option>
                        <option value="Trà, Cà phê & Nông sản">Trà, Cà phê & Nông sản</option>
                        <option value="Bánh ngọt & Thực phẩm">Bánh ngọt & Thực phẩm</option>
                        <option value="Quà tặng doanh nghiệp / Tết">Quà tặng doanh nghiệp / Tết</option>
                        <option value="Xưởng in / Gia công bao bì">Xưởng in / Gia công bao bì</option>
                      </select>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className={cn(
                        limeButton(),
                        "mt-2 w-full justify-center shadow-soft-8 font-semibold text-sm",
                        isLoading && "opacity-60 cursor-not-allowed"
                      )}
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="size-4 animate-spin" />
                          Đang xếp vị trí hàng chờ...
                        </>
                      ) : (
                        <>
                          Gia Nhập Danh Sách Chờ
                          <ArrowRight className="size-4" />
                        </>
                      )}
                    </button>

                    <p className="text-center text-[11px] text-stone-400">
                      Không spam. Thông tin của bạn được bảo mật theo tiêu chuẩn WrapFit.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
