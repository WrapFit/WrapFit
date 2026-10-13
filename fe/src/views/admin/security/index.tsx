'use client';

/**
 * `/admin/security`: the sign-in rules of the API (be/src/auth/auth.constants.ts and the auth flows), read-only.
 * Changing them is a deployment, not a setting.
 */

import { ShieldCheck } from 'lucide-react';
import React from 'react';
import { AdminShell, Badge, DataTable, Panel, PanelTitle } from '@/components/workspace';
import { RequireAuth } from '@/features/auth';

export default function AdminSecurityPage() {
  return (
    <RequireAuth role="ADMIN">
      <Security />
    </RequireAuth>
  );
}

interface Policy {
  name: string;
  value: string;
  detail: string;
}

const POLICIES: Policy[] = [
  { name: 'Phiên đăng nhập', value: 'Cookie HttpOnly', detail: 'Access và refresh token chỉ nằm trong cookie, không bao giờ trong nội dung trả về.' },
  { name: 'Xoay vòng refresh token', value: '30 giây ân hạn', detail: 'Token cũ dùng lại trong 30 giây (tab khác cùng trình duyệt) được cấp phiên mới thay vì đăng xuất.' },
  { name: 'Đăng nhập sai', value: '10 lần / 15 phút', detail: 'Tính theo email, mọi IP; quá mức trả 429 LOGIN_RATE_LIMITED tới hết khung giờ.' },
  { name: 'Link xác minh email', value: '24 giờ', detail: 'Mỗi lần gửi lại, link cũ hết hiệu lực. Chưa xác minh thì chưa đăng nhập được (403).' },
  { name: 'Link đặt lại mật khẩu', value: '30 phút', detail: 'Đặt mật khẩu mới thu hồi mọi phiên đăng nhập của tài khoản.' },
  { name: 'Email tài khoản', value: '1 / phút, 5 / ngày', detail: 'Giới hạn cho gửi lại xác minh và quên mật khẩu, mỗi loại.' },
  { name: 'Mật khẩu', value: '8–72 ký tự', detail: 'Có ít nhất một chữ cái và một chữ số.' },
  { name: 'Đăng nhập Google', value: 'OAuth + state 10 phút', detail: 'Cookie state chống CSRF; chỉ nhận email Google đã xác minh.' },
  { name: 'Chuyển hướng sau đăng nhập', value: 'Cùng trang', detail: 'Chỉ nhận đường dẫn tương đối, chặn chuyển hướng mở ra trang ngoài.' },
  { name: 'Khoá tài khoản', value: 'Thu hồi phiên', detail: 'Quản trị viên khoá tài khoản thì mọi phiên của người đó kết thúc ngay.' },
];

function Security() {
  return (
    <AdminShell title="Bảo mật" description="Các quy tắc đăng nhập và link tài khoản mà API đang áp dụng.">
      <div className="flex flex-col gap-6">
        <Panel aria-labelledby="security-policies">
          <PanelTitle id="security-policies" action={<Badge tone="green">Theo API</Badge>}>
            Chính sách đăng nhập
          </PanelTitle>
          <DataTable<Policy>
            label="Chính sách đăng nhập"
            rows={POLICIES}
            rowKey={(policy) => policy.name}
            columns={[
              { key: 'name', label: 'Quy tắc', render: (policy) => <span className="font-medium">{policy.name}</span> },
              { key: 'value', label: 'Giá trị', render: (policy) => <Badge>{policy.value}</Badge> },
              { key: 'detail', label: 'Chi tiết', render: (policy) => <span className="text-library-sub">{policy.detail}</span> },
            ]}
          />
        </Panel>
        <p className="flex items-start gap-3 rounded-xl bg-library-panel p-4 text-sm leading-[1.6] text-library-sub">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-library-ink" aria-hidden />
          Xác thực hai bước chưa có ở API. Thời hạn access / refresh token đặt trong biến môi trường của máy chủ (JWT_ACCESS_TTL_SECONDS, JWT_REFRESH_TTL_SECONDS).
        </p>
      </div>
    </AdminShell>
  );
}
