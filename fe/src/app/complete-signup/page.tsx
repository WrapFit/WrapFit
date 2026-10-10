import type { Metadata } from "next";
import SetPasswordPage from "@/views/account/set-password";

// The path is fixed: the backend builds the link of the "complete sign-up" email as FRONTEND_URL + /complete-signup?token=.
export const metadata: Metadata = {
  title: "WrapFit — Hoàn tất đăng ký",
  robots: { index: false },
};

export default function CompleteSignupRoute() {
  return <SetPasswordPage variant="complete-signup" />;
}
