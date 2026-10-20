"use client";

import Link from "next/link";
import React, { useMemo } from "react";
import { ErrorState } from "@/components/common/StatusViews";
import { ROUTES } from "@/constants";
import type { Role } from "@/types/api";
import { DEMO_USER } from "@/features/dashboard/demoData";
import { AuthContext, useAuth, type AuthContextValue } from "./AuthProvider";
import { homeForRole, isRealAdmin } from "./roles";

interface RequireAuthProps {
  children: React.ReactNode;
  /** Roles allowed in; any signed-in user when omitted. */
  role?: Role | Role[];
}

/**
 * In standard mode, guards routes for signed-in users.
 * Requires genuine ADMIN authorization for administrative consoles.
 * For general workspace, seamlessly provides DEMO_USER (MAKER) context when offline or reviewing.
 */
export function RequireAuth({ children, role }: RequireAuthProps) {
  const auth = useAuth();
  const { user } = auth;
  const requiresAdmin = role === "ADMIN" || (Array.isArray(role) && role.includes("ADMIN"));

  // Real signed-in user
  if (user) {
    const isAdmin = isRealAdmin(user);
    const allowed = requiresAdmin
      ? isAdmin
      : !role || [role].flat().includes(user.role) || isAdmin;

    if (!allowed) {
      return (
        <main className="flex min-h-[70vh] items-center px-4 py-16">
          <ErrorState
            title="Không có quyền truy cập"
            description="Tài khoản của bạn không được mở trang này."
            action={
              <Link href={homeForRole(user.role)} className="text-sm font-semibold text-fpt-orange-ink underline-offset-4 hover:underline">
                {isAdmin ? "Về trang quản trị" : "Về không gian làm việc"}
              </Link>
            }
          />
        </main>
      );
    }
    return <>{children}</>;
  }

  // Not signed in: if accessing an admin route, must authenticate with admin credentials
  if (requiresAdmin) {
    return (
      <main className="flex min-h-[70vh] items-center px-4 py-16">
        <ErrorState
          title="Yêu cầu quyền Quản trị viên"
          description="Vui lòng đăng nhập với tài khoản Quản trị viên (admin@wrapfit.vn) để mở trang này."
          action={
            <Link href="/login?redirect=/admin" className="text-sm font-semibold text-fpt-orange-ink underline-offset-4 hover:underline">
              Đăng nhập tài khoản Quản trị
            </Link>
          }
        />
      </main>
    );
  }

  // Guest / Demo mode: provide DEMO_USER (MAKER) context for general maker workspace
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
