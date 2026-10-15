'use client';

/**
 * `/dashboard/specs`: the production rules every WrapFit box follows, in the pacdora.com workspace style. Box structures
 * and their size limits come from `GET /templates/structures`; the FitCheck™ thresholds and the score from
 * `@wrapfit/shared` (the same validator runs in the editor and on the server).
 */

import { BLEED_MM, MAX_SHEET_MM, MIN_DPI, SAFE_MARGIN_MM } from '@wrapfit/shared';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import { primaryButton, createBoxButton } from '@/components/library';
import { Badge, HeroPanel, Panel, PanelTitle, WorkspaceError, WorkspaceShell } from '@/components/workspace';
import { ROUTES } from '@/constants';
import { RequireAuth } from '@/features/auth';
import { DielineSketch, useBoxStructures } from '@/features/templates';
import type { BoxStructure, DimensionRange } from '@/types/api';

export default function DashboardSpecsPage() {
  return (
    <RequireAuth>
      <SpecsScreen />
    </RequireAuth>
  );
}

const CATEGORY_LABELS: Record<string, string> = { folding: 'Hộp gấp', rigid: 'Hộp cứng' };

/** Layers of every dieline file, with the colours and strokes of the export. */
const LAYERS = [
  { name: 'Đường cắt (CutContour)', text: 'Viền dao bế bên ngoài.', stroke: '#E53E3E', dash: undefined },
  { name: 'Đường gấp (Crease)', text: 'Nơi giấy được cấn để gấp.', stroke: '#3182CE', dash: '4 4' },
  { name: `Tràn lề ≥ ${BLEED_MM} mm`, text: 'Nền in kéo ra ngoài đường cắt.', stroke: '#38A169', dash: '1 3' },
  { name: `Vùng an toàn ≥ ${SAFE_MARGIN_MM} mm`, text: 'Chữ, logo, mã vạch nằm trong vùng này.', stroke: '#D4AF37', dash: '6 3' },
] as const;

/** Rules of `checkBox`: severity and what it costs on the score. */
const RULES = [
  { title: 'Phần tử chạm đường cắt hoặc nếp gấp', text: `Cách mép dưới ${SAFE_MARGIN_MM} mm là cảnh báo, dưới 1 mm là lỗi.`, severity: 'error' as const },
  { title: 'Hình in lên mép dán', text: 'Mực trên mép dán làm keo không bám.', severity: 'error' as const },
  { title: 'Thiếu tràn lề', text: `Nền chưa phủ ra ngoài đường cắt ${BLEED_MM} mm.`, severity: 'warning' as const },
  { title: 'Ảnh độ phân giải thấp', text: `Ảnh dưới ${MIN_DPI} DPI ở kích thước in.`, severity: 'warning' as const },
  { title: 'Phôi lớn hơn khổ B1', text: `Phôi trải phẳng vượt ${MAX_SHEET_MM.long} × ${MAX_SHEET_MM.short} mm.`, severity: 'warning' as const },
  { title: 'Phần tử nằm ngoài mặt hộp', text: 'Phần tử không thuộc mặt nào của khuôn bế.', severity: 'warning' as const },
];

const range = (r: DimensionRange | undefined) => (r ? `${r.min}–${r.max}` : '–');

