import type { Metadata } from "next";
import AuthLoginPage from "@/views/auth/login";

export const metadata: Metadata = { title: "WrapFit — Xác Thực & Tài Khoản" };

export default function LoginPage() {
  return <AuthLoginPage initialMode="login" />;
}
