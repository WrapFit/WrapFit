'use client';

import React from 'react';
import Link from 'next/link';

export interface BrandLogoProps {
  /** Variant of the logo display */
  variant?: 'default' | 'compact' | 'light' | 'dark';
  /** Size scale */
  size?: 'sm' | 'md' | 'lg';
  /** Optional CAD or sub-tier badge (e.g. "CAD CADRE v4.2") */
  badge?: string;
  /** Where the badge shows (Tailwind display classes) */
  badgeClassName?: string;
  /** Link target, default to '/' */
  href?: string;
  /** Custom extra classes */
  className?: string;
}

export function BrandLogo({
  variant = 'default',
  size = 'md',
  badge,
  badgeClassName = 'hidden sm:inline-block',
  href = '/',
  className = '',
}: BrandLogoProps) {
  const isLight = variant === 'light';
  const isCompact = variant === 'compact';

  const sizeBox = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
  }[size];

  const sizeText = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
  }[size];

  const content = (
    <div className={`flex items-center gap-2.5 select-none group ${className}`}>
      {/* Tactile Origami Box Cube Mark */}
      <div
        className={`${sizeBox} rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 shadow-xs ${
          isLight
            ? 'bg-white/20 border border-white/30 text-white'
            : 'bg-brand-forest-deep border border-brand-forest text-white'
        }`}
      >
        <svg
          className="w-5 h-5 transition-transform duration-500 group-hover:rotate-6"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.9"
          viewBox="0 0 24 24"
        >
          {/* Isometric Packaging Box outline */}
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          {/* Internal Origami crease lines */}
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" x2="12" y1="22.08" y2="12" />
        </svg>
      </div>

      {/* Typography Wordmark */}
      {!isCompact && (
        <div className="flex items-center gap-2 leading-none">
          <span
            className={`font-landing-body font-bold tracking-tight transition-colors ${sizeText} ${
              isLight ? 'text-white' : 'text-brand-forest-deep group-hover:text-brand-forest'
            }`}
          >
            WrapFit
          </span>

          {badge && (
            <span
              className={`${badgeClassName} font-mono text-caption uppercase font-semibold px-2 py-0.5 rounded-full border tracking-wider leading-tight ${
                isLight
                  ? 'bg-white/10 text-white/90 border-white/20'
                  : 'bg-surface-sunken text-fg-muted border-line/80'
              }`}
            >
              {badge}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center rounded-lg">
        {content}
      </Link>
    );
  }

  return content;
}
