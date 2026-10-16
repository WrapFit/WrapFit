'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ROUTES } from '@/constants';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth';
import { displayName, initialsOf, loginHref, ROLE_LABELS, TIER_LABELS } from './account';
import { Icon } from "@/components/ui";

export interface UserAvatarDropdownProps {
  /** Overrides of the signed-in user's data; by default everything comes from `useAuth()`. */
  name?: string;
  /** Line under the name; the Vietnamese label of the subscription tier by default. */
  role?: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  align?: 'left' | 'right';
  className?: string;
  /** Where the name and tier show next to the avatar: a crowded header hides them while its desktop nav is shown. */
  labelClassName?: string;
}

/**
 * Account menu of the headers. Signed in: avatar and menu; anonymous (or the session check failed): a "Đăng nhập"
 * pill; still checking: a neutral skeleton of the avatar's size, so the login button never flashes.
 */
export function UserAvatarDropdown({
  name: nameOverride,
  role: roleOverride,
  avatarUrl: avatarOverride,
  size = 'md',
  align = 'right',
  className = '',
  labelClassName = 'hidden lg:flex',
}: UserAvatarDropdownProps) {
  const { user, status, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
  }[size];

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (status === 'loading') {
    return (
      <div className={`relative inline-flex p-1 ${className}`} aria-hidden>
        <span className={`${sizeClasses} block rounded-full bg-line/80 animate-pulse motion-reduce:animate-none`} />
      </div>
    );
  }

  if (!user) {
    return (
      <Link
        href={loginHref(pathname)}
        className={`inline-flex h-11 -my-0.5 items-center gap-1.5 rounded-full border border-line/80 bg-white px-4 text-xs font-semibold text-fg shadow-xs transition-all hover:bg-surface-sunken/50 hover:text-black active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest-deep/30 ${className}`}
      >
        <Icon name="login" className="size-4" />
        <span>Đăng nhập</span>
      </Link>
    );
  }

  const name = nameOverride ?? displayName(user);
  const role = roleOverride ?? TIER_LABELS[user.subscriptionTier];
  const avatarUrl = avatarOverride === undefined ? user.avatarUrl : avatarOverride;
  // Falls back to the initials when the image cannot be loaded (a new URL is tried again).
  const imageUrl = avatarUrl && failedImage !== avatarUrl ? avatarUrl : null;
  const isAdmin = user.role === 'ADMIN';
  const initials = initialsOf(name);

  const handleLogout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      // Never throws: the local session is cleared even when the API cannot be reached.
      await logout();
      setIsOpen(false);
      router.push('/');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className={`relative inline-block text-left select-none ${className}`} ref={menuRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 rounded-full hover:bg-line/50 transition-all outline-none focus-visible:ring-2 focus-visible:ring-brand-forest-deep/30 group"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`Tài khoản của ${name}`}
      >
        <div className="relative">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              onError={() => setFailedImage(imageUrl)}
              className={`${sizeClasses} rounded-full object-cover ring-2 ring-line/80 group-hover:ring-brand-forest-deep transition-all`}
            />
          ) : (
            <div
              className={`${sizeClasses} rounded-full bg-brand-forest-deep text-white flex items-center justify-center font-bold ring-2 ring-line/80`}
            >
              {initials}
            </div>
          )}
          {/* Online green indicator */}
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-success ring-2 ring-white" />
        </div>

        {/* User name on large displays */}
        <div className={`${labelClassName} flex-col items-start leading-none pr-1`}>
          <span className="font-landing-body text-xs font-semibold text-fg group-hover:text-black max-w-[140px] truncate">
            {name}
          </span>
          <span className="font-mono text-cad-spec-micro text-fg-muted mt-0.5">
            {role}
          </span>
        </div>

        <Icon name={isOpen ? 'expand_less' : 'expand_more'} className="size-4 text-fg-muted group-hover:text-fg-muted transition-transform duration-200" />
      </button>

      {/* Dropdown Menu Modal */}
      {isOpen && (
        <div
          className={`absolute z-50 mt-2 w-72 rounded-3xl bg-white/95 backdrop-blur-xl border border-line/80 shadow-[0_16px_40px_rgba(28,25,23,0.12)] p-2 animate-pop-in ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {/* Profile Header */}
          <div className="p-3 bg-surface-sunken/80 rounded-2xl border border-line/50 mb-2">
            <div className="flex items-center gap-3">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt=""
                  onError={() => setFailedImage(imageUrl)}
                  className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-line/80"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-brand-forest-deep text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {initials}
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="font-landing-body text-sm font-bold text-fg truncate">
                  {name}
                </span>
                <span className="text-caption text-fg-muted truncate">
                  {role} · {ROLE_LABELS[user.role]}
                </span>
                <span className="truncate text-caption text-fg-muted">{user.email}</span>
              </div>
            </div>
          </div>

          {/* Group 1: User Workspaces */}
          <div className="space-y-0.5 py-1 text-sm font-medium">
            <Link
              href="/dashboard/projects"
              onClick={() => setIsOpen(false)}
              className="flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2 text-fg transition-colors hover:bg-surface-sunken/80"
            >
              <Icon name="folder_special" className="size-[18px] text-fg-muted" />
              <span>Dự án</span>
            </Link>

            <Link
              href="/dashboard/orders"
              onClick={() => setIsOpen(false)}
              className="flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2 text-fg transition-colors hover:bg-surface-sunken/80"
            >
              <Icon name="receipt_long" className="size-[18px] text-fg-muted" />
              <span>Đơn hàng</span>
            </Link>

            <Link
              href="/dashboard/brand-kit"
              onClick={() => setIsOpen(false)}
              className="flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2 text-fg transition-colors hover:bg-surface-sunken/80"
            >
              <Icon name="palette" className="size-[18px] text-fg-muted" />
              <span>Bộ nhận diện</span>
            </Link>

            <Link
              href="/dashboard/specs"
              onClick={() => setIsOpen(false)}
              className="flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2 text-fg transition-colors hover:bg-surface-sunken/80"
            >
              <Icon name="architecture" className="size-[18px] text-fg-muted" />
              <span>Quy chuẩn hộp</span>
            </Link>
          </div>

          <div className="h-px bg-line/60 my-1.5" />

          {/* Group 2: Quick Jump to 3D Studio & Admin */}
          <div className="space-y-0.5 py-1 text-sm font-medium">
            <Link
              href={ROUTES.editorNew}
              onClick={() => setIsOpen(false)}
              className="flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2 text-fg transition-colors hover:bg-surface-sunken/80"
            >
                <Icon name="view_in_ar" className="size-[18px] text-fg-muted" />
                <span>Mở Studio</span>
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setIsOpen(false)}
                className="flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2 text-fg transition-colors hover:bg-surface-sunken/80"
              >
                  <Icon name="shield_person" className="size-[18px] text-fg-muted" />
                  <span>Quản trị</span>
              </Link>
            )}
          </div>

          <div className="h-px bg-line/60 my-1.5" />

          {/* Group 3: Settings & Logout */}
          <div className="space-y-0.5 py-1 text-sm font-medium">
            <Link
              href="/dashboard/profile"
              onClick={() => setIsOpen(false)}
              className="flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2 text-fg transition-colors hover:bg-surface-sunken/80"
            >
              <Icon name="badge" className="size-[18px] text-fg-muted" />
              <span>Hồ sơ</span>
            </Link>

            <Link
              href="/dashboard/settings"
              onClick={() => setIsOpen(false)}
              className="flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2 text-fg transition-colors hover:bg-surface-sunken/80"
            >
              <Icon name="tune" className="size-[18px] text-fg-muted" />
              <span>Cài đặt</span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              disabled={signingOut}
              aria-busy={signingOut || undefined}
              className="flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-danger-fg transition-colors hover:bg-danger-bg disabled:cursor-wait disabled:opacity-70"
            >
              <Icon name="logout" className="size-[18px] text-danger-fg" />
              <span>{signingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
