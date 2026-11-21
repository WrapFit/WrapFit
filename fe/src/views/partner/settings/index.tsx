"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import { getPartnerMe, updatePartnerShop } from "@/api";
import { useToast } from "@/components/common/Toast";
import { Button } from "@/components/ui";
import { Panel, PanelTitle, WORKSPACE_INPUT, WorkspaceError } from "@/components/workspace";
import { PartnerShell } from "@/components/workspace/PartnerShell";
import { cn } from "@/utils/helpers";

/**
 * `/partner/settings`: the shop as WrapFit knows it, and what its OWNER may change (docs/19 BR-G11): a pause until a date
 * (holidays, a machine repair: customers do not see the shop meanwhile), daily capacity, phone and Zalo. The contract
 * (fee rate, capabilities) stays with the admin.
 */
export default function PartnerSettingsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ["partner", "me"], queryFn: getPartnerMe });
  const [form, setForm] = useState({ pausedUntil: "", dailyCapacity: "", phone: "", zalo: "" });

  useEffect(() => {
    if (!me.data) return;
    const shop = me.data.shop;
    setForm({
      pausedUntil: shop.pausedUntil ? shop.pausedUntil.slice(0, 10) : "",
      dailyCapacity: String(shop.dailyCapacity),
      phone: shop.phone,
      zalo: shop.zalo ?? "",
    });
  }, [me.data]);

  const save = useMutation({
    mutationFn: () =>
      updatePartnerShop({
        // End of the chosen day, Vietnam time.
        pausedUntil: form.pausedUntil ? new Date(`${form.pausedUntil}T23:59:59+07:00`).toISOString() : null,
        dailyCapacity: Number(form.dailyCapacity) || undefined,
        phone: form.phone.trim() || undefined,
        zalo: form.zalo.trim() || undefined,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["partner", "me"], data);
      toast.show({ tone: "success", title: "Đã lưu thông tin xưởng" });
    },
    onError: (error) => toast.error(error, "Chưa lưu được"),
  });

  const owner = me.data?.role === "OWNER";
  const shop = me.data?.shop;
  return (
    <PartnerShell title="Thông tin xưởng">
      {me.isError ? (
        <WorkspaceError error={me.error} title="Không tải được thông tin xưởng" onRetry={() => void me.refetch()} retrying={me.isFetching} />
      ) : !shop ? (
        <div aria-busy="true" className="h-48 animate-pulse rounded-2xl bg-library-panel" />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Panel aria-labelledby="shop-title">
            <PanelTitle id="shop-title">{shop.name}</PanelTitle>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-library-muted">Địa chỉ</dt>
              <dd>{shop.address}</dd>
              <dt className="text-library-muted">Khổ máy</dt>
              <dd>{shop.sheet}</dd>
              <dt className="text-library-muted">Thời gian làm</dt>
              <dd>
                {shop.leadTime} · mẫu {shop.sampleLeadTimeDays} ngày
              </dd>
              <dt className="text-library-muted">Năng lực</dt>
              <dd>{shop.services.join(", ")}</dd>
              {shop.platformFeeBps !== undefined && (
                <>
                  <dt className="text-library-muted">Phí nền tảng</dt>
                  <dd>{(shop.platformFeeBps / 100).toLocaleString("vi-VN")} % trên tiền hộp</dd>
                </>
              )}
              <dt className="text-library-muted">Vai trò của bạn</dt>
              <dd>{owner ? "Chủ xưởng" : "Nhân viên"}</dd>
            </dl>
            <p className="mt-3 text-caption text-library-muted">Năng lực, bảng giá và hợp đồng do WrapFit cập nhật: nhắn admin khi cần đổi.</p>
          </Panel>
          <Panel aria-labelledby="edit-title">
            <PanelTitle id="edit-title">Lịch và liên hệ</PanelTitle>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                save.mutate();
              }}
              className="flex flex-col gap-3"
            >
              <fieldset disabled={!owner || save.isPending} className="flex flex-col gap-3">
                <label className="text-sm font-medium text-library-ink">
                  Tạm nghỉ đến hết ngày
                  <input type="date" value={form.pausedUntil} onChange={(e) => setForm({ ...form, pausedUntil: e.target.value })} className={cn(WORKSPACE_INPUT, "mt-1")} />
                  <span className="mt-1 block text-caption text-library-muted">Khách không thấy xưởng khi đặt đơn mới đến hết ngày này. Đơn đang làm vẫn tiếp tục. Để trống là đang nhận đơn.</span>
                </label>
                <label className="text-sm font-medium text-library-ink">
                  Số đơn bắt đầu mỗi ngày
                  <input type="number" min={1} value={form.dailyCapacity} onChange={(e) => setForm({ ...form, dailyCapacity: e.target.value })} className={cn(WORKSPACE_INPUT, "mt-1")} />
                </label>
                <label className="text-sm font-medium text-library-ink">
                  Số điện thoại (khách thấy sau khi xưởng nhận đơn)
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={cn(WORKSPACE_INPUT, "mt-1")} />
                </label>
                <label className="text-sm font-medium text-library-ink">
                  Zalo
                  <input value={form.zalo} onChange={(e) => setForm({ ...form, zalo: e.target.value })} className={cn(WORKSPACE_INPUT, "mt-1")} />
                </label>
              </fieldset>
              {owner ? (
                <Button type="submit" variant="brand" size="sm" className="self-start" disabled={save.isPending}>
                  Lưu
                </Button>
              ) : (
                <p className="text-caption text-library-muted">Chỉ chủ xưởng đổi được các mục này.</p>
              )}
            </form>
          </Panel>
        </div>
      )}
    </PartnerShell>
  );
}
