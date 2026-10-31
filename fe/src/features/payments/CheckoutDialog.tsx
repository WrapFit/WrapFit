"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, FlaskConical, QrCode, RotateCw, TimerOff } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createPayment, getBillingSummary, getPayment, simulatePayment } from "@/api";
import { GoiMascot } from "@/components/common/GoiMascot";
import { useToast } from "@/components/common/Toast";
import { Alert, Badge, Button, Dialog, LoadingState, Spinner } from "@/components/ui";
import { formatVnd } from "@/features/pricing";
import { queryKeys } from "@/hooks/data";
import type { Payment, PaymentPurpose } from "@/types/api";

/** The server is asked for the payment status every 3 seconds while it waits for the transfer. */
const POLL_MS = 3000;

const TITLES: Record<PaymentPurpose, string> = {
  EXPORT_1: "Mua 1 lượt xuất",
  EXPORT_5: "Mua 5 lượt xuất",
  EXPORT_15: "Mua 15 lượt xuất",
  PRO_MONTH: "Nâng lên Pro 30 ngày",
  SAMPLE_ORDER: "Thanh toán đơn in mẫu",
  XU_500: "Nạp 500 xu Wrap",
  XU_1050: "Nạp 1.050 xu Wrap",
  XU_2200: "Nạp 2.200 xu Wrap",
};

function successText(payment: Payment): string {
  if (payment.purpose === "PRO_MONTH") return "Gói Pro đã bật: xuất file in sạch không giới hạn trong 30 ngày.";
  if (payment.purpose === "SAMPLE_ORDER") return "Đơn in mẫu đã được thanh toán. Xưởng in sẽ gọi xác nhận trước khi in.";
  if (payment.xu) return `Đã cộng ${payment.xu.toLocaleString("vi-VN")} xu Wrap vào ví, dùng trong 12 tháng.`;
  return `Đã cộng ${payment.credits ?? 0} lượt xuất vào tài khoản, dùng trong 12 tháng.`;
}

/** mm:ss left until `expiresAt`, ticking every second while `active`. */
function useCountdown(expiresAt: string | undefined, active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active]);
  return expiresAt ? Math.max(0, new Date(expiresAt).getTime() - now) : 0;
}

