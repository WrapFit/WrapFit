"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useRef, useState } from "react";
import { getVnpayReturn } from "@/api/payments";
import { GoiMascot, type MascotPose } from "@/components/common/GoiMascot";
import { Alert, Button, ButtonLink } from "@/components/ui";
import { RequireAuth } from "@/features/auth";
import { DEFAULT_RETURN_TO, clearPendingVnpay, readPendingVnpay } from "@/features/payments/vnpaySession";
import { formatVnd } from "@/features/pricing";
import { queryKeys } from "@/hooks/data";
import { errorMessage, isApiError } from "@/services/api";
import type { Payment, VnpayReturnResult } from "@/types/api";
import { AccountFrame, AccountLoading } from "@/views/account/shared";

/** `/payments/vnpay-return?vnp_*`: where VNPay sends the browser back (docs/21 §3.4, §4.1). */
export default function VnpayReturnPage() {
  return (
    <RequireAuth>
      <Suspense
        fallback={
          <AccountFrame>
            <AccountLoading label="Đang kiểm tra kết quả thanh toán…" />
          </AccountFrame>
        }
      >
        <VnpayReturnFromQuery />
      </Suspense>
    </RequireAuth>
  );
}

function VnpayReturnFromQuery() {
  const search = useSearchParams().toString();
  return <VnpayReturn key={search} search={search} />;
}

const COPY: Record<VnpayReturnResult["result"], { pose: MascotPose; eyebrow: string; title: string; text: string }> = {
  success: {
    pose: "celebration",
    eyebrow: "VNPay sandbox",
    title: "Thanh toán thành công",
    text: "WrapFit đã nhận thanh toán thử nghiệm và cộng quyền lợi vào tài khoản.",
  },
  failed: {
    pose: "waving",
    eyebrow: "VNPay sandbox",
    title: "Chưa thanh toán được",
    text: "Bạn đã hủy hoặc ngân hàng từ chối giao dịch. Tài khoản chưa nhận quyền lợi, hãy thử lại.",
  },
  invalid: {
    pose: "measuring",
    eyebrow: "VNPay sandbox",
    title: "Không xác minh được kết quả",
    text: "Kết quả gửi về không khớp chữ ký hoặc số tiền của VNPay, nên WrapFit không ghi nhận thanh toán này. Nếu bạn đã bị trừ tiền, hãy liên hệ WrapFit.",
  },
};

