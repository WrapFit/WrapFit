import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageLoader } from '@/components/common/StatusViews';
import DashboardOrdersPage from '@/views/dashboard/orders';

export const metadata: Metadata = {
  title: 'Đơn hàng — WrapFit',
  robots: { index: false },
};

export default function Page() {
  return (
    <Suspense fallback={<PageLoader label="Đang tải danh sách đơn hàng…" />}>
      <DashboardOrdersPage />
    </Suspense>
  );
}
