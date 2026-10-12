'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { GoiMascot } from '@/components/common/GoiMascot';

export default function Auth2FaPage() {
  const [otp] = useState(['3', '0', '6', '', '', '']);

  return (
    <div className="min-h-screen bg-[#fff8f5] text-[#1b1c18] flex flex-col justify-between p-6 pb-28 md:pb-6 lg:p-10 font-['Plus_Jakarta_Sans'] select-none">
      <header className="flex items-center justify-between">
        <Link href="/auth/login" className="w-10 h-10 rounded-full bg-white/80 border border-[#e8ded0] flex items-center justify-center text-[#122e20] hover:bg-white shadow-xs transition-all">
          <span className="material-symbols-outlined text-lg">arrow_back</span>
        </Link>
        <span className="font-['JetBrains_Mono'] text-xs text-[#717971] uppercase tracking-wider font-semibold">BKLIT ZERO-TRUST PERIMETER</span>
        <div className="w-10"></div>
      </header>

      {/* Main Authenticator Apple Card */}
      <main className="max-w-md mx-auto w-full bg-white p-8 lg:p-10 rounded-3xl border border-[#e8ded0]/80 shadow-[0_8px_32px_rgba(28,25,23,0.05)] text-center space-y-6 my-auto">
        <div className="w-16 h-16 rounded-3xl bg-[#f7f2ef] border border-[#e8ded0] text-[#122e20] flex items-center justify-center mx-auto shadow-sm">
          <span className="material-symbols-outlined text-3xl">qr_code_scanner</span>
        </div>

        <div>
          <h2 className="font-['Playfair_Display'] text-2xl font-bold text-[#122e20]">Xác Thực Bảo Mật 2FA &amp; OTP</h2>
          <p className="text-xs text-[#717971] mt-1 font-['JetBrains_Mono']">Quét mã bằng Google Authenticator hoặc Touch ID</p>
        </div>

        {/* 6 OTP Boxes */}
        <div className="flex justify-center gap-2.5 my-4">
          {otp.map((val, idx) => (
            <div
              key={idx}
              className={"w-12 h-14 rounded-2xl flex items-center justify-center font-['JetBrains_Mono'] text-xl font-bold border transition-all " +
                (val ? "bg-[#f7f2ef] border-[#122e20] text-[#122e20] shadow-xs" : "bg-white border-[#e8ded0] text-[#717971]")}
            >
              {val || '•'}
            </div>
          ))}
        </div>

        {/* Fallback Email Block */}
        <div className="p-4 rounded-2xl bg-[#f7f2ef] border border-[#e8ded0]/60 text-xs text-[#525a54] flex items-center justify-between">
          <div className="flex items-center gap-2 text-left">
            <span className="material-symbols-outlined text-lg text-[#122e20]">mail</span>
            <span>Mã OTP gửi đến <strong>el***@wrapfit.io</strong></span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-white text-[10px] font-['JetBrains_Mono'] font-bold text-[#717971]">Gửi lại (45s)</span>
        </div>

        <Link
          href="/dashboard"
          className="w-full py-4 rounded-full bg-[#122e20] hover:bg-[#1a382b] text-white text-center text-sm font-semibold shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <span>Xác Thực &amp; Kích Hoạt Bản Quyền</span>
          <span className="material-symbols-outlined text-base">arrow_forward</span>
        </Link>
      </main>

      <footer className="flex items-center justify-center gap-3 text-xs text-[#717971]">
        <GoiMascot pose="thumbs_up" size={36} />
        <span>Bé Gói Zero-Trust chứng thực bảo mật phiên làm việc FIDO2.</span>
      </footer>
    </div>
  );
}
