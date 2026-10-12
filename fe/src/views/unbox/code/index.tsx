"use client";

import { ArrowRight, QrCode } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useId, useState } from "react";
import { GoiMascot } from "@/components/common/GoiMascot";
import { ROUTES } from "@/constants";
import { unboxSlugFrom } from "@/features/showcase/slug";
import { UnboxFrame } from "@/views/unbox/UnboxFrame";

const SENDER_STEPS = [
  "Thiết kế hộp quà trong Studio WrapFit.",
  "Viết lời chúc, chọn hiệu ứng và nhạc mở hộp.",
  "In mã QR dưới đáy hộp, người nhận quét là mở.",
];

/**
 * `/unbox` without a code: recipients who cannot scan the QR code type the code or paste the link printed with the
 * gift; senders learn how to make one.
 */
export default function UnboxCodePage() {
  const router = useRouter();
  const inputId = useId();
  const errorId = useId();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const slug = unboxSlugFrom(value);
    if (!slug) {
      setError("Mã gồm chữ, số, dấu gạch, tối đa 32 ký tự; hoặc dán cả liên kết …/unbox/<mã>.");
      return;
    }
    router.push(ROUTES.unbox(slug));
  };

  return (
    <UnboxFrame>
      <section
        aria-labelledby="unbox-code-title"
        className="w-full max-w-md rounded-3xl border border-white/15 bg-white/[0.06] p-6 shadow-tactile-lg backdrop-blur-md sm:p-8"
      >
        <div className="mb-4 flex justify-center">
          <GoiMascot pose="unboxing_pop" size={92} showPhotoBadge={false} label="Gói, trợ lý đóng gói của WrapFit" />
        </div>
        <p className="flex items-center justify-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-brand-gold">
          <QrCode className="h-3.5 w-3.5" aria-hidden />
          Mở hộp 3D qua mã QR
        </p>
        <h1 id="unbox-code-title" className="mt-2 text-center font-serif text-[28px] leading-tight tracking-tight text-white sm:text-[32px]">
          Mỗi hộp quà có một lời chúc riêng
        </h1>
        <p className="mt-3 text-center text-sm leading-relaxed text-stone-300">
          Quét mã QR dưới đáy hộp bằng camera điện thoại để mở hộp quà 3D. Không quét được? Nhập mã hoặc dán liên kết in
          kèm hộp.
        </p>

        <form onSubmit={submit} noValidate className="mt-6 space-y-3">
          <label htmlFor={inputId} className="block text-xs font-semibold text-stone-200">
            Mã mở hộp hoặc liên kết
          </label>
          <input
            id={inputId}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setError(null);
            }}
            maxLength={2048}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="go"
            placeholder="vd. Ab3dE9xYz012"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="h-12 w-full rounded-full border border-white/20 bg-white/10 px-5 font-mono text-sm text-white placeholder:text-stone-400 focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/30"
          />
          {error && (
            <p id={errorId} role="alert" className="text-xs leading-relaxed text-vibrant-coral-light">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={!value.trim()}
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-brand-gold px-6 text-sm font-bold text-brand-forest-dark transition hover:bg-[#e0bd4a] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Mở hộp quà
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </form>

        <div className="mt-7 border-t border-white/10 pt-5">
          <h2 className="font-mono text-[11px] uppercase tracking-wider text-stone-400">Bạn muốn gửi quà?</h2>
          <ol className="mt-3 space-y-2">
            {SENDER_STEPS.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm text-stone-200">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-brand-gold/40 font-mono text-[11px] text-brand-gold">
                  {index + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </UnboxFrame>
  );
}
