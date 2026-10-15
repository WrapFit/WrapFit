"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CreditCard, Factory, LifeBuoy, Minus, PackagePlus, Plus, ShieldCheck, ShoppingBag, Tag, Trash2, Truck } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { listProjects } from "@/api/projects";
import { createSampleOrder } from "@/api/orders";
import { listPrintShops } from "@/api/print-shops";
import { Container } from "@/components/landing";
import { Card, PRIMARY_CTA, SECONDARY_CTA, SitePage } from "@/components/site";
import { RequireAuth } from "@/features/auth";
import { formatVnd } from "@/features/pricing";
import { MAX_QUANTITY, PAPER_STOCKS, PROMO_CODES, sampleFee, useSampleCart } from "@/features/site/cart";
import { BoxPreview } from "@/features/templates/components/BoxPreview";
import { queryKeys } from "@/hooks/data";
import { errorMessage } from "@/services/api";
import type { ProjectSummary, SampleOrder } from "@/types/api";
import { cn } from "@/utils/helpers";

const PROJECTS_QUERY = { status: "ACTIVE" as const, sortBy: "updatedAt" as const, order: "desc" as const, limit: 50 };
const PAPER_OF: Record<string, string> = { ivory: PAPER_STOCKS[0], kraft: PAPER_STOCKS[1], duplex: PAPER_STOCKS[2] };

