import type { Metadata } from "next";
import AuthLoginPage from "@/views/auth/login";

export const metadata: Metadata = { title: "Tạo tài khoản | WrapFit" };

export default function RegisterPage() {
  return <AuthLoginPage initialMode="register" />;
}
