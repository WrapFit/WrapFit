import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageLoader } from '@/components/common/StatusViews';
import CheckoutStep1Page from '@/views/checkout/step-1';

export const metadata: Metadata = {
  title: 'Chọn gói — Thanh toán WrapFit',
  robots: { index: false },
};

// The plan and billing cycle are read from the query string on the client.
export default function Page() {
  return (
    <Suspense fallback={<PageLoader />}>
      <CheckoutStep1Page />
    </Suspense>
  );
}
