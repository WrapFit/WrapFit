"use client";

import { ArrowRight, QrCode } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useId, useState } from "react";
import { ROUTES } from "@/constants";
import { unboxSlugFrom } from "@/features/showcase/slug";
import { UnboxFrame } from "@/views/unbox/UnboxFrame";

const SENDER_STEPS = [
  { title: "Thiết kế hộp", text: "Nhập kích thước món quà, WrapFit dựng khuôn bế và hộp 3D." },
  { title: "Viết lời chúc", text: "Chọn hiệu ứng và nhạc khi người nhận mở hộp." },
  { title: "In mã QR", text: "Mã in dưới đáy hộp, người nhận quét là mở." },
];

/**
 * `/unbox` without a code, in the pack.ly style: recipients who cannot scan the QR code type the code or paste the
 * link printed with the gift; senders learn how to make one.
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
      <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-stretch">
        <section aria-labelledby="unbox-code-title" className="flex flex-col justify-center rounded-sheet bg-white p-6 sm:p-10">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-fpt-orange text-white">
            <QrCode className="size-6" aria-hidden />
          </span>
          <p className="mt-6 text-sm font-semibold text-fpt-orange-ink">Mở hộp quà 3D</p>
          <h1 id="unbox-code-title" className="mt-1 font-landing-heading text-4xl font-bold tracking-tight sm:text-5xl">
            Mỗi hộp quà có một lời chúc riêng
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-landing-muted">
            Quét mã QR dưới đáy hộp bằng camera điện thoại để mở hộp quà 3D. Không quét được? Nhập mã hoặc dán liên kết in kèm hộp.
          </p>

          <form onSubmit={submit} noValidate className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-start">
            <div className="flex-1">
              <label htmlFor={inputId} className="sr-only">
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
                placeholder="Mã mở hộp, vd. Ab3dE9xYz012"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                className="h-12 w-full rounded-lg bg-mist-200 px-4 font-mono text-base text-landing-ink outline-none ring-1 ring-transparent transition-shadow placeholder:font-landing-body placeholder:text-landing-muted/80 focus:bg-white focus:ring-fpt-orange/60 aria-[invalid=true]:ring-danger"
              />
              {error && (
                <p id={errorId} role="alert" className="mt-1.5 text-sm text-danger-fg">
                  {error}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={!value.trim()}
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-fpt-orange px-6 text-base font-semibold text-white transition-colors hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mở hộp quà
              <ArrowRight className="size-4" aria-hidden />
            </button>
          </form>
        </section>

        <aside aria-labelledby="unbox-sender-title" className="flex flex-col rounded-sheet bg-landing-green-night p-6 text-white sm:p-10">
          <h2 id="unbox-sender-title" className="font-landing-heading text-2xl font-bold sm:text-3xl">
            Bạn muốn gửi quà?
          </h2>
          <p className="mt-2 text-base leading-7 text-white/80">Tạo một hộp quà có lời chúc 3D trong vài phút.</p>
          <ol className="mt-6 flex flex-col gap-3">
            {SENDER_STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-4 rounded-2xl bg-white/[0.06] p-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-fpt-orange text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <span>
                  <span className="block font-semibold">{step.title}</span>
                  <span className="block text-sm leading-6 text-white/75">{step.text}</span>
                </span>
              </li>
            ))}
          </ol>
          <Link
            href={ROUTES.editorNew}
            className="mt-6 inline-flex h-12 items-center justify-center gap-2 self-start rounded-full bg-fpt-orange px-6 text-base font-semibold text-white transition-colors hover:bg-action-hover lg:mt-auto"
          >
            Bắt đầu thiết kế
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </aside>
      </div>
    </UnboxFrame>
  );
}
