'use client';

import React from 'react';
import Link from 'next/link';
import { BrandLogo } from './BrandLogo';

export interface MainFooterProps {
  /** Optional custom class */
  className?: string;
  /** Compact mode for tighter pages */
  compact?: boolean;
}

export function MainFooter({ className = '', compact = false }: MainFooterProps) {
  return (
    <footer className={`w-full bg-[#f8f5ee] border-t border-[#e8ded0]/80 text-stone-700 select-none ${className}`}>
      {/* Below md the floating BottomNavBar sits over the end of the page: the bottom padding keeps the last line clear. */}
      <div className="max-w-7xl 2xl:max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-28 md:pb-10 lg:py-14">
        {!compact && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12 pb-10 border-b border-[#e8ded0]/60">
            {/* Column 1 & 2: Brand & Mission Statement */}
            <div className="lg:col-span-2 space-y-4">
              <BrandLogo size="lg" badge="CAD CADRE v4.2" href="/" />
              <p className="font-['Plus_Jakarta_Sans'] text-xs text-stone-600 max-w-sm leading-relaxed">
                Nền tảng trí tuệ bao bì thông minh hàng đầu dành cho thương hiệu thủ công, nghệ nhân và quà tặng xa xỉ. Biến mọi món quà thành tác phẩm trình diễn mở hộp chuẩn xác từng milimét.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#e8ded0] text-[11px] font-['JetBrains_Mono'] text-[#122e20] shadow-2xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>CAD Engine 1:1 Active</span>
                </span>
                <span className="font-['JetBrains_Mono'] text-[11px] text-stone-500">
                  ISO 12647-2 Standard
                </span>
              </div>
            </div>

            {/* Column 3: CAD & Dieline */}
            <div className="space-y-3">
              <h4 className="font-['Plus_Jakarta_Sans'] text-xs font-bold uppercase tracking-wider text-[#122e20]">
                Bản Vẽ CAD &amp; Dieline
              </h4>
              <ul className="space-y-2 text-xs font-medium text-stone-600">
                <li>
                  <Link href="/dashboard/specs" className="hover:text-black hover:underline transition-colors">
                    Quy Chuẩn FEFCO &amp; Caliper
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/materials" className="hover:text-black hover:underline transition-colors">
                    Thư Viện Giấy &amp; Ép Kim PBR
                  </Link>
                </li>
                <li>
                  <Link href="/editor/inspect/fefco" className="hover:text-black hover:underline transition-colors">
                    Thanh Tra Sai Số CNC Laser
                  </Link>
                </li>
                <li>
                  <Link href="/editor" className="hover:text-black hover:underline transition-colors">
                    3D Interactive WebGL Studio
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4: Services & Production */}
            <div className="space-y-3">
              <h4 className="font-['Plus_Jakarta_Sans'] text-xs font-bold uppercase tracking-wider text-[#122e20]">
                Dịch Vụ &amp; Sản Xuất
              </h4>
              <ul className="space-y-2 text-xs font-medium text-stone-600">
                <li>
                  <Link href="/pricing" className="hover:text-black hover:underline transition-colors">
                    Bảng Giá Studio Pass
                  </Link>
                </li>
                <li>
                  <Link href="/checkout/step-1" className="hover:text-black hover:underline transition-colors">
                    Cấp Phép Bản Quyền CAD
                  </Link>
                </li>
                <li>
                  <Link href="/admin/print-shops" className="hover:text-black hover:underline transition-colors">
                    Mạng Lưới Xưởng In Đối Tác
                  </Link>
                </li>
                <li>
                  <Link href="/unbox/demo-order" className="hover:text-black hover:underline transition-colors">
                    Trải Nghiệm Mở Hộp Phygital AR
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 5: Support & Administration */}
            <div className="space-y-3">
              <h4 className="font-['Plus_Jakarta_Sans'] text-xs font-bold uppercase tracking-wider text-[#122e20]">
                Hệ Thống &amp; Trợ Giúp
              </h4>
              <ul className="space-y-2 text-xs font-medium text-stone-600">
                <li>
                  <Link href="/support" className="hover:text-black hover:underline transition-colors">
                    Trung Tâm Hỗ Trợ &amp; FAQ
                  </Link>
                </li>
                <li>
                  <Link href="/team" className="hover:text-black hover:underline transition-colors">
                    Đội Ngũ Sáng Lập &amp; Kỹ Sư
                  </Link>
                </li>
                <li>
                  <Link href="/notifications" className="hover:text-black hover:underline transition-colors">
                    Bản Tin Cập Nhật Hệ Thống
                  </Link>
                </li>
                <li>
                  <Link href="/admin/security" className="hover:text-black hover:underline transition-colors">
                    Trung Tâm An Ninh Zero-Trust
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Bottom Compliance & Copyright Line */}
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-stone-500 font-['JetBrains_Mono']">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 text-emerald-800 font-semibold">
              <span className="material-symbols-outlined text-sm">workspace_premium</span>
              <span>ISO 12647-2 Litho Offset</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-blue-800 font-semibold">
              <span className="material-symbols-outlined text-sm">lock</span>
              <span>PCI-DSS Tier 1 Ready</span>
            </span>
            <span>•</span>
            <span className="text-stone-600">SLA 99.98% Gateway Hanoi</span>
          </div>

          <div className="text-center md:text-right">
            © 2026 WrapFit Packaging Ltd. All millimeter calibrations verified.
          </div>
        </div>
      </div>
    </footer>
  );
}