/**
 * `/cart`: the sample-print cart. Projects come from `GET /projects`, the partner shops from `GET /print-shops`, and
 * "Đặt in mẫu" places one `POST /orders/sample` per project, priced like the API (49.000đ + 25.000đ per extra box).
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
  const shops = useQuery({ queryKey: queryKeys.printShops.all, queryFn: listPrintShops, staleTime: 10 * 60_000 });
  const [shopId, setShopId] = useState<string>("");
  const [promo, setPromo] = useState("");
  const [applied, setApplied] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [form, setForm] = useState({ recipientName: "", phone: "", shippingAddress: "", notes: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<SampleOrder[] | null>(null);

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
  const discount = applied ? Math.min(subtotal, PROMO_CODES[applied].discount(subtotal, known.length)) : 0;
  const suggestions = (projects.data?.items ?? []).filter((project) => !cart.items.some((item) => item.projectId === project.id)).slice(0, 3);
  const activeShops = (shops.data ?? []).filter((shop) => (shop.status ?? shop.state ?? "active") === "active");

  const order = useMutation({
    mutationFn: async () => {
      const done: SampleOrder[] = [];
      for (const { item, project } of known) {
        done.push(
          await createSampleOrder({
            projectId: item.projectId,
            quantity: item.quantity,
            paperStock: item.paperStock,
            printShopId: shopId || undefined,
            recipientName: form.recipientName.trim(),
            phone: form.phone.trim(),
            shippingAddress: form.shippingAddress.trim(),
            notes: [form.notes.trim(), applied ? `Mã ưu đãi: ${applied}` : "", `Dự án: ${project!.title}`].filter(Boolean).join(" · "),
          })
        );
      }
      return done;
    },
    onSuccess: (orders) => {
      setPlaced(orders);
      cart.clear();
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });

  const applyPromo = () => {
    const code = promo.trim().toUpperCase();
    if (!code) return;
    if (!PROMO_CODES[code]) {
      setApplied(null);
      setPromoError("Mã không hợp lệ hoặc đã hết hạn.");
      return;
    }
    setApplied(code);
    setPromoError(null);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.recipientName.trim() || !form.phone.trim() || !form.shippingAddress.trim()) {
      setFormError("Hãy nhập tên người nhận, số điện thoại và địa chỉ giao hàng.");
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
    return (
      <Container className="max-w-3xl pb-16 pt-28 sm:pt-32">
        <Card className="text-center sm:p-10">
          <CheckCircle2 className="mx-auto size-12 text-landing-green" aria-hidden />
          <h1 className="mt-4 font-landing-heading text-3xl font-bold">Đã gửi {placed.length} đơn in mẫu</h1>
          <p className="mt-2 text-sm text-landing-muted">Xưởng in sẽ gọi xác nhận trước khi in. Theo dõi trạng thái trong Đơn hàng & file in.</p>
          <ul className="mx-auto mt-6 flex max-w-md flex-col gap-2 text-left">
            {placed.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-landing-canvas px-4 py-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{item.projectTitle}</span>
                  <span className="font-mono text-xs text-landing-muted">{item.orderCode ?? item.id}</span>
                </span>
                <span className="shrink-0 font-semibold">{formatVnd(item.totalVnd ?? item.sampleFeeVnd ?? sampleFee(item.quantity))}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/dashboard/orders" className={PRIMARY_CTA}>
              Xem đơn hàng
            </Link>
            <Link href="/dashboard/projects" className={SECONDARY_CTA}>
              Về dự án
            </Link>
          </div>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="pb-16 pt-28 sm:pt-32">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-fpt-orange-ink">In mẫu thử</p>
          <h1 className="font-landing-heading text-3xl font-bold tracking-tight sm:text-4xl">Giỏ in mẫu</h1>
          <p className="mt-1 text-sm text-landing-muted">In 1–{MAX_QUANTITY} hộp mỗi thiết kế để kiểm tra màu và độ vừa trước khi in số lượng.</p>
        </div>
        <Link href="/support?a=dinh-dang-xuat" className="inline-flex items-center gap-1.5 text-sm font-semibold text-landing-green-deep">
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
              <Link href="/editor/new" className={SECONDARY_CTA}>
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
              {applied && (
                <div className="flex justify-between text-landing-green-deep">
                  <dt>{PROMO_CODES[applied].label}</dt>
                  <dd className="font-semibold">−{formatVnd(discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-landing-muted">Giao hàng</dt>
                <dd className="text-landing-muted">Xưởng báo khi xác nhận</dd>
              </div>
              <div className="flex justify-between border-t border-landing-line/60 pt-3 text-base">
                <dt className="font-semibold">Tạm tính</dt>
                <dd className="font-landing-heading text-xl font-bold">{formatVnd(Math.max(0, subtotal - discount))}</dd>
              </div>
            </dl>
            <p className="text-xs text-landing-muted">49.000đ hộp đầu, 25.000đ mỗi hộp thêm của cùng thiết kế.</p>

            <div>
              <label htmlFor="promo" className="flex items-center gap-1.5 text-sm font-medium">
                <Tag className="size-4" aria-hidden /> Mã ưu đãi
              </label>
              <div className="mt-1 flex gap-2">
                <input id="promo" value={promo} onChange={(event) => setPromo(event.target.value)} placeholder="WORKSHOPTET" className="h-10 min-w-0 flex-1 rounded-full bg-landing-canvas px-4 font-mono text-sm uppercase outline-none ring-1 ring-landing-line focus-visible:ring-landing-green" />
                <button type="button" onClick={applyPromo} className="h-10 rounded-full bg-landing-ink px-4 text-sm font-semibold text-white">
                  Áp dụng
                </button>
              </div>
              {promoError && <p className="mt-1 text-xs font-medium text-danger-fg">{promoError}</p>}
              {applied && <p className="mt-1 text-xs text-landing-muted">Xưởng in kiểm tra lại mã khi xác nhận đơn.</p>}
            </div>
          </Card>

          <Card className="flex flex-col gap-3 p-5 sm:p-6">
            <h2 className="flex items-center gap-2 font-landing-heading text-lg font-bold">
              <Factory className="size-5" aria-hidden /> Xưởng in
            </h2>
            <select value={shopId} onChange={(event) => setShopId(event.target.value)} className="h-11 rounded-xl bg-landing-canvas px-3 text-sm ring-1 ring-landing-line">
              <option value="">Để WrapFit chọn xưởng phù hợp</option>
              {activeShops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name} · {shop.city}
                  {shop.leadTime ? ` · ${shop.leadTime}` : ""}
                </option>
              ))}
            </select>
            {shops.isError && <p className="text-xs text-landing-muted">Chưa tải được danh sách xưởng; WrapFit sẽ chọn xưởng gần bạn.</p>}

            <h2 className="mt-2 flex items-center gap-2 font-landing-heading text-lg font-bold">
              <Truck className="size-5" aria-hidden /> Nhận hàng
            </h2>
            {(
              [
                ["recipientName", "Người nhận", "name", "Nguyễn Mai Anh"],
                ["phone", "Số điện thoại", "tel", "0901 234 567"],
                ["shippingAddress", "Địa chỉ", "street-address", "Số nhà, đường, phường, quận, tỉnh"],
              ] as const
            ).map(([key, label, autoComplete, placeholder]) => (
              <label key={key} className="text-sm font-medium">
                {label}
                <input value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} autoComplete={autoComplete} placeholder={placeholder} className="mt-1 h-11 w-full rounded-xl bg-landing-canvas px-3 text-sm outline-none ring-1 ring-landing-line focus-visible:ring-landing-green" />
              </label>
            ))}
            <label className="text-sm font-medium">
              Ghi chú cho xưởng
              <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={2} placeholder="Cán mờ, giao giờ hành chính…" className="mt-1 w-full rounded-xl bg-landing-canvas p-3 text-sm outline-none ring-1 ring-landing-line focus-visible:ring-landing-green" />
            </label>

            {(formError || order.error) && (
              <p role="alert" className="rounded-xl bg-danger-bg px-3 py-2 text-sm text-danger-fg">
                {formError ?? errorMessage(order.error)}
              </p>
            )}
            <button type="submit" disabled={!known.length || order.isPending} className={cn(PRIMARY_CTA, "h-12 w-full disabled:opacity-50")}>
              {order.isPending ? "Đang gửi đơn…" : `Đặt in mẫu · ${formatVnd(Math.max(0, subtotal - discount))}`}
            </button>
            <div className="flex flex-col gap-1.5 text-xs text-landing-muted">
              <p className="flex items-center gap-1.5">
                <CreditCard className="size-3.5" aria-hidden /> Thanh toán khi nhận hàng (COD) hoặc chuyển khoản VietQR khi xưởng xác nhận
              </p>
              <p className="flex items-center gap-1.5">
                <ShieldCheck className="size-3.5" aria-hidden /> In lại miễn phí một lần nếu hộp không vừa số đo đã nhập ·{" "}
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
          <p className="mt-2 text-xs font-medium text-warning-fg">FitCheck™ chưa đạt 100: nên sửa lỗi trong studio trước khi in.</p>
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
