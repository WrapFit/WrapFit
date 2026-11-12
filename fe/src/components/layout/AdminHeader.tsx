'use client';

import React from 'react';
import { landingFontVariables } from '@/assets/fonts/landing';
import { cn } from '@/utils/helpers';
import { LandingLogo } from './LandingLogo';
import { UserAvatarDropdown } from './UserAvatarDropdown';

export interface AdminHeaderProps {
  className?: string;
}

/**
 * Dedicated top header for the /admin console.
 * Separated from the public maker storefront (no box templates, no 3D studio CTA, no maker project pills).
 */
export function AdminHeader({ className = '' }: AdminHeaderProps) {
  // No <ViewTransition> here: the admin header lives in the persistent admin frame and never changes between pages, and a
  // view transition would snapshot and morph it on every navigation (the logo flickered).
  return (
      <header
        data-app-tokens
        className={cn(
          landingFontVariables,
          'fixed inset-x-0 top-0 z-50 border-b border-line/70 bg-white font-landing-body text-landing-ink',
          className
        )}
      >
        <nav
          aria-label="Thanh điều hướng Quản trị"
          className="flex h-16 w-full items-center justify-between gap-4 px-4 sm:px-6 lg:pl-6 lg:pr-8"
        >
          {/* Left: WrapFit logo */}
          <div className="flex items-center gap-3">
            <LandingLogo size="md" />
          </div>

          {/* Right: User Avatar */}
          <div className="flex items-center gap-3">
            <UserAvatarDropdown size="md" align="right" labelClassName="hidden sm:flex" />
          </div>
        </nav>
      </header>
  );
}
