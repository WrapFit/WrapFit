import type { Metadata } from "next";

// The path is fixed: the backend builds the link of the verification email as FRONTEND_URL + /verify-email?token=.
export const metadata: Metadata = {
  title: "WrapFit — Xác nhận email",
  robots: { index: false },
};

export { default } from "@/views/account/verify-email";
