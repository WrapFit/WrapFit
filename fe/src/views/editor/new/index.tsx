"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, LayoutTemplate } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import type { BoxDimensions, BoxStructureType, FitCheckReport } from "@wrapfit/shared";
import { createProject, getTemplate, listBoxStructures } from "@/api";
import { ErrorState, PageLoader } from "@/components/common/StatusViews";
import { useToast } from "@/components/common/Toast";
import { ROUTES } from "@/constants";
import { RequireAuth } from "@/features/auth";
import { BOX_STRUCTURES, Step1BoxTemplatePicker } from "@/features/studio/components/Step1BoxTemplatePicker";
import { Step2DimensionAndMaterial } from "@/features/studio/components/Step2DimensionAndMaterial";
import { StudioStepper } from "@/features/studio/components/StudioStepper";
import type { BoxMaterialTheme } from "@/features/studio/components/three/InteractiveFoldingBox3D";
import { checkDesign, dielinePiecesOf } from "@/features/studio/utils/dieline";
import { materialSpecFor, materialThemeOf } from "@/features/studio/utils/projectMaterial";
import { queryKeys } from "@/hooks/data";
import type { BoxStructure, TemplateDetail } from "@/types/api";

const NOT_CREATED = "Hoàn tất bước 2 để tạo dự án trước";

const EMPTY_REPORT: FitCheckReport = { isValidForProduction: true, score: 100, violations: [], auditedAt: "" };

function defaultDimensionsOf(structure: BoxStructureType): BoxDimensions {
  return { ...(BOX_STRUCTURES.find((s) => s.id === structure)?.defaultDims ?? BOX_STRUCTURES[0].defaultDims) };
}

/**
 * `/editor/new` (docs/12 D1): steps 1–2 of the studio, then `POST /projects` and the editor of the new project.
 * `?template=<id>` starts from a curated design of the template hub: its structure is fixed, its canvas is copied.
 */
export default function NewProjectPage() {
  return (
    <RequireAuth>
      <NewProject />
    </RequireAuth>
  );
}

function NewProject() {
  const templateId = useSearchParams().get("template");
  const structures = useQuery({
    queryKey: queryKeys.templates.structures,
    queryFn: listBoxStructures,
    staleTime: 5 * 60_000,
  });
  const template = useQuery({
    queryKey: queryKeys.templates.detail(templateId ?? ""),
    queryFn: () => getTemplate(templateId!),
    enabled: !!templateId,
  });

  const failed = structures.error ?? template.error;
  if (failed) {
    const retry = () => {
      if (structures.error) void structures.refetch();
      if (template.error) void template.refetch();
    };
    return (
      <main className="min-h-screen bg-paper-grain flex items-center px-4 py-16">
        <ErrorState
          error={failed}
          title={template.error ? "Không mở được mẫu thiết kế" : "Không tải được danh sách cấu trúc hộp"}
          onRetry={retry}
          retrying={structures.isFetching || template.isFetching}
          action={
            template.error ? (
              <Link href={ROUTES.editorNew} className="text-sm font-semibold text-brand-forest underline-offset-4 hover:underline">
                Tự chọn cấu trúc hộp
              </Link>
            ) : undefined
          }
        />
      </main>
    );
  }
  if (!structures.data || (templateId && !template.data)) return <PageLoader label="Đang chuẩn bị xưởng thiết kế…" />;

  return <NewProjectWizard key={templateId ?? "blank"} structures={structures.data} template={template.data ?? null} />;
}

