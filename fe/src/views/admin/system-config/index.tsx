'use client';

/**
 * `/admin/system-config`: production rules shared by the studio and the API (`@wrapfit/shared`): FitCheck™
 * thresholds, dieline formulas, paper thickness and export formats. Read-only: they change with a release.
 */

import { BLEED_MM, CALIPER_MM_PER_GSM, CURRENT_FORMULA_VERSION, HARD_MIN_DPI, MAX_SHEET_MM, MIN_DPI, MIN_LINE_MM, SAFE_MARGIN_CREASE_MM, SAFE_MARGIN_CUT_MM } from '@wrapfit/shared';
import React from 'react';
import { AdminShell, Badge, DataTable, Panel, PanelTitle } from '@/components/workspace';
import { RequireAuth } from '@/features/auth';

export default function AdminSystemConfigPage() {
  return (
    <RequireAuth role="ADMIN">
      <SystemConfig />
    </RequireAuth>
  );
}

interface Setting {
  key: string;
  name: string;
  value: string;
  detail: string;
}

const PRODUCTION: Setting[] = [
  { key: 'SAFE_MARGIN_CUT_MM', name: 'Vùng an toàn (nét cắt)', value: `${SAFE_MARGIN_CUT_MM} mm`, detail: 'Chữ, logo, mã vạch cách đường cắt ít nhất chừng này.' },
  { key: 'SAFE_MARGIN_CREASE_MM', name: 'Vùng an toàn (nếp gấp)', value: `${SAFE_MARGIN_CREASE_MM} mm`, detail: 'Chữ, logo, mã vạch cách nếp gấp ít nhất chừng này.' },
  { key: 'BLEED_MM', name: 'Tràn lề', value: `${BLEED_MM} mm`, detail: 'Nền in kéo ra ngoài đường cắt.' },
  { key: 'MIN_DPI', name: 'Độ phân giải ảnh', value: `${MIN_DPI} DPI`, detail: `Ảnh thấp hơn ở kích thước in là cảnh báo, dưới ${HARD_MIN_DPI} DPI là lỗi.` },
  { key: 'MIN_LINE_MM', name: 'Độ dày nét tối thiểu', value: `${MIN_LINE_MM} mm`, detail: 'Nét mảnh hơn mực khó bám, bị đứt khi in.' },
  { key: 'MAX_SHEET_MM', name: 'Khổ phôi tối đa', value: `${MAX_SHEET_MM.long} × ${MAX_SHEET_MM.short} mm`, detail: 'Khổ B1 của phần lớn xưởng in.' },
  { key: 'CALIPER_MM_PER_GSM', name: 'Độ dày giấy', value: `GSM × ${CALIPER_MM_PER_GSM}`, detail: 'Độ dày t tính từ định lượng, 300 GSM → 0,42 mm.' },
  { key: 'CURRENT_FORMULA_VERSION', name: 'Công thức khuôn bế', value: `v${CURRENT_FORMULA_VERSION}`, detail: 'Dự án cũ được đề nghị nâng cấp, kèm mốc phiên bản để hoàn tác.' },
];

const EXPORTS: Setting[] = [
  { key: 'PDF_CMYK', name: 'PDF CMYK', value: '300 DPI', detail: 'Các lớp CutContour, Crease, Artwork, Dimensions cho nhà in.' },
  { key: 'SVG', name: 'SVG', value: 'Vector', detail: 'Chỉnh sửa tiếp trong phần mềm thiết kế.' },
  { key: 'DXF', name: 'DXF', value: 'Vector', detail: 'Cho máy cắt và máy bế.' },
];

const columns = [
  { key: 'name', label: 'Thiết lập', render: (row: Setting) => <span className="font-medium">{row.name}</span> },
  { key: 'key', label: 'Khoá', render: (row: Setting) => <span className="font-mono text-xs text-library-muted">{row.key}</span> },
  { key: 'value', label: 'Giá trị', render: (row: Setting) => <Badge tone="lime">{row.value}</Badge> },
  { key: 'detail', label: 'Ý nghĩa', render: (row: Setting) => <span className="text-library-sub">{row.detail}</span> },
];

function SystemConfig() {
  return (
    <AdminShell title="Cấu hình" description="Quy tắc sản xuất dùng chung cho studio và API. Chỉ đổi được qua một bản phát hành mới.">
      <div className="flex flex-col gap-6">
        <Panel aria-labelledby="config-production">
          <PanelTitle id="config-production" action={<Badge tone="green">@wrapfit/shared</Badge>}>
            FitCheck™ và khuôn bế
          </PanelTitle>
          <DataTable<Setting> label="FitCheck và khuôn bế" rows={PRODUCTION} rowKey={(row) => row.key} columns={columns} />
          <p className="mt-4 text-sm text-library-sub">Điểm FitCheck™ = 100 − 30 × lỗi − 10 × cảnh báo. Còn lỗi thì API từ chối xuất file in (422).</p>
        </Panel>
        <Panel aria-labelledby="config-exports">
          <PanelTitle id="config-exports">Định dạng xuất file</PanelTitle>
          <DataTable<Setting> label="Định dạng xuất file" rows={EXPORTS} rowKey={(row) => row.key} columns={columns} />
          <p className="mt-4 text-sm text-library-sub">Link tải có hạn 15 phút; tối đa 10 yêu cầu xuất mỗi phút cho mỗi người dùng.</p>
        </Panel>
      </div>
    </AdminShell>
  );
}