function VnpayReturn({ search }: { search: string }) {
  const queryClient = useQueryClient();
  // The query is the proof of the payment: it goes to the API as VNPay sent it. The server is idempotent, and the
  // query cache keeps a strict-mode remount from asking twice.
  const hasQuery = search.includes("vnp_");
  const result = useQuery({
    queryKey: ["payments", "vnpay-return", search],
    queryFn: () => getVnpayReturn(search),
    enabled: hasQuery,
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const outcome = result.data?.result;

  // Read after mount: the storage does not exist while the page renders on the server.
  const [returnTo, setReturnTo] = useState(DEFAULT_RETURN_TO);
  useEffect(() => {
    const pending = readPendingVnpay();
    if (pending) setReturnTo(pending.returnTo);
  }, []);

  useEffect(() => {
    if (!outcome) return;
    clearPendingVnpay();
    if (outcome !== "success") return;
    void queryClient.invalidateQueries({ queryKey: queryKeys.billing });
    void queryClient.invalidateQueries({ queryKey: queryKeys.aiUsage });
    void queryClient.invalidateQueries({ queryKey: queryKeys.xuHistory });
    void queryClient.invalidateQueries({ queryKey: queryKeys.me });
    void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
  }, [outcome, queryClient]);

  // Focus moves to the title when the answer arrives, so a screen reader starts reading there.
  const title = useRef<HTMLHeadingElement>(null);
  const settled = Boolean(outcome) || result.isError || !hasQuery;
  useEffect(() => {
    if (settled) title.current?.focus({ preventScroll: true });
  }, [settled]);

  const backLabel = returnTo === DEFAULT_RETURN_TO ? "Về ví xu" : "Quay lại việc đang làm";

  return (
    <AccountFrame>
      <section aria-labelledby="vnpay-return-title" className="text-center">
        {!hasQuery ? (
          <Missing
            titleRef={title}
            title="Không có kết quả để hiển thị"
            text="Trang này chỉ mở được từ cổng VNPay sau khi thanh toán. Quay lại ví để nạp xu hoặc xem lịch sử."
            action={<ButtonLink href={DEFAULT_RETURN_TO} variant="primary" size="xl" block>Về ví xu</ButtonLink>}
          />
        ) : result.isPending ? (
          <div role="status" aria-live="polite">
            <GoiMascot pose="delivery" size={120} interactive={false} />
            <h1 id="vnpay-return-title" className="mt-3 font-landing-heading text-3xl font-bold tracking-tight">
              Đang kiểm tra thanh toán
            </h1>
            <p className="mt-3 text-base leading-7 text-landing-muted">Giữ nguyên trang này, WrapFit đang hỏi lại VNPay.</p>
          </div>
        ) : result.isError ? (
          <Missing
            titleRef={title}
            title={isApiError(result.error) && result.error.status === 404 ? "Không tìm thấy thanh toán" : "Chưa kiểm tra được kết quả"}
            text={errorMessage(result.error)}
            action={
              isApiError(result.error) && result.error.status === 404 ? (
                <ButtonLink href={returnTo} variant="primary" size="xl" block>
                  {backLabel}
                </ButtonLink>
              ) : (
                <Button size="xl" block loading={result.isFetching} loadingLabel="Đang thử lại…" onClick={() => void result.refetch()}>
                  Thử lại
                </Button>
              )
            }
          />
        ) : (
          <Outcome data={result.data} titleRef={title} returnTo={returnTo} backLabel={backLabel} />
        )}
      </section>
    </AccountFrame>
  );
}

function Outcome({
  data,
  titleRef,
  returnTo,
  backLabel,
}: {
  data: VnpayReturnResult;
  titleRef: React.RefObject<HTMLHeadingElement | null>;
  returnTo: string;
  backLabel: string;
}) {
  const copy = COPY[data.result];
  const payment = data.payment;
  return (
    <div role="status" aria-live="polite">
      <GoiMascot pose={copy.pose} size={120} interactive={false} />
      <p className="mt-3 text-sm font-semibold text-fpt-orange-ink">{copy.eyebrow}</p>
      <h1 id="vnpay-return-title" ref={titleRef} tabIndex={-1} className="mt-1 font-landing-heading text-3xl font-bold tracking-tight outline-none sm:text-4xl">
        {copy.title}
      </h1>
      <p className="mt-3 text-base leading-7 text-landing-muted">{data.result === "success" && payment ? successText(payment) : copy.text}</p>

      {payment && data.result !== "invalid" && (
        <dl className="mx-auto mt-6 grid max-w-xs grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 rounded-panel bg-surface-sunken p-4 text-left text-body-sm">
          <dt className="text-fg-muted">Số tiền</dt>
          <dd className="text-right font-semibold tabular-nums text-fg">{formatVnd(payment.amountVnd)}</dd>
          <dt className="text-fg-muted">Mã đơn</dt>
          <dd className="text-right font-mono text-fg">{payment.reference}</dd>
          <dt className="text-fg-muted">Cách trả</dt>
          <dd className="text-right text-fg">VNPay (sandbox)</dd>
        </dl>
      )}

      {data.result === "invalid" && (
        <Alert tone="warning" className="mt-6 text-left">
          Không có khoản thanh toán nào được ghi nhận từ liên kết này.
        </Alert>
      )}

      <div className="mt-7 flex flex-col gap-2">
        {data.result === "invalid" ? (
          <>
            <ButtonLink href={returnTo} variant="primary" size="xl" block>
              {backLabel}
            </ButtonLink>
            <ButtonLink href="/support" variant="secondary" size="xl" block>
              Liên hệ WrapFit
            </ButtonLink>
          </>
        ) : (
          <ButtonLink href={returnTo} variant="primary" size="xl" block>
            {data.result === "failed" ? "Quay lại và thử lại" : backLabel}
          </ButtonLink>
        )}
        {data.result === "success" && returnTo !== DEFAULT_RETURN_TO && (
          <ButtonLink href={DEFAULT_RETURN_TO} variant="secondary" size="xl" block>
            Mở ví xu
          </ButtonLink>
        )}
      </div>
    </div>
  );
}

function successText(payment: Payment): string {
  if (payment.purpose === "PRO_MONTH") return "Gói Pro đã bật: xuất file in sạch không giới hạn trong 30 ngày.";
  if (payment.purpose === "SAMPLE_ORDER") return "Đơn in mẫu đã được thanh toán. Xưởng in sẽ gọi xác nhận trước khi in.";
  if (payment.xu) return `Đã cộng ${payment.xu.toLocaleString("vi-VN")} xu Wrap vào ví, dùng trong 12 tháng.`;
  return `Đã cộng ${payment.credits ?? 0} lượt xuất vào tài khoản, dùng trong 12 tháng.`;
}

function Missing({
  titleRef,
  title,
  text,
  action,
}: {
  titleRef: React.RefObject<HTMLHeadingElement | null>;
  title: string;
  text: string;
  action: React.ReactNode;
}) {
  return (
    <div role="status" aria-live="polite">
      <GoiMascot pose="measuring" size={120} interactive={false} />
      <h1 id="vnpay-return-title" ref={titleRef} tabIndex={-1} className="mt-3 font-landing-heading text-3xl font-bold tracking-tight outline-none">
        {title}
      </h1>
      <p className="mt-3 text-base leading-7 text-landing-muted">{text}</p>
      <div className="mt-7">{action}</div>
    </div>
  );
}
