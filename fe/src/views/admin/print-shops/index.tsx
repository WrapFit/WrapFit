'use client';

/** `/admin/print-shops`: partner print shops. No partner API yet: example rows (SampleScreen). */

import React from 'react';
import { Badge } from '@/components/workspace';
import { SampleScreen } from '@/views/admin/shared/SampleScreen';

interface PrintShop {
  name: string;
  city: string;
  sheet: string;
  services: string;
  leadTime: string;
  state: 'active' | 'review' | 'paused';
}

const SHOPS: PrintShop[] = [
  { name: 'In Bao Bì Sài Gòn Xanh', city: 'TP. Hồ Chí Minh', sheet: 'B1 · 1020 × 720', services: 'Offset 4 màu, bế, ép kim', leadTime: '5–7 ngày', state: 'active' },
  { name: 'Hộp Giấy Hà Thành', city: 'Hà Nội', sheet: 'B1 · 1020 × 720', services: 'Hộp cứng, bồi carton', leadTime: '7–10 ngày', state: 'active' },
  { name: 'Kraft Đà Nẵng', city: 'Đà Nẵng', sheet: 'B2 · 720 × 520', services: 'In kỹ thuật số, bế', leadTime: '3–5 ngày', state: 'review' },
  { name: 'Xưởng In Mộc Cần Thơ', city: 'Cần Thơ', sheet: 'B2 · 720 × 520', services: 'In offset, cán màng', leadTime: '6–8 ngày', state: 'paused' },
];

const STATE = {
  active: { tone: 'green', label: 'Đang hợp tác' },
  review: { tone: 'amber', label: 'Đang thẩm định' },
  paused: { tone: 'grey', label: 'Tạm dừng' },
} as const;

export default function AdminPrintShopsPage() {
  return (
    <SampleScreen<PrintShop>
      title="Xưởng in"
      description="Xưởng in đối tác nhận file PDF CMYK từ WrapFit: khổ máy, gia công và thời gian giao."
      note="Đặt in qua xưởng đối tác chưa có API; tài khoản vai trò Xưởng in quản lý ở mục Tài khoản. Danh sách dưới đây là ví dụ."
      stats={[
        { label: 'Xưởng đối tác', value: '4' },
        { label: 'Đang hợp tác', value: '2' },
        { label: 'Khổ lớn nhất', value: 'B1' },
        { label: 'Giao nhanh nhất', value: '3 ngày' },
      ]}
      tableTitle="Danh sách xưởng"
      rows={SHOPS}
      rowKey={(shop) => shop.name}
      columns={[
        { key: 'name', label: 'Xưởng', render: (shop) => <span className="font-medium">{shop.name}</span> },
        { key: 'city', label: 'Thành phố', render: (shop) => shop.city },
        { key: 'sheet', label: 'Khổ máy (mm)', render: (shop) => <span className="font-mono text-xs">{shop.sheet}</span> },
        { key: 'services', label: 'Gia công', render: (shop) => <span className="text-library-sub">{shop.services}</span> },
        { key: 'lead', label: 'Thời gian', render: (shop) => shop.leadTime },
        { key: 'state', label: 'Trạng thái', align: 'right', render: (shop) => <Badge tone={STATE[shop.state].tone}>{STATE[shop.state].label}</Badge> },
      ]}
    />
  );
}
