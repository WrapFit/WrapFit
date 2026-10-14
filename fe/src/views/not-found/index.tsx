import { FolderOpen, LayoutTemplate, LifeBuoy } from "lucide-react";
import Link from "next/link";
import React from "react";
import { LIME_PILL, StatusScreen, WHITE_PILL } from "@/components/landing/StatusScreen";
import { ROUTES } from "@/constants";

/** 404 in the pack.ly style. The projects of the user are saved: the page says where to find them. */
export default function NotFoundPage() {
  return (
    <StatusScreen
      code="404"
      title="Không tìm thấy trang này"
      description="Đường dẫn có thể đã đổi hoặc trang đã bị gỡ. Dự án của bạn vẫn được lưu an toàn trong không gian làm việc."
      actions={
        <>
          <Link href={ROUTES.home} className={LIME_PILL}>
            Về trang chủ
          </Link>
          <Link href={ROUTES.dashboard} className={WHITE_PILL}>
            Mở không gian làm việc
          </Link>
        </>
      }
      shortcuts={[
        { href: ROUTES.projects, title: "Dự án của bạn", text: "Mọi hộp đã lưu, kể cả bản trong thùng rác 30 ngày.", icon: FolderOpen },
        { href: ROUTES.templates, title: "Thư viện mẫu", text: "Bắt đầu lại từ một mẫu hộp đạt FitCheck™.", icon: LayoutTemplate },
        { href: "/support", title: "Trung tâm hỗ trợ", text: "Câu hỏi thường gặp về kích thước, file in, mã QR.", icon: LifeBuoy },
      ]}
    />
  );
}
