'use client';

/**
 * `/dashboard/settings` in the pacdora.com workspace style. Wired: "Đổi mật khẩu" (reset link by email,
 * `POST /auth/password/forgot`), "Đăng xuất mọi thiết bị" (`POST /auth/logout-all`) and the storage meter
 * (`GET /storage/usage`). The studio preferences have no API yet: they are kept in this browser only.
 */

import {
  ArrowRight,
  Box as BoxIcon,
  Cloud,
  FileOutput as FileIcon,
  FoldVertical as FoldIcon,
  Grid3x3 as GridIcon,
  History as HistoryIcon,
  KeyRound,
  LogOut,
  Ruler as RulerIcon,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { displayName } from '@/components/layout/account';
import { Avatar } from '@/components/ui';
import { outlineButton, primaryButton } from '@/components/library';
import { Badge, Meter, Panel, PanelTitle, SegmentedControl, Toggle, WorkspaceError, WorkspaceShell } from '@/components/workspace';
import { ROLE_LABELS, ROUTES, TIER_LABELS } from '@/constants';
import { RequireAuth, useAuth } from '@/features/auth';
import { ConfirmDialog, formatBytes, formatCount, usagePercent, useStorageUsage } from '@/features/dashboard';
import { useLogoutAllDevices, usePasswordResetLink } from '@/features/settings';
import type { SafeUser } from '@/types/api';
import { cn } from '@/utils/helpers';

export default function DashboardSettingsPage() {
  return (
    <RequireAuth>
      <DashboardSettingsScreen />
    </RequireAuth>
  );
}

type Tab = 'account' | 'studio' | 'storage';

const TABS: { value: Tab; label: string }[] = [
  { value: 'account', label: 'Tài khoản & bảo mật' },
  { value: 'studio', label: 'Studio' },
  { value: 'storage', label: 'Lưu trữ' },
];

/** Studio preferences: no settings API yet, so they live in this browser. */
const DEFAULT_PREFERENCES = {
  unit: 'mm' as 'mm' | 'cm' | 'inch',
  cadGrid: true,
  kFactor: 'K-0.45' as 'K-0.45' | 'K-0.68',
  unbox: true,
  snapshot: true,
  /** Formats of `POST /projects/:id/exports`. */
  format: 'PDF' as 'PDF' | 'SVG' | 'DXF',
};
type Preferences = typeof DEFAULT_PREFERENCES;
const STORAGE_KEY = 'wrapfit:studio-preferences';

function readPreferences(): Preferences {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as Partial<Preferences>) } : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function DashboardSettingsScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('account');
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false);
  if (!user) return null;

  return (
    <WorkspaceShell title="Cài đặt" description="Mật khẩu, phiên đăng nhập, tuỳ chọn studio và dung lượng lưu trữ.">
      <div className="flex flex-col gap-6">
        <SegmentedControl<Tab> tone="ink" label="Nhóm cài đặt" value={tab} onChange={setTab} options={TABS} />
        {tab === 'account' && (
          <>
            <AccountPanel user={user} />
            <SecurityPanel user={user} onLogoutAll={() => setConfirmLogoutAll(true)} />
          </>
        )}
        {tab === 'studio' && <StudioPanel />}
        {tab === 'storage' && <StoragePanel />}
      </div>
      {confirmLogoutAll && <LogoutAllDialog email={user.email} onClose={() => setConfirmLogoutAll(false)} />}
    </WorkspaceShell>
  );
}

