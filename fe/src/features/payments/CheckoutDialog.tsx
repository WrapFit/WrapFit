"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, CreditCard, ExternalLink, FlaskConical, QrCode, RotateCw, TimerOff } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createPayment, getBillingSummary, getPayment, simulatePayment, simulateTransfer, type MockTransferScenario } from "@/api";

const MOCK_TRANSFERS: { scenario: MockTransferScenario; label: string }[] = [
  { scenario: "exact", label: "Chuyển đúng" },
  { scenario: "underpaid", label: "Chuyển thiếu 10.000đ" },
  { scenario: "no_reference", label: "Quên ghi mã" },
];
import { GoiMascot } from "@/components/common/GoiMascot";
import { useToast } from "@/components/common/Toast";
import { Alert, Badge, Button, Dialog, LoadingState, Spinner } from "@/components/ui";
import { formatVnd } from "@/features/pricing";
import { queryKeys } from "@/hooks/data";
import { errorMessage } from "@/services/api";
import type { Payment, PaymentPurpose } from "@/types/api";
import { savePendingVnpay } from "./vnpaySession";

/** The server is asked for the payment status every 3 seconds while it waits for the money. */
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

/** Test card of the VNPay sandbox (published by VNPay for its test environment, not a real card). */
const VNPAY_TEST_CARD = { bank: "NCB", number: "9704198526191432198", holder: "NGUYEN VAN A", issued: "07/15", otp: "123456" };

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
 * Checkout (docs/17 S5, docs/21 §4.1): creates a 15-minute payment and asks the server every 3 seconds until it is paid.
 * Real accounts (provider VIETQR) scan a QR and the bank's webhook confirms it; demo accounts (provider VNPAY) open the
 * VNPay sandbox by redirect and come back through `/payments/vnpay-return`. With PAYMENT_SIMULATION on the server
 * (CP4 demo) a button marks either one paid. On success Gói celebrates, and the plan, credits and orders are fetched again.
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
  // `vnpay` is only in the answer of POST /payments: the polling answers replace the payment without it.
  const payUrl = create.data?.vnpay?.payUrl;
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

  // A new payment shows in "Lịch sử thanh toán" as soon as it exists.
  useEffect(() => {
    if (paymentId) void queryClient.invalidateQueries({ queryKey: queryKeys.paymentHistory });
  }, [paymentId, queryClient]);

  const paid = payment?.status === "PAID";
  useEffect(() => {
    if (!paid) return;
    void queryClient.invalidateQueries({ queryKey: queryKeys.paymentHistory });
    void queryClient.invalidateQueries({ queryKey: queryKeys.billing });
    void queryClient.invalidateQueries({ queryKey: queryKeys.aiUsage });
    void queryClient.invalidateQueries({ queryKey: queryKeys.xuHistory });
    void queryClient.invalidateQueries({ queryKey: queryKeys.me });
    void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
  }, [paid, queryClient]);

  // The content swaps for the success screen: move focus to its heading so a screen reader starts there.
  const successHeading = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (paid) successHeading.current?.focus({ preventScroll: true });
  }, [paid]);

  const simulate = useMutation({
    // VietQR goes through the mock bank transfer, so the admin reconciliation page sees it too.
    mutationFn: async () => {
      if (payment?.provider === "VIETQR") {
        try {
          return await simulateTransfer(paymentId!);
        } catch {
          // Older backend without the route: confirm directly.
        }
      }
      return simulatePayment(paymentId!);
    },
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.payment(result.id), result);
      if (result.xu) {
        queryClient.setQueryData(queryKeys.aiUsage, (old: any) =>
          old ? { ...old, xu: { ...old.xu, balance: (old.xu?.balance ?? 0) + (result.xu ?? 0) } } : old
        );
      }
    },
    onError: (error) => toast.error(error, "Chưa giả lập được thanh toán"),
  });

  const transfer = useMutation({
    mutationFn: (scenario: MockTransferScenario) => simulateTransfer(paymentId!, scenario),
    onSuccess: (result, scenario) => {
      queryClient.setQueryData(queryKeys.payment(result.id), result);
      if (scenario !== "exact" && result.status === "PENDING") {
        toast.show({
          tone: scenario === "underpaid" ? "warning" : "info",
          title: scenario === "underpaid" ? "Chuyển chưa đủ tiền" : "Ngân hàng đã báo tiền về",
          description:
            scenario === "underpaid"
              ? "Khoản thiếu không được tự khớp; admin sẽ liên hệ để hoàn tiền. Hãy chuyển lại đúng số tiền."
              : "Giao dịch chưa khớp, đang chờ admin đối soát. Cửa sổ này tự cập nhật khi admin gán.",
        });
      }
    },
    onError: (error) => toast.error(error, "Chưa giả lập được chuyển khoản"),
  });
  const busy = simulate.isPending || transfer.isPending;

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

  const provider = payment?.provider ?? "VIETQR";
  const openVnpay = () => {
    if (!payUrl || !paymentId) return;
    savePendingVnpay({ paymentId, returnTo: `${window.location.pathname}${window.location.search}` });
    window.location.assign(payUrl);
  };

  const showSimulate =
    billing.data?.paymentSimulation ||
    (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"));
  const simulateAlert = showSimulate ? (
    <Alert
      tone="info"
      icon={FlaskConical}
      title="Chế độ thử nghiệm"
      action={
        <Button size="sm" variant="dark" loading={simulate.isPending} disabled={busy} loadingLabel="Đang xác nhận…" onClick={() => simulate.mutate()}>
          Giả lập đã thanh toán
        </Button>
      }
    >
      Môi trường thử nghiệm: bấm nút để xác nhận thanh toán thành công ngay lập tức mà không cần chuyển tiền thật.
      {provider === "VIETQR" && pending && (
        <span className="mt-3 block">
          <span className="block text-body-sm text-fg-muted">Hoặc giả lập ngân hàng báo tiền về (hiện ở trang admin đối soát):</span>
          <span className="mt-2 flex flex-wrap gap-2">
            {MOCK_TRANSFERS.map((item) => (
              <Button
                key={item.scenario}
                size="sm"
                variant="secondary"
                disabled={busy}
                loading={transfer.isPending && transfer.variables === item.scenario}
                loadingLabel="Đang gửi…"
                onClick={() => transfer.mutate(item.scenario)}
              >
                {item.label}
              </Button>
            ))}
          </span>
        </span>
      )}
    </Alert>
  ) : null;

  const footer = paid ? (
    <Button onClick={close}>{doneLabel}</Button>
  ) : (
    <Button variant="secondary" onClick={close} disabled={busy}>
      Để sau
    </Button>
  );

  // A portal: opened from another dialog (export), whose animated panel has a transform, the fixed layer would be laid
  // out inside that panel instead of the viewport.
  return createPortal(
    <Dialog
      title={TITLES[purpose]}
      description={
        paid
          ? "Đã nhận thanh toán"
          : provider === "VNPAY"
            ? "Thanh toán thử nghiệm qua cổng VNPay sandbox"
            : "Quét mã VietQR bằng ứng dụng ngân hàng bất kỳ"
      }
      icon={provider === "VNPAY" && !paid ? <CreditCard aria-hidden /> : <QrCode aria-hidden />}
      onClose={close}
      busy={busy}
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
          {errorMessage(create.error)}
        </Alert>
      ) : paid && payment ? (
        <div className="flex flex-col items-center gap-3 py-2 text-center" role="status">
          <GoiMascot pose="celebration" size={120} interactive={false} />
          <p ref={successHeading} tabIndex={-1} className="font-landing-heading text-heading-sm text-fg outline-none">
            Thanh toán thành công
          </p>
          <p className="max-w-sm text-body-sm text-fg-muted">{successText(payment)}</p>
          <dl className="grid w-full max-w-xs grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 rounded-panel bg-surface-sunken p-3.5 text-left text-body-sm">
            <dt className="text-fg-muted">Số tiền</dt>
            <dd className="text-right font-semibold tabular-nums text-fg">{formatVnd(payment.amountVnd)}</dd>
            <dt className="text-fg-muted">Mã</dt>
            <dd className="text-right font-mono text-fg">{payment.reference}</dd>
            <dt className="text-fg-muted">Cách trả</dt>
            <dd className="text-right text-fg">{providerLabel(payment)}</dd>
          </dl>
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
          {payment.provider === "VNPAY"
            ? "Phiên thanh toán chỉ dùng được trong 15 phút. Nếu VNPay đã báo thành công, đừng thanh toán lại: liên hệ WrapFit kèm mã "
            : "Mã chỉ dùng được trong 15 phút. Nếu bạn đã chuyển khoản, đừng chuyển lại: liên hệ WrapFit kèm mã "}
          {payment.reference}.
        </Alert>
      ) : payment?.provider === "VNPAY" ? (
        <>
          <section aria-labelledby="vnpay-title" className="flex flex-col gap-4 rounded-panel border border-line bg-surface-raised p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-control bg-accent-bg text-accent-fg [&_svg]:size-5">
                <CreditCard aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 id="vnpay-title" className="text-body font-semibold text-fg">
                    Thanh toán qua VNPay (sandbox)
                  </h3>
                  <Badge size="sm" tone="warning">
                    Thử nghiệm
                  </Badge>
                </div>
                <p className="mt-0.5 text-body-sm text-fg-muted">Tài khoản demo trả qua cổng thử nghiệm của VNPay, không trừ tiền thật.</p>
              </div>
            </div>

            <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 text-body-sm">
              <dt className="text-fg-muted">Số tiền</dt>
              <dd className="font-landing-heading text-heading-sm tabular-nums text-fg">{formatVnd(payment.amountVnd)}</dd>
              <dt className="text-fg-muted">Mã đơn</dt>
              <dd className="font-mono font-semibold tracking-wider text-accent-fg">{payment.reference}</dd>
              <dt className="text-fg-muted">Còn hiệu lực</dt>
              <dd role="timer" aria-label={`Còn hiệu lực ${mmss(left)}`} className="font-mono font-semibold tabular-nums text-fg">
                {mmss(left)}
              </dd>
            </dl>

            {payUrl ? (
              <Button variant="brand" shape="rounded" size="lg" block trailingIcon={<ExternalLink aria-hidden />} onClick={openVnpay}>
                Mở cổng VNPay
              </Button>
            ) : (
              <Alert tone="warning" title="Chưa mở được cổng VNPay">
                {showSimulate
                  ? "Máy chủ chưa cấu hình VNPay sandbox. Dùng nút giả lập bên dưới để hoàn tất thanh toán thử."
                  : "Cổng VNPay không có liên kết cho phiên này. Đóng hộp thoại rồi tạo thanh toán mới."}
              </Alert>
            )}
          </section>

          <Alert tone="info" icon={CreditCard} title="Thẻ thử của VNPay sandbox">
            Ngân hàng <strong>{VNPAY_TEST_CARD.bank}</strong>, số thẻ <span className="font-mono tabular-nums">{VNPAY_TEST_CARD.number}</span>, tên{" "}
            <span className="font-mono">{VNPAY_TEST_CARD.holder}</span>, ngày phát hành <span className="font-mono">{VNPAY_TEST_CARD.issued}</span>, mã OTP{" "}
            <span className="font-mono">{VNPAY_TEST_CARD.otp}</span>.
          </Alert>

          <WaitingNote>Sau khi thanh toán, VNPay đưa bạn quay lại WrapFit. Trang tự cập nhật.</WaitingNote>
          {simulateAlert}
        </>
      ) : payment?.vietqr ? (
        <>
          <ol aria-label="Cách chuyển khoản" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Step n={1}>Mở app ngân hàng, chọn quét mã QR</Step>
            <Step n={2}>Quét mã bên dưới, kiểm tra số tiền</Step>
            <Step n={3}>
              Giữ nguyên nội dung <span className="font-mono font-semibold">WF…</span>
            </Step>
          </ol>

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

          <WaitingNote>Đang chờ ngân hàng báo về… Trang tự cập nhật khi WrapFit nhận được tiền.</WaitingNote>
          {simulateAlert}
        </>
      ) : null}
    </Dialog>,
    document.body,
  );
}

function providerLabel(payment: Payment): string {
  if (payment.confirmedVia === "SIMULATION") return "Giả lập";
  return payment.provider === "VNPAY" ? "VNPay (sandbox)" : "VietQR";
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 rounded-control bg-surface-sunken px-3 py-2.5 text-body-sm text-fg">
      <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-bg text-caption font-semibold text-accent-fg">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}

/** Status line while the server waits for the money: Gói on his delivery run, announced politely to screen readers. */
function WaitingNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-panel bg-surface-sunken px-3.5 py-2.5" role="status">
      <GoiMascot pose="delivery" size={44} interactive={false} />
      <p className="min-w-0 flex-1 text-body-sm text-fg-muted">{children}</p>
      <Spinner size="sm" />
    </div>
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
