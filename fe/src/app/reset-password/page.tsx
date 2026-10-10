import type { Metadata } from "next";
import SetPasswordPage from "@/views/account/set-password";

// The path is fixed: the backend builds the link of the "reset password" email as FRONTEND_URL + /reset-password?token=.
export const metadata: Metadata = {
  title: "WrapFit — Đặt lại mật khẩu",
  robots: { index: false },
};

export default function ResetPasswordRoute() {
  return <SetPasswordPage variant="reset" />;
}
