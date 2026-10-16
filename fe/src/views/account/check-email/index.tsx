"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { Suspense, useState } from "react";
import { ROUTES } from "@/constants";
import {
  AccountLoading,
  AccountShell,
  ApiErrorAlert,
  SECONDARY_BUTTON,
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
        <AccountShell icon={MailCheck} eyebrow="Xác nhận email" title={TITLE}>
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
        icon={MailCheck}
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
      icon={MailCheck}
      eyebrow="Xác nhận email"
      title={TITLE}
      description={
        <>
          Chúng tôi đã gửi email tới <strong className="break-all font-semibold text-landing-ink">{email}</strong>. Tài
          khoản cần được xác nhận trước khi đăng nhập.
        </>
      }
    >
      <ol className="space-y-3 rounded-2xl bg-white p-5 text-left text-sm leading-6 text-landing-muted ring-1 ring-landing-ink/10">
        <Step n={1}>
          Mở email <strong className="font-semibold text-landing-ink">mới nhất</strong> từ WrapFit. Mỗi lần gửi lại, link
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
        className={`mt-4 ${SECONDARY_BUTTON}`}
      >
        {resend.isPending ? "Đang gửi…" : resendLabel(resend, "Gửi lại email")}
      </button>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2">
        <button type="button" onClick={() => setEditing(true)} className={TEXT_LINK}>
          Dùng email khác
        </button>
        <span aria-hidden className="text-landing-line">
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
        className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-fpt-orange text-xs font-semibold text-white"
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
