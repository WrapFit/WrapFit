'use client';

/**
 * `/admin/vault-quotas`: the quotas the API enforces per subscription tier (features/pricing, kept in step with
 * be/src/storage/storage.rules.ts and be/src/ai/ai-pattern.service.ts) and the upload limits per file purpose.
 */

import React from 'react';
import { AdminShell, Badge, DataTable, Panel, PanelTitle } from '@/components/workspace';
import { TIER_LABELS } from '@/constants';
import { RequireAuth } from '@/features/auth';
import { UPLOAD_RULES, formatBytes } from '@/features/dashboard';
import { PLANS, PLAN_ORDER, formatQuota, formatUsd, type Plan } from '@/features/pricing';

export default function AdminVaultQuotasPage() {
  return (
    <RequireAuth role="ADMIN">
      <VaultQuotas />
    </RequireAuth>
  );
}

const PURPOSE_LABELS: Record<keyof typeof UPLOAD_RULES, string> = {
  LOGO: 'Logo (Brand kit)',
  IMAGE: 'Ảnh trên hộp',
  THUMBNAIL: 'Ảnh thu nhỏ dự án',
  AVATAR: 'Ảnh đại diện',
};

function VaultQuotas() {
  const purposes = Object.keys(UPLOAD_RULES) as (keyof typeof UPLOAD_RULES)[];
  return (
    <AdminShell title="Hạn mức lưu trữ" description="Dung lượng và lượt tạo hoa văn AI mà API áp cho từng gói, cùng giới hạn của từng loại tệp tải lên.">
      <div className="flex flex-col gap-6">
        <Panel aria-labelledby="quota-tiers">
          <PanelTitle id="quota-tiers" action={<Badge tone="green">Dữ liệu thật</Badge>}>
            Hạn mức theo gói
          </PanelTitle>
          <DataTable<Plan>
            label="Hạn mức theo gói"
            rows={PLAN_ORDER.map((tier) => PLANS[tier])}
            rowKey={(plan) => plan.tier}
            columns={[
              { key: 'tier', label: 'Gói', render: (plan) => <span className="font-medium">{TIER_LABELS[plan.tier]}</span> },
              { key: 'storage', label: 'Dung lượng', render: (plan) => formatQuota(plan.storageBytes) },
              { key: 'ai', label: 'Xu Wrap / kỳ', render: (plan) => `${plan.xuPerPeriod.toLocaleString('vi-VN')} xu` },
              { key: 'price', label: 'Giá / tháng', align: 'right', render: (plan) => (plan.price.monthly === 0 ? 'Miễn phí' : formatUsd(plan.price.monthly)) },
            ]}
          />
          <p className="mt-4 text-sm leading-[1.6] text-library-sub">
            Khi đầy dung lượng, API từ chối tệp mới (403) cho tới khi người dùng xoá bớt hoặc nâng gói; dự án cũ không bị ảnh hưởng. Lượt AI tính trên 24 giờ gần nhất.
          </p>
        </Panel>

        <Panel aria-labelledby="quota-uploads">
          <PanelTitle id="quota-uploads">Giới hạn tệp tải lên</PanelTitle>
          <DataTable<keyof typeof UPLOAD_RULES>
            label="Giới hạn tệp tải lên"
            rows={purposes}
            rowKey={(purpose) => purpose}
            columns={[
              { key: 'purpose', label: 'Loại tệp', render: (purpose) => <span className="font-medium">{PURPOSE_LABELS[purpose]}</span> },
              { key: 'code', label: 'Mục đích (API)', render: (purpose) => <span className="font-mono text-xs">{purpose}</span> },
              { key: 'formats', label: 'Định dạng', render: (purpose) => UPLOAD_RULES[purpose].formats },
              { key: 'max', label: 'Tối đa', align: 'right', render: (purpose) => formatBytes(UPLOAD_RULES[purpose].maxBytes) },
            ]}
          />
        </Panel>
      </div>
    </AdminShell>
  );
}
