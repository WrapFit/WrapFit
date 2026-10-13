'use client';

/**
 * `/dashboard/materials`: the paper stocks of the editor in the pacdora.com workspace style. The stocks and their
 * thickness come from the editor (`PAPER_STOCKS`, t = GSM × 0.0014 mm of `@wrapfit/shared`); the accepted range is the
 * one the API validates (`materialSpec`: ivory | kraft | duplex, 100–1000 GSM, matte | glossy | raw).
 */

import { ArrowRight, Info } from 'lucide-react';
import Link from 'next/link';
import React, { useState } from 'react';
import { primaryButton } from '@/components/library';
import { Badge, Panel, PanelTitle, SegmentedControl, WorkspaceShell } from '@/components/workspace';
import { ROUTES } from '@/constants';
import { RequireAuth } from '@/features/auth';
import { MATERIAL_FINISH_LABELS, MATERIAL_TYPE_LABELS, PAPER_STOCKS, type PaperStock } from '@/features/studio/utils/paperStocks';
import { BoxPreview } from '@/features/templates';
import { cn } from '@/utils/helpers';

export default function DashboardMaterialsPage() {
  return (
    <RequireAuth>
      <MaterialsScreen />
    </RequireAuth>
  );
}

type Filter = 'all' | PaperStock['spec']['type'];
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'ivory', label: 'Ivory' },
  { value: 'kraft', label: 'Kraft' },
  { value: 'duplex', label: 'Duplex' },
];

/** Sample box the stocks are shown on. */
const SAMPLE = { length: 90, width: 60, height: 50 };

