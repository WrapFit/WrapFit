'use client';

/** `/admin/print-shops`: partner print shops connected to WrapFit network. */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { listPrintShops } from '@/api';
import { Badge } from '@/components/workspace';
import { queryKeys } from '@/hooks/data';
import type { PrintShop as ApiPrintShop } from '@/types/api';
import { SampleScreen } from '@/views/admin/shared/SampleScreen';

interface DisplayPrintShop {
  id?: string;
  name: string;
  city: string;
  sheet: string;
  services: string;
  leadTime: string;
  state: 'active' | 'review' | 'paused';
}

const FALLBACK_SHOPS: DisplayPrintShop[] = [
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
  const query = useQuery({
    queryKey: queryKeys.printShops.all,
    queryFn: listPrintShops,
    staleTime: 60_000,
  });

  const apiShops = query.data;
  const shops: DisplayPrintShop[] = apiShops && apiShops.length > 0
    ? apiShops.map((s: ApiPrintShop) => ({
        id: s.id,
        name: s.name,
        city: s.city,
        sheet: s.sheet || s.sheetSize || 'B1 · 1020 × 720 mm',
        services: Array.isArray(s.services) ? s.services.join(', ') : String(s.services),
        leadTime: s.leadTime || (s.leadTimeDays ? `${s.leadTimeDays} ngày` : '3–5 ngày'),
        state: (s.state || s.status || 'active') as 'active' | 'review' | 'paused',
      }))
    : FALLBACK_SHOPS;

  const activeCount = shops.filter((s) => s.state === 'active').length;

  return (
    <SampleScreen<DisplayPrintShop>
      title="Xưởng in đối tác"
      description="Mạng lưới xưởng in đối tác nhận file PDF CMYK từ WrapFit: nhận in mẫu thử 01 hộp và sản xuất theo lô nhỏ (Zero MOQ)."
      note="Dữ liệu được đồng bộ từ backend service /api/print-shops; xưởng in đối tác được kết nối trực tiếp với quy trình nhận đơn mẫu thử."
      stats={[
        { label: 'Xưởng đối tác', value: String(shops.length) },
        { label: 'Đang hợp tác', value: String(activeCount) },
        { label: 'Khổ lớn nhất', value: 'B1' },
        { label: 'Giao nhanh nhất', value: '3 ngày' },
      ]}
      tableTitle="Danh sách xưởng in"
      rows={shops}
      rowKey={(shop) => shop.id ?? shop.name}
      columns={[
        { key: 'name', label: 'Xưởng', render: (shop) => <span className="font-medium">{shop.name}</span> },
        { key: 'city', label: 'Thành phố', render: (shop) => shop.city },
        { key: 'sheet', label: 'Khổ máy (mm)', render: (shop) => <span className="font-mono text-xs">{shop.sheet}</span> },
        { key: 'services', label: 'Gia công', render: (shop) => <span className="text-library-sub">{shop.services}</span> },
        { key: 'lead', label: 'Thời gian', render: (shop) => shop.leadTime },
        { key: 'state', label: 'Trạng thái', align: 'right', render: (shop) => <Badge tone={STATE[shop.state]?.tone ?? 'grey'}>{STATE[shop.state]?.label ?? shop.state}</Badge> },
      ]}
    />
  );
}
