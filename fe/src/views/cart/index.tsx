"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CreditCard, Factory, LifeBuoy, Minus, PackagePlus, Plus, ShieldCheck, ShoppingBag, Trash2, Truck } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { listProjects } from "@/api/projects";
import { createSampleBundle } from "@/api/orders";
import { Container } from "@/components/landing";
import { Card, PRIMARY_CTA, SECONDARY_CTA, SitePage } from "@/components/site";
import { Badge, Button, buttonClass } from "@/components/ui";
import { RequireAuth } from "@/features/auth";
import { CheckoutDialog } from "@/features/payments";
import { formatVnd } from "@/features/pricing";
import { MAX_QUANTITY, PAPER_STOCKS, sampleFee, useSampleCart } from "@/features/site/cart";
import { ProvinceSelect, ShopPicker, deliveryDateLabel, useShopMatch } from "@/features/print-shops/ShopPicker";
import { BoxPreview } from "@/features/templates/components/BoxPreview";
import { queryKeys } from "@/hooks/data";
import { errorMessage, isApiError } from "@/services/api";
import type { PrintShopOffer, ProjectSummary, SampleOrder } from "@/types/api";
import { cn } from "@/utils/helpers";

const PROJECTS_QUERY = { status: "ACTIVE" as const, sortBy: "updatedAt" as const, order: "desc" as const, limit: 50 };
const PAPER_OF: Record<string, string> = { ivory: PAPER_STOCKS[0], kraft: PAPER_STOCKS[1], duplex: PAPER_STOCKS[2] };

/**
 * `/cart`: the sample-print cart. Projects come from `GET /projects`; the shops that can print them, ranked for the
 * province of the recipient, from `POST /orders/sample/match` (docs/19 G.3). "Đặt in mẫu" places ONE
 * `POST /orders/sample/bundle` with the chosen shop, priced like the API (49.000đ + 25.000đ per extra box).
 */
export default function CartPage() {
  return (
    <SitePage>
      <RequireAuth>
        <CartScreen />
      </RequireAuth>
    </SitePage>
  );
}

