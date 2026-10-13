'use client';

/**
 * `/checkout/step-2?plan=&billing=`: invoice details and payment method. There is no billing API yet: the details are
 * prefilled from the account (`GET /auth/me`), checked here and never sent; no card number is asked.
 */

import { ArrowLeft, ArrowRight, Building2, CreditCard, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { CheckoutShell, useCheckoutParams } from '@/components/checkout/CheckoutShell';
import { RequireAuth, useAuth } from '@/features/auth';
import { cn } from '@/utils/helpers';
import { TextField } from '@/views/account/shared';

export default function CheckoutStep2Page() {
  return (
    <RequireAuth>
      <Payment />
    </RequireAuth>
  );
}

const METHODS = [
  { id: 'card', label: 'Thẻ quốc tế', text: 'Visa, Mastercard, JCB', icon: CreditCard },
  { id: 'bank', label: 'Chuyển khoản ngân hàng', text: 'Mã QR VietQR, kích hoạt khi nhận tiền', icon: Building2 },
  { id: 'wallet', label: 'Ví điện tử', text: 'MoMo, ZaloPay', icon: Wallet },
] as const;

function Payment() {
  const router = useRouter();
  const { user } = useAuth();
  const { tier, billing, query } = useCheckoutParams();
  const [name, setName] = useState(user?.fullName ?? '');
  const [company, setCompany] = useState(user?.shopName ?? '');
  const [taxCode, setTaxCode] = useState('');
  const [method, setMethod] = useState<(typeof METHODS)[number]['id']>('card');
  const [errors, setErrors] = useState<{ name?: string; taxCode?: string }>({});

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const next = {
      name: name.trim() ? undefined : 'Vui lòng nhập tên người mua.',
      taxCode: taxCode.trim() && !/^\d{10}(-\d{3})?$/.test(taxCode.trim()) ? 'Mã số thuế gồm 10 số, hoặc 10 số kèm -3 số của chi nhánh.' : undefined,
    };
    setErrors(next);
    if (next.name || next.taxCode) {
      document.getElementById(next.name ? 'buyer-name' : 'tax-code')?.focus();
      return;
    }
    router.push(`/checkout/step-3${query()}`);
  };

  return (
    <CheckoutShell step={2} tier={tier} billing={billing} query={query()}>
      <form onSubmit={onSubmit} noValidate aria-labelledby="checkout-title" className="rounded-[28px] bg-white p-6 sm:p-8">
        <h1 id="checkout-title" className="font-landing-heading text-3xl font-bold tracking-tight sm:text-4xl">
          Thông tin thanh toán
        </h1>
        <p className="mt-2 text-base leading-7 text-landing-muted">Hoá đơn được gửi tới email của tài khoản.</p>

        <fieldset className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <legend className="mb-3 text-base font-semibold">Thông tin xuất hoá đơn</legend>
          <TextField
            id="buyer-name"
            label="Họ và tên người mua"
            autoComplete="name"
            maxLength={100}
            value={name}
            error={errors.name}
            onChange={(event) => {
              setName(event.target.value);
              setErrors((current) => ({ ...current, name: undefined }));
            }}
          />
          <TextField id="buyer-email" label="Email nhận hoá đơn" value={user?.email ?? ''} readOnly hint="Email của tài khoản WrapFit." />
          <TextField id="company" label="Cửa hàng / công ty (không bắt buộc)" autoComplete="organization" maxLength={100} value={company} onChange={(event) => setCompany(event.target.value)} />
          <TextField
            id="tax-code"
            label="Mã số thuế (không bắt buộc)"
            inputMode="numeric"
            maxLength={14}
            value={taxCode}
            error={errors.taxCode}
            onChange={(event) => {
              setTaxCode(event.target.value);
              setErrors((current) => ({ ...current, taxCode: undefined }));
            }}
          />
        </fieldset>

        <fieldset className="mt-8">
          <legend className="mb-3 text-base font-semibold">Phương thức thanh toán</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Phương thức thanh toán">
            {METHODS.map((item) => {
              const active = item.id === method;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setMethod(item.id)}
                  className={cn('flex flex-col items-start gap-2 rounded-2xl p-4 text-left transition-shadow', active ? 'ring-2 ring-landing-ink' : 'ring-1 ring-landing-ink/10 hover:ring-landing-ink/40')}
                >
                  <span className={cn('flex size-9 items-center justify-center rounded-xl', active ? 'bg-landing-lime text-landing-green-night' : 'bg-[#EBEDEF] text-landing-ink')}>
                    <item.icon className="size-5" aria-hidden />
                  </span>
                  <span className="text-sm font-semibold">{item.label}</span>
                  <span className="text-xs leading-5 text-landing-muted">{item.text}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-sm text-landing-muted">Bạn sẽ thanh toán trên trang của cổng thanh toán; WrapFit không lưu số thẻ.</p>
        </fieldset>

        <div className="mt-8 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href={`/checkout/step-1${query()}`} className="inline-flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-landing-muted hover:text-landing-ink">
            <ArrowLeft className="size-4" aria-hidden />
            Đổi gói
          </Link>
          <button type="submit" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-landing-lime px-6 text-base font-semibold text-landing-green-night transition-colors hover:bg-[#AFEC88]">
            Xem lại đơn hàng
            <ArrowRight className="size-4" aria-hidden />
          </button>
        </div>
      </form>
    </CheckoutShell>
  );
}