function NewProjectWizard({ structures, template }: { structures: BoxStructure[]; template: TemplateDetail | null }) {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<1 | 2>(template ? 2 : 1);
  const [structure, setStructure] = useState<BoxStructureType>(
    () => template?.structure.id ?? (structures.find((s) => s.id === "tuck-top") ?? structures[0])?.id ?? "tuck-top"
  );
  const [dimensions, setDimensions] = useState<BoxDimensions>(() =>
    template ? { ...template.dimensions } : defaultDimensionsOf(structure)
  );
  const [material, setMaterial] = useState<BoxMaterialTheme>(() =>
    template ? materialThemeOf(template.canvasState.materialTheme, template.materialSpec) : "ivory"
  );

  const current = structures.find((s) => s.id === structure);
  const elements = useMemo(() => template?.canvasState.elements ?? [], [template]);
  const report = useMemo(() => {
    try {
      return checkDesign(dielinePiecesOf(structure, dimensions), elements);
    } catch {
      return EMPTY_REPORT;
    }
  }, [structure, dimensions, elements]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  const create = useMutation({
    mutationFn: () =>
      createProject({
        templateId: structure,
        title: template?.title ?? `${current?.name ?? "Hộp quà"} ${dimensions.length}×${dimensions.width}×${dimensions.height}`,
        dimensions,
        materialSpec: materialSpecFor(material, dimensions.paperThickness),
        canvasState: template
          ? { ...template.canvasState, materialTheme: material }
          : { elements: [], backgroundPattern: null, materialTheme: material },
        designTemplateId: template?.id,
      }),
    onSuccess: (project) => {
      queryClient.setQueryData(queryKeys.projects.detail(project.id), project);
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      router.replace(ROUTES.editor(project.id));
    },
    onError: (err) => toast.error(err, "Chưa tạo được dự án"),
  });

  const selectStructure = (id: BoxStructureType) => {
    if (id === structure) return;
    setStructure(id);
    setDimensions(defaultDimensionsOf(id));
  };

  return (
    <div className="min-h-screen bg-paper-grain flex flex-col font-sans overflow-x-hidden">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200">
        <div className="w-full max-w-7xl 2xl:max-w-[1720px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => (step === 2 && !template ? setStep(1) : router.push(ROUTES.dashboard))}
              className="w-10 h-10 flex-shrink-0 rounded-full border border-stone-200 hover:bg-stone-50 flex items-center justify-center text-stone-600 transition"
              aria-label={step === 2 && !template ? "Quay lại Bước 1" : "Về trang Dự án"}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="hidden sm:block min-w-0">
              <span className="font-serif font-bold text-stone-900 text-base block truncate">Dự án mới</span>
              <span className="text-[10px] text-stone-500 font-mono block">
                {dimensions.length}×{dimensions.width}×{dimensions.height} mm
              </span>
            </div>
          </div>

          <StudioStepper
            current={step}
            onSelect={(next) => (next === 2 ? setStep(2) : next === 1 && !template ? setStep(1) : undefined)}
            locked={{
              ...(template ? { 1: "Cấu trúc hộp do mẫu thiết kế quy định" } : {}),
              3: NOT_CREATED,
              4: NOT_CREATED,
            }}
          />

          <span className="hidden lg:block w-[120px]" aria-hidden />
        </div>
      </header>

      <main className="flex-1 w-full flex flex-col">
        {template && (
          <div className="w-full max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-squircle-lg bg-white border border-stone-200 shadow-tactile">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-10 h-10 flex-shrink-0 rounded-full bg-brand-gold/15 text-brand-forest flex items-center justify-center">
                  <LayoutTemplate className="w-5 h-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <span className="text-xs text-stone-500 block">Bắt đầu từ mẫu thiết kế</span>
                  <span className="font-serif font-bold text-stone-900 text-base block truncate">{template.title}</span>
                </div>
              </div>
              <Link
                href={ROUTES.editorNew}
                className="text-xs font-semibold text-brand-forest underline-offset-4 hover:underline min-h-[44px] inline-flex items-center"
              >
                Bỏ mẫu, tự chọn cấu trúc hộp
              </Link>
            </div>
          </div>
        )}

        {step === 1 ? (
          <Step1BoxTemplatePicker
            structures={structures}
            selectedStructure={structure}
            onSelectStructure={selectStructure}
            onNext={() => setStep(2)}
          />
        ) : (
          <Step2DimensionAndMaterial
            dimensions={dimensions}
            onDimensionsChange={setDimensions}
            activeMaterial={material}
            onMaterialChange={(m) => setMaterial(m as BoxMaterialTheme)}
            fitCheckReport={report}
            limits={current?.dimensionLimits ?? template?.dimensionLimits}
            structure={structure}
            onBack={template ? undefined : () => setStep(1)}
            onNext={() => create.mutate()}
            nextLabel={create.isPending ? "Đang tạo dự án…" : "Tạo Dự Án & Vào Xưởng Bản Vẽ 2D"}
            busy={create.isPending || create.isSuccess}
          />
        )}
      </main>
    </div>
  );
}
