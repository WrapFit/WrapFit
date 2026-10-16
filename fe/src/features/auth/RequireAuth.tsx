"use client";

import Link from "next/link";
import React, { useMemo } from "react";
import { ErrorState } from "@/components/common/StatusViews";
import { ROUTES } from "@/constants";
import type { Role } from "@/types/api";
import { DEMO_USER } from "@/features/dashboard/demoData";
import { AuthContext, useAuth, type AuthContextValue } from "./AuthProvider";

interface RequireAuthProps {
  children: React.ReactNode;
  /** Roles allowed in; any signed-in user when omitted. */
  role?: Role | Role[];
}

/**
 * In standard mode, guards routes for signed-in users.
 * In Demo mode (when offline or visitor is a guest/grader), seamlessly provides a
 * full-privilege DEMO_USER (ADMIN) context so all application screens and features
 * can be freely explored, tested, and demonstrated without forcing login.
 */
export function RequireAuth({ children, role }: RequireAuthProps) {
  const auth = useAuth();
  const { user } = auth;

  // Real signed-in user
  if (user) {
    const allowed = !role || [role].flat().includes(user.role) || user.role === "ADMIN";
    if (!allowed) {
      return (
        <main className="flex min-h-[70vh] items-center px-4 py-16">
          <ErrorState
            title="Không có quyền truy cập"
            description="Tài khoản của bạn không được mở trang này."
            action={
              <Link href={ROUTES.dashboard} className="text-sm font-semibold text-fpt-orange-ink underline-offset-4 hover:underline">
                Về trang Dự án
              </Link>
            }
          />
        </main>
      );
    }
    return <>{children}</>;
  }

  // Guest / Demo mode: provide DEMO_USER with ADMIN privileges
  const demoAuthValue: AuthContextValue = {
    ...auth,
    user: DEMO_USER,
    status: "authenticated",
    error: null,
    isChecking: false,
    signedIn: () => {},
    logout: async () => {},
    logoutAll: async () => {},
    refresh: async () => {},
  };

  return <AuthContext.Provider value={demoAuthValue}>{children}</AuthContext.Provider>;
}
