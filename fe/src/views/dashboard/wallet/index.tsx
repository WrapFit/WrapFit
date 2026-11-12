'use client';

/**
 * `/dashboard/wallet` (docs/21 S6): the xu wallet moved out of billing. Layout of NasaFilm's WalletPage in WrapFit's
 * design system: "Nạp xu" in the main column, balance / expiring xu / plan at the side, the ledger history below.
 * Data: `GET /billing/me` (balance, lots, plan) and `GET /billing/xu/history`. Packs are paid in the shared checkout.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getBillingSummary } from '@/api/payments';
import { ButtonLink } from '@/components/ui';
import { WorkspaceError, WorkspaceShell } from '@/components/workspace';
import { RequireAuth, useAuth } from '@/features/auth';
import { CheckoutDialog } from '@/features/payments';
import { queryKeys } from '@/hooks/data';
import React, { useState } from 'react';
import { BalanceAside } from './BalanceAside';
import { HistoryPanel } from './HistoryPanel';
import { TopUpPanel, VIETQR_METHOD, VNPAY_METHOD, type XuTopUp } from './TopUpPanel';

export default function WalletPage() {
  return (
    <RequireAuth>
      <WalletScreen />
    </RequireAuth>
  );
}

function WalletScreen() {
  const { user } = useAuth();
  const tier = user?.subscriptionTier ?? 'FREE';
  const queryClient = useQueryClient();
  const billing = useQuery({ queryKey: queryKeys.billing, queryFn: getBillingSummary });
  const [buying, setBuying] = useState<XuTopUp | null>(null);

  const refresh = () => {
    void billing.refetch();
    void queryClient.invalidateQueries({ queryKey: queryKeys.xuHistory });
  };

  // The server picks the provider at checkout from `users.is_demo`; the card only tells the user which one applies.
  // Until the summary arrives, show the real-money method: a demo account never pays that way, so no wrong promise sticks.
  const methods = [billing.data?.isDemo ? VNPAY_METHOD : VIETQR_METHOD];

  return (
    <WorkspaceShell
      title="Ví xu Wrap"
      description="Nạp xu cho ảnh AI, hoa văn và xuất file sản xuất."
      actions={
        <ButtonLink href="/dashboard/billing" variant="outline" shape="rounded">
          Gói cước và hóa đơn
        </ButtonLink>
      }
    >
      {billing.isError && !billing.data && (
        <div className="mb-6">
          <WorkspaceError error={billing.error} onRetry={() => void billing.refetch()} retrying={billing.isFetching} />
        </div>
      )}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12 xl:grid-rows-[auto_1fr]">
        <div className="xl:col-span-8">
          <TopUpPanel methods={methods} onBuy={setBuying} />
        </div>
        <div className="xl:col-span-4 xl:row-span-2">
          <BalanceAside billing={billing.data} tier={tier} loading={billing.isPending} refreshing={billing.isFetching} onRefresh={refresh} />
        </div>
        <div className="xl:col-span-8">
          <HistoryPanel />
        </div>
      </div>
      {buying && <CheckoutDialog purpose={buying.purpose} xu={'xu' in buying ? buying.xu : undefined} onClose={() => setBuying(null)} />}
    </WorkspaceShell>
  );
}
