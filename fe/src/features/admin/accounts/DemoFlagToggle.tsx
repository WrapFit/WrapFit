"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { setUserDemo } from "@/api/admin/bank-transactions";
import { useToast } from "@/components/common/Toast";
import { Toggle } from "@/components/workspace";
import type { SafeUser } from "@/types/api";
import { displayName } from "./accountFormat";

/** `GET /users` returns `isDemo` (`users.is_demo`); the shared `SafeUser` type does not list it yet. */
type DemoUser = SafeUser & { isDemo?: boolean };

/**
 * "Tài khoản demo" switch (`PATCH /users/:id { isDemo }`, docs/21 D3). Demo accounts pay through VNPay sandbox, the others
 * through a real bank transfer; the flag counts for the next payment the user creates.
 */
export function DemoFlagToggle({ user, disabled }: { user: SafeUser; disabled?: boolean }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const isDemo = (user as DemoUser).isDemo === true;

  const mutation = useMutation({
    mutationFn: (next: boolean) => setUserDemo(user.id, next),
    onSuccess: (saved) => {
      toast.show({
        tone: "success",
        title: saved.isDemo ? "Đã bật tài khoản demo" : "Đã tắt tài khoản demo",
        description: saved.isDemo
          ? `${displayName(user)} thanh toán qua VNPay sandbox từ lần tạo thanh toán sau.`
          : `${displayName(user)} thanh toán bằng chuyển khoản thật từ lần tạo thanh toán sau.`,
      });
      void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "user", user.id] });
    },
    onError: (error) => toast.error(error, "Chưa đổi được cờ demo"),
  });

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-library-panel/40 p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-library-ink">Tài khoản demo</p>
        <p className="mt-0.5 text-caption text-library-sub">{isDemo ? "Trả qua VNPay sandbox, không mất tiền thật" : "Trả bằng chuyển khoản thật qua SePay"}</p>
      </div>
      <Toggle checked={isDemo} onChange={(next) => mutation.mutate(next)} label="Tài khoản demo" disabled={disabled || mutation.isPending} tone="brand" />
    </div>
  );
}
