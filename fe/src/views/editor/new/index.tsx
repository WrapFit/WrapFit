"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Info, LayoutTemplate } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useMemo, useState } from "react";
import type { BoxDimensions, BoxStructureType, FitCheckReport } from "@wrapfit/shared";
import { createProject, getTemplate, listBoxStructures } from "@/api";
import { landingFontVariables } from "@/assets/fonts/landing";
import { PageLoader } from "@/components/common/StatusViews";
import { useToast } from "@/components/common/Toast";
import { MainHeader } from "@/components/layout";
import { primaryButton } from "@/components/library";
import { Badge, SegmentedControl, WorkspaceError } from "@/components/workspace";
import { ROUTES } from "@/constants";
import { RequireAuth } from "@/features/auth";
import { BoxStage3D } from "@/features/showcase";
import { MmInput } from "@/features/studio/components/MmInput";
import type { BoxMaterialTheme } from "@/features/studio/components/three/InteractiveFoldingBox3D";
import { BOX_STRUCTURES, GIFT_PRESETS } from "@/features/studio/utils/boxStructures";
import { checkDesign, clampDimension, dielinePiecesOf, dimensionErrors, type DimensionField } from "@/features/studio/utils/dieline";
import { PAPER_STOCKS } from "@/features/studio/utils/paperStocks";
import { materialSpecFor, materialThemeOf } from "@/features/studio/utils/projectMaterial";
import { DielineSketch } from "@/features/templates";
import { queryKeys } from "@/hooks/data";
import type { BoxStructure, DimensionLimits, TemplateDetail } from "@/types/api";
import { cn } from "@/utils/helpers";

// `/editor/new` in the style of the pacdora.com dieline generator, in WrapFit greens: a large stage with the flat
// dieline or the folded 3D box on the left, the size, structure and paper on the right. Data: `GET
// /templates/structures` (names, size limits), `GET /templates/:id` for `?template=`, then `POST /projects`.

const EMPTY_REPORT: FitCheckReport = { isValidForProduction: true, score: 100, violations: [], auditedAt: "" };

/** Slider ranges when the structure has no limits. */
const DEFAULT_RANGES: Record<DimensionField, { min: number; max: number }> = {
  length: { min: 20, max: 400 },
  width: { min: 20, max: 300 },
  height: { min: 15, max: 300 },
  paperThickness: { min: 0.3, max: 0.6 },
};

const SIDES = [
  { field: "length", label: "Dài (L)" },
  { field: "width", label: "Rộng (W)" },
  { field: "height", label: "Cao (H)" },
] as const;

function defaultDimensionsOf(structure: BoxStructureType): BoxDimensions {
  return { ...(BOX_STRUCTURES.find((s) => s.id === structure)?.defaultDims ?? BOX_STRUCTURES[0].defaultDims) };
}

export default function NewProjectPage() {
  return (
    <RequireAuth>
      <NewProject />
    </RequireAuth>
  );
}

function NewProject() {
  const templateId = useSearchParams().get("template");
  const structures = useQuery({ queryKey: queryKeys.templates.structures, queryFn: listBoxStructures, staleTime: 5 * 60_000 });
  const template = useQuery({
    queryKey: queryKeys.templates.detail(templateId ?? ""),
    queryFn: () => getTemplate(templateId!),
    enabled: !!templateId,
  });

  const failed = structures.error ?? template.error;
  if (failed) {
    return (
      <Page>
        <WorkspaceError
          error={failed}
          title={template.error ? "Không mở được mẫu thiết kế" : "Không tải được danh sách cấu trúc hộp"}
          onRetry={() => {
            if (structures.error) void structures.refetch();
            if (template.error) void template.refetch();
          }}
          retrying={structures.isFetching || template.isFetching}
        />
        {template.error && (
          <p className="mt-4 text-center">
            <Link href={ROUTES.editorNew} className="text-sm font-medium text-library-accent hover:underline">
              Tự chọn cấu trúc hộp
            </Link>
          </p>
        )}
      </Page>
    );
  }
  if (!structures.data || (templateId && !template.data)) return <PageLoader label="Đang chuẩn bị khuôn bế…" />;

  return <NewBoxDesigner key={templateId ?? "blank"} structures={structures.data} template={template.data ?? null} />;
}

