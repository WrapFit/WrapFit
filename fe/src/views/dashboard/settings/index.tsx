'use client';

/**
 * Stitch screen `dashboard-settings`, status "wired" (`stitch:sync` keeps this file). Wired: the profile card
 * (`useAuth()`), "Đổi mật khẩu" (reset link by email), "Đăng xuất mọi thiết bị" and the storage meter
 * (`GET /storage/usage`). The CAD preferences, toggles and the save dock have no API: they behave as in the Stitch
 * screen, locally only (D6). React replaces the screen's script, so there is no StitchRuntime.
 */

import Link from 'next/link';
import React, { useEffect, useId, useRef, useState } from 'react';
import { ErrorState } from '@/components/common/StatusViews';
import { DashboardHeaderNav } from '@/components/layout/DashboardHeaderNav';
import { MainFooter } from '@/components/layout/MainFooter';
import { MainHeader } from '@/components/layout/MainHeader';
import { displayName, initialsOf } from '@/components/layout/account';
import { ROLE_LABELS, ROUTES, TIER_LABELS } from '@/constants';
import { RequireAuth, useAuth } from '@/features/auth';
import { ConfirmDialog, formatBytes, formatCount, usagePercent, useStorageUsage } from '@/features/dashboard';
import { useLogoutAllDevices, usePasswordResetLink } from '@/features/settings';
import type { SafeUser } from '@/types/api';

export default function DashboardSettingsPage() {
  return (
    <RequireAuth>
      <DashboardSettingsScreen />
    </RequireAuth>
  );
}

type Tab = 'account' | 'cad' | 'storage';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'account', label: 'Tài Khoản & Hồ Sơ', icon: 'person' },
  { id: 'cad', label: 'Cài Đặt Hệ Thống & CAD', icon: 'square_foot' },
  { id: 'storage', label: 'Bộ Nhớ & Cloud Vault', icon: 'cloud' },
];

const TAB_ACTIVE =
  'tab-btn shrink-0 whitespace-nowrap min-h-[44px] md:min-h-0 px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 bg-white text-on-surface shadow-xs focus-visible:ring-2 focus-visible:ring-primary/40';
const TAB_IDLE =
  'tab-btn shrink-0 whitespace-nowrap min-h-[44px] md:min-h-0 px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-2 text-stone-600 hover:text-stone-900 focus-visible:ring-2 focus-visible:ring-primary/40';
const OPTION_ACTIVE =
  'min-h-[36px] px-3 py-1 rounded-lg bg-white text-primary font-cad-mono text-xs font-semibold shadow-xs';
const OPTION_IDLE =
  'min-h-[36px] px-3 py-1 rounded-lg text-stone-600 hover:text-stone-900 font-cad-mono text-xs transition-colors';
const ROW_ACTION =
  'min-h-[44px] px-3 -mr-3 rounded-xl text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60 disabled:cursor-wait';

/** Local-only switches of the Stitch screen (no settings API yet). */
const DEFAULT_PREFERENCES = {
  cadGrid: true,
  unbox: true,
  snapshot: true,
  unit: 'mm',
  kFactor: 'K-0.45',
  format: 'DXF',
};

function DashboardSettingsScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('account');
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [saved, setSaved] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false);
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ account: null, cad: null, storage: null });
  const panelId = useId();

  // "Lưu Cài Đặt" and ⌘S only flash a confirmation, as in the Stitch screen: these preferences are not stored yet.
  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(false), 1200);
    return () => window.clearTimeout(timer);
  }, [saved]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        setSaved(true);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  if (!user) return null;

  const set = <K extends keyof typeof DEFAULT_PREFERENCES>(key: K, value: (typeof DEFAULT_PREFERENCES)[K]) =>
    setPreferences((current) => ({ ...current, [key]: value }));

  const onTabKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const index = TABS.findIndex((item) => item.id === tab);
    const next = TABS[(index + (event.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length].id;
    setTab(next);
    tabRefs.current[next]?.focus();
  };

  const toggle = (key: 'cadGrid' | 'unbox' | 'snapshot', label: string) => {
    const on = preferences[key];
    return (
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => set(key, !on)}
        className={`toggle-btn shrink-0 w-11 h-6 rounded-full p-0.5 flex items-center transition-colors relative focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 ${
          on ? 'bg-primary' : 'bg-stone-300'
        }`}
      >
        <span
          className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${on ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
    );
  };

  const options = <K extends 'unit' | 'kFactor' | 'format'>(key: K, values: string[], label: string) => (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex items-center p-1 bg-stone-100 rounded-xl gap-1 border border-stone-200/60"
    >
      {values.map((value) => {
        const active = preferences[key] === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => set(key, value)}
            className={active ? OPTION_ACTIVE : OPTION_IDLE}
          >
            {value}
          </button>
        );
      })}
    </div>
  );

  return (
    <div
      data-stitch="dashboard-settings"
      className="bg-background font-body-md text-on-surface antialiased relative min-h-screen selection:bg-blue-100 selection:text-primary pb-36"
    >
      {/* Top Apple Floating Navigation Bar */} <MainHeader /> {/* Main Content Wrapper */}{' '}
      <main className="relative z-10 w-full pt-28 px-4 sm:px-6 md:px-8 max-w-5xl 2xl:max-w-6xl mx-auto pb-24 flex-1">
        <div className="mb-8">
          <DashboardHeaderNav />
        </div>
        {/* Clean Apple Title Header */}
        <div className="text-center max-w-xl mx-auto mb-8">
          <h1 className="font-headline-lg text-3xl sm:text-4xl text-on-surface tracking-tight font-medium">
            {' Cài Đặt Hệ Thống '}
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-2 font-normal">
            {' Quản lý hồ sơ thiết kế, thông số kỹ thuật CAD và đồng bộ Cloud Vault. '}
          </p>
        </div>
        {/* macOS/iOS Style Segmented Category Switcher */}
        <div className="flex justify-center mb-8">
          <div
            role="tablist"
            aria-label="Nhóm cài đặt"
            onKeyDown={onTabKeyDown}
            className="relative inline-flex max-w-full overflow-x-auto p-1 bg-stone-200/60 backdrop-blur-md rounded-2xl border border-stone-200/80 shadow-xs"
          >
            {TABS.map((item) => (
              <button
                key={item.id}
                ref={(element) => {
                  tabRefs.current[item.id] = element;
                }}
                type="button"
                role="tab"
                id={`${panelId}-${item.id}-tab`}
                aria-selected={tab === item.id}
                aria-controls={`${panelId}-${item.id}`}
                tabIndex={tab === item.id ? 0 : -1}
                onClick={() => setTab(item.id)}
                className={tab === item.id ? TAB_ACTIVE : TAB_IDLE}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ================= SUB-VIEW 1: TÀI KHOẢN & HỒ SƠ ================= */}
        <div
          role="tabpanel"
          id={`${panelId}-account`}
          aria-labelledby={`${panelId}-account-tab`}
          hidden={tab !== 'account'}
          className="tab-content transition-opacity duration-200 space-y-4"
        >
          <AccountCard user={user} onLogoutAll={() => setConfirmLogoutAll(true)} />
        </div>

        {/* ================= SUB-VIEW 2: CÀI ĐẶT HỆ THỐNG & CAD (local only, D6) ================= */}
        <div
          role="tabpanel"
          id={`${panelId}-cad`}
          aria-labelledby={`${panelId}-cad-tab`}
          hidden={tab !== 'cad'}
          className="tab-content transition-opacity duration-200 space-y-3"
        >
          <div className="apple-card rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shadow-[0_2px_16px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="material-symbols-outlined text-stone-600 text-[20px]">
                straighten
              </span>
              <span className="text-xs sm:text-sm font-medium text-stone-900">Đơn Vị Đo Chuẩn</span>
            </div>
            {options('unit', ['mm', 'cm', 'inch'], 'Đơn vị đo chuẩn')}
          </div>
          <div className="apple-card rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3 shadow-[0_2px_16px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="material-symbols-outlined text-stone-600 text-[20px]">
                grid_4x4
              </span>
              <span className="text-xs sm:text-sm font-medium text-stone-900">Hiển Thị Lưới Dieline CAD</span>
            </div>
            {toggle('cadGrid', 'Hiển thị lưới Dieline CAD')}
          </div>
          <div className="apple-card rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shadow-[0_2px_16px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="material-symbols-outlined text-stone-600 text-[20px]">
                tune
              </span>
              <span className="text-xs sm:text-sm font-medium text-stone-900">Bù Caliper Nếp Cấn (K-Factor)</span>
            </div>
            {options('kFactor', ['K-0.45', 'K-0.68'], 'Bù caliper nếp cấn')}
          </div>
          <div className="apple-card rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3 shadow-[0_2px_16px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="material-symbols-outlined text-stone-600 text-[20px]">
                view_in_ar
              </span>
              <span className="text-xs sm:text-sm font-medium text-stone-900">Mở Nắp Tự Động Khi Xem 3D</span>
            </div>
            {toggle('unbox', 'Mở nắp tự động khi xem 3D')}
          </div>
          <div className="apple-card rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shadow-[0_2px_16px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="material-symbols-outlined text-stone-600 text-[20px]">
                output
              </span>
              <span className="text-xs sm:text-sm font-medium text-stone-900">Tiêu Chuẩn Xuất File Chế Bản</span>
            </div>
            {options('format', ['DXF', 'PDF', 'EPS'], 'Tiêu chuẩn xuất file chế bản')}
          </div>
        </div>

        {/* ================= SUB-VIEW 3: BỘ NHỚ & CLOUD VAULT ================= */}
        <div
          role="tabpanel"
          id={`${panelId}-storage`}
          aria-labelledby={`${panelId}-storage-tab`}
          hidden={tab !== 'storage'}
          className="tab-content transition-opacity duration-200 space-y-4"
        >
          <div className="apple-card rounded-2xl p-6 shadow-[0_2px_16px_rgba(0,0,0,0.02)] space-y-6">
            {/* Storage Meter */}
            <StorageMeter />
            <div className="divide-y divide-stone-100 pt-2 border-t border-stone-100">
              {/* Toggle Snapshot (local only) */}
              <div className="py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span aria-hidden="true" className="material-symbols-outlined text-stone-600 text-[20px]">
                    sync
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-stone-900">Tự Động Snapshot Bản Vẽ</span>
                </div>
                {toggle('snapshot', 'Tự động snapshot bản vẽ')}
              </div>
              {/* Clean Cache Action (local only) */}
              <div className="py-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span aria-hidden="true" className="material-symbols-outlined text-stone-600 text-[20px]">
                    delete_sweep
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-stone-900">Dọn Dẹp Bộ Nhớ Đệm (Cache 3D)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCacheCleared(true)}
                  className={`min-h-[44px] px-3.5 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
                    cacheCleared
                      ? 'text-emerald-700 border-emerald-200 bg-emerald-50'
                      : 'border-stone-200 text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  {cacheCleared ? ' Đã Dọn Dẹp (0 B) ' : ' Dọn Dẹp (1.4 GB) '}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
      {/* LUXURY FLOATING BOTTOM ACTION DOCK: above the mobile bottom navigation */}
      <footer className="fixed bottom-24 md:bottom-6 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
        <div className="pointer-events-auto h-13 px-3 py-1.5 flex items-center gap-3 rounded-full bg-forest-900 text-white shadow-[0_12px_32px_rgba(19,48,32,0.22)] border border-forest-800">
          <button
            type="button"
            onClick={() => setPreferences(DEFAULT_PREFERENCES)}
            className="min-h-[44px] px-4 py-2 rounded-full text-xs font-medium text-emerald-200/90 hover:text-white hover:bg-white/10 transition-colors"
          >
            {' Khôi Phục Mặc Định '}
          </button>
          <div className="h-4 w-px bg-white/20" />
          <button
            type="button"
            onClick={() => setSaved(true)}
            className={`min-h-[44px] px-5 py-2 rounded-full text-forest-900 text-xs font-semibold hover:bg-emerald-50 transition-colors shadow-xs flex items-center gap-2 ${
              saved ? 'bg-emerald-200' : 'bg-white'
            }`}
          >
            <span aria-live="polite">{saved ? 'Đã Lưu!' : 'Lưu Cài Đặt'}</span>
            <kbd className="hidden sm:inline px-1.5 py-0.5 text-[10px] bg-stone-100 rounded font-cad-mono text-stone-700 leading-none">
              ⌘S
            </kbd>
          </button>
        </div>
      </footer>
      <MainFooter />
      {confirmLogoutAll && <LogoutAllDialog email={user.email} onClose={() => setConfirmLogoutAll(false)} />}
    </div>
  );
}

/** Profile card and security rows of the account tab. */
function AccountCard({ user, onLogoutAll }: { user: SafeUser; onLogoutAll(): void }) {
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
  const reset = usePasswordResetLink(user.email);
  const name = displayName(user);

  return (
    <div className="apple-card rounded-2xl p-6 shadow-[0_2px_16px_rgba(0,0,0,0.02)]">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-stone-100">
        <div className="flex items-center gap-4 min-w-0">
          <div className="relative w-16 h-16 rounded-2xl overflow-hidden ring-1 ring-stone-200/80 shadow-xs shrink-0">
            {user.avatarUrl && user.avatarUrl !== failedAvatar ? (
              <img
                alt={`Ảnh đại diện của ${name}`}
                className="w-full h-full object-cover"
                src={user.avatarUrl}
                referrerPolicy="no-referrer"
                onError={() => setFailedAvatar(user.avatarUrl)}
              />
            ) : (
              <span
                aria-hidden="true"
                className="w-full h-full bg-forest-900 text-white flex items-center justify-center text-lg font-semibold"
              >
                {initialsOf(name)}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-on-surface truncate">{name}</h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold tracking-wide uppercase">
                {TIER_LABELS[user.subscriptionTier]}
              </span>
            </div>
            <p className="text-xs text-stone-500 font-normal mt-0.5 truncate">{user.email}</p>
            <p className="text-[11px] text-stone-500 mt-0.5 truncate">{user.shopName || ROLE_LABELS[user.role]}</p>
          </div>
        </div>
        <Link
          href={ROUTES.profile}
          className="min-h-[44px] flex items-center px-3.5 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-xs font-medium text-stone-700 transition-colors"
        >
          {' Sửa Hồ Sơ '}
        </Link>
      </div>
      {/* Account Security Rows */}
      <div className="divide-y divide-stone-100">
        <div className="py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="material-symbols-outlined text-stone-500 text-[20px]">
              fingerprint
            </span>
            <span className="text-xs font-medium text-stone-800">{'Passkey & Touch ID'}</span>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            {' Đã Kích Hoạt '}
          </span>
        </div>
        <div className="py-3.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <div className="flex items-center gap-3 min-w-0">
            <span aria-hidden="true" className="material-symbols-outlined text-stone-500 text-[20px]">
              lock_reset
            </span>
            <div className="min-w-0">
              <span className="block text-xs font-medium text-stone-800">Mật Khẩu Studio</span>
              <span className="block text-[11px] text-stone-500">Gửi link đặt mật khẩu mới tới email của bạn</span>
            </div>
          </div>
          <button
            type="button"
            onClick={reset.send}
            disabled={reset.sending || reset.secondsLeft > 0}
            className={`${ROW_ACTION} text-primary enabled:hover:underline disabled:text-stone-500`}
          >
            {reset.sending
              ? 'Đang gửi…'
              : reset.secondsLeft > 0
                ? `Gửi lại sau ${reset.secondsLeft} giây`
                : 'Đổi Mật Khẩu'}
          </button>
        </div>
        <div className="py-3.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <div className="flex items-center gap-3 min-w-0">
            <span aria-hidden="true" className="material-symbols-outlined text-stone-500 text-[20px]">
              devices
            </span>
            <div className="min-w-0">
              <span className="block text-xs font-medium text-stone-800">Phiên Đăng Nhập</span>
              <span className="block text-[11px] text-stone-500">Kết thúc mọi phiên, kể cả trình duyệt này</span>
            </div>
          </div>
          <button type="button" onClick={onLogoutAll} className={`${ROW_ACTION} text-[#ba1a1a] hover:bg-[#ffdad6]/50`}>
            Đăng Xuất Mọi Thiết Bị
          </button>
        </div>
        <div className="py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="material-symbols-outlined text-stone-500 text-[20px]">
              groups
            </span>
            <span className="text-xs font-medium text-stone-800">Thành Viên Nhóm</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500">4 Thành viên</span>
            <span aria-hidden="true" className="material-symbols-outlined text-stone-400 text-[18px]">
              chevron_right
            </span>
          </div>
        </div>
        <div className="py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="material-symbols-outlined text-stone-500 text-[20px]">
              key
            </span>
            <span className="text-xs font-medium text-stone-800">Mã API Xưởng In CNC</span>
          </div>
          <div className="flex items-center gap-2 font-cad-mono text-xs text-stone-600 bg-stone-100 px-2.5 py-1 rounded-lg">
            <span>wrp_live_ecdsa_9942</span>
            <button
              className="hover:text-primary transition-colors"
              title="Sao chép"
              type="button"
              aria-label="Sao chép mã API"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                content_copy
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const PERCENT = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

/** `GET /storage/usage`: used / quota of the plan, in the meter markup of the Stitch screen. */
function StorageMeter() {
  const usage = useStorageUsage();

  if (usage.isPending) {
    return (
      <div aria-busy="true" className="space-y-2">
        <span role="status" className="sr-only">
          Đang tải dung lượng…
        </span>
        <div
          aria-hidden="true"
          className="h-5 w-1/2 rounded-full bg-stone-100 animate-pulse motion-reduce:animate-none"
        />
        <div
          aria-hidden="true"
          className="h-2 w-full rounded-full bg-stone-100 animate-pulse motion-reduce:animate-none"
        />
      </div>
    );
  }
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
  const bar = percent >= 95 ? 'bg-[#EE5253]' : percent >= 80 ? 'bg-amber-500' : 'bg-emerald-600';
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="material-symbols-outlined text-stone-700 text-[20px]">
            cloud_done
          </span>
          <span className="text-xs sm:text-sm font-semibold text-stone-900">
            Dung Lượng Cloud Vault · {TIER_LABELS[tier]}
          </span>
        </div>
        <span className="font-cad-mono text-xs font-semibold text-stone-800">
          {formatBytes(usedBytes)} / {formatBytes(quotaBytes)}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Dung lượng đã dùng"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        className="w-full h-2 rounded-full bg-stone-100 overflow-hidden mb-2"
      >
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${percent}%` }} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500 font-cad-mono">
        <span>
          Đã dùng {PERCENT.format(percent)}% · {formatCount(fileCount)} tệp
        </span>
        <span>Còn trống {formatBytes(Math.max(0, quotaBytes - usedBytes))}</span>
      </div>
    </div>
  );
}

/** Ends every session of the account, this one too: the page then goes to the login screen. */
function LogoutAllDialog({ email, onClose }: { email: string; onClose(): void }) {
  const logoutAll = useLogoutAllDevices();
  return (
    <ConfirmDialog
      title="Đăng xuất khỏi mọi thiết bị?"
      icon="devices"
      confirmLabel="Đăng xuất tất cả"
      busyLabel="Đang đăng xuất…"
      busy={logoutAll.isPending}
      onClose={onClose}
      onConfirm={() => logoutAll.mutate()}
    >
      <p>
        Mọi phiên đăng nhập của <strong className="font-semibold text-stone-900 break-all">{email}</strong> sẽ kết thúc
        ngay, kể cả trình duyệt này. Bạn cần đăng nhập lại trên từng thiết bị.
      </p>
      <p>Dự án và tệp của bạn không bị ảnh hưởng.</p>
    </ConfirmDialog>
  );
}
