'use client';

/**
 * `/dashboard/profile`: the account of the signed-in user in the pacdora.com workspace style. Name, shop name and avatar
 * are saved with `PATCH /users/me` (avatar upload purpose AVATAR); plan, storage and brand kit are read from
 * `GET /auth/me` and `GET /storage/usage`.
 */

import { ArrowRight, BadgeCheck, KeyRound, MailWarning, Palette } from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import { displayName } from '@/components/layout/account';
import { outlineButton } from '@/components/library';
import { Badge, Meter, Panel, PanelTitle, WorkspaceShell } from '@/components/workspace';
import { ROLE_LABELS, ROUTES, TIER_LABELS } from '@/constants';
import { RequireAuth, useAuth } from '@/features/auth';
import { formatBytes, formatDate, usagePercent, useStorageUsage } from '@/features/dashboard';
import { AvatarEditor, ProfileForm } from '@/features/profile';
import type { SafeUser } from '@/types/api';

export default function DashboardProfilePage() {
  return (
    <RequireAuth>
      <DashboardProfileScreen />
    </RequireAuth>
  );
}

function DashboardProfileScreen() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <WorkspaceShell title="Hồ sơ" description="Ảnh đại diện, tên hiển thị và cửa hàng của bạn trên WrapFit.">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Panel as="div" className="h-fit lg:col-span-4">
          <div className="flex flex-col items-center gap-3 text-center">
            <AvatarEditor user={user} />
            <div className="min-w-0">
              <h2 className="break-words text-xl font-medium text-library-ink">{displayName(user)}</h2>
              <p className="text-sm text-library-muted">{user.shopName || ROLE_LABELS[user.role]}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5">
              <Badge tone="lime">{TIER_LABELS[user.subscriptionTier]}</Badge>
              <Badge>{ROLE_LABELS[user.role]}</Badge>
              {user.emailVerifiedAt ? (
                <Badge tone="green">
                  <BadgeCheck className="size-3.5" aria-hidden />
                  Đã xác minh
                </Badge>
              ) : (
                <Badge tone="amber">Chưa xác minh email</Badge>
              )}
            </div>
          </div>

          <dl className="mt-6 divide-y divide-library-line border-t border-library-line text-sm">
            <Row label="Email">
              <span className="truncate" title={user.email}>
                {user.email}
              </span>
            </Row>
            <Row label="Cửa hàng">{user.shopName || 'Chưa đặt'}</Row>
            <Row label="Thành viên từ">{formatDate(user.createdAt)}</Row>
            {user.referralCode && (
              <Row label="Mã giới thiệu">
                <span className="font-mono">{user.referralCode}</span>
              </Row>
            )}
          </dl>
        </Panel>

        <div className="flex flex-col gap-6 lg:col-span-8">
          <ProfileForm user={user} />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <PlanPanel user={user} />
            <BrandKitPanel user={user} />
          </div>
          <SecurityPanel user={user} />
        </div>
      </div>
    </WorkspaceShell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <dt className="shrink-0 text-library-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right text-library-ink">{children}</dd>
    </div>
  );
}

/** Plan of the account and the storage it leaves (`GET /storage/usage`). */
function PlanPanel({ user }: { user: SafeUser }) {
  const storage = useStorageUsage();
  const percent = storage.data ? usagePercent(storage.data.usedBytes, storage.data.quotaBytes) : 0;
  return (
    <Panel>
      <PanelTitle>Gói dịch vụ</PanelTitle>
      <p className="text-2xl font-medium text-library-ink">{TIER_LABELS[user.subscriptionTier]}</p>
      <div className="mt-4">
        {storage.data ? (
          <>
            <Meter percent={percent} label="Dung lượng đã dùng" />
            <p className="mt-2 flex justify-between text-sm text-library-sub">
              <span>
                {formatBytes(storage.data.usedBytes)} / {formatBytes(storage.data.quotaBytes)}
              </span>
              <span>{storage.data.fileCount} tệp</span>
            </p>
          </>
        ) : (
          <div aria-hidden className="h-2 animate-pulse rounded-full bg-library-panel motion-reduce:animate-none" />
        )}
      </div>
      <Link href="/pricing" className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-library-accent hover:underline">
        So sánh các gói
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </Panel>
  );
}

/** The saved brand kit at a glance; edited on its own page (`PATCH /users/me/brand-kit`). */
function BrandKitPanel({ user }: { user: SafeUser }) {
  const kit = user.brandKit;
  return (
    <Panel>
      <PanelTitle
        action={
          <Link href={ROUTES.brandKit} className="text-sm font-medium text-library-accent hover:underline">
            {kit ? 'Chỉnh sửa' : 'Thiết lập'}
          </Link>
        }
      >
        Brand kit
      </PanelTitle>
      {kit ? (
        <>
          <ul className="flex gap-2" aria-label="Màu thương hiệu">
            {kit.colors.map((color) => (
              <li key={color} title={color} className="h-10 flex-1 rounded-lg border border-library-line" style={{ backgroundColor: color }}>
                <span className="sr-only">{color}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-library-sub">{kit.fonts.length > 0 ? kit.fonts.join(' · ') : 'Chưa chọn font'}</p>
          {kit.slogan && <p className="mt-1 truncate text-sm italic text-library-ink">“{kit.slogan}”</p>}
        </>
      ) : (
        <div className="flex items-start gap-3 rounded-xl bg-library-panel p-4 text-sm text-library-sub">
          <Palette className="mt-0.5 size-4 shrink-0 text-library-ink" aria-hidden />
          Lưu logo, 3–5 màu và font của thương hiệu để áp lên hộp chỉ với một cú nhấp trong studio.
        </div>
      )}
    </Panel>
  );
}

/** Sign-in state of the account; the actions live in the settings. */
function SecurityPanel({ user }: { user: SafeUser }) {
  return (
    <Panel>
      <PanelTitle>Đăng nhập &amp; bảo mật</PanelTitle>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-library-ink bg-white">
            {user.emailVerifiedAt ? <KeyRound className="size-4" aria-hidden /> : <MailWarning className="size-4 text-amber-700" aria-hidden />}
          </span>
          <p className="text-sm leading-[1.6] text-library-sub">
            {user.emailVerifiedAt
              ? `Email đã xác minh ngày ${formatDate(user.emailVerifiedAt)}. Đổi mật khẩu hoặc đăng xuất khỏi mọi thiết bị trong phần Cài đặt.`
              : 'Email chưa được xác minh: hãy mở thư WrapFit đã gửi để kích hoạt tài khoản.'}
          </p>
        </div>
        <Link href={ROUTES.settings} className={outlineButton}>
          Mở cài đặt
        </Link>
      </div>
    </Panel>
  );
}