/** One setting: icon, name, explanation, then its control on the right. */
function SettingRow({ icon: Icon, title, text, children }: { icon: LucideIcon; title: string; text?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-library-panel text-library-ink">
          <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-body font-medium text-library-ink">{title}</p>
          {text && <p className="text-sm text-library-sub">{text}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}

function AccountPanel({ user }: { user: SafeUser }) {
  const name = displayName(user);
  return (
    <Panel className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-4">
        <Avatar src={user.avatarUrl} name={name} size="2xl" decorative />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-lg font-medium text-library-ink">{name}</h2>
            <Badge tone="green">{TIER_LABELS[user.subscriptionTier]}</Badge>
          </div>
          <p className="truncate text-sm text-library-sub">{user.email}</p>
          <p className="truncate text-sm text-library-muted">{user.shopName || ROLE_LABELS[user.role]}</p>
        </div>
      </div>
      <Link href={ROUTES.profile} className={outlineButton}>
        Sửa hồ sơ
      </Link>
    </Panel>
  );
}

function SecurityPanel({ user, onLogoutAll }: { user: SafeUser; onLogoutAll(): void }) {
  const reset = usePasswordResetLink(user.email);
  return (
    <Panel>
      <PanelTitle>Bảo mật</PanelTitle>
      <div className="divide-y divide-library-line border-t border-library-line">
        <SettingRow icon={KeyRound} title="Mật khẩu" text={`Gửi link đặt mật khẩu mới tới ${user.email}. Link có hạn 30 phút.`}>
          <button type="button" onClick={reset.send} disabled={reset.sending || reset.secondsLeft > 0} className={cn(outlineButton, 'disabled:cursor-not-allowed')}>
            {reset.sending ? 'Đang gửi…' : reset.secondsLeft > 0 ? `Gửi lại sau ${reset.secondsLeft} giây` : 'Đổi mật khẩu'}
          </button>
        </SettingRow>
        <SettingRow icon={ShieldCheck} title="Xác thực hai bước" text="Nhập thêm mã 6 số khi đăng nhập trên thiết bị mới.">
          <Badge>Sắp ra mắt</Badge>
        </SettingRow>
        <SettingRow icon={LogOut} title="Phiên đăng nhập" text="Kết thúc mọi phiên, kể cả trình duyệt này.">
          <button type="button" onClick={onLogoutAll} className={cn(outlineButton, 'border-danger/30 text-danger-fg hover:bg-danger-bg')}>
            Đăng xuất mọi thiết bị
          </button>
        </SettingRow>
      </div>
    </Panel>
  );
}

function StudioPanel() {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [saved, setSaved] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const stored = readPreferences();
    setPreferences(stored);
    setSaved(stored);
  }, []);
  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(false), 1600);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const dirty = JSON.stringify(preferences) !== JSON.stringify(saved);
  const set = <K extends keyof Preferences>(key: K, value: Preferences[K]) => setPreferences((current) => ({ ...current, [key]: value }));
  const save = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Private window or blocked storage: the choice still applies until the page closes.
    }
    setSaved(preferences);
    setFlash(true);
  };

  // ⌘S / Ctrl+S saves, as in the editor.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        save();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  });

  return (
    <Panel>
      <PanelTitle action={<Badge>Lưu trên trình duyệt này</Badge>}>Tuỳ chọn studio</PanelTitle>
      <div className="divide-y divide-library-line border-t border-library-line">
        <SettingRow icon={RulerIcon} title="Đơn vị đo" text="Đơn vị của ô nhập kích thước và thước đo trên khuôn bế.">
          <SegmentedControl tone="ink" label="Đơn vị đo" value={preferences.unit} onChange={(value) => set('unit', value)} options={['mm', 'cm', 'inch'].map((v) => ({ value: v as Preferences['unit'], label: v }))} />
        </SettingRow>
        <SettingRow icon={GridIcon} title="Lưới khuôn bế" text="Hiện lưới milimét sau bản vẽ 2D.">
          <Toggle tone="ink" checked={preferences.cadGrid} onChange={(value) => set('cadGrid', value)} label="Hiện lưới khuôn bế" />
        </SettingRow>
        <SettingRow icon={FoldIcon} title="Bù độ dày nếp gấp (K-factor)" text="Khoảng bù tại nếp cấn theo độ dày giấy.">
          <SegmentedControl tone="ink" label="K-factor" value={preferences.kFactor} onChange={(value) => set('kFactor', value)} options={['K-0.45', 'K-0.68'].map((v) => ({ value: v as Preferences['kFactor'], label: v }))} />
        </SettingRow>
        <SettingRow icon={BoxIcon} title="Mở nắp khi xem 3D" text="Hộp 3D mở nắp sẵn khi vào studio.">
          <Toggle tone="ink" checked={preferences.unbox} onChange={(value) => set('unbox', value)} label="Mở nắp khi xem 3D" />
        </SettingRow>
        <SettingRow icon={HistoryIcon} title="Tự động lưu mốc phiên bản" text="Tạo một mốc khi bạn rời studio.">
          <Toggle tone="ink" checked={preferences.snapshot} onChange={(value) => set('snapshot', value)} label="Tự động lưu mốc phiên bản" />
        </SettingRow>
        <SettingRow icon={FileIcon} title="Định dạng xuất mặc định" text="PDF CMYK 300 DPI cho nhà in, SVG để chỉnh sửa, DXF cho máy cắt.">
          <SegmentedControl tone="ink" label="Định dạng xuất mặc định" value={preferences.format} onChange={(value) => set('format', value)} options={['PDF', 'SVG', 'DXF'].map((v) => ({ value: v as Preferences['format'], label: v }))} />
        </SettingRow>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-end gap-2 border-t border-library-line pt-4">
        <span aria-live="polite" className="mr-auto text-sm text-fpt-orange-ink">
          {flash ? 'Đã lưu trên trình duyệt này.' : ''}
        </span>
        <button type="button" onClick={() => setPreferences(DEFAULT_PREFERENCES)} className={outlineButton}>
          Khôi phục mặc định
        </button>
        <button type="button" onClick={save} disabled={!dirty} className={cn(primaryButton, 'disabled:cursor-not-allowed disabled:opacity-50')}>
          Lưu cài đặt
          <kbd className="hidden rounded bg-white/60 px-1.5 py-0.5 font-mono text-cad-spec-micro leading-none sm:inline">Ctrl S</kbd>
        </button>
      </div>
    </Panel>
  );
}

