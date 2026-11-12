'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleSlash, Link2 } from 'lucide-react';
import React, { useState } from 'react';
import {
  BANK_TX_KEY,
  previewBankTxPayment,
  resolveBankTransaction,
  type BankTransaction,
  type BankTxPayment,
  type ResolveBankTransactionRequest,
} from '@/api/admin/bank-transactions';
import { useToast } from '@/components/common/Toast';
import { Alert, Badge, Button, Dialog, Field, Input, Textarea } from '@/components/ui';
import { formatVnd } from '@/features/pricing';
import { formatDateTime, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_TONES, PURPOSE_LABELS } from './labels';

/** `WF` + 6 characters, the alphabet of `be/src/payments/payments.service.ts` (no O / 0 / I / 1). */
const REFERENCE = /^WF[A-HJ-NP-Z2-9]{6}$/;

/** `POST /admin/bank-transactions/:id/resolve`, then the lists reload. */
function useResolve(onDone: () => void, success: string, failure: string) {
  const toast = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ResolveBankTransactionRequest }) => resolveBankTransaction(id, data),
    onSuccess: () => {
      toast.show({ tone: 'success', title: success });
      void queryClient.invalidateQueries({ queryKey: BANK_TX_KEY });
      onDone();
    },
    onError: (error) => toast.error(error, failure),
  });
}

function TransferSummary({ tx }: { tx: BankTransaction }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-panel bg-surface-sunken p-3 text-sm">
      <dt className="text-fg-muted">Số tiền</dt>
      <dd className="text-right font-semibold tabular-nums text-fg">{formatVnd(tx.amountVnd)}</dd>
      <dt className="text-fg-muted">Thời gian</dt>
      <dd className="text-right tabular-nums text-fg">{formatDateTime(tx.transactionAt)}</dd>
      <dt className="text-fg-muted">Nội dung</dt>
      <dd className="min-w-0 break-words text-right font-mono text-xs text-fg">{tx.content}</dd>
    </dl>
  );
}

function PaymentPreview({ payment, transferVnd }: { payment: BankTxPayment; transferVnd: number }) {
  const short = transferVnd < payment.amountVnd;
  const paid = payment.status === 'PAID';
  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-panel border border-line p-3 text-sm">
        <dt className="text-fg-muted">Khách hàng</dt>
        <dd className="min-w-0 break-words text-right text-fg">{payment.userEmail}</dd>
        <dt className="text-fg-muted">Mua</dt>
        <dd className="text-right text-fg">{PURPOSE_LABELS[payment.purpose] ?? payment.purpose}</dd>
        <dt className="text-fg-muted">Cần trả</dt>
        <dd className="text-right font-semibold tabular-nums text-fg">{formatVnd(payment.amountVnd)}</dd>
        <dt className="text-fg-muted">Hạn</dt>
        <dd className="text-right tabular-nums text-fg">{formatDateTime(payment.expiresAt)}</dd>
        <dt className="text-fg-muted">Trạng thái</dt>
        <dd className="text-right">
          <Badge tone={PAYMENT_STATUS_TONES[payment.status] ?? 'neutral'}>{PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}</Badge>
        </dd>
      </dl>
      {paid && (
        <Alert tone="danger" title="Thanh toán này đã được trả">
          Không gán thêm được. Nếu khoản này là tiền thừa, hãy chọn Bỏ qua và ghi chú việc hoàn tiền.
        </Alert>
      )}
      {!paid && short && (
        <Alert tone="danger" title="Số tiền chuyển chưa đủ">
          Khách chuyển {formatVnd(transferVnd)}, thanh toán cần {formatVnd(payment.amountVnd)}. Chỉ gán được khi số tiền chuyển lớn hơn hoặc bằng số cần trả.
        </Alert>
      )}
      {!paid && !short && payment.status !== 'PENDING' && (
        <Alert tone="warning" title="Thanh toán đã quá hạn">
          Gán vẫn xác nhận thanh toán và cấp phần khách đã mua.
        </Alert>
      )}
    </div>
  );
}

