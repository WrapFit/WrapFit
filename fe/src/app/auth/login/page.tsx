import type { Metadata } from "next";
import AuthLoginPage from "@/views/auth/login";

export const metadata: Metadata = { title: "Đăng nhập — WrapFit" };

export default function LoginPage() {
  return <AuthLoginPage initialMode="login" />;
}
