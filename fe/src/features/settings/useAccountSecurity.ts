"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { requestPasswordReset } from "@/api/auth";
import { useToast } from "@/components/common/Toast";
import { useAuth } from "@/features/auth";

/** Same pause as "gửi lại" on /check-email: the backend rate-limits these emails anyway. */
const RESEND_COOLDOWN_MS = 60_000;

/**
 * "Đổi mật khẩu": the API has no change-password endpoint, so a reset link goes to the account's own email
 * (`POST /auth/password/forgot`, always 202). Setting the new password signs out every session.
 */
export function usePasswordResetLink(email: string) {
  const toast = useToast();
  const [availableAt, setAvailableAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (availableAt <= Date.now()) return;
    const timer = window.setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= availableAt) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [availableAt]);

  const mutation = useMutation({
    mutationFn: () => requestPasswordReset(email),
    onSuccess: () => {
      const sentAt = Date.now();
      setNow(sentAt);
      setAvailableAt(sentAt + RESEND_COOLDOWN_MS);
      toast.show({
        tone: "success",
        title: "Đã gửi email đổi mật khẩu",
        description: `Mở link trong thư gửi tới ${email} (hiệu lực 30 phút). Đặt mật khẩu mới xong, mọi thiết bị phải đăng nhập lại.`,
      });
    },
    onError: (error) => toast.error(error, "Không gửi được email đổi mật khẩu"),
  });

  return {
    send: () => mutation.mutate(),
    sending: mutation.isPending,
    /** Seconds before another email may be asked for. */
    secondsLeft: Math.max(0, Math.ceil((availableAt - now) / 1000)),
  };
}

/**
 * `POST /auth/logout-all`: every session of the account ends at once, this browser included. The toast lives in the
 * mutation options because the page unmounts as soon as the session is cleared (RequireAuth sends to the login page).
 */
export function useLogoutAllDevices() {
  const { logoutAll } = useAuth();
  const toast = useToast();
  return useMutation({
    mutationFn: () => logoutAll(),
    onSuccess: () =>
      toast.show({
        tone: "success",
        title: "Đã đăng xuất khỏi mọi thiết bị",
        description: "Hãy đăng nhập lại để tiếp tục làm việc.",
      }),
    onError: (error) => toast.error(error, "Không đăng xuất được mọi thiết bị"),
  });
}
