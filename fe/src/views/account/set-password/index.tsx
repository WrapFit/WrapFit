"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useState } from "react";
import { resetPassword } from "@/api/auth";
import { PRIMARY_BUTTON } from "@/components/common/StatusViews";
import { ROUTES } from "@/constants";
import { useAuth } from "@/features/auth";
import { isApiError } from "@/services/api";
import type { ApiErrorCode } from "@/types/api";
import {
  AccountLoading,
  AccountShell,
  ApiErrorAlert,
  PASSWORD_HINT,
  PasswordField,
  SubmitButton,
  TEXT_LINK,
  isPlausibleToken,
  passwordError,
} from "@/views/account/shared";

/** `reset` = link of "Đặt lại mật khẩu", `complete-signup` = link of "Hoàn tất đăng ký". Same API (docs/06, 3.6). */
export type SetPasswordVariant = "reset" | "complete-signup";

const COPY: Record<SetPasswordVariant, { eyebrow: string; title: string; description: string; submit: string }> = {
  reset: {
    eyebrow: "Mật khẩu",
    title: "Đặt lại mật khẩu",
    description: "Chọn mật khẩu mới cho tài khoản WrapFit. Sau khi lưu, mọi thiết bị đang đăng nhập sẽ được đăng xuất.",
    submit: "Lưu mật khẩu mới",
  },
  "complete-signup": {
    eyebrow: "Hoàn tất đăng ký",
    title: "Hoàn tất đăng ký — đặt mật khẩu",
    description: "Đặt mật khẩu để hoàn tất tài khoản WrapFit. Email của bạn được xác nhận cùng lúc.",
    submit: "Hoàn tất đăng ký",
  },
};

/** Page of `/reset-password?token=` and `/complete-signup?token=`. */
export default function SetPasswordPage({ variant }: { variant: SetPasswordVariant }) {
  const copy = COPY[variant];
  return (
    <Suspense
      fallback={
        <AccountShell pose="measuring" eyebrow={copy.eyebrow} title={copy.title}>
          <AccountLoading />
        </AccountShell>
      }
    >
      <SetPasswordFromQuery variant={variant} />
    </Suspense>
  );
}

function SetPasswordFromQuery({ variant }: { variant: SetPasswordVariant }) {
  const token = useSearchParams().get("token")?.trim() ?? "";
  return <SetPassword key={token} variant={variant} token={token} />;
}

type LinkProblemCode = Extract<ApiErrorCode, "AUTH_TOKEN_INVALID" | "AUTH_TOKEN_EXPIRED" | "AUTH_TOKEN_CONSUMED">;
const LINK_PROBLEMS = new Set<string>(["AUTH_TOKEN_INVALID", "AUTH_TOKEN_EXPIRED", "AUTH_TOKEN_CONSUMED"]);

function SetPassword({ variant, token }: { variant: SetPasswordVariant; token: string }) {
  const copy = COPY[variant];
  const router = useRouter();
  const { logout } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});

  const save = useMutation({
    mutationFn: (value: string) => resetPassword(token, value),
    // The backend signs out every session and clears the cookies: drop the local user too, then sign in again.
    // Awaited, so the button stays busy until the page changes.
    onSuccess: async () => {
      await logout();
      router.replace(`${ROUTES.login}?notice=password_reset`);
    },
  });

  if (!isPlausibleToken(token)) return <SetPasswordLinkProblem variant={variant} code="AUTH_TOKEN_INVALID" />;
  const { error } = save;
  if (isApiError(error) && error.code && LINK_PROBLEMS.has(error.code)) {
    return <SetPasswordLinkProblem variant={variant} code={error.code as LinkProblemCode} />;
  }

  const busy = save.isPending || save.isSuccess;

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const next = {
      password: passwordError(password),
      confirm: !confirm
        ? "Vui lòng nhập lại mật khẩu."
        : confirm !== password
          ? "Mật khẩu nhập lại không khớp."
          : undefined,
    };
    setErrors(next);
    if (next.password || next.confirm) {
      document.getElementById(next.password ? "new-password" : "confirm-password")?.focus();
      return;
    }
    save.mutate(password);
  };

  return (
    <AccountShell pose="measuring" eyebrow={copy.eyebrow} title={copy.title} description={copy.description}>
      <form onSubmit={onSubmit} noValidate className="space-y-3.5">
        <PasswordField
          id="new-password"
          name="password"
          label="Mật khẩu mới"
          autoComplete="new-password"
          required
          maxLength={200}
          value={password}
          error={errors.password}
          hint={PASSWORD_HINT}
          onChange={(event) => {
            setPassword(event.target.value);
            setErrors((current) => ({ ...current, password: undefined }));
          }}
        />
        <PasswordField
          id="confirm-password"
          name="confirmPassword"
          label="Nhập lại mật khẩu mới"
          autoComplete="new-password"
          required
          maxLength={200}
          value={confirm}
          error={errors.confirm}
          onChange={(event) => {
            setConfirm(event.target.value);
            setErrors((current) => ({ ...current, confirm: undefined }));
          }}
        />
        {/* A 400 without code (password refused): the link still works, the user may try again. */}
        {error != null && <ApiErrorAlert error={error} />}
        <SubmitButton busy={busy} busyLabel="Đang lưu mật khẩu…">
          {copy.submit}
        </SubmitButton>
      </form>
    </AccountShell>
  );
}

const PROBLEM_COPY: Record<LinkProblemCode, { title: string; description: string }> = {
  AUTH_TOKEN_INVALID: {
    title: "Link không còn hiệu lực",
    description:
      "Link này không đúng, hoặc đã có link mới hơn được gửi tới hộp thư của bạn. Hãy mở email mới nhất, hoặc yêu cầu link mới.",
  },
  AUTH_TOKEN_EXPIRED: {
    title: "Link đã hết hạn",
    description: "Link đặt mật khẩu chỉ có hiệu lực 30 phút. Hãy yêu cầu link mới.",
  },
  AUTH_TOKEN_CONSUMED: {
    title: "Link đã được dùng",
    description: "Mật khẩu đã được đặt bằng link này. Hãy đăng nhập bằng mật khẩu mới.",
  },
};

function SetPasswordLinkProblem({ variant, code }: { variant: SetPasswordVariant; code: LinkProblemCode }) {
  const { title, description } = PROBLEM_COPY[code];
  const consumed = code === "AUTH_TOKEN_CONSUMED";
  return (
    <AccountShell pose="chilling" eyebrow={COPY[variant].eyebrow} title={title} description={description}>
      <div className="flex flex-col items-center gap-1">
        {consumed ? (
          <>
            <Link href={ROUTES.login} className={`${PRIMARY_BUTTON} w-full`}>
              Đến trang đăng nhập
            </Link>
            <Link href={ROUTES.forgotPassword} className={TEXT_LINK}>
              Quên mật khẩu?
            </Link>
          </>
        ) : (
          <>
            <Link href={ROUTES.forgotPassword} className={`${PRIMARY_BUTTON} w-full`}>
              Gửi link đặt mật khẩu mới
            </Link>
            <Link href={ROUTES.login} className={TEXT_LINK}>
              Quay lại đăng nhập
            </Link>
          </>
        )}
      </div>
    </AccountShell>
  );
}
