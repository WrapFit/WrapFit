"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Info, LayoutTemplate } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import type { BoxDimensions, BoxStructureType, FitCheckReport } from "@wrapfit/shared";
import { createProject, getTemplate, listBoxStructures } from "@/api";
import { landingFontVariables } from "@/assets/fonts/landing";
import { PageLoader } from "@/components/common/StatusViews";
import { useToast } from "@/components/common/Toast";
import { MainHeader } from "@/components/layout";
import { primaryButton } from "@/components/library";
import { Badge, SegmentedControl, WorkspaceError } from "@/components/workspace";
import { ProductTour, TourReplayButton, useTourContinuation, type TourStep } from "@/components/ui";
import { ROUTES } from "@/constants";
import { useAuth } from "@/features/auth";
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
/** Pause after the last slider move before the 3D box is rebuilt at the new size (as COMMIT_DELAY_MS of step 2). */
const STAGE_REBUILD_DELAY_MS = 180;

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

const FALLBACK_STRUCTURES: BoxStructure[] = BOX_STRUCTURES.map((s) => ({
  id: s.id,
  name: s.name,
  category: "Standard",
  description: s.description,
  preview3dUrl: null,
  dimensionLimits: {
    length: { min: 20, max: 400 },
    width: { min: 20, max: 300 },
    height: { min: 15, max: 300 },
    paperThickness: { min: 0.2, max: 0.8 },
  },
}));

function defaultDimensionsOf(structure: BoxStructureType): BoxDimensions {
  return { ...(BOX_STRUCTURES.find((s) => s.id === structure)?.defaultDims ?? BOX_STRUCTURES[0].defaultDims) };
}

export default function NewProjectPage() {
  return <NewProject />;
}

