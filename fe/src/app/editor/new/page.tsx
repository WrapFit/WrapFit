import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLoader } from "@/components/common/StatusViews";
import NewProjectPage from "@/views/editor/new";

export const metadata: Metadata = {
  title: "Tạo dự án mới | WrapFit Studio",
  description: "Chọn cấu trúc hộp và kích thước món quà (mm) để bắt đầu thiết kế bao bì.",
};

// `?template=` is read on the client (useSearchParams), so the page is wrapped in Suspense.
export default function Page() {
  return (
    <Suspense fallback={<PageLoader />}>
      <NewProjectPage />
    </Suspense>
  );
}