function MaterialsScreen() {
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedTheme, setSelectedTheme] = useState(PAPER_STOCKS[0].theme);
  const stocks = PAPER_STOCKS.filter((paper) => filter === 'all' || paper.spec.type === filter);
  const selected = PAPER_STOCKS.find((paper) => paper.theme === selectedTheme) ?? PAPER_STOCKS[0];

  return (
    <WorkspaceShell
      title="Vật liệu"
      description="Các loại giấy in được trong studio: định lượng, độ dày và bề mặt quyết định khuôn bế của hộp."
      actions={
        <Link href={ROUTES.editorNew} className={primaryButton}>
          Tạo hộp mới
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      }
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="flex flex-col gap-5 xl:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SegmentedControl<Filter> label="Loại giấy" value={filter} onChange={setFilter} options={FILTERS} />
            <span className="text-sm text-library-muted">{stocks.length} loại giấy</span>
          </div>
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {stocks.map((paper) => {
              const active = paper.theme === selected.theme;
              return (
                <li key={paper.theme}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedTheme(paper.theme)}
                    className="group block w-full text-left outline-none"
                  >
                    <span
                      className={cn(
                        'relative block aspect-[321/201] overflow-hidden rounded-2xl border bg-library-tile transition-shadow',
                        active ? 'border-[1.5px] border-library-ink shadow-hard-sm' : 'border-library-ink group-hover:shadow-hard-sm group-focus-visible:shadow-hard-sm',
                      )}
                    >
                      <span className="absolute inset-0 grid grid-cols-2">
                        <span className="flex items-center justify-center p-5 pr-2">
                          <PaperSheet paper={paper} />
                        </span>
                        <span className="flex items-center justify-center p-4 pl-1">
                          <BoxPreview structure="tuck-top" dimensions={{ ...SAMPLE, paperThickness: paper.spec.caliper }} material={paper.spec.type} color={paper.swatch.outside} className="h-full w-full" />
                        </span>
                      </span>
                      <span className="absolute right-3 top-3 rounded-md bg-white px-1.5 py-1 text-xs text-library-sub">{paper.finishLabel}</span>
                      <span className="absolute bottom-3 left-3 rounded-md bg-white px-1.5 py-1 font-mono text-[11px] text-library-sub">t = {paper.spec.caliper.toFixed(2)} mm</span>
                    </span>
                    <span className="mt-3 block text-base font-medium text-library-ink">{paper.name}</span>
                    <span className="block text-sm text-library-muted">{paper.bestFor}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="xl:col-span-5">
          <div className="flex flex-col gap-5 xl:sticky xl:top-24">
            <Panel aria-labelledby="material-detail">
              <PanelTitle id="material-detail" action={<Badge tone="lime">{MATERIAL_TYPE_LABELS[selected.spec.type]}</Badge>}>
                {selected.name}
              </PanelTitle>
              <div className="flex aspect-[16/10] items-center justify-center rounded-xl bg-library-tile p-6">
                <BoxPreview
                  structure="tuck-top"
                  dimensions={{ ...SAMPLE, paperThickness: selected.spec.caliper }}
                  material={selected.spec.type}
                  color={selected.swatch.outside}
                  label={`Hộp nắp gài bằng giấy ${selected.name}`}
                  className="h-full w-full"
                />
              </div>
              <p className="mt-4 text-sm leading-[1.6] text-library-sub">{selected.description}</p>
              <dl className="mt-4 divide-y divide-library-line border-y border-library-line text-sm">
                <SpecRow label="Loại giấy">{MATERIAL_TYPE_LABELS[selected.spec.type]}</SpecRow>
                <SpecRow label="Định lượng">{selected.spec.gsm} GSM</SpecRow>
                <SpecRow label="Độ dày t">
                  <span className="font-mono">
                    {selected.spec.gsm} × 0,0014 = {selected.spec.caliper.toFixed(2)} mm
                  </span>
                </SpecRow>
                <SpecRow label="Bề mặt">
                  {selected.finishLabel} ({MATERIAL_FINISH_LABELS[selected.spec.finish].toLowerCase()})
                </SpecRow>
                <SpecRow label="Màu mặt in / mặt trong">
                  <span className="inline-flex items-center gap-1.5">
                    <Chip color={selected.swatch.outside} />
                    <Chip color={selected.swatch.inside} />
                  </span>
                </SpecRow>
                <SpecRow label="Hợp với">{selected.bestFor}</SpecRow>
              </dl>
            </Panel>

            <Panel aria-labelledby="material-rules">
              <PanelTitle id="material-rules">Độ dày giấy và khuôn bế</PanelTitle>
              <p className="flex items-start gap-3 text-sm leading-[1.6] text-library-sub">
                <Info className="mt-0.5 size-4 shrink-0 text-library-ink" aria-hidden />
                Mỗi nếp gấp được cộng bù theo độ dày giấy t, nên đổi giấy là đổi kích thước khuôn bế. Studio nhận giấy Ivory, Kraft và Duplex từ 100 đến
                1000 GSM với bề mặt mờ, bóng hoặc mộc.
              </p>
            </Panel>
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
}

function SpecRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-library-muted">{label}</dt>
      <dd className="min-w-0 text-right text-library-ink">{children}</dd>
    </div>
  );
}

function Chip({ color }: { color: string }) {
  return <span title={color} className="size-5 rounded border border-black/15" style={{ backgroundColor: color }} />;
}

/** A flat sheet of the stock with a corner turned up to show its inside. */
function PaperSheet({ paper }: { paper: PaperStock }) {
  return (
    <svg viewBox="0 0 120 90" className="h-full w-full" aria-hidden>
      <path d="M10 8 H110 V62 L84 82 H10 Z" fill={paper.swatch.outside} stroke="#191919" strokeOpacity="0.25" />
      <path d="M110 62 L84 82 L88 60 Z" fill={paper.swatch.inside} stroke="#191919" strokeOpacity="0.25" />
      <path d="M10 8 H110" stroke="#E53E3E" strokeWidth="1" />
      <path d="M40 8 V82 M80 8 V70" stroke="#3182CE" strokeWidth="0.8" strokeDasharray="3 3" />
    </svg>
  );
}