function NewProject() {
  const params = useSearchParams();
  const templateId = params.get("template");
  const structures = useQuery({ queryKey: queryKeys.templates.structures, queryFn: listBoxStructures, staleTime: 5 * 60_000, retry: false });
  const template = useQuery({
    queryKey: queryKeys.templates.detail(templateId ?? ""),
    queryFn: () => getTemplate(templateId!),
    enabled: !!templateId,
    retry: false,
  });

  const structuresData = structures.data ?? FALLBACK_STRUCTURES;

  if (templateId && template.isLoading) return <PageLoader label="Đang chuẩn bị khuôn bế…" />;

  return <NewBoxDesigner key={templateId ?? "blank"} structures={structuresData} template={template.data ?? null} preset={templateId ? null : presetFrom(params)} />;
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

/** `?structure=&l=&w=&h=&paper=` from a structure page: the box to start from (kept inside its limits later). */
interface Preset {
  structure?: string;
  length?: number;
  width?: number;
  height?: number;
  paper?: string;
}

function presetFrom(params: Pick<URLSearchParams, "get">): Preset {
  const num = (key: string) => {
    const value = Number(params.get(key));
    return Number.isFinite(value) && value > 0 ? value : undefined;
  };
  return { structure: params.get("structure") ?? undefined, length: num("l"), width: num("w"), height: num("h"), paper: params.get("paper") ?? undefined };
}

function NewBoxDesigner({ structures, template, preset }: { structures: BoxStructure[]; template: TemplateDetail | null; preset: Preset | null }) {
  const continued = useTourContinuation();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { status } = useAuth();

  const [structure, setStructure] = useState<BoxStructureType>(
    () =>
      template?.structure.id ??
      structures.find((s) => s.id === preset?.structure)?.id ??
      (structures.find((s) => s.id === "tuck-top") ?? structures[0])?.id ??
      "tuck-top",
  );
  const [material, setMaterial] = useState<BoxMaterialTheme>(() =>
    template
      ? materialThemeOf(template.canvasState.materialTheme, template.materialSpec)
      : (PAPER_STOCKS.find((p) => p.theme === preset?.paper)?.theme ?? "ivory"),
  );
  const [dimensions, setDimensions] = useState<BoxDimensions>(() => {
    if (template) return { ...template.dimensions };
    const base = defaultDimensionsOf(structure);
    const limits = structures.find((s) => s.id === structure)?.dimensionLimits;
    const side = (field: "length" | "width" | "height", value: number | undefined) =>
      value === undefined ? base[field] : limits ? Math.max(limits[field].min, Math.min(limits[field].max, Math.round(value))) : Math.round(value);
    const caliper = PAPER_STOCKS.find((p) => p.theme === material)?.spec.caliper ?? base.paperThickness;
    return { length: side("length", preset?.length), width: side("width", preset?.width), height: side("height", preset?.height), paperThickness: clampDimension(limits, "paperThickness", caliper) };
  });
  const [view, setView] = useState<"2d" | "3d">("2d");
  const [fold, setFold] = useState(100);
  // The 3D box is rebuilt only once a slider rests; while it moves, the built box is scaled to `dimensions` (as in step 2).
  const [stageDimensions, setStageDimensions] = useState(dimensions);
  useEffect(() => {
    const timer = window.setTimeout(() => setStageDimensions(dimensions), STAGE_REBUILD_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [dimensions]);

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

  const handleCreateOrExplore = () => {
    if (status !== "authenticated") {
      toast.show({ tone: "info", title: "Đang mở Studio 3D (Chế độ trải nghiệm khách)..." });
      router.push(
        `${ROUTES.editorDemo}?structure=${structure}&l=${dimensions.length}&w=${dimensions.width}&h=${dimensions.height}&paper=${material}`
      );
      return;
    }
    create.mutate();
  };

  const sheets = pieces.map(({ name, geometry: { totalBoundingBox: b } }) => ({ name, width: Math.round(b.width), height: Math.round(b.height) }));
  const presetFits = (dims: BoxDimensions) => dimensionErrors(dims, limits, structure).length === 0;
  const presetId = GIFT_PRESETS.find((p) => p.dims.length === dimensions.length && p.dims.width === dimensions.width && p.dims.height === dimensions.height)?.id ?? "";

  return (
    <Page>
      <ProductTour id={NEW_BOX_TOUR_ID} steps={NEW_BOX_TOUR} force={continued} />
      <p className="text-sm text-library-muted">
        <Link href="/" className="hover:text-library-ink hover:underline">
          Trang chủ
        </Link>
        <span className="mx-2">/</span>
        <Link href={ROUTES.templates} className="hover:text-library-ink hover:underline">
          Thư viện mẫu
        </Link>
        <span className="mx-2">/</span>
        <span>Tạo hộp mới</span>
      </p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium text-library-ink sm:text-heading-lg sm:leading-tight">{template ? template.title : `${current?.name ?? "Hộp"} theo kích thước của bạn`}</h1>
          <p className="mt-1.5 max-w-2xl text-base leading-[1.6] text-library-sub">
            Nhập kích thước lọt lòng theo milimét và chọn giấy: khuôn bế và hộp 3D cập nhật ngay, đúng công thức của file in.
          </p>
        </div>
        <span className="flex flex-wrap items-center gap-3">
          <TourReplayButton tourId={NEW_BOX_TOUR_ID} variant="ghost" size="sm" />
          <span className="font-mono text-sm text-library-sub">
            {dimensions.length} × {dimensions.width} × {dimensions.height} mm · t {dimensions.paperThickness.toFixed(2)}
          </span>
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
          <Link href={ROUTES.editorNew} className="text-sm font-medium text-fpt-orange-ink hover:underline">
            Bỏ mẫu, tự chọn cấu trúc hộp
          </Link>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* Stage: stays in view while the settings on the right scroll. */}
        <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
          <section aria-label="Xem trước" data-tour="new-preview" className="overflow-hidden rounded-squircle-md border-[1.5px] border-library-ink bg-library-tile shadow-hard">
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
              <div className="flex h-[360px] items-center justify-center bg-mist-150 bg-[radial-gradient(#D5DCCF_1px,transparent_1px)] [background-size:14px_14px] p-6 sm:h-[520px] sm:p-10">
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
                    dimensions={stageDimensions}
                    liveDimensions={dimensions}
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
                  <input type="range" min={0} max={100} value={fold} onChange={(event) => setFold(Number(event.target.value))} className="w-full accent-fpt-orange sm:w-56" />
                  <span className="w-10 shrink-0 text-right font-mono text-xs">{fold}%</span>
                </label>
              )}
            </div>
          </section>

          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3" data-tour="new-stats">
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
          <Section tour="new-structure" title="Cấu trúc hộp" hint={template ? "Do mẫu thiết kế quy định" : undefined}>
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

          <Section tour="new-size" title="Kích thước lọt lòng" hint="mm">
            <label className="mb-4 flex flex-col gap-1.5" data-tour="new-preset">
              <span className="text-sm text-library-muted">Món quà mẫu</span>
              <select
                value={presetId}
                onChange={(event) => {
                  const preset = GIFT_PRESETS.find((p) => p.id === event.target.value);
                  if (preset) setDimensions({ ...preset.dims, paperThickness: dimensions.paperThickness });
                }}
                className="h-11 w-full rounded-lg border border-library-line bg-white px-3 pr-9 text-sm text-library-ink outline-none focus:border-fpt-orange focus:ring-[3px] focus:ring-fpt-orange/20"
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
              <div className="flex flex-col gap-4" data-tour="new-sides">
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
                      className="mt-1.5 w-full accent-fpt-orange"
                    />
                    <div className="flex justify-between font-mono text-cad-spec-micro text-library-muted">
                      <span>{min}</span>
                      <span>{max}</span>
                    </div>
                  </div>
                );
              })}

              </div>

              {/* Gift weight input & Crash-lock intelligent recommendation */}
              <div className="pt-2 border-t border-library-line" data-tour="new-weight">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-library-ink font-medium">Khối lượng quà tặng</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={10}
                      max={3000}
                      step={10}
                      value={dimensions.giftWeight ?? 250}
                      onChange={(e) => {
                        const weight = Math.max(10, Math.min(3000, Number(e.target.value) || 0));
                        setDimensions((dims) => ({
                          ...dims,
                          giftWeight: weight,
                          bottomType: weight > 300 ? "lock" : dims.bottomType ?? "tuck",
                        }));
                      }}
                      className="w-20 h-8 rounded-lg border border-library-line px-2 text-right font-mono text-sm text-library-ink outline-none focus:border-fpt-orange"
                    />
                    <span className="text-xs text-library-muted">g</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={50}
                  max={1500}
                  step={50}
                  value={dimensions.giftWeight ?? 250}
                  onChange={(e) => {
                    const weight = Number(e.target.value);
                    setDimensions((dims) => ({
                      ...dims,
                      giftWeight: weight,
                      bottomType: weight > 300 ? "lock" : dims.bottomType ?? "tuck",
                    }));
                  }}
                  className="mt-1.5 w-full accent-fpt-orange"
                />
                <div className="flex justify-between font-mono text-cad-spec-micro text-library-muted">
                  <span>50g (nhẹ)</span>
                  <span>&gt; 300g (nặng)</span>
                  <span>1500g</span>
                </div>

                {(dimensions.giftWeight ?? 0) > 300 && structure === "tuck-top" && (
                  <div className="mt-3 rounded-xl border border-warning/30 bg-warning-bg/80 p-3 text-xs leading-relaxed text-warning-fg space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="size-4 shrink-0 text-warning-fg mt-0.5" />
                      <div>
                        <strong className="font-semibold">Quà nặng {dimensions.giftWeight}g (&gt; 300g):</strong> Đáy gài tiêu chuẩn (Straight tuck) có nguy cơ bục đáy khi vận chuyển.
                      </div>
                    </div>
                    <p className="text-warning-fg">
                      WrapFit khuyến nghị kết cấu <strong>Đáy khóa FEFCO 0215 (Crash-lock / 1-2-3 lock)</strong> và giấy GSM ≥ 350 để hộp chịu lực tốt nhất.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setDimensions((dims) => ({ ...dims, bottomType: "lock" }))}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors",
                          dimensions.bottomType !== "tuck" ? "bg-warning text-white border-warning font-semibold" : "bg-white text-warning-fg border-warning/30 hover:bg-warning-bg",
                        )}
                      >
                        ✓ Đáy khóa chịu lực (Khuyên dùng)
                      </button>
                      <button
                        type="button"
                        onClick={() => selectStructure("lid-base")}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white text-fg-muted border border-line hover:bg-surface-sunken/50"
                      >
                        Đổi sang Hộp Âm Dương
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Section>

          <Section tour="new-paper" title="Giấy" hint={`t = ${dimensions.paperThickness.toFixed(2)} mm`}>
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
                      active ? "border-[1.5px] border-library-ink bg-fpt-orange-light" : "border-library-line hover:border-library-ink",
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
                className="mt-1.5 w-full accent-fpt-orange"
              />
            </label>
          </Section>

          <div className="flex flex-col gap-3 p-5">
            {errors.length > 0 && (
              <p role="alert" className="flex items-start gap-2 rounded-lg bg-danger-bg p-3 text-sm text-danger-fg">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                {errors.join(" ")}
              </p>
            )}
            <button
              type="button"
              onClick={handleCreateOrExplore}
              disabled={busy || errors.length > 0}
              data-tour="new-create"
              className={cn(primaryButton, "h-12 w-full disabled:cursor-not-allowed")}
            >
              {busy && <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-fpt-orange/30 border-t-fpt-orange motion-reduce:animate-none" />}
              {busy ? "Đang tạo dự án…" : status === "authenticated" ? "Tạo dự án & mở studio" : "Mở Studio 3D (Trải nghiệm ngay)"}
              {!busy && <ArrowRight className="size-4" aria-hidden />}
            </button>
            {status !== "authenticated" && (
              <Link
                href={`${ROUTES.structure(structure)}?l=${dimensions.length}&w=${dimensions.width}&h=${dimensions.height}&paper=${material}`}
                className="text-center text-xs font-medium text-fpt-orange-ink hover:underline"
              >
                Hoặc xem thông số kỹ thuật & tải khuôn bế SVG
              </Link>
            )}
            <p className="text-center text-xs text-library-muted">Kích thước và giấy vẫn đổi được trong studio.</p>
          </div>
        </aside>
      </div>
    </Page>
  );
}

