'use client';

/**
 * `/team`: people and print shops working on the user's boxes, in the workspace style. The API has no teams yet:
 * the members below are examples (marked), the roles reflect what WrapFit accounts can be (ROLE_LABELS).
 */

import { Info, UserPlus } from 'lucide-react';
import React from 'react';
import { outlineButton } from '@/components/library';
import { Badge, DataTable, Panel, PanelTitle, SampleBadge, StatTile, WorkspaceShell } from '@/components/workspace';
import { RequireAuth } from '@/features/auth';
import { cn } from '@/utils/helpers';

export default function TeamPage() {
  return (
    <RequireAuth>
      <Team />
    </RequireAuth>
  );
}

interface Member {
  name: string;
  kind: 'owner' | 'designer' | 'print-shop' | 'reviewer';
  access: string;
  scope: string;
  lastActive: string;
}

const MEMBERS: Member[] = [
  { name: 'Bạn', kind: 'owner', access: 'Toàn quyền', scope: 'Mọi dự án, bộ nhận diện, gói dịch vụ', lastActive: 'Đang hoạt động' },
  { name: 'Studio Minh & Co.', kind: 'designer', access: 'Sửa thiết kế', scope: 'Hình in, hoa văn, chữ trên khuôn bế', lastActive: '2 giờ trước' },
  { name: 'In Bao Bì Sài Gòn Xanh', kind: 'print-shop', access: 'Tải file in', scope: 'PDF CMYK, DXF của dự án đã đạt FitCheck™', lastActive: 'Hôm qua' },
  { name: 'An Nguyễn', kind: 'reviewer', access: 'Xem & góp ý', scope: 'Xem 3D, bình luận trước khi in', lastActive: '3 ngày trước' },
];

const KIND = {
  owner: { label: 'Chủ sở hữu', tone: 'lime' },
  designer: { label: 'Thiết kế', tone: 'green' },
  'print-shop': { label: 'Xưởng in', tone: 'amber' },
  reviewer: { label: 'Duyệt mẫu', tone: 'grey' },
} as const;

const ACCESS = [
  { name: 'Toàn quyền', text: 'Tạo, sửa, xoá dự án; quản lý bộ nhận diện và gói dịch vụ.' },
  { name: 'Sửa thiết kế', text: 'Chỉnh hình in trên khuôn bế; không đổi kích thước hay xuất file.' },
  { name: 'Tải file in', text: 'Chỉ tải file in của dự án đạt FitCheck™, dành cho xưởng in.' },
  { name: 'Xem & góp ý', text: 'Xem khuôn bế, hộp 3D và để lại góp ý.' },
];

function Team() {
  return (
    <WorkspaceShell
      title="Đội ngũ & xưởng in"
      description="Mời người cùng thiết kế và xưởng in nhận file trực tiếp từ dự án của bạn."
      actions={
        <>
          <SampleBadge />
          <button type="button" disabled title="Chưa có API mời thành viên" className={cn(outlineButton, 'disabled:cursor-not-allowed')}>
            <UserPlus className="size-4" aria-hidden />
            Mời thành viên
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <p className="flex items-start gap-3 rounded-xl border border-dashed border-warning/30 bg-warning-bg/60 p-4 text-sm leading-[1.6] text-warning-fg">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          Làm việc nhóm chưa có ở API: mỗi tài khoản WrapFit hiện chỉ thấy dự án của chính mình. Danh sách dưới đây là ví dụ cho cách chia quyền sắp tới.
        </p>

        <section aria-label="Số liệu mẫu" className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label="Thành viên" value="4" />
          <StatTile label="Xưởng in" value="1" />
          <StatTile label="Dự án chia sẻ" value="6" />
          <StatTile label="Lời mời đang chờ" value="0" />
        </section>

        <Panel aria-labelledby="team-members">
          <PanelTitle id="team-members">Thành viên</PanelTitle>
          <DataTable<Member>
            label="Thành viên"
            rows={MEMBERS}
            rowKey={(member) => member.name}
            columns={[
              {
                key: 'name',
                label: 'Tên',
                render: (member) => (
                  <span className="flex items-center gap-3">
                    <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full border border-library-ink bg-library-tile text-sm font-medium">
                      {member.name.charAt(0)}
                    </span>
                    <span className="font-medium">{member.name}</span>
                  </span>
                ),
              },
              { key: 'kind', label: 'Vai trò', render: (member) => <Badge tone={KIND[member.kind].tone}>{KIND[member.kind].label}</Badge> },
              { key: 'access', label: 'Quyền', render: (member) => member.access },
              { key: 'scope', label: 'Phạm vi', render: (member) => <span className="text-library-sub">{member.scope}</span> },
              { key: 'last', label: 'Hoạt động', align: 'right', render: (member) => <span className="whitespace-nowrap text-library-sub">{member.lastActive}</span> },
            ]}
          />
        </Panel>

        <Panel aria-labelledby="team-access">
          <PanelTitle id="team-access">Các mức quyền</PanelTitle>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {ACCESS.map((item) => (
              <li key={item.name} className="rounded-xl bg-library-panel p-4">
                <p className="text-base font-medium text-library-ink">{item.name}</p>
                <p className="mt-1 text-sm leading-[1.6] text-library-sub">{item.text}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </WorkspaceShell>
  );
}
