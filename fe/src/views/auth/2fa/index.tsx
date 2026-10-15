'use client';

/**
 * `/auth/2fa`: second sign-in step with a 6-digit code, in the pack.ly style of the login screen. The API has no
 * two-factor authentication yet (be/src/auth): the page is a preview, nothing typed here is sent.
 */

import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import React, { useRef, useState } from 'react';
import { ROUTES } from '@/constants';
import { cn } from '@/utils/helpers';
import { AccountShell, FormAlert, INPUT_CLASS, SubmitButton, TEXT_LINK, TextField } from '@/views/account/shared';

const LENGTH = 6;

export default function Auth2FaPage() {
  const [digits, setDigits] = useState<string[]>(() => Array(LENGTH).fill(''));
  const [recovery, setRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [remember, setRemember] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const code = digits.join('');
  const complete = recovery ? recoveryCode.trim().length >= 8 : code.length === LENGTH;

  const fill = (from: number, text: string) => {
    const chars = text.replace(/\D/g, '').slice(0, LENGTH - from).split('');
    if (chars.length === 0) return;
    setDigits((current) => current.map((digit, index) => (index >= from && index < from + chars.length ? chars[index - from] : digit)));
    setSubmitted(false);
    inputs.current[Math.min(from + chars.length, LENGTH - 1)]?.focus();
  };

  const onKeyDown = (index: number) => (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      event.preventDefault();
      setDigits((current) => current.map((digit, position) => (position === index - 1 ? '' : digit)));
      inputs.current[index - 1]?.focus();
    } else if (event.key === 'ArrowLeft' && index > 0) {
      inputs.current[index - 1]?.focus();
    } else if (event.key === 'ArrowRight' && index < LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (complete) setSubmitted(true);
  };

  return (
    <AccountShell
      icon={ShieldCheck}
      eyebrow="Xác thực hai bước"
      title={recovery ? 'Nhập mã khôi phục' : 'Nhập mã xác thực'}
      description={
        recovery
          ? 'Dùng một trong các mã khôi phục bạn đã lưu khi bật xác thực hai bước. Mỗi mã chỉ dùng được một lần.'
          : 'Mở ứng dụng xác thực (Google Authenticator, Authy, Microsoft Authenticator…) và nhập mã 6 số của WrapFit.'
      }
    >
      <FormAlert tone="info" className="mb-5">
        Bản xem trước: WrapFit chưa bật xác thực hai bước, mã nhập ở đây không được gửi đi.
      </FormAlert>

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {recovery ? (
          <TextField
            id="recovery-code"
            label="Mã khôi phục"
            placeholder="xxxx-xxxx"
            autoComplete="off"
            spellCheck={false}
            maxLength={20}
            value={recoveryCode}
            onChange={(event) => {
              setRecoveryCode(event.target.value);
              setSubmitted(false);
            }}
            className="[&_input]:font-mono [&_input]:tracking-widest"
          />
        ) : (
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-landing-ink">Mã 6 số</legend>
            <div className="grid grid-cols-6 gap-2 sm:gap-3">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    inputs.current[index] = element;
                  }}
                  value={digit}
                  inputMode="numeric"
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  aria-label={`Chữ số ${index + 1} trên ${LENGTH}`}
                  maxLength={LENGTH}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === '') {
                      setDigits((current) => current.map((item, position) => (position === index ? '' : item)));
                      return;
                    }
                    fill(index, value.slice(-LENGTH + index));
                  }}
                  onPaste={(event) => {
                    event.preventDefault();
                    fill(index, event.clipboardData.getData('text'));
                  }}
                  onKeyDown={onKeyDown(index)}
                  onFocus={(event) => event.target.select()}
                  className={cn(INPUT_CLASS, 'h-14 px-0 text-center font-mono text-2xl font-semibold', digit && 'bg-white ring-landing-ink/20')}
                />
              ))}
            </div>
          </fieldset>
        )}

        <label className="flex cursor-pointer items-center gap-3 text-sm text-landing-muted">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="size-5 rounded border-landing-line accent-landing-green text-landing-green focus:ring-landing-green/40"
          />
          Ghi nhớ thiết bị này trong 30 ngày
        </label>

        {submitted && (
          <FormAlert tone="info" title="Chưa thể xác minh">
            Xác thực hai bước đang được phát triển. Hiện tại bạn chỉ cần email và mật khẩu để đăng nhập.
          </FormAlert>
        )}

        <SubmitButton busy={false} busyLabel="" disabled={!complete}>
          Xác minh
        </SubmitButton>
      </form>

      <div className="mt-4 flex flex-col items-center gap-1 text-center">
        <button
          type="button"
          onClick={() => {
            setRecovery((value) => !value);
            setSubmitted(false);
          }}
          className={TEXT_LINK}
        >
          {recovery ? 'Dùng mã từ ứng dụng xác thực' : 'Không mở được ứng dụng? Dùng mã khôi phục'}
        </button>
        <Link href={ROUTES.login} className="py-2 text-sm text-landing-muted hover:text-landing-ink hover:underline">
          Quay lại đăng nhập
        </Link>
      </div>
    </AccountShell>
  );
}
