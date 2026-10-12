"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { Suspense, useState } from "react";
import { ROUTES } from "@/constants";
import {
  AccountLoading,
  AccountShell,
  ApiErrorAlert,
  ResendSentNotice,
  ResendVerificationForm,
  TEXT_LINK,
  resendLabel,
  useResendVerification,
  withEmail,
} from "@/views/account/shared";

const TITLE = "Kiểm tra hộp thư";

/** `/check-email?email=`: after signing up, or when signing in with an address that is not verified yet. */
export default function CheckEmailPage() {
  return (
    <Suspense
      fallback={
        <AccountShell pose="delivery" eyebrow="Xác nhận email" title={TITLE}>
          <AccountLoading />
        </AccountShell>
      }
    >
      <CheckEmailFromQuery />
    </Suspense>
  );
}

function CheckEmailFromQuery() {
  const email = useSearchParams().get("email")?.trim() ?? "";
  return <CheckEmail key={email} initialEmail={email} />;
}

function CheckEmail({ initialEmail }: { initialEmail: string }) {
  const resend = useResendVerification();
  const [email, setEmail] = useState(initialEmail);
  // No address in the link: ask for it before anything can be resent.
  const [editing, setEditing] = useState(!initialEmail);
  const locked = resend.isPending || resend.secondsLeft > 0;

  if (editing) {
    return (
      <AccountShell
        pose="delivery"
        eyebrow="Xác nhận email"
        title={TITLE}
        description="Nhập email bạn đã dùng để đăng ký, chúng tôi sẽ gửi lại link xác nhận tài khoản."
      >
        <ResendVerificationForm
          resend={resend}
          defaultEmail={email}
          onSent={(address) => {
            setEmail(address);
            setEditing(false);
          }}
        />
        <BackToLogin email={email} />
      </AccountShell>
    );
  }

  return (
    <AccountShell
      pose="delivery"
      eyebrow="Xác nhận email"
      title={TITLE}
      description={
        <>
          Chúng tôi đã gửi email tới <strong className="break-all font-semibold text-stone-900">{email}</strong>. Tài
          khoản cần được xác nhận trước khi đăng nhập.
        </>
      }
    >
      <ol className="space-y-2.5 rounded-2xl border border-stone-200/80 bg-paper-ivory/80 p-4 text-left text-[13px] leading-relaxed text-stone-700">
        <Step n={1}>
          Mở email <strong className="font-semibold text-stone-900">mới nhất</strong> từ WrapFit. Mỗi lần gửi lại, link
          trong email trước sẽ hết hiệu lực.
        </Step>
        <Step n={2}>Bấm vào link trong email. Link có hiệu lực 24 giờ.</Step>
        <Step n={3}>Không thấy email? Xem thư mục Spam hoặc Quảng cáo, rồi gửi lại nếu cần.</Step>
      </ol>

      <div className="mt-5 space-y-3" aria-live="polite">
        {resend.error != null && <ApiErrorAlert error={resend.error} />}
        {resend.sentTo && resend.error == null && <ResendSentNotice email={resend.sentTo} />}
      </div>

      <button
        type="button"
        onClick={() => resend.send(email)}
        disabled={locked}
        aria-busy={resend.isPending || undefined}
        className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-stone-200 bg-white px-6 text-sm font-semibold text-stone-800 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:text-stone-400 disabled:active:scale-100"
      >
        {resend.isPending ? "Đang gửi…" : resendLabel(resend, "Gửi lại email")}
      </button>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2">
        <button type="button" onClick={() => setEditing(true)} className={TEXT_LINK}>
          Dùng email khác
        </button>
        <span aria-hidden className="text-stone-300">
          ·
        </span>
        <BackToLogin email={email} inline />
      </div>
    </AccountShell>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-forest font-mono text-[10px] font-bold text-white"
      >
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}

function BackToLogin({ email, inline = false }: { email: string; inline?: boolean }) {
  const link = (
    <Link href={withEmail(ROUTES.login, email)} className={TEXT_LINK}>
      Quay lại đăng nhập
    </Link>
  );
  return inline ? link : <div className="mt-3 text-center">{link}</div>;
}
