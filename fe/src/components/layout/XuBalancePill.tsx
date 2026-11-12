'use client';

import { useQuery } from '@tanstack/react-query';
import { Coins, Plus, ChevronRight, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';
import { XU_CUSTOM, XU_PACKS, XU_VALUE_VND, customXuError, customXuPriceVnd, type XuPackId } from '@wrapfit/shared';
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
  const [buying, setBuying] = useState<{ purpose: XuPackPurpose | 'XU_CUSTOM'; xu?: number } | null>(null);
  const [custom, setCustom] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);
  const customXu = custom === '' ? null : Number(custom);
  const customError = customXu === null ? null : customXuError(customXu);

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
              // Opens the packs and the amount field: the user picks how much, nothing is bought on this click.
              setIsOpen(true);
              window.setTimeout(() => customInputRef.current?.focus(), 0);
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
                href="/dashboard/wallet"
                onClick={() => setIsOpen(false)}
                className="text-xs font-medium text-fpt-orange-ink hover:underline flex items-center gap-0.5"
              >
                Mở ví
                <ChevronRight className="size-3" aria-hidden />
              </Link>
            </div>

            {/* Current Balance Display — Clean white surface */}
            <div className="my-3 rounded-panel border border-landing-line/60 bg-surface-sunken p-3">
              <div className="flex items-baseline justify-between text-xs text-landing-muted">
                <span>Số dư khả dụng</span>
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
                        setBuying({ purpose: pack.id });
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

            {/* Any number of xu, at the list price (the packs above carry a bonus) */}
            <form
              className="mt-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (customXu === null || customError) return;
                setIsOpen(false);
                setBuying({ purpose: 'XU_CUSTOM', xu: customXu });
                setCustom('');
              }}
            >
              <label htmlFor="xu-pill-custom" className="mb-1.5 block text-xs font-semibold text-landing-ink">
                Hoặc nhập số xu
              </label>
              <div className="flex gap-1.5">
                <input
                  id="xu-pill-custom"
                  ref={customInputRef}
                  type="number"
                  inputMode="numeric"
                  min={XU_CUSTOM.min}
                  max={XU_CUSTOM.max}
                  step={XU_CUSTOM.step}
                  placeholder={`${XU_CUSTOM.min}–${XU_CUSTOM.max.toLocaleString('vi-VN')} xu`}
                  value={custom}
                  onChange={(e) => setCustom(e.target.value.replace(/[^\d]/g, ''))}
                  aria-invalid={customError ? true : undefined}
                  aria-describedby={customError ? 'xu-pill-custom-error' : undefined}
                  className="h-9 min-w-0 flex-1 rounded-xl border border-landing-line bg-white px-3 font-mono text-xs tabular-nums text-landing-ink outline-none focus-visible:border-fpt-orange focus-visible:ring-[3px] focus-visible:ring-fpt-orange/20"
                />
                <button
                  type="submit"
                  disabled={customXu === null || customError !== null}
                  className="h-9 shrink-0 rounded-xl bg-fpt-orange px-3 text-xs font-semibold text-white transition-colors hover:bg-fpt-orange-dark disabled:opacity-50"
                >
                  {customXu !== null && !customError ? `Nạp ${formatVnd(customXuPriceVnd(customXu))}` : 'Nạp'}
                </button>
              </div>
              {customError && (
                <p id="xu-pill-custom-error" className="mt-1 text-caption text-danger-fg">
                  {customError}
                </p>
              )}
            </form>

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
          purpose={buying.purpose}
          xu={buying.xu}
          onClose={() => setBuying(null)}
        />
      )}
    </>
  );
}