const mmss = (ms: number) => {
  const seconds = Math.ceil(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
};

export interface CheckoutDialogProps {
  purpose: PaymentPurpose;
  /** The sample order to pay (purpose SAMPLE_ORDER). */
  orderId?: string;
  /** Label of the button that closes the dialog after paying, e.g. "Xuất file ngay". */
  doneLabel?: string;
  /** The payment went through; called when the dialog closes after it. */
  onPaid?(payment: Payment): void;
  onClose(): void;
}

/**
 * VietQR checkout (docs/17 S5): creates a 15-minute payment, shows the QR, the amount and the transfer content to copy,
 * and asks the server every 3 seconds until it is paid. With PAYMENT_SIMULATION on the server (CP4 demo) a button
 * marks it paid. On success Gói celebrates, and the plan, credits and orders are fetched again.
 */
export function CheckoutDialog({ purpose, orderId, doneLabel = "Tiếp tục", onPaid, onClose }: CheckoutDialogProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const billing = useQuery({ queryKey: queryKeys.billing, queryFn: getBillingSummary, staleTime: 60_000 });

  const create = useMutation({ mutationFn: () => createPayment(purpose, orderId) });
  // Once per dialog (React strict mode mounts effects twice in development).
  const created = useRef(false);
  useEffect(() => {
    if (created.current) return;
    created.current = true;
    create.mutate();
  }, [create]);

  const paymentId = create.data?.id;
  const poll = useQuery({
    queryKey: queryKeys.payment(paymentId ?? ""),
    queryFn: () => getPayment(paymentId!),
    enabled: Boolean(paymentId),
    initialData: create.data,
    refetchInterval: (query) => (query.state.data?.status === "PENDING" ? POLL_MS : false),
  });
  const payment = poll.data ?? create.data;
  const pending = payment?.status === "PENDING";
  const left = useCountdown(payment?.expiresAt, pending);

  // The server marks the payment EXPIRED when asked after the deadline.
  const due = pending && left === 0;
  const { refetch } = poll;
  useEffect(() => {
    if (due) void refetch();
  }, [due, refetch]);

  const paid = payment?.status === "PAID";
  useEffect(() => {
    if (!paid) return;
    void queryClient.invalidateQueries({ queryKey: queryKeys.billing });
    void queryClient.invalidateQueries({ queryKey: queryKeys.aiUsage });
    void queryClient.invalidateQueries({ queryKey: queryKeys.xuHistory });
    void queryClient.invalidateQueries({ queryKey: queryKeys.me });
    void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
  }, [paid, queryClient]);

  const simulate = useMutation({
    mutationFn: () => simulatePayment(paymentId!),
    onSuccess: (result) => queryClient.setQueryData(queryKeys.payment(result.id), result),
    onError: (error) => toast.error(error, "Chưa giả lập được thanh toán"),
  });

  const close = () => {
    if (paid && payment) onPaid?.(payment);
    onClose();
  };

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.show({ tone: "success", title: `Đã chép ${label}` });
    } catch {
      toast.show({ tone: "warning", title: "Không chép được", description: `Hãy chép tay: ${value}` });
    }
  };

  const footer = paid ? (
    <Button onClick={close}>{doneLabel}</Button>
  ) : (
    <Button variant="secondary" onClick={close} disabled={simulate.isPending}>
      Để sau
    </Button>
  );

  // A portal: opened from another dialog (export), whose animated panel has a transform, the fixed layer would be laid
  // out inside that panel instead of the viewport.
  return createPortal(
    <Dialog
      title={TITLES[purpose]}
      description={paid ? "Đã nhận thanh toán" : "Quét mã VietQR bằng ứng dụng ngân hàng bất kỳ"}
      icon={<QrCode aria-hidden />}
      onClose={close}
      busy={simulate.isPending}
      footer={footer}
      size="lg"
    >
      {create.isPending ? (
        <LoadingState label="Đang tạo mã thanh toán…" />
      ) : create.isError ? (
        <Alert
          tone="danger"
          title="Chưa tạo được mã thanh toán"
          action={
            <Button size="sm" variant="secondary" leadingIcon={<RotateCw aria-hidden />} onClick={() => create.mutate()}>
              Thử lại
            </Button>
          }
        >
          {create.error instanceof Error ? create.error.message : "Kiểm tra kết nối rồi thử lại."}
        </Alert>
      ) : paid && payment ? (
        <div className="flex flex-col items-center gap-3 py-2 text-center" role="status">
          <GoiMascot pose="celebration" size={120} interactive={false} />
          <p className="font-landing-heading text-heading-sm text-fg">Thanh toán thành công</p>
          <p className="max-w-sm text-body-sm text-fg-muted">{successText(payment)}</p>
          <p className="text-caption text-fg-muted">
            {formatVnd(payment.amountVnd)} · mã <span className="font-mono">{payment.reference}</span>
          </p>
        </div>
      ) : payment && !pending ? (
        <Alert
          tone="warning"
          icon={TimerOff}
          title="Mã thanh toán đã hết hạn"
          action={
            <Button size="sm" leadingIcon={<RotateCw aria-hidden />} onClick={() => create.mutate()}>
              Tạo mã mới
            </Button>
          }
        >
          Mã chỉ dùng được trong 15 phút. Nếu bạn đã chuyển khoản, đừng chuyển lại: liên hệ WrapFit kèm mã {payment.reference}.
        </Alert>
      ) : payment?.vietqr ? (
        <>
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            <div className="flex shrink-0 flex-col items-center gap-2">
              {/* An <img>, not inline markup: the SVG comes from the API and never runs in the page. */}
              <img
                src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(payment.vietqr.qrSvg)}`}
                alt={`Mã VietQR chuyển ${formatVnd(payment.amountVnd)} tới ${payment.vietqr.bankName}, nội dung ${payment.reference}`}
                className="size-52 rounded-panel bg-white p-2 ring-1 ring-line"
              />
              <span className="text-caption text-fg-muted" role="timer" aria-label={`Mã còn hiệu lực ${mmss(left)}`}>
                Còn <span className="font-mono font-semibold tabular-nums text-fg">{mmss(left)}</span>
              </span>
            </div>

            <dl className="grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2.5 text-body-sm">
              <dt className="text-fg-muted">Số tiền</dt>
              <dd className="font-landing-heading text-heading-sm tabular-nums text-fg">{formatVnd(payment.amountVnd)}</dd>
              <dt className="text-fg-muted">Ngân hàng</dt>
              <dd className="truncate text-fg">{payment.vietqr.bankName}</dd>
              <dt className="text-fg-muted">Số tài khoản</dt>
              <dd className="flex items-center gap-1">
                <span className="truncate font-mono tabular-nums text-fg">{payment.vietqr.accountNo}</span>
                <CopyButton label="số tài khoản" onCopy={() => void copy("số tài khoản", payment.vietqr!.accountNo)} />
              </dd>
              <dt className="text-fg-muted">Chủ tài khoản</dt>
              <dd className="truncate text-fg">{payment.vietqr.accountName}</dd>
              <dt className="text-fg-muted">Nội dung</dt>
              <dd className="flex items-center gap-1">
                <span className="font-mono text-body font-semibold tracking-wider text-accent-fg">{payment.reference}</span>
                <CopyButton label="nội dung chuyển khoản" onCopy={() => void copy("nội dung", payment.reference)} />
              </dd>
            </dl>
          </div>

          {payment.vietqr.sample && (
            <p className="flex flex-wrap items-center gap-2 text-caption text-fg-muted">
              <Badge size="sm" tone="warning">
                Mô phỏng
              </Badge>
              Tài khoản mẫu cho bản thử nghiệm: đừng chuyển tiền thật vào mã này.
            </p>
          )}

          <p className="flex items-center gap-2 text-body-sm text-fg-muted" role="status">
            <Spinner size="sm" />
            Đang chờ chuyển khoản. Trang tự cập nhật khi WrapFit nhận được tiền.
          </p>

          {billing.data?.paymentSimulation && (
            <Alert
              tone="info"
              icon={FlaskConical}
              title="Chế độ demo"
              action={
                <Button size="sm" variant="dark" loading={simulate.isPending} loadingLabel="Đang xác nhận…" onClick={() => simulate.mutate()}>
                  Giả lập đã thanh toán
                </Button>
              }
            >
              Máy chủ đang bật thanh toán mô phỏng: bấm để xác nhận như khi ngân hàng báo đã nhận tiền.
            </Alert>
          )}
        </>
      ) : null}
    </Dialog>,
    document.body,
  );
}

function CopyButton({ label, onCopy }: { label: string; onCopy(): void }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const timer = window.setTimeout(() => setDone(false), 1500);
    return () => window.clearTimeout(timer);
  }, [done]);
  return (
    <Button
      variant="ghost"
      size="icon-lg"
      aria-label={`Chép ${label}`}
      onClick={() => {
        onCopy();
        setDone(true);
      }}
    >
      {done ? <Check aria-hidden /> : <Copy aria-hidden />}
    </Button>
  );
}
