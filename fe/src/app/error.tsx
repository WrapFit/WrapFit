"use client";

import { FolderOpen, LifeBuoy, RotateCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { LIME_PILL, StatusScreen, WHITE_PILL } from "@/components/landing/StatusScreen";
import { ROUTES } from "@/constants";

/** A page crashed while rendering: say so instead of a blank screen, and let the user retry. */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      code="Ôi!"
      title="Trang gặp sự cố"
      description={`Có lỗi khi hiển thị trang này. Thử tải lại; nếu vẫn lỗi, hãy gửi mã lỗi cho chúng tôi${error.digest ? `: ${error.digest}` : "."}`}
      actions={
        <>
          <button type="button" onClick={reset} className={LIME_PILL}>
            <RotateCw className="size-4" aria-hidden />
            Thử lại
          </button>
          <Link href={ROUTES.home} className={WHITE_PILL}>
            Về trang chủ
          </Link>
        </>
      }
      shortcuts={[
        { href: ROUTES.projects, title: "Dự án của bạn", text: "Thiết kế đã lưu tự động không bị mất.", icon: FolderOpen },
        { href: "/support", title: "Trung tâm hỗ trợ", text: "Báo lỗi và xem các câu hỏi thường gặp.", icon: LifeBuoy },
      ]}
    />
  );
}