const NEW_BOX_TOUR_ID = "editor-new-v1";

/**
 * First visit of "Tạo hộp mới", written for someone who has never designed a box: one decision per step, in the order
 * of the page (structure → size → weight → paper → check → create). The last step is done by pressing the real button.
 */
const NEW_BOX_TOUR: TourStep[] = [
  {
    title: "Làm chiếc hộp đầu tiên chỉ với 4 việc",
    body: "Chọn kiểu hộp, nhập kích thước món quà, chọn giấy rồi bấm tạo. Mình sẽ chỉ từng chỗ một, bạn cứ làm theo nhé.",
    mascot: "thumbs_up",
  },
  {
    target: '[data-tour="new-structure"]',
    title: "Việc 1: Chọn kiểu hộp",
    body: "Hộp nắp gài hợp với mỹ phẩm, nến; hộp âm dương sang trọng cho quà tặng; hộp kéo bao diêm cho trang sức nhỏ; hộp gối cho phụ kiện. Bấm vào hình để chọn, bản vẽ bên trái đổi theo.",
    mascot: "presenting",
    placement: "left",
  },
  {
    target: '[data-tour="new-preset"]',
    title: "Chưa đo món quà? Chọn món gần giống",
    body: "Danh sách có sẵn kích thước của các món quà phổ biến (hũ nến thơm, chai nước hoa, hộp trang sức…). Chọn một món là kích thước tự điền.",
    mascot: "measuring",
    placement: "left",
  },
  {
    target: '[data-tour="new-sides"]',
    title: "Việc 2: Nhập kích thước món quà",
    body: "Dùng thước đo món quà theo milimét (1 cm = 10 mm): Dài, Rộng và Cao. Đây là khoảng trống bên trong hộp, nên cộng thêm 2–3 mm cho dễ bỏ quà vào. Gõ số vào ô hoặc kéo thanh trượt.",
    mascot: "measuring",
    placement: "left",
  },
  {
    target: '[data-tour="new-weight"]',
    title: "Món quà nặng bao nhiêu?",
    body: "Nhập khối lượng theo gam. Quà nặng hơn 300 g thì WrapFit gợi ý đáy khoá chắc hơn để hộp không bục khi vận chuyển.",
    mascot: "measuring",
    placement: "left",
  },
  {
    target: '[data-tour="new-paper"]',
    title: "Việc 3: Chọn giấy",
    body: "Mỗi loại giấy có màu và độ dày khác nhau. Không chắc thì cứ giữ loại đang chọn, sau này vẫn đổi được trong Studio.",
    mascot: "folding",
    placement: "left",
  },
  {
    target: '[data-tour="new-preview"]',
    title: "Xem trước chiếc hộp",
    body: "“Khuôn bế 2D” là bản vẽ trải phẳng để in và cắt: nét đỏ là đường cắt, nét xanh đứt là đường gấp. Bấm “Hộp 3D” để xem hộp đã gấp, kéo thanh “Gấp hộp” để xem từng nếp.",
    mascot: "folding",
  },
  {
    target: '[data-tour="new-stats"]',
    title: "Kiểm tra trước khi in",
    body: "FitCheck™ chấm điểm khuôn: từ 90 điểm trở lên là in được. Khổ phôi cho biết tờ giấy cần to bao nhiêu.",
    mascot: "thumbs_up",
  },
  {
    target: '[data-tour="new-create"]',
    title: "Việc 4: Tạo dự án",
    body: "Xong rồi! Bấm nút này để lưu chiếc hộp và mở Studio, nơi bạn thêm chữ, logo, hoa văn rồi xuất file in.",
    mascot: "celebration",
    placement: "left",
    clickTarget: true,
  },
];

function Section({ title, hint, tour, children }: { title: string; hint?: string; tour?: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-library-line p-5" data-tour={tour}>
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
