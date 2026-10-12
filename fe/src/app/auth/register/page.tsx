import type { Metadata } from "next";
import AuthLoginPage from "@/views/auth/login";

export const metadata: Metadata = { title: "WrapFit — Đăng Ký Tài Khoản & CAD Studio" };

export default function RegisterPage() {
  return <AuthLoginPage initialMode="register" />;
}
