"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect } from "react";
import { ErrorState, PageLoader } from "@/components/common/StatusViews";
import { ROUTES } from "@/constants";
import type { Role } from "@/types/api";
import { useAuth } from "./AuthProvider";
import { loginUrl } from "./redirect";

interface RequireAuthProps {
  children: React.ReactNode;
  /** Roles allowed in; any signed-in user when omitted. */
  role?: Role | Role[];
}

/**
 * Renders its children for a signed-in user only. The session cookies are scoped to /api, so pages cannot be guarded
 * on the server (middleware): the check runs here, and the API still refuses what the user may not do.
 */
export function RequireAuth({ children, role }: RequireAuthProps) {
  const { status, user, error, isChecking, refresh } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "anonymous") router.replace(loginUrl(pathname + window.location.search));
  }, [status, pathname, router]);

  if (status === "error") {
    return (
      <main className="flex min-h-[70vh] items-center px-4 py-16">
        <ErrorState
          error={error}
          title="Chưa kiểm tra được phiên đăng nhập"
          onRetry={() => void refresh()}
          retrying={isChecking}
        />
      </main>
    );
  }
  if (status !== "authenticated" || !user) return <PageLoader label="Đang kiểm tra phiên đăng nhập…" />;

  const allowed = !role || [role].flat().includes(user.role);
  if (!allowed) {
    return (
      <main className="flex min-h-[70vh] items-center px-4 py-16">
        <ErrorState
          title="Không có quyền truy cập"
          description="Tài khoản của bạn không được mở trang này."
          action={
            <Link href={ROUTES.dashboard} className="text-sm font-semibold text-landing-green-deep underline-offset-4 hover:underline">
              Về trang Dự án
            </Link>
          }
        />
      </main>
    );
  }
  return <>{children}</>;
}