const PERCENT = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

/** `GET /storage/usage`: used / quota of the plan. */
function StoragePanel() {
  const usage = useStorageUsage();

  let body: React.ReactNode;
  if (usage.isPending) {
    body = (
      <div aria-busy="true" className="space-y-2">
        <span role="status" className="sr-only">
          Đang tải dung lượng…
        </span>
        <div aria-hidden className="h-6 w-1/2 animate-pulse rounded bg-library-panel motion-reduce:animate-none" />
        <div aria-hidden className="h-2 w-full animate-pulse rounded-full bg-library-panel motion-reduce:animate-none" />
      </div>
    );
  } else if (usage.isError) {
    body = <WorkspaceError error={usage.error} title="Không tải được dung lượng" onRetry={() => void usage.refetch()} retrying={usage.isFetching} />;
  } else {
    const { usedBytes, quotaBytes, fileCount, tier } = usage.data;
    const percent = usagePercent(usedBytes, quotaBytes);
    body = (
      <>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <p className="text-2xl font-medium text-library-ink">
            {formatBytes(usedBytes)} <span className="text-base font-normal text-library-muted">/ {formatBytes(quotaBytes)}</span>
          </p>
          <Badge tone="green">{TIER_LABELS[tier]}</Badge>
        </div>
        <div className="mt-3">
          <Meter percent={percent} label="Dung lượng đã dùng" />
        </div>
        <p className="mt-2 flex flex-wrap justify-between gap-2 text-sm text-library-sub">
          <span>
            Đã dùng {PERCENT.format(percent)}% · {formatCount(fileCount)} tệp
          </span>
          <span>Còn trống {formatBytes(Math.max(0, quotaBytes - usedBytes))}</span>
        </p>
      </>
    );
  }

  return (
    <Panel>
      <PanelTitle>Dung lượng lưu trữ</PanelTitle>
      {body}
      <div className="mt-6 grid grid-cols-1 gap-3 border-t border-library-line pt-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <p className="flex items-start gap-3 text-sm leading-[1.6] text-library-sub">
          <Cloud className="mt-0.5 size-4 shrink-0 text-library-ink" aria-hidden />
          Ảnh đại diện, logo, ảnh tải lên cho hộp và file in đã xuất đều tính vào dung lượng. Dự án xoá vĩnh viễn trả lại dung lượng của các tệp gắn với nó.
        </p>
        <Link href="/pricing" className={outlineButton}>
          Nâng dung lượng
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </Panel>
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
        Mọi phiên đăng nhập của <strong className="break-all font-medium text-library-ink">{email}</strong> sẽ kết thúc ngay, kể cả trình duyệt này. Bạn cần
        đăng nhập lại trên từng thiết bị.
      </p>
      <p>Dự án và tệp của bạn không bị ảnh hưởng.</p>
    </ConfirmDialog>
  );
}
