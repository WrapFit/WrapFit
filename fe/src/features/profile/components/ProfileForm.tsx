"use client";

import React, { useId, useState } from "react";
import { useToast } from "@/components/common/Toast";
import type { SafeUser, UpdateProfileRequest } from "@/types/api";
import { useUpdateProfile } from "../useAccount";

const NAME_MAX = 100;

const FIELD =
  "w-full min-h-[44px] px-4 rounded-2xl border border-[#e8ded0] text-sm placeholder:text-stone-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#122e20]/30 focus-visible:border-[#122e20]/40 aria-[invalid=true]:border-[#ba1a1a]";

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
      <label htmlFor={id} className="text-xs font-semibold text-[#122e20]">
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
        className={`${FIELD} bg-[#fdfbf7] text-[#1b1c18]`}
      />
      <p id={`${id}-hint`} className={`text-[11px] ${tooLong(values[key]) ? "text-[#ba1a1a]" : "text-stone-500"}`}>
        {tooLong(values[key]) ? `Tối đa ${NAME_MAX} ký tự.` : hint}
      </p>
    </div>
  );

  return (
    <form
      onSubmit={submit}
      noValidate
      className="md:col-span-2 bg-white p-6 sm:p-8 rounded-3xl border border-[#e8ded0]/80 shadow-[0_4px_24px_rgba(28,25,23,0.04)] flex flex-col gap-5"
    >
      <div>
        <span className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest font-bold text-stone-500">
          Thông tin hiển thị
        </span>
        <h2 className="font-['Playfair_Display'] text-xl font-bold text-[#122e20] mt-1">Tên &amp; cửa hàng của bạn</h2>
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
        <label htmlFor={emailId} className="text-xs font-semibold text-[#122e20]">
          Email đăng nhập
        </label>
        <input id={emailId} value={user.email} readOnly className={`${FIELD} bg-stone-50 text-stone-600`} />
        <p className="text-[11px] text-stone-500">Email không đổi được ở đây.</p>
      </div>
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-1">
        {dirty && (
          <button
            type="button"
            onClick={() => setValues(baseline)}
            disabled={update.isPending}
            className="min-h-[44px] px-5 rounded-full bg-white border border-[#e8ded0] text-stone-700 hover:bg-stone-50 text-xs font-semibold transition-colors disabled:opacity-60"
          >
            Huỷ thay đổi
          </button>
        )}
        <button
          type="submit"
          disabled={!dirty || invalid}
          aria-disabled={update.isPending}
          className="min-h-[44px] px-6 rounded-full bg-[#122e20] enabled:hover:bg-[#1a382b] text-white text-xs font-bold shadow-md shadow-[#122e20]/20 flex items-center justify-center gap-2 transition-all enabled:active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed aria-disabled:cursor-wait"
        >
          {update.isPending ? "Đang lưu…" : "Lưu hồ sơ"}
        </button>
      </div>
    </form>
  );
}
