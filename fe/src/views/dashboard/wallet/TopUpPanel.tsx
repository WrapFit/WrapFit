'use client';

import { CheckCircle2, CreditCard, QrCode, type LucideIcon } from 'lucide-react';
import React, { useState } from 'react';
import { XU_CUSTOM, XU_PACKS, XU_VALUE_VND, customXuError, customXuPriceVnd, type XuPackId } from '@wrapfit/shared';
import { Badge, Button, Field, Input, RadioGroup } from '@/components/ui';
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

/** What the wallet asks the checkout to sell: a fixed pack, or any number of xu. */
export type XuTopUp = { purpose: XuPackPurpose } | { purpose: 'XU_CUSTOM'; xu: number };

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
  onBuy(topUp: XuTopUp): void;
}

/** "Nạp xu": the way to pay, the three fixed packs as quick picks or a number of xu typed in, one button that opens the checkout. */
export function TopUpPanel({ methods = [VIETQR_METHOD], onBuy }: TopUpPanelProps) {
  const [packId, setPackId] = useState<XuPackId>('XU_1050');
  // Typed number of xu: when set it replaces the selected pack.
  const [custom, setCustom] = useState('');
  const customXu = custom === '' ? null : Number(custom);
  const customError = customXu === null ? null : customXuError(customXu);

  const pack = XU_PACKS[packId];
  const bonus = pack.xu - pack.priceVnd / XU_VALUE_VND;
  const receive = customXu ?? pack.xu;
  const price = customXu !== null ? customXuPriceVnd(customXu) : pack.priceVnd;

  return (
    <Panel aria-labelledby="wallet-topup-title">
      <PanelTitle id="wallet-topup-title">Nạp xu</PanelTitle>

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
          value={customXu === null ? packId : ('' as XuPackId)}
          onChange={(id) => {
            setPackId(id);
            setCustom('');
          }}
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

      <Field
        className="mt-5"
        label="Hoặc nhập số xu muốn nạp"
        hint={`Từ ${xu(XU_CUSTOM.min)} đến ${xu(XU_CUSTOM.max)}, bội số của ${XU_CUSTOM.step}. Gói chọn nhanh được tặng thêm xu.`}
        error={customError}
      >
        {(field) => (
          <Input
            {...field}
            type="number"
            inputMode="numeric"
            min={XU_CUSTOM.min}
            max={XU_CUSTOM.max}
            step={XU_CUSTOM.step}
            placeholder="Ví dụ: 800"
            value={custom}
            onChange={(e) => setCustom(e.target.value.replace(/[^\d]/g, ''))}
            trailing={<span className="text-caption text-fg-muted">xu</span>}
          />
        )}
      </Field>

      <div className="mt-5 flex flex-col gap-4 rounded-panel bg-surface-sunken p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-body-sm text-fg-muted">
            Nhận <strong className="tabular-nums text-fg">{xu(receive)}</strong>
            {customXu === null && bonus > 0 && <span className="text-success-fg"> (+{xu(bonus)} tặng thêm)</span>}
          </p>
          <p className="mt-0.5 text-caption text-fg-muted">{customXu === null ? `${PACK_ESTIMATES[packId]} · ` : ''}dùng trong 12 tháng</p>
        </div>
        <Button
          variant="brand"
          shape="rounded"
          size="lg"
          className="sm:shrink-0"
          disabled={customError !== null}
          onClick={() => {
            tactileAudio.playSquishyTap();
            onBuy(customXu !== null ? { purpose: 'XU_CUSTOM', xu: customXu } : { purpose: packId });
          }}
        >
          Nạp {customError ? '' : formatVnd(price)}
        </Button>
      </div>
    </Panel>
  );
}
