"use client";

import React, { useId, useState } from "react";
import { useToast } from "@/components/common/Toast";
import { outlineButton, primaryButton } from "@/components/library";
import { WORKSPACE_INPUT } from "@/components/workspace";
import { cn } from "@/utils/helpers";
import type { SafeUser, UpdateProfileRequest } from "@/types/api";
import { useUpdateProfile } from "../useAccount";

const NAME_MAX = 100;

interface Values {
  fullName: string;
  shopName: string;
}

const valuesOf = (user: SafeUser): Values => ({ fullName: user.fullName ?? "", shopName: user.shopName ?? "" });

/** Display name and shop name (`PATCH /users/me`); only the fields that changed are sent. */
export function ProfileForm({ user }: { user: SafeUser }) {
  const toast = useToast();
  const update = useUpdateProfile();
  const nameId = useId();
  const shopId = useId();
  const emailId = useId();
  const [baseline, setBaseline] = useState(() => valuesOf(user));
  const [values, setValues] = useState(baseline);

  // Saved elsewhere (avatar upload, another tab): follow the server copy unless the user is typing.
  const server = valuesOf(user);
  if (server.fullName !== baseline.fullName || server.shopName !== baseline.shopName) {
    if (values.fullName === baseline.fullName && values.shopName === baseline.shopName) setValues(server);
    setBaseline(server);
  }

  const changes: UpdateProfileRequest = {};
  if (values.fullName.trim() !== baseline.fullName) changes.fullName = values.fullName.trim();
  if (values.shopName.trim() !== baseline.shopName) changes.shopName = values.shopName.trim();
  const dirty = Object.keys(changes).length > 0;
  const tooLong = (value: string) => value.trim().length > NAME_MAX;
  const invalid = tooLong(values.fullName) || tooLong(values.shopName);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!dirty || invalid || update.isPending) return;
    update.mutate(changes, {
      onSuccess: (saved) => {
        const next = valuesOf(saved);
        setBaseline(next);
        setValues(next);
        toast.show({ tone: "success", title: "Đã lưu hồ sơ", description: "Tên mới đã hiện trên thanh điều hướng." });
      },
      onError: (error) => toast.error(error, "Không lưu được hồ sơ"),
    });
  };

  const field = (key: keyof Values, id: string, label: string, placeholder: string, hint: string) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-library-ink">
        {label}
      </label>
      <input
        id={id}
        value={values[key]}
        onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))}
        placeholder={placeholder}
        maxLength={NAME_MAX + 20}
        autoComplete={key === "fullName" ? "name" : "organization"}
        aria-invalid={tooLong(values[key])}
        aria-describedby={`${id}-hint`}
        className={WORKSPACE_INPUT}
      />
      <p id={`${id}-hint`} className={cn("text-xs", tooLong(values[key]) ? "text-red-600" : "text-library-muted")}>
        {tooLong(values[key]) ? `Tối đa ${NAME_MAX} ký tự.` : hint}
      </p>
    </div>
  );

  return (
    <form
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-5 rounded-2xl border border-library-line bg-white p-5 sm:p-6"
    >
      <div>
        <h2 className="text-lg font-medium text-library-ink">Thông tin hiển thị</h2>
        <p className="mt-0.5 text-sm text-library-sub">Tên và cửa hàng hiện trên thanh điều hướng và trang chia sẻ.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {field(
          "fullName",
          nameId,
          "Họ và tên",
          "Ví dụ: Nguyễn Minh Anh",
          "Hiện trên thanh điều hướng và trang chia sẻ.",
        )}
        {field(
          "shopName",
          shopId,
          "Tên cửa hàng / xưởng",
          "Ví dụ: Tiệm Nến Gió Mộc",
          "Ghi công trên hộp bạn chia sẻ công khai.",
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={emailId} className="text-sm font-medium text-library-ink">
          Email đăng nhập
        </label>
        <input id={emailId} value={user.email} readOnly className={cn(WORKSPACE_INPUT, "bg-library-panel text-library-sub")} />
        <p className="text-xs text-library-muted">Email không đổi được ở đây.</p>
      </div>
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-1">
        {dirty && (
          <button
            type="button"
            onClick={() => setValues(baseline)}
            disabled={update.isPending}
            className={outlineButton}
          >
            Huỷ thay đổi
          </button>
        )}
        <button
          type="submit"
          disabled={!dirty || invalid}
          aria-disabled={update.isPending}
          className={cn(primaryButton, "disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-wait")}
        >
          {update.isPending ? "Đang lưu…" : "Lưu hồ sơ"}
        </button>
      </div>
    </form>
  );
}
