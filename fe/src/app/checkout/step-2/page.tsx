import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageLoader } from '@/components/common/StatusViews';
import CheckoutStep2Page from '@/views/checkout/step-2';

export const metadata: Metadata = {
  title: 'Thông tin thanh toán — Thanh toán WrapFit',
  robots: { index: false },
};

// The plan and billing cycle are read from the query string on the client.
export default function Page() {
  return (
    <Suspense fallback={<PageLoader />}>
      <CheckoutStep2Page />
    </Suspense>
  );
}
