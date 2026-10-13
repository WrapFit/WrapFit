"use client";

import { useMutation } from "@tanstack/react-query";
import { KeyRound, MailCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { Suspense, useState } from "react";
import { requestPasswordReset } from "@/api/auth";
import { ROUTES } from "@/constants";
import {
  AccountLoading,
  AccountShell,
  ApiErrorAlert,
  FormAlert,
  SubmitButton,
  TEXT_LINK,
  TextField,
  emailError,
  withEmail,
} from "@/views/account/shared";

const TITLE = "Quên mật khẩu";

/** `/forgot-password?email=`: asks for a reset link. The answer never says whether the address has an account. */
export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <AccountShell icon={KeyRound} eyebrow="Mật khẩu" title={TITLE}>
          <AccountLoading />
        </AccountShell>
      }
    >
      <ForgotPasswordFromQuery />
    </Suspense>
  );
}

function ForgotPasswordFromQuery() {
  const email = useSearchParams().get("email")?.trim() ?? "";
  return <ForgotPassword key={email} initialEmail={email} />;
}

function ForgotPassword({ initialEmail }: { initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [fieldError, setFieldError] = useState<string>();
  const request = useMutation({ mutationFn: (address: string) => requestPasswordReset(address) });

  if (request.isSuccess) {
    const sentTo = request.variables;
    return (
      <AccountShell icon={MailCheck} eyebrow="Mật khẩu" title="Kiểm tra hộp thư">
        <FormAlert tone="success">
          Nếu email <strong className="break-all font-semibold">{sentTo}</strong> có tài khoản, chúng tôi đã gửi link
          đặt lại mật khẩu. Link có hiệu lực 30 phút.
        </FormAlert>
        <p className="mt-4 text-center text-sm leading-6 text-landing-muted">
          Không thấy email? Xem thư mục Spam hoặc Quảng cáo, hoặc kiểm tra lại địa chỉ.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2">
          <button type="button" onClick={() => request.reset()} className={TEXT_LINK}>
            Nhập email khác
          </button>
          <span aria-hidden className="text-landing-line">
            ·
          </span>
          <Link href={withEmail(ROUTES.login, sentTo)} className={TEXT_LINK}>
            Quay lại đăng nhập
          </Link>
        </div>
      </AccountShell>
    );
  }

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (request.isPending) return;
    const problem = emailError(email);
    setFieldError(problem);
    if (problem) {
      document.getElementById("forgot-email")?.focus();
      return;
    }
    request.mutate(email.trim());
  };

  return (
    <AccountShell
      icon={KeyRound}
      eyebrow="Mật khẩu"
      title={TITLE}
      description="Nhập email của tài khoản WrapFit, chúng tôi sẽ gửi link để bạn đặt mật khẩu mới."
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <TextField
          id="forgot-email"
          name="email"
          type="email"
          label="Email"
          placeholder="ten@shop.vn"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          error={fieldError}
          onChange={(event) => {
            setEmail(event.target.value);
            setFieldError(undefined);
          }}
        />
        {request.error != null && <ApiErrorAlert error={request.error} />}
        <SubmitButton busy={request.isPending} busyLabel="Đang gửi…">
          Gửi link đặt lại mật khẩu
        </SubmitButton>
      </form>
      <div className="mt-3 text-center">
        <Link href={withEmail(ROUTES.login, email)} className={TEXT_LINK}>
          Quay lại đăng nhập
        </Link>
      </div>
    </AccountShell>
  );
}