/** "Gán cho thanh toán": the admin types the `WF…` reference, sees the payment, then confirms it. */
export function AssignDialog({ tx, onClose }: { tx: BankTransaction; onClose(): void }) {
  const [input, setInput] = useState(tx.extractedReference ?? '');
  const [note, setNote] = useState('');
  const reference = input.replace(/\s+/g, '').toUpperCase();
  const valid = REFERENCE.test(reference);

  const preview = useQuery({
    queryKey: [...BANK_TX_KEY, 'payment', reference],
    queryFn: () => previewBankTxPayment(reference),
    enabled: valid,
    retry: false,
  });
  const resolve = useResolve(onClose, 'Đã gán giao dịch cho thanh toán', 'Chưa gán được giao dịch');
  const payment = preview.data;
  const blocked = !payment || payment.status === 'PAID' || tx.amountVnd < payment.amountVnd;

  return (
    <Dialog
      title="Gán cho thanh toán"
      description="Xác nhận thanh toán đúng với khoản tiền này và cấp phần khách đã mua."
      icon={<Link2 aria-hidden />}
      size="md"
      busy={resolve.isPending}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={resolve.isPending}>
            Hủy
          </Button>
          <Button
            variant="primary"
            disabled={blocked}
            loading={resolve.isPending}
            loadingLabel="Đang gán…"
            onClick={() => resolve.mutate({ id: tx.id, data: { action: 'assign', paymentReference: reference, note: note.trim() || undefined } })}
          >
            Gán và xác nhận
          </Button>
        </>
      }
    >
      <TransferSummary tx={tx} />
      <Field
        label="Mã thanh toán"
        hint="Mã WF… in trên màn hình thanh toán của khách."
        error={input && !valid ? 'Mã gồm WF và 6 ký tự, ví dụ WFAB23CD' : preview.isError ? 'Không tìm thấy thanh toán VietQR với mã này' : undefined}
      >
        {(props) => (
          <Input
            {...props}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="WFAB23CD"
            autoComplete="off"
            spellCheck={false}
            className="font-mono uppercase"
            autoFocus
          />
        )}
      </Field>
      {valid && preview.isPending && <div className="h-32 animate-pulse rounded-panel bg-surface-sunken" aria-label="Đang tìm thanh toán" role="status" />}
      {payment && <PaymentPreview payment={payment} transferVnd={tx.amountVnd} />}
      <Field label="Ghi chú (không bắt buộc)">
        {(props) => <Textarea {...props} value={note} onChange={(event) => setNote(event.target.value)} rows={2} maxLength={500} />}
      </Field>
    </Dialog>
  );
}

/** "Bỏ qua": the money was refunded by hand or is unrelated; a note says why. */
export function IgnoreDialog({ tx, onClose }: { tx: BankTransaction; onClose(): void }) {
  const [note, setNote] = useState('');
  const resolve = useResolve(onClose, 'Đã bỏ qua giao dịch', 'Chưa bỏ qua được giao dịch');
  const trimmed = note.trim();

  return (
    <Dialog
      title="Bỏ qua giao dịch"
      description="Dùng khi đã hoàn tiền tay hoặc khoản tiền không liên quan tới WrapFit."
      icon={<CircleSlash aria-hidden />}
      size="md"
      busy={resolve.isPending}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={resolve.isPending}>
            Hủy
          </Button>
          <Button
            variant="danger"
            disabled={trimmed === ''}
            loading={resolve.isPending}
            loadingLabel="Đang lưu…"
            onClick={() => resolve.mutate({ id: tx.id, data: { action: 'ignore', note: trimmed } })}
          >
            Bỏ qua giao dịch
          </Button>
        </>
      }
    >
      <TransferSummary tx={tx} />
      <Field label="Lý do" required hint="Ví dụ: đã hoàn lại 50.000đ cho khách qua app ngân hàng ngày 10/11.">
        {(props) => <Textarea {...props} value={note} onChange={(event) => setNote(event.target.value)} rows={3} maxLength={500} autoFocus />}
      </Field>
    </Dialog>
  );
}
