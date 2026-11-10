'use client';

import { CheckCircle2, CreditCard, QrCode, type LucideIcon } from 'lucide-react';
import React, { useState } from 'react';
import { XU_PACKS, XU_VALUE_VND, type XuPackId } from '@wrapfit/shared';
import { Badge, Button, RadioGroup } from '@/components/ui';
import { Panel, PanelTitle } from '@/components/workspace';
import { formatVnd } from '@/features/pricing';
import { tactileAudio } from '@/services/audio/tactileAudio';
import type { XuPackPurpose } from '@/types/api';
import { xu } from './xu-meta';

const PACKS = (Object.keys(XU_PACKS) as XuPackId[]).map((id) => XU_PACKS[id]);

const PACK_ESTIMATES: Record<XuPackId, string> = {
  XU_500: '~12 ảnh AI hoặc 500 hoa văn',
  XU_1050: '~26 ảnh AI hoặc 1.000 hoa văn',
  XU_2200: 'Trọn gói cho 50+ mẫu hộp quà',
};

/** A way to pay that applies to this account. The server picks it at checkout; the card only tells the user which. */
export interface TopUpMethod {
  id: string;
  title: string;
  text: string;
  icon: LucideIcon;
}

export const VIETQR_METHOD: TopUpMethod = {
  id: 'vietqr',
  title: 'Chuyển khoản VietQR',
  text: 'Quét mã bằng app ngân hàng, xác nhận sau vài giây',
  icon: QrCode,
};

export const VNPAY_METHOD: TopUpMethod = {
  id: 'vnpay',
  title: 'VNPay (sandbox)',
  text: 'Tài khoản demo: thanh toán thử qua cổng VNPay, không trừ tiền thật',
  icon: CreditCard,
};

/** `methods` is the card of the way this account pays: VietQR for real accounts, "VNPay (sandbox)" for demo accounts (docs/21 §4.2). */
export interface TopUpPanelProps {
  methods?: TopUpMethod[];
  onBuy(purpose: XuPackPurpose): void;
}

/** "Nạp xu": the way to pay, the three fixed packs as quick picks, one button that opens the checkout. */
export function TopUpPanel({ methods = [VIETQR_METHOD], onBuy }: TopUpPanelProps) {
  const [packId, setPackId] = useState<XuPackId>('XU_1050');
  const pack = XU_PACKS[packId];
  const bonus = pack.xu - pack.priceVnd / XU_VALUE_VND;

  return (
    <Panel aria-labelledby="wallet-topup-title">
      <PanelTitle id="wallet-topup-title" action={<Badge tone="neutral">1 xu = {formatVnd(XU_VALUE_VND)}</Badge>}>
        Nạp xu
      </PanelTitle>

      <ul aria-label="Phương thức thanh toán" className="flex flex-col gap-2">
        {methods.map((method) => (
          <li key={method.id} className="flex items-center gap-3 rounded-panel border border-accent bg-accent-bg p-3.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-surface-raised text-accent-fg [&_svg]:size-5">
              <method.icon aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body-sm font-medium text-fg">{method.title}</span>
              <span className="block text-caption text-fg-muted">{method.text}</span>
            </span>
            <CheckCircle2 className="size-5 shrink-0 text-accent-fg" aria-label="Đang áp dụng" />
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <RadioGroup<XuPackId>
          label="Chọn nhanh gói xu"
          value={packId}
          onChange={setPackId}
          variant="card"
          inline
          options={PACKS.map((item) => ({
            value: item.id,
            label: (
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="tabular-nums">{xu(item.xu)}</span>
                {item.id === 'XU_1050' && (
                  <Badge tone="warning" size="sm">
                    Phổ biến
                  </Badge>
                )}
              </span>
            ),
            description: formatVnd(item.priceVnd),
          }))}
        />
      </div>

      <div className="mt-5 flex flex-col gap-4 rounded-panel bg-surface-sunken p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-body-sm text-fg-muted">
            Nhận <strong className="tabular-nums text-fg">{xu(pack.xu)}</strong>
            {bonus > 0 && <span className="text-success-fg"> (+{xu(bonus)} tặng thêm)</span>}
          </p>
          <p className="mt-0.5 text-caption text-fg-muted">{PACK_ESTIMATES[packId]} · dùng trong 12 tháng</p>
        </div>
        <Button
          variant="brand"
          shape="rounded"
          size="lg"
          className="sm:shrink-0"
          onClick={() => {
            tactileAudio.playSquishyTap();
            onBuy(packId);
          }}
        >
          Nạp {formatVnd(pack.priceVnd)}
        </Button>
      </div>
    </Panel>
  );
}
