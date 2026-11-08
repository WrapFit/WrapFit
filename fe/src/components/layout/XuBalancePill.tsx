'use client';

import { useQuery } from '@tanstack/react-query';
import { Coins, Plus, ChevronRight, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';
import { XU_PACKS, XU_VALUE_VND, type XuPackId } from '@wrapfit/shared';
import { getBillingSummary } from '@/api/payments';
import { CheckoutDialog } from '@/features/payments';
import { formatVnd } from '@/features/pricing';
import { queryKeys } from '@/hooks/data';
import { useAuth, isRealAdmin } from '@/features/auth';
import { useHydrated } from '@/hooks/dom';
import type { XuPackPurpose } from '@/types/api';
import { cn } from '@/utils/helpers';

const PACK_LIST = (Object.keys(XU_PACKS) as XuPackId[]).map((id) => XU_PACKS[id]);

export interface XuBalancePillProps {
  className?: string;
}

/**
 * Authentic WrapFit Xu Wrap balance pill on the site header (pack.ly style).
 * Sits alongside ProjectsPill with identical geometry, clean paper-white surfaces, and FPT Orange accents.
 */
export function XuBalancePill({ className }: XuBalancePillProps) {
  const { user } = useAuth();
  const hydrated = useHydrated();
  const [isOpen, setIsOpen] = useState(false);
  const [buying, setBuying] = useState<XuPackPurpose | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const billing = useQuery({
    queryKey: queryKeys.billing,
    queryFn: getBillingSummary,
    enabled: !!user && hydrated,
    staleTime: 30_000,
  });

  const wallet = billing.data?.xu;
  const balance = wallet?.balance;
  const isLow = balance !== undefined && balance < 20;

  // Close popover on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!hydrated || !user || isRealAdmin(user)) return null;

  return (
    <>
      <div ref={containerRef} className={cn('relative inline-flex items-center', className)}>
        {/* Trigger Pill — Matching pack.ly ProjectsPill geometry */}
        <div
          className={cn(
            'inline-flex h-10 items-center gap-1.5 rounded-full bg-landing-tile pl-3 pr-1 text-landing-ink transition-colors hover:bg-landing-accent',
            isOpen && 'bg-landing-accent ring-1 ring-landing-line'
          )}
        >
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            aria-label={balance !== undefined ? `Ví xu Wrap: ${balance.toLocaleString('vi-VN')} xu` : 'Ví xu Wrap'}
            className="flex items-center gap-2 outline-none focus-visible:ring-[3px] focus-visible:ring-landing-ink/20 rounded-full py-1"
          >
            <Coins className="size-[18px] text-fpt-orange-ink" strokeWidth={1.75} aria-hidden />
            <span
              className={cn(
                'inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-white px-2.5 text-xs font-semibold font-mono tabular-nums',
                isLow ? 'text-danger-fg' : 'text-landing-ink'
              )}
            >
              {balance !== undefined ? `${balance.toLocaleString('vi-VN')} xu` : '–'}
            </span>
          </button>

          {/* Quick Top-up Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              setBuying('XU_500');
            }}
            title="Nạp thêm xu qua VietQR"
            aria-label="Nạp thêm xu"
            className="flex size-7 items-center justify-center rounded-full bg-fpt-orange text-white transition-colors hover:bg-fpt-orange-dark outline-none focus-visible:ring-[3px] focus-visible:ring-fpt-orange/40"
          >
            <Plus className="size-3.5 stroke-[2.5]" aria-hidden />
          </button>
        </div>

        {/* Clean Paper Popover — pack.ly & pacdora aesthetic */}
        {isOpen && (
          <div
            role="dialog"
            aria-label="Chi tiết ví xu Wrap"
            className="absolute right-0 top-full mt-2 w-[340px] rounded-sheet border border-landing-line/80 bg-white p-4 shadow-popover z-50 animate-in fade-in-50 zoom-in-95 duration-150"
          >
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-landing-line/60 pb-3">
              <div>
                <div className="flex items-center gap-1.5 font-landing-heading text-sm font-bold text-landing-ink">
                  <Coins className="size-4 text-fpt-orange-ink" strokeWidth={2} aria-hidden />
                  <span>Ví xu Wrap</span>
                </div>
                <span className="text-caption text-landing-muted block mt-0.5">Dùng cho ảnh và hoa văn AI</span>
              </div>
              <Link
                href="/dashboard/billing"
                onClick={() => setIsOpen(false)}
                className="text-xs font-medium text-fpt-orange-ink hover:underline flex items-center gap-0.5"
              >
                Lịch sử
                <ChevronRight className="size-3" aria-hidden />
              </Link>
            </div>

            {/* Current Balance Display — Clean white surface */}
            <div className="my-3 rounded-panel border border-landing-line/60 bg-surface-sunken p-3">
              <div className="flex items-baseline justify-between text-xs text-landing-muted">
                <span>Số dư khả dụng</span>
                {balance !== undefined && (
                  <span className="font-mono text-landing-muted">
                    ≈ {formatVnd(balance * XU_VALUE_VND)}
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-baseline gap-1.5 font-mono text-2xl font-bold tabular-nums text-landing-ink">
                {balance !== undefined ? balance.toLocaleString('vi-VN') : '–'}
                <span className="text-xs font-normal text-landing-muted font-sans">xu</span>
              </div>
              {wallet?.allowance && (
                <div className="mt-2 pt-2 border-t border-landing-line/40 text-caption text-landing-muted leading-tight">
                  Gói cộng <strong className="text-landing-ink font-semibold">{wallet.allowance.perPeriod.toLocaleString('vi-VN')} xu</strong> mỗi kỳ (cấp lại{' '}
                  {new Date(wallet.allowance.resetsAt).toLocaleDateString('vi-VN')}).
                </div>
              )}
            </div>

            {/* Quick Top-up Packs — Pacdora hairline tiles */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-landing-ink">Nạp xu qua VietQR</span>
                <span className="text-caption font-mono text-landing-muted">1 xu = 100đ</span>
              </div>

              <div className="space-y-1.5">
                {PACK_LIST.map((pack) => {
                  const bonus = pack.xu - pack.priceVnd / XU_VALUE_VND;
                  const isPopular = pack.id === 'XU_1050';

                  return (
                    <button
                      key={pack.id}
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        setBuying(pack.id);
                      }}
                      className={cn(
                        'group flex w-full items-center justify-between rounded-xl border p-2.5 text-left text-xs transition-all',
                        isPopular
                          ? 'border-fpt-orange/50 bg-fpt-orange-light/20 hover:border-fpt-orange hover:shadow-hard-sm'
                          : 'border-landing-line bg-white hover:border-landing-ink/30 hover:shadow-hard-sm'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-landing-ink tabular-nums">
                          {pack.xu.toLocaleString('vi-VN')} xu
                        </span>
                        {bonus > 0 && (
                          <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 text-label-sm font-medium">
                            +{bonus} xu
                          </span>
                        )}
                        {isPopular && (
                          <span className="rounded-full bg-fpt-orange px-1.5 py-0.2 text-label-sm font-semibold text-white">
                            Phổ biến
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="font-mono font-semibold text-landing-ink">
                          {formatVnd(pack.priceVnd)}
                        </span>
                        <ChevronRight className="size-3 text-landing-muted group-hover:text-landing-ink transition-colors" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer usage note */}
            <div className="mt-3 border-t border-landing-line/60 pt-2 flex items-center justify-between text-caption text-landing-muted">
              <span>Lỗi hệ thống hoàn xu 100%</span>
              <Link
                href="/pricing#xu-wrap"
                onClick={() => setIsOpen(false)}
                className="hover:text-fpt-orange-ink inline-flex items-center gap-0.5 font-medium"
              >
                Bảng giá
                <ExternalLink className="size-2.5" aria-hidden />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* VietQR Checkout Modal */}
      {buying && (
        <CheckoutDialog
          purpose={buying}
          onClose={() => setBuying(null)}
        />
      )}
    </>
  );
}
