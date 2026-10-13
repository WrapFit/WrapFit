import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageLoader } from '@/components/common/StatusViews';
import CheckoutStep3Page from '@/views/checkout/step-3';

export const metadata: Metadata = {
  title: 'Xác nhận nâng cấp — Thanh toán WrapFit',
  robots: { index: false },
};

// The plan and billing cycle are read from the query string on the client.
export default function Page() {
  return (
    <Suspense fallback={<PageLoader />}>
      <CheckoutStep3Page />
    </Suspense>
  );
}