function SpecsScreen() {
  const structures = useBoxStructures();

  return (
    <WorkspaceShell
      title="Quy chuẩn hộp"
      description="Cấu trúc hộp, giới hạn kích thước và các quy tắc FitCheck™ mà mọi khuôn bế WrapFit phải đạt trước khi xuất file in."
      actions={
        <Link href={ROUTES.editorNew} className={createBoxButton}>
          Tạo hộp mới
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      }
    >
      <div className="flex flex-col gap-8">
        <section aria-labelledby="specs-structures">
          <PanelTitle id="specs-structures">Cấu trúc hộp được hỗ trợ</PanelTitle>
          {structures.isError ? (
            <WorkspaceError error={structures.error} title="Không tải được cấu trúc hộp" onRetry={() => void structures.refetch()} retrying={structures.isFetching} />
          ) : (
            <ul className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {(structures.data ?? []).map((structure) => (
                <li key={structure.id}>
                  <StructureCard structure={structure} />
                </li>
              ))}
              {structures.isPending &&
                [0, 1, 2, 3].map((index) => <li key={index} aria-hidden className="h-[260px] animate-pulse rounded-2xl bg-library-tile motion-reduce:animate-none" />)}
            </ul>
          )}
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Panel aria-labelledby="specs-layers">
            <PanelTitle id="specs-layers">Lớp của file khuôn bế</PanelTitle>
            <ul className="divide-y divide-library-line border-t border-library-line">
              {LAYERS.map((layer) => (
                <li key={layer.name} className="flex items-center gap-4 py-3">
                  <svg viewBox="0 0 48 12" className="h-3 w-12 shrink-0" aria-hidden>
                    <line x1="0" y1="6" x2="48" y2="6" stroke={layer.stroke} strokeWidth="2" strokeDasharray={layer.dash} strokeLinecap="round" />
                  </svg>
                  <span className="min-w-0">
                    <span className="block text-body font-medium text-library-ink">{layer.name}</span>
                    <span className="block text-sm text-library-sub">{layer.text}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm leading-[1.6] text-library-sub">
              File in xuất ra PDF CMYK 300 DPI nhiều lớp (CutContour, Crease, Artwork, Dimensions), SVG hoặc DXF cho máy cắt.
            </p>
          </Panel>

          <Panel aria-labelledby="specs-rules">
            <PanelTitle id="specs-rules" action={<Badge tone="lime">FitCheck™</Badge>}>
              Quy tắc kiểm tra
            </PanelTitle>
            <ul className="divide-y divide-library-line border-t border-library-line">
              {RULES.map((rule) => (
                <li key={rule.title} className="flex items-start justify-between gap-4 py-3">
                  <span className="min-w-0">
                    <span className="block text-body font-medium text-library-ink">{rule.title}</span>
                    <span className="block text-sm text-library-sub">{rule.text}</span>
                  </span>
                  {rule.severity === 'error' ? <Badge tone="red">Lỗi −30</Badge> : <Badge tone="amber">Cảnh báo −10</Badge>}
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <HeroPanel>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div>
              <h2 className="text-2xl font-medium text-library-ink">Điểm FitCheck™ = 100 − 30 × lỗi − 10 × cảnh báo</h2>
              <p className="mt-2 text-base leading-[1.6] text-library-sub">
                Studio chấm điểm ngay khi bạn sửa, máy chủ chấm lại khi lưu. Còn lỗi thì chưa xuất được file in; cảnh báo vẫn xuất được nhưng nên sửa trước khi
                gửi xưởng.
              </p>
            </div>
            <dl className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Đạt', value: '90–100', className: 'bg-fpt-orange-light text-fpt-orange-ink' },
                { label: 'Cần xem', value: '70–89', className: 'bg-warning-bg text-warning-fg' },
                { label: 'Chưa đạt', value: '< 70', className: 'bg-danger-bg text-danger-fg' },
              ].map((band) => (
                <div key={band.label} className={`rounded-xl px-4 py-3 ${band.className}`}>
                  <dt className="text-xs">{band.label}</dt>
                  <dd className="font-mono text-lg font-medium">{band.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </HeroPanel>
      </div>
    </WorkspaceShell>
  );
}

function StructureCard({ structure }: { structure: BoxStructure }) {
  const limits = structure.dimensionLimits;
  return (
    <article className="flex h-full flex-col gap-4 rounded-2xl border border-library-line bg-white p-5 sm:flex-row">
      <div className="flex aspect-[4/3] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-library-ink bg-library-tile p-3 sm:w-44">
        <DielineSketch structure={structure.id} dimensions={{ length: 80, width: 55, height: 60, paperThickness: 0.42 }} className="h-full w-full" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-medium text-library-ink">{structure.name}</h3>
          <Badge>{CATEGORY_LABELS[structure.category] ?? structure.category}</Badge>
        </div>
        {structure.description && <p className="mt-1 text-sm leading-[1.6] text-library-sub">{structure.description}</p>}
        <dl className="mt-3 grid grid-cols-4 gap-1.5 text-center">
          {[
            { key: 'L', value: range(limits.length) },
            { key: 'W', value: range(limits.width) },
            { key: 'H', value: range(limits.height) },
            { key: 't', value: range(limits.paperThickness) },
          ].map((item) => (
            <div key={item.key} className="rounded-lg bg-library-panel px-1 py-1.5">
              <dt className="font-mono text-xs text-library-muted">{item.key}</dt>
              <dd className="font-mono text-xs text-library-ink">{item.value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-3 flex items-center justify-between gap-2">
          <Link href={`/structures/${structure.id}`} className="text-sm font-medium text-library-ink hover:underline">
            Chi tiết khuôn bế
          </Link>
          <Link href={`${ROUTES.templates}?structure=${structure.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-fpt-orange-ink hover:underline">
            Xem mẫu
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}
