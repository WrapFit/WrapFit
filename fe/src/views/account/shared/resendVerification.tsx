"use client";

import { useMutation } from "@tanstack/react-query";
import React, { useCallback, useEffect, useState } from "react";
import { resendVerificationEmail } from "@/api/auth";
import { isApiError } from "@/services/api";
import { ApiErrorAlert, FormAlert } from "./FormAlert";
import { SubmitButton, TextField } from "./fields";
import { emailError } from "./validation";

/** The backend sends at most one email per minute per account (and ignores the rest silently): lock the button. */
export const RESEND_LOCK_SECONDS = 60;

/** Seconds left of a lock started with `start(seconds)`; ticks while running. */
function useCooldown() {
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!until) return;
    const timer = window.setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (time >= until) window.clearInterval(timer);
    }, 250);
    return () => window.clearInterval(timer);
  }, [until]);

  const start = useCallback((seconds: number) => {
    const time = Date.now();
    setNow(time);
    setUntil(time + seconds * 1000);
  }, []);

  return { secondsLeft: Math.max(0, Math.ceil((until - now) / 1000)), start };
}

export interface ResendVerification {
  /** `onSent` runs after this send succeeded (while the caller is still mounted). */
  send(email: string, onSent?: (email: string) => void): void;
  isPending: boolean;
  error: unknown;
  /** Address of the last email sent from this page. */
  sentTo: string | null;
  /** > 0 while the button is locked. */
  secondsLeft: number;
}

/** "Send the verification email again", shared by `/check-email` and the failed `/verify-email`. */
export function useResendVerification(): ResendVerification {
  const cooldown = useCooldown();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (email: string) => resendVerificationEmail(email),
    onSuccess: (_answer, email) => {
      setSentTo(email);
      cooldown.start(RESEND_LOCK_SECONDS);
    },
    onError: (error) => {
      // Rate limited: wait as long as the server asks. Other failures (offline…) may be retried at once.
      if (isApiError(error) && error.status === 429) cooldown.start(error.retryAfter ?? RESEND_LOCK_SECONDS);
    },
  });

  return {
    send: (email, onSent) => {
      if (mutation.isPending || cooldown.secondsLeft > 0) return;
      const address = email.trim();
      mutation.mutate(address, { onSuccess: () => onSent?.(address) });
    },
    isPending: mutation.isPending,
    error: mutation.error,
    sentTo,
    secondsLeft: cooldown.secondsLeft,
  };
}

export function resendLabel(resend: ResendVerification, label: string): string {
  return resend.secondsLeft > 0 ? `Gửi lại sau ${resend.secondsLeft} giây` : label;
}

/** Confirmation once an email went out: always the same text, the API never says whether the address exists. */
export function ResendSentNotice({ email }: { email: string }) {
  return (
    <FormAlert tone="success" title="Đã gửi lại email">
      Nếu <strong className="break-all font-semibold">{email}</strong> có tài khoản chưa xác nhận, email mới đang trên
      đường tới. Hãy mở email <strong className="font-semibold">mới nhất</strong>: link trong các email trước không còn
      dùng được.
    </FormAlert>
  );
}

interface ResendVerificationFormProps {
  resend: ResendVerification;
  defaultEmail?: string;
  submitLabel?: string;
  /** Called once the email went out (e.g. to show the address instead of the form). */
  onSent?: (email: string) => void;
}

/** Asks for the address, then sends a new verification link. */
export function ResendVerificationForm({
  resend,
  defaultEmail = "",
  submitLabel = "Gửi email xác nhận",
  onSent,
}: ResendVerificationFormProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [fieldError, setFieldError] = useState<string>();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const problem = emailError(email);
    setFieldError(problem);
    if (problem) {
      document.getElementById("resend-email")?.focus();
      return;
    }
    resend.send(email, onSent);
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <TextField
        id="resend-email"
        name="email"
        type="email"
        label="Email đã dùng để đăng ký"
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
      {resend.error != null && <ApiErrorAlert error={resend.error} />}
      {resend.sentTo && !onSent && <ResendSentNotice email={resend.sentTo} />}
      <SubmitButton busy={resend.isPending} busyLabel="Đang gửi…" disabled={resend.secondsLeft > 0}>
        {resendLabel(resend, submitLabel)}
      </SubmitButton>
    </form>
  );
}
