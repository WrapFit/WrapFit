"use client";

import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, BadgeCheck, Link2Off, MailOpen } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useRef } from "react";
import { verifyEmail } from "@/api/auth";
import { ROUTES } from "@/constants";
import { isApiError } from "@/services/api";
import {
  AccountLoading,
  AccountShell,
  ApiErrorAlert,
  PRIMARY_LINK,
  SECONDARY_BUTTON,
  ResendSentNotice,
  ResendVerificationForm,
  TEXT_LINK,
  isPlausibleToken,
  useResendVerification,
} from "@/views/account/shared";

/** `/verify-email?token=`: the link of the verification email. Verifies on open; never signs in (decision D7). */
export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <AccountShell icon={MailOpen} eyebrow="Xác nhận email" title="Đang xác nhận email">
          <AccountLoading label="Đang kiểm tra link…" />
        </AccountShell>
      }
    >
      <VerifyEmailFromQuery />
    </Suspense>
  );
}

function VerifyEmailFromQuery() {
  const token = useSearchParams().get("token")?.trim() ?? "";
  // A new token (another link opened in the same tab) starts over.
  return <VerifyEmail key={token} token={token} />;
}

type LinkProblem = "invalid" | "expired";

function VerifyEmail({ token }: { token: string }) {
  const plausible = isPlausibleToken(token);
  const verify = useMutation({ mutationFn: (value: string) => verifyEmail(value) });
  const { mutate } = verify;

  // Exactly one call per link: the ref survives React Strict Mode's mount → unmount → mount in development.
  const started = useRef(false);
  useEffect(() => {
    if (!plausible || started.current) return;
    started.current = true;
    mutate(token);
  }, [plausible, token, mutate]);

  if (!plausible) return <VerifyLinkProblem problem="invalid" />;

  if (verify.isSuccess) {
    return (
      <AccountShell
        icon={BadgeCheck}
        eyebrow="Xác nhận email"
        title="Email đã được xác nhận"
        description="Tài khoản WrapFit của bạn đã sẵn sàng. Đăng nhập để bắt đầu thiết kế chiếc hộp đầu tiên."
      >
        <Link href={`${ROUTES.login}?notice=email_verified`} className={PRIMARY_LINK}>
          Đăng nhập
        </Link>
      </AccountShell>
    );
  }

  if (verify.isError) {
    const { error } = verify;
    if (isApiError(error, "AUTH_TOKEN_EXPIRED")) return <VerifyLinkProblem problem="expired" />;
    // AUTH_TOKEN_INVALID, or a 400 for a malformed token: asking again cannot help.
    if (isApiError(error, "AUTH_TOKEN_INVALID") || (isApiError(error) && error.status === 400)) {
      return <VerifyLinkProblem problem="invalid" />;
    }
    return (
      <AccountShell icon={AlertTriangle} tone="red" eyebrow="Xác nhận email" title="Chưa xác nhận được email">
        <ApiErrorAlert error={error} />
        <button type="button" onClick={() => mutate(token)} disabled={verify.isPending} className={`mt-4 ${SECONDARY_BUTTON}`}>
          {verify.isPending ? "Đang thử lại…" : "Thử lại"}
        </button>
      </AccountShell>
    );
  }

  return (
    <AccountShell icon={MailOpen} eyebrow="Xác nhận email" title="Đang xác nhận email">
      <AccountLoading label="Đang kiểm tra link…" />
    </AccountShell>
  );
}

const PROBLEMS: Record<LinkProblem, { title: string; description: string }> = {
  invalid: {
    title: "Link không còn hiệu lực",
    description:
      "Link này không đúng, hoặc đã có link mới hơn được gửi tới hộp thư của bạn. Hãy mở email mới nhất, hoặc nhập email để nhận link mới.",
  },
  expired: {
    title: "Link đã hết hạn",
    description: "Link xác nhận chỉ có hiệu lực 24 giờ. Nhập email để nhận link mới.",
  },
};

function VerifyLinkProblem({ problem }: { problem: LinkProblem }) {
  const resend = useResendVerification();
  const { title, description } = PROBLEMS[problem];
  return (
    <AccountShell icon={Link2Off} tone="amber" eyebrow="Xác nhận email" title={title} description={description}>
      {resend.sentTo ? (
        <div className="space-y-3">
          <ResendSentNotice email={resend.sentTo} />
          <div className="text-center">
            <Link href={`${ROUTES.checkEmail}?email=${encodeURIComponent(resend.sentTo)}`} className={TEXT_LINK}>
              Xem hướng dẫn kiểm tra hộp thư
            </Link>
          </div>
        </div>
      ) : (
        <ResendVerificationForm resend={resend} submitLabel="Gửi link xác nhận mới" />
      )}
      <div className="mt-3 text-center">
        <Link href={ROUTES.login} className={TEXT_LINK}>
          Quay lại đăng nhập
        </Link>
      </div>
    </AccountShell>
  );
}