function CartScreen() {
  const cart = useSampleCart();
  const queryClient = useQueryClient();
  const projects = useQuery({ queryKey: queryKeys.projects.list(PROJECTS_QUERY), queryFn: () => listProjects(PROJECTS_QUERY) });
  /** Chosen shop; "" = the recommended one (named on screen before payment, docs/19 BR-G12). */
  const [shopId, setShopId] = useState<string>("");
  const [province, setProvince] = useState<string>("");
  const [form, setForm] = useState({ recipientName: "", phone: "", shippingAddress: "", notes: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<SampleOrder[] | null>(null);
  /** The shop offer the order went to, for the delivery date on the confirmation. */
  const [placedShop, setPlacedShop] = useState<PrintShopOffer | null>(null);
  /** Order whose VietQR checkout is open. */
  const [paying, setPaying] = useState<SampleOrder | null>(null);

  const byId = useMemo(() => new Map((projects.data?.items ?? []).map((project) => [project.id, project])), [projects.data]);

  // /cart?add=<project id> (from the studio export dialog and the orders page): put that project in the cart once.
  const added = useRef(false);
  useEffect(() => {
    if (added.current || !cart.ready || !projects.data) return;
    added.current = true;
    const id = new URLSearchParams(window.location.search).get("add");
    const project = id ? byId.get(id) : undefined;
    if (project) cart.add(project.id, PAPER_OF[project.materialSpec.type]);
    if (id) window.history.replaceState(null, "", "/cart");
  }, [cart, projects.data, byId]);
  const lines = cart.items.map((item) => ({ item, project: byId.get(item.projectId) }));
  const known = lines.filter((line) => line.project);
  const subtotal = known.reduce((sum, { item }) => sum + sampleFee(item.quantity), 0);
  const suggestions = (projects.data?.items ?? []).filter((project) => !cart.items.some((item) => item.projectId === project.id)).slice(0, 3);
  const match = useShopMatch(
    known.map(({ item }) => ({ projectId: item.projectId, quantity: item.quantity })),
    province
  );
  const chosenId = shopId || match.data?.recommendedId || "";
  const chosen = match.data?.offers.find((offer) => offer.shop.id === chosenId) ?? null;
  // The ranking moved (province, designs): a choice that is no longer offered falls back to the recommended shop.
  useEffect(() => {
    if (shopId && match.data && !match.data.offers.some((offer) => offer.shop.id === shopId)) setShopId("");
  }, [shopId, match.data]);

  const order = useMutation({
    // Every design of the cart goes into ONE order: one bill, one payment.
    mutationFn: async () => {
      const bill = await createSampleBundle({
        items: known.map(({ item }) => ({ projectId: item.projectId, quantity: item.quantity, paperStock: item.paperStock })),
        printShopId: chosenId,
        recipientProvince: province,
        recipientName: form.recipientName.trim(),
        phone: form.phone.trim(),
        shippingAddress: form.shippingAddress.trim(),
        notes: form.notes.trim() || undefined,
      });
      return [bill];
    },
    onSuccess: (orders) => {
      setPlaced(orders);
      setPlacedShop(chosen);
      // One order (the usual sample): its VietQR checkout opens right away.
      if (orders.length === 1 && orders[0].status === "pending_payment") setPaying(orders[0]);
      cart.clear();
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
    onError: (error) => {
      // The shop stopped taking this order between the cart and now (docs/19 EF-G1): rank again.
      if (isApiError(error, "PRINT_SHOP_UNAVAILABLE")) {
        setShopId("");
        void match.refetch();
      }
    },
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.recipientName.trim() || !form.phone.trim() || !form.shippingAddress.trim() || !province) {
      setFormError("Hãy nhập tên người nhận, số điện thoại, tỉnh / thành và địa chỉ giao hàng.");
      return;
    }
    if (!chosen) {
      setFormError("Chưa có xưởng nào nhận được đơn này.");
      return;
    }
    if (!/^(\+?84|0)\d{8,10}$/.test(form.phone.replace(/[\s.]/g, ""))) {
      setFormError("Số điện thoại chưa đúng, ví dụ: 0901 234 567.");
      return;
    }
    setFormError(null);
    order.mutate();
  };

  if (placed) {
    const markPaid = (id: string) =>
      setPlaced((current) => current?.map((item) => (item.id === id ? { ...item, status: "paid", orderStatus: "PAID" } : item)) ?? null);
    const unpaid = placed.filter((item) => item.status === "pending_payment");
    return (
      <Container className="max-w-2xl pb-16 pt-28 sm:pt-32">
        <Card className="overflow-hidden p-0 sm:p-0">
          <header className="flex items-start gap-4 border-b border-landing-line px-6 py-6 sm:px-8">
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full",
                unpaid.length ? "bg-warning-bg text-warning-fg" : "bg-success-bg text-success-fg"
              )}
            >
              {unpaid.length ? <CreditCard className="size-5" aria-hidden /> : <CheckCircle2 className="size-5" aria-hidden />}
            </span>
            <div className="min-w-0">
              <h1 className="font-landing-heading text-2xl font-bold tracking-tight">{unpaid.length ? "Đơn in mẫu chờ thanh toán" : "Đã nhận đơn in mẫu"}</h1>
              <p className="mt-1 text-sm text-landing-muted">
                {unpaid.length
                  ? "Thanh toán để xưởng bắt đầu in. Đơn chưa trả vẫn nằm trong Đơn hàng & file in."
                  : "Xưởng đã nhận được đơn và sẽ bắt đầu in. Theo dõi trạng thái trong Đơn hàng & file in."}
              </p>
            </div>
          </header>

          {placed.map((bill) => {
            const designs = bill.items?.length
              ? bill.items
              : [{ projectId: bill.projectId, projectTitle: bill.projectTitle, quantity: bill.quantity, lineTotalVnd: bill.sampleFeeVnd ?? 0 }];
            const paid = bill.status !== "pending_payment";
            return (
              <section key={bill.id} aria-label={`Đơn ${bill.orderCode ?? bill.id}`} className="border-b border-landing-line px-6 py-5 sm:px-8">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-landing-muted">Mã đơn</p>
                    <p className="font-mono text-sm font-semibold tracking-wide">{bill.orderCode ?? bill.id}</p>
                  </div>
                  <Badge size="sm" tone={paid ? "success" : "warning"}>
                    {paid ? "Đã thanh toán" : "Chờ thanh toán"}
                  </Badge>
                </div>

                <ul className="mt-4 divide-y divide-landing-line border-y border-landing-line">
                  {designs.map((design, index) => (
                    <li key={`${design.projectId ?? index}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{design.projectTitle}</p>
                        <p className="text-xs text-landing-muted">{design.quantity} hộp in mẫu</p>
                      </div>
                      <span className="tabular-nums">{formatVnd(design.lineTotalVnd)}</span>
                      {/* Paying the print order unlocks the print file of that design version in the studio. */}
                      {paid && design.projectId && (
                        <Link href={`/editor/${design.projectId}?step=6`} className={buttonClass({ variant: "secondary", size: "sm" })}>
                          Xuất file in
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-sm text-landing-muted">Tổng cộng</span>
                  <span className="font-landing-heading text-lg font-bold tabular-nums">{formatVnd(bill.totalVnd ?? bill.sampleFeeVnd ?? 0)}</span>
                </div>
                {!paid && (
                  <Button className="mt-4" block onClick={() => setPaying(bill)}>
                    Thanh toán đơn này
                  </Button>
                )}
              </section>
            );
          })}

          <section aria-labelledby="next-title" className="px-6 py-5 sm:px-8">
            <h2 id="next-title" className="text-sm font-semibold">
              Tiếp theo
            </h2>
            <ol className="mt-3 grid gap-3 sm:grid-cols-3">
              {[
                { icon: Factory, title: "Xưởng nhận đơn", text: placedShop ? placedShop.shop.name : "Sau khi bạn thanh toán" },
                { icon: PackagePlus, title: "In mẫu", text: placedShop ? `${placedShop.productionDays} ngày làm việc` : "Theo lịch của xưởng" },
                {
                  icon: Truck,
                  title: "Giao hàng",
                  text: placedShop ? `Dự kiến ${deliveryDateLabel(placedShop.estimatedDelivery)}` : "Tới địa chỉ bạn đã nhập",
                },
              ].map(({ icon: Icon, title, text }, index) => (
                <li key={title} className="flex gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-landing-canvas text-landing-muted">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      {index + 1}. {title}
                    </span>
                    <span className="block text-xs text-landing-muted">{text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <footer className="flex flex-wrap justify-end gap-3 border-t border-landing-line bg-landing-canvas/60 px-6 py-4 sm:px-8">
            <Link href="/dashboard/projects" className={SECONDARY_CTA}>
              Về dự án
            </Link>
            <Link href="/dashboard/orders" className={PRIMARY_CTA}>
              Xem đơn hàng
            </Link>
          </footer>
        </Card>
        {paying && (
          <CheckoutDialog
            purpose="SAMPLE_ORDER"
            orderId={paying.id}
            doneLabel="Xong"
            onPaid={() => markPaid(paying.id)}
            onClose={() => setPaying(null)}
          />
        )}
      </Container>
    );
  }

  return (
    <Container className="pb-16 pt-28 sm:pt-32">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-fpt-orange-ink">In mẫu thử</p>
          <h1 className="font-landing-heading text-3xl font-bold tracking-tight sm:text-4xl">Giỏ in mẫu</h1>
          <p className="mt-1 text-sm text-landing-muted">In mẫu 1–{MAX_QUANTITY} hộp để kiểm tra thực tế trước khi in số lượng lớn.</p>
        </div>
        <Link href="/support?a=dinh-dang-xuat" className="inline-flex items-center gap-1.5 text-sm font-semibold text-fpt-orange-ink">
          <LifeBuoy className="size-4" aria-hidden /> Cần giúp chọn giấy?
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-4">
          {!cart.ready || projects.isLoading ? (
            <Card className="h-40 animate-pulse bg-white/60" />
          ) : lines.length === 0 ? (
            <Card className="flex flex-col items-center gap-3 py-10 text-center">
              <ShoppingBag className="size-10 text-landing-muted" aria-hidden />
              <p className="font-landing-heading text-xl font-bold">Giỏ đang trống</p>
              <p className="max-w-sm text-sm text-landing-muted">Chọn một thiết kế bên dưới để in hộp mẫu, hoặc tạo dự án mới trong studio.</p>
              <Link href="/editor/demo" className={SECONDARY_CTA}>
                Tạo dự án mới
              </Link>
            </Card>
          ) : (
            <ul className="flex flex-col gap-3">
              {lines.map(({ item, project }) => (
                <li key={item.projectId}>
                  {project ? (
                    <CartLine project={project} quantity={item.quantity} paperStock={item.paperStock} onChange={(change) => cart.update(item.projectId, change)} onRemove={() => cart.remove(item.projectId)} />
                  ) : (
                    <Card className="flex items-center justify-between gap-3 p-4 text-sm text-landing-muted">
                      Dự án này không còn trong tài khoản (đã xoá hoặc chuyển vào thùng rác).
                      <button type="button" onClick={() => cart.remove(item.projectId)} className="font-semibold text-danger-fg">
                        Bỏ khỏi giỏ
                      </button>
                    </Card>
                  )}
                </li>
              ))}
            </ul>
          )}

          {suggestions.length > 0 && (
            <section aria-labelledby="goi-y" className="mt-4">
              <h2 id="goi-y" className="font-landing-heading text-lg font-bold">
                {lines.length ? "In thêm thiết kế khác" : "Thiết kế của bạn"}
              </h2>
              <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {suggestions.map((project) => (
                  <li key={project.id} className="flex flex-col rounded-3xl bg-white p-4 ring-1 ring-landing-ink/10">
                    <span className="flex h-24 items-center justify-center rounded-2xl bg-landing-canvas">
                      <BoxPreview structure={project.template.id} material={project.materialSpec.type} dimensions={project.dimensions} className="size-full" />
                    </span>
                    <p className="mt-3 truncate text-sm font-semibold">{project.title}</p>
                    <p className="text-xs text-landing-muted">
                      {project.dimensions.length} × {project.dimensions.width} × {project.dimensions.height} mm
                    </p>
                    <button type="button" onClick={() => cart.add(project.id, PAPER_OF[project.materialSpec.type])} className="mt-3 inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-landing-canvas text-sm font-semibold hover:bg-landing-tile">
                      <PackagePlus className="size-4" aria-hidden /> Thêm vào giỏ
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Summary and checkout */}
        <form onSubmit={submit} noValidate className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="flex flex-col gap-4 p-5 sm:p-6">
            <h2 className="font-landing-heading text-lg font-bold">Tóm tắt đơn</h2>
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-landing-muted">{known.length} thiết kế · {known.reduce((sum, { item }) => sum + item.quantity, 0)} hộp</dt>
                <dd className="font-semibold">{formatVnd(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-landing-muted">Giao hàng</dt>
                <dd className="text-landing-muted">Xưởng báo khi xác nhận</dd>
              </div>
              <div className="flex justify-between border-t border-landing-line/60 pt-3 text-base">
                <dt className="font-semibold">Tạm tính</dt>
                <dd className="font-landing-heading text-xl font-bold">{formatVnd(subtotal)}</dd>
              </div>
            </dl>
            <p className="text-xs text-landing-muted">49.000đ hộp đầu, 25.000đ mỗi hộp thêm của cùng thiết kế.</p>
          </Card>

          <Card className="flex flex-col gap-3 p-5 sm:p-6">
            <h2 className="flex items-center gap-2 font-landing-heading text-lg font-bold">
              <Factory className="size-5" aria-hidden /> Xưởng in
            </h2>
            <label htmlFor="cart-province" className="text-sm font-medium">
              Giao tới tỉnh / thành
              <ProvinceSelect id="cart-province" value={province} onChange={setProvince} />
            </label>
            <ShopPicker match={match} value={shopId} onChange={setShopId} />

            <h2 className="mt-2 flex items-center gap-2 font-landing-heading text-lg font-bold">
              <Truck className="size-5" aria-hidden /> Nhận hàng
            </h2>
            {(
              [
                ["recipientName", "Người nhận", "name", "Nguyễn Mai Anh"],
                ["phone", "Số điện thoại", "tel", "0901 234 567"],
                ["shippingAddress", "Địa chỉ", "street-address", "Số nhà, đường, phường / xã"],
              ] as const
            ).map(([key, label, autoComplete, placeholder]) => (
              <label key={key} className="text-sm font-medium">
                {label}
                <input value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} autoComplete={autoComplete} placeholder={placeholder} className="mt-1 h-11 w-full rounded-xl bg-landing-canvas px-3 text-sm outline-none ring-1 ring-landing-line focus-visible:ring-fpt-orange" />
              </label>
            ))}
            <label className="text-sm font-medium">
              Ghi chú cho xưởng
              <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={2} placeholder="Cán mờ, giao giờ hành chính…" className="mt-1 w-full rounded-xl bg-landing-canvas p-3 text-sm outline-none ring-1 ring-landing-line focus-visible:ring-fpt-orange" />
            </label>

            {(formError || order.error) && (
              <p role="alert" className="rounded-xl bg-danger-bg px-3 py-2 text-sm text-danger-fg">
                {formError ?? errorMessage(order.error)}
              </p>
            )}
            <button type="submit" disabled={!known.length || !chosen || order.isPending} className={cn(PRIMARY_CTA, "h-12 w-full disabled:opacity-50")}>
              {order.isPending ? "Đang gửi đơn…" : `Đặt in mẫu · ${formatVnd(subtotal)}`}
            </button>
            {chosen && (
              <p className="text-xs text-landing-muted">
                In tại <strong className="font-semibold text-landing-ink">{chosen.shop.name}</strong>, nhận dự kiến {deliveryDateLabel(chosen.estimatedDelivery)}.
              </p>
            )}
            <div className="flex flex-col gap-1.5 text-xs text-landing-muted">
              <p className="flex items-center gap-1.5">
                <CreditCard className="size-3.5" aria-hidden /> COD hoặc chuyển khoản VietQR khi xác nhận đơn
              </p>
              <p className="flex items-center gap-1.5">
                <ShieldCheck className="size-3.5" aria-hidden /> In lại miễn phí nếu hộp sai lệch kích thước ·{" "}
                <Link href="/legal/terms#mau-sac" className="underline">
                  Điều khoản
                </Link>
              </p>
            </div>
          </Card>
        </form>
      </div>
    </Container>
  );
}

function CartLine({
  project,
  quantity,
  paperStock,
  onChange,
  onRemove,
}: {
  project: ProjectSummary;
  quantity: number;
  paperStock: string;
  onChange: (change: { quantity?: number; paperStock?: string }) => void;
  onRemove: () => void;
}) {
  const step = "inline-flex size-9 items-center justify-center rounded-full bg-white ring-1 ring-landing-line hover:bg-landing-tile disabled:opacity-40";
  return (
    <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
      <Link href={`/editor/${project.id}`} className="flex size-24 shrink-0 items-center justify-center self-center rounded-2xl bg-landing-canvas sm:self-auto">
        <BoxPreview structure={project.template.id} material={project.materialSpec.type} dimensions={project.dimensions} className="size-full" label={project.title} />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/editor/${project.id}`} className="block truncate font-landing-heading text-lg font-bold hover:underline">
          {project.title}
        </Link>
        <p className="text-sm text-landing-muted">
          {project.template.name} · {project.dimensions.length} × {project.dimensions.width} × {project.dimensions.height} mm
          {project.fitcheckScore !== null && ` · FitCheck™ ${project.fitcheckScore}`}
        </p>
        <label className="mt-2 inline-flex items-center gap-2 text-sm">
          <span className="text-landing-muted">Giấy</span>
          <select value={paperStock} onChange={(event) => onChange({ paperStock: event.target.value })} className="h-9 rounded-full bg-landing-canvas px-3 text-sm ring-1 ring-landing-line">
            {PAPER_STOCKS.map((stock) => (
              <option key={stock}>{stock}</option>
            ))}
          </select>
        </label>
        {project.fitcheckScore !== null && project.fitcheckScore < 100 && (
          <p className="mt-2 text-xs font-medium text-warning-fg">FitCheck™ &lt; 100: nên tối ưu lại trước khi đặt in.</p>
        )}
      </div>
      <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
        <div className="flex items-center gap-2" role="group" aria-label={`Số hộp của ${project.title}`}>
          <button type="button" className={step} disabled={quantity <= 1} onClick={() => onChange({ quantity: quantity - 1 })} aria-label="Bớt một hộp">
            <Minus className="size-4" aria-hidden />
          </button>
          <span className="w-8 text-center font-mono font-semibold" aria-live="polite">
            {quantity}
          </span>
          <button type="button" className={step} disabled={quantity >= MAX_QUANTITY} onClick={() => onChange({ quantity: quantity + 1 })} aria-label="Thêm một hộp">
            <Plus className="size-4" aria-hidden />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-semibold">{formatVnd(sampleFee(quantity))}</span>
          <button type="button" onClick={onRemove} aria-label={`Bỏ ${project.title} khỏi giỏ`} className="rounded-full p-2 text-landing-muted hover:bg-danger-bg hover:text-danger-fg">
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </Card>
  );
}