/** Site header and the white page of the workspace. */
function Page({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MainHeader />
      <div className={`${landingFontVariables} min-h-screen bg-white pt-16 font-landing-heading text-library-text`}>
        <div className="mx-auto w-full max-w-[1440px] px-4 pb-28 pt-6 sm:px-6 md:pb-16 lg:px-10">{children}</div>
      </div>
    </>
  );
}

function NewBoxDesigner({ structures, template }: { structures: BoxStructure[]; template: TemplateDetail | null }) {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [structure, setStructure] = useState<BoxStructureType>(
    () => template?.structure.id ?? (structures.find((s) => s.id === "tuck-top") ?? structures[0])?.id ?? "tuck-top",
  );
  const [dimensions, setDimensions] = useState<BoxDimensions>(() => (template ? { ...template.dimensions } : defaultDimensionsOf(structure)));
  const [material, setMaterial] = useState<BoxMaterialTheme>(() => (template ? materialThemeOf(template.canvasState.materialTheme, template.materialSpec) : "ivory"));
  const [view, setView] = useState<"2d" | "3d">("2d");
  const [fold, setFold] = useState(100);

  const current = structures.find((s) => s.id === structure);
  const presentation = BOX_STRUCTURES.find((s) => s.id === structure);
  const limits: DimensionLimits | undefined = current?.dimensionLimits ?? template?.dimensionLimits;
  const elements = useMemo(() => template?.canvasState.elements ?? [], [template]);
  const pieces = useMemo(() => {
    try {
      return dielinePiecesOf(structure, dimensions);
    } catch {
      return [];
    }
  }, [structure, dimensions]);
  const report = useMemo(() => (pieces.length ? checkDesign(pieces, elements) : EMPTY_REPORT), [pieces, elements]);
  const errors = dimensionErrors(dimensions, limits, structure);
  const materialSpec = materialSpecFor(material, dimensions.paperThickness);
  const canvasState = useMemo(
    () => ({ elements, backgroundPattern: template?.canvasState.backgroundPattern ?? null, materialTheme: material }),
    [elements, template, material],
  );

  const range = (field: DimensionField) => {
    const own = limits?.[field];
    if (!own) return DEFAULT_RANGES[field];
    // The paper slider keeps its fine range inside the allowed one.
    if (field === "paperThickness") {
      return {
        min: Math.max(own.min, Math.min(DEFAULT_RANGES.paperThickness.min, own.max)),
        max: Math.min(own.max, Math.max(DEFAULT_RANGES.paperThickness.max, own.min)),
      };
    }
    return own;
  };
  const setSide = (field: "length" | "width" | "height", value: number) => {
    const { min, max } = range(field);
    setDimensions((dims) => ({ ...dims, [field]: Math.max(min, Math.min(max, Math.round(value))) }));
  };
  const setThickness = (value: number) => setDimensions((dims) => ({ ...dims, paperThickness: clampDimension(limits, "paperThickness", Number(value.toFixed(2))) }));

  const selectStructure = (id: BoxStructureType) => {
    if (id === structure) return;
    setStructure(id);
    setDimensions(defaultDimensionsOf(id));
  };

  const create = useMutation({
    mutationFn: () =>
      createProject({
        templateId: structure,
        title: template?.title ?? `${current?.name ?? "Hộp quà"} ${dimensions.length}×${dimensions.width}×${dimensions.height}`,
        dimensions,
        materialSpec,
        canvasState: template ? { ...template.canvasState, materialTheme: material } : { elements: [], backgroundPattern: null, materialTheme: material },
        designTemplateId: template?.id,
      }),
    onSuccess: (project) => {
      queryClient.setQueryData(queryKeys.projects.detail(project.id), project);
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      router.replace(ROUTES.editor(project.id));
    },
    onError: (err) => toast.error(err, "Chưa tạo được dự án"),
  });
  const busy = create.isPending || create.isSuccess;

  const sheets = pieces.map(({ name, geometry: { totalBoundingBox: b } }) => ({ name, width: Math.round(b.width), height: Math.round(b.height) }));
  const presetFits = (dims: BoxDimensions) => dimensionErrors(dims, limits, structure).length === 0;
  const presetId = GIFT_PRESETS.find((p) => p.dims.length === dimensions.length && p.dims.width === dimensions.width && p.dims.height === dimensions.height)?.id ?? "";

  return (
    <Page>
      <p className="text-sm text-library-muted">
        <Link href={ROUTES.dashboard} className="hover:text-library-ink hover:underline">
          Không gian làm việc
        </Link>
        <span className="mx-2">/</span>
        <Link href={ROUTES.projects} className="hover:text-library-ink hover:underline">
          Dự án
        </Link>
        <span className="mx-2">/</span>
        <span>Tạo hộp mới</span>
      </p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium text-library-ink sm:text-[32px] sm:leading-tight">{template ? template.title : `${current?.name ?? "Hộp"} theo kích thước của bạn`}</h1>
          <p className="mt-1.5 max-w-2xl text-base leading-[1.6] text-library-sub">
            Nhập kích thước lọt lòng theo milimét và chọn giấy: khuôn bế và hộp 3D cập nhật ngay, đúng công thức của file in.
          </p>
        </div>
        <span className="font-mono text-sm text-library-sub">
          {dimensions.length} × {dimensions.width} × {dimensions.height} mm · t {dimensions.paperThickness.toFixed(2)}
        </span>
      </div>

      {template && (
        <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-library-line bg-library-panel p-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-library-ink bg-white">
              <LayoutTemplate className="size-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-xs text-library-muted">Bắt đầu từ mẫu thiết kế · cấu trúc {template.structure.name}</span>
              <span className="block truncate text-base font-medium text-library-ink">{template.title}</span>
            </span>
          </span>
          <Link href={ROUTES.editorNew} className="text-sm font-medium text-library-accent hover:underline">
            Bỏ mẫu, tự chọn cấu trúc hộp
          </Link>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* Stage: stays in view while the settings on the right scroll. */}
        <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
          <section aria-label="Xem trước" className="overflow-hidden rounded-[20px] border-[1.5px] border-library-ink bg-library-tile shadow-hard">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-library-ink/15 px-4 py-3">
              <SegmentedControl<"2d" | "3d">
                label="Chế độ xem"
                value={view}
                onChange={setView}
                options={[
                  { value: "2d", label: "Khuôn bế 2D" },
                  { value: "3d", label: "Hộp 3D" },
                ]}
              />
              <ul className="flex flex-wrap gap-1.5" aria-label="Khổ phôi trải phẳng">
                {sheets.map((sheet) => (
                  <li key={sheet.name} className="rounded-md bg-white px-2 py-1 font-mono text-xs text-library-sub">
                    {sheet.width} × {sheet.height} mm
                  </li>
                ))}
              </ul>
            </div>

            {view === "2d" ? (
              <div className="flex h-[360px] items-center justify-center bg-white p-6 sm:h-[520px] sm:p-10">
                <DielineSketch
                  structure={structure}
                  dimensions={dimensions}
                  label={`Khuôn bế ${current?.name ?? ""} ${dimensions.length} × ${dimensions.width} × ${dimensions.height} mm`}
                  className="h-full w-full"
                />
              </div>
            ) : (
              <div className="relative h-[360px] sm:h-[520px]">
                <div className="absolute inset-0">
                  <BoxStage3D
                    structure={structure}
                    dimensions={dimensions}
                    materialSpec={materialSpec}
                    canvasState={canvasState}
                    title={template?.title ?? current?.name ?? "Hộp mới"}
                    foldProgress={fold / 100}
                    frameless
                    environment="transparent"
                    className="h-full"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-library-ink/15 bg-library-tile px-4 py-3 text-sm text-library-sub">
              {view === "2d" ? (
                <span className="flex flex-wrap items-center gap-x-5 gap-y-1">
                  <Legend color="#E53E3E" label="Đường cắt" />
                  <Legend color="#3182CE" dashed label="Đường gấp" />
                  <span>Kích thước thật theo mm, cùng công thức với file in</span>
                </span>
              ) : (
                <label className="flex w-full items-center gap-3 sm:w-auto">
                  <span className="shrink-0">Gấp hộp</span>
                  <input type="range" min={0} max={100} value={fold} onChange={(event) => setFold(Number(event.target.value))} className="w-full accent-library-accent sm:w-56" />
                  <span className="w-10 shrink-0 text-right font-mono text-xs">{fold}%</span>
                </label>
              )}
            </div>
          </section>

          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat label="Khổ phôi trải phẳng" value={sheets.map((s) => `${s.width} × ${s.height}`).join(" + ") + " mm"} />
            <Stat label="Bù độ dày giấy mỗi nếp" value={`+${dimensions.paperThickness.toFixed(2)} mm`} />
            <Stat
              label="FitCheck™ của khuôn"
              value={
                <span className="flex items-center gap-2">
                  {report.score}/100
                  <Badge tone={report.score >= 90 ? "green" : report.score >= 70 ? "amber" : "red"}>{report.violations.length === 0 ? "Đạt" : `${report.violations.length} lưu ý`}</Badge>
                </span>
              }
            />
          </dl>
          {presentation && (
            <p className="flex items-start gap-3 rounded-xl bg-library-panel p-4 text-sm leading-[1.6] text-library-sub">
              <Info className="mt-0.5 size-4 shrink-0 text-library-ink" aria-hidden />
              <span>
                <strong className="font-medium text-library-ink">{current?.name ?? presentation.vietnameseName}:</strong> {current?.description ?? presentation.description} Hợp với{" "}
                {presentation.recommendedGifts.slice(0, 3).join(", ").toLowerCase()}; giấy gợi ý {presentation.recommendedPaper}.
              </span>
            </p>
          )}
        </div>

        {/* Settings */}
        <aside aria-label="Tuỳ chỉnh hộp" className="h-fit rounded-2xl border border-library-line bg-white">
          <Section title="Cấu trúc hộp" hint={template ? "Do mẫu thiết kế quy định" : undefined}>
            <div className="grid grid-cols-2 gap-2.5">
              {structures.map((item) => {
                const active = item.id === structure;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={active}
                    disabled={!!template && !active}
                    onClick={() => selectStructure(item.id)}
                    className={cn(
                      "flex flex-col gap-1.5 rounded-xl border p-2 text-left transition-shadow outline-none focus-visible:ring-[3px] focus-visible:ring-library-ink/20 disabled:cursor-not-allowed disabled:opacity-40",
                      active ? "border-[1.5px] border-library-ink shadow-hard-sm" : "border-library-line hover:border-library-ink",
                    )}
                  >
                    <span className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-library-tile p-2">
                      <DielineSketch structure={item.id} dimensions={defaultDimensionsOf(item.id)} className="h-full w-full" />
                    </span>
                    <span className="truncate px-0.5 text-sm text-library-ink">{item.name}</span>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="Kích thước lọt lòng" hint="mm">
            <label className="mb-4 flex flex-col gap-1.5">
              <span className="text-sm text-library-muted">Món quà mẫu</span>
              <select
                value={presetId}
                onChange={(event) => {
                  const preset = GIFT_PRESETS.find((p) => p.id === event.target.value);
                  if (preset) setDimensions({ ...preset.dims, paperThickness: dimensions.paperThickness });
                }}
                className="h-11 w-full rounded-lg border border-library-line bg-white px-3 pr-9 text-sm text-library-ink outline-none focus:border-library-accent focus:ring-[3px] focus:ring-library-accent/20"
              >
                <option value="">Tự nhập kích thước</option>
                {GIFT_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id} disabled={!presetFits({ ...preset.dims, paperThickness: dimensions.paperThickness })}>
                    {preset.name} · {preset.dims.length}×{preset.dims.width}×{preset.dims.height}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col gap-4">
              {SIDES.map(({ field, label }) => {
                const { min, max } = range(field);
                return (
                  <div key={field}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-library-ink">{label}</span>
                      <MmInput value={dimensions[field]} min={min} max={max} step={1} label={label} onCommit={(value) => setSide(field, value)} />
                    </div>
                    <input
                      type="range"
                      aria-label={label}
                      min={min}
                      max={max}
                      step={1}
                      value={dimensions[field]}
                      onChange={(event) => setSide(field, Number(event.target.value))}
                      className="mt-1.5 w-full accent-library-accent"
                    />
                    <div className="flex justify-between font-mono text-[11px] text-library-muted">
                      <span>{min}</span>
                      <span>{max}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title="Giấy" hint={`t = ${dimensions.paperThickness.toFixed(2)} mm`}>
            <div role="radiogroup" aria-label="Giấy" className="flex flex-col gap-2">
              {PAPER_STOCKS.map((paper) => {
                const active = paper.theme === material;
                return (
                  <button
                    key={paper.theme}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => {
                      setMaterial(paper.theme);
                      setDimensions((dims) => ({ ...dims, paperThickness: clampDimension(limits, "paperThickness", paper.spec.caliper) }));
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-library-ink/20",
                      active ? "border-[1.5px] border-library-ink bg-library-accent-mist" : "border-library-line hover:border-library-ink",
                    )}
                  >
                    <span aria-hidden className="size-9 shrink-0 rounded-lg border border-black/15" style={{ backgroundColor: paper.swatch.outside }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-library-ink">{paper.name}</span>
                      <span className="block truncate text-xs text-library-muted">{paper.finishLabel}</span>
                    </span>
                    <span className="shrink-0 font-mono text-xs text-library-sub">{paper.spec.caliper.toFixed(2)} mm</span>
                  </button>
                );
              })}
            </div>
            <label className="mt-4 block">
              <span className="flex items-center justify-between text-sm text-library-ink">
                Độ dày giấy (t)
                <span className="font-mono text-xs text-library-sub">{dimensions.paperThickness.toFixed(2)} mm</span>
              </span>
              <input
                type="range"
                min={range("paperThickness").min}
                max={range("paperThickness").max}
                step={0.01}
                value={dimensions.paperThickness}
                onChange={(event) => setThickness(Number(event.target.value))}
                className="mt-1.5 w-full accent-library-accent"
              />
            </label>
          </Section>

          <div className="flex flex-col gap-3 p-5">
            {errors.length > 0 && (
              <p role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                {errors.join(" ")}
              </p>
            )}
            <button type="button" onClick={() => create.mutate()} disabled={busy || errors.length > 0} className={cn(primaryButton, "h-12 w-full disabled:cursor-not-allowed")}>
              {busy && <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-library-lime-ink/30 border-t-library-lime-ink motion-reduce:animate-none" />}
              {busy ? "Đang tạo dự án…" : "Tạo dự án & mở studio"}
              {!busy && <ArrowRight className="size-4" aria-hidden />}
            </button>
            <p className="text-center text-xs text-library-muted">Kích thước và giấy vẫn đổi được trong studio.</p>
          </div>
        </aside>
      </div>
    </Page>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-library-line p-5">
      <h2 className="mb-3 flex items-center justify-between gap-2 text-base font-medium text-library-ink">
        {title}
        {hint && <span className="text-xs font-normal text-library-muted">{hint}</span>}
      </h2>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-library-panel px-4 py-3">
      <dt className="text-xs text-library-muted">{label}</dt>
      <dd className="mt-0.5 font-mono text-sm text-library-ink">{value}</dd>
    </div>
  );
}

function Legend({ color, label, dashed = false }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg viewBox="0 0 24 4" className="h-1 w-6" aria-hidden>
        <line x1="0" y1="2" x2="24" y2="2" stroke={color} strokeWidth="2" strokeDasharray={dashed ? "4 3" : undefined} />
      </svg>
      {label}
    </span>
  );
}
