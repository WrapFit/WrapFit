'use client';

/**
 * Stitch screen `dashboard-brand-kit`, wired to `PATCH /users/me/brand-kit` (status "wired": `stitch:sync` keeps this
 * file). Column 1 edits the 3–5 colours, column 2 the fonts, slogan and logo (upload purpose LOGO); the kit is saved as
 * a whole. The paper samples of column 3, the print specs and the seal tile have no API and stay static (D6).
 */

import React from 'react';
import { DashboardHeaderNav } from '@/components/layout/DashboardHeaderNav';
import { MainFooter } from '@/components/layout/MainFooter';
import { MainHeader } from '@/components/layout/MainHeader';
import { useToast } from '@/components/common/Toast';
import { RequireAuth, useAuth } from '@/features/auth';
import { HEX_COLOR } from '@/features/dashboard';
import {
  BrandLogoTile,
  BrandSwatch,
  COLOR_ROLES,
  EXTRA_COLORS,
  FontListEditor,
  MAX_COLORS,
  MIN_COLORS,
  SLOGAN_MAX_LENGTH,
  brandKitProblems,
  toBrandKitRequest,
  useBrandKitDraft,
  useUpdateBrandKit,
} from '@/features/profile';

export default function DashboardBrandKitPage() {
  return (
    <RequireAuth>
      <DashboardBrandKitScreen />
    </RequireAuth>
  );
}

/**
 * The screen's CSS fits it in one viewport: `overflow: hidden` on html, body and the root. The editable columns
 * stack on phones and grow with the fonts list, so the page must scroll again.
 */
const SCROLL_FIX =
  'html:has([data-stitch="dashboard-brand-kit"]),body:has([data-stitch="dashboard-brand-kit"]){overflow:visible;height:auto}';

const STEPS = [
  { href: '#bk-colors', label: '01. Bảng Màu' },
  { href: '#bk-type', label: '02. Typography & Con Dấu' },
  { href: '#bk-materials', label: '03. Vật Liệu Giấy' },
];

function DashboardBrandKitScreen() {
  const { user } = useAuth();
  const toast = useToast();
  const kit = user?.brandKit ?? null;
  const { draft, update, dirty, reset, markSaved } = useBrandKitDraft(kit);
  const save = useUpdateBrandKit();
  const problems = brandKitProblems(draft);
  const valid = Object.keys(problems).length === 0;
  // A kit never saved starts from the suggested palette: saving it as is must be possible.
  const canSave = valid && (dirty || kit === null);
  const sloganLength = draft.slogan.trim().length;
  const headingFont = draft.fonts[0];
  const bodyFont = draft.fonts[1] ?? draft.fonts[0];
  const accentFont = draft.fonts[2] ?? bodyFont;
  const swatchColors = draft.colors.filter((color) => HEX_COLOR.test(color));

  const setColor = (index: number, color: string) =>
    update({ colors: draft.colors.map((current, position) => (position === index ? color : current)) });

  const submit = () => {
    if (!canSave || save.isPending) return;
    save.mutate(toBrandKitRequest(draft), {
      onSuccess: (saved) => {
        markSaved(saved.brandKit);
        toast.show({
          tone: 'success',
          title: 'Đã lưu Brand Kit',
          description: 'Màu, font, logo và slogan sẵn sàng để dùng trong 3D Studio.',
        });
      },
      onError: (error) => toast.error(error, 'Không lưu được Brand Kit'),
    });
  };

  return (
    <div
      data-stitch="dashboard-brand-kit"
      className="min-h-screen h-auto overflow-visible bg-background text-on-surface font-body-md antialiased flex flex-col justify-between"
    >
      <style>{SCROLL_FIX}</style>
      {/* TOP FLOATING NAV / BAR */} <MainHeader />
      <div className="w-full max-w-7xl 2xl:max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-8 flex flex-col gap-6">
        <DashboardHeaderNav /> {/* MAIN VIEWPORT CONTENT */}{' '}
        <main className="w-full flex-1 flex flex-col py-2.5 md:py-3 gap-3 md:gap-3.5 max-w-[1760px] mx-auto">
          <div className="w-full flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-2 shrink-0">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 ambient-pill px-3 py-1.5 rounded-full shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h1 className="font-headline-sm text-sm font-semibold tracking-tight text-on-surface">
                  {'Quy Trình Nhận Diện & Chuẩn Hóa Sản Xuất'}
                </h1>
              </div>
              <span className="font-cad-spec-micro text-[11px] px-2.5 py-1 rounded-full bg-secondary-container/60 text-secondary font-medium tracking-wide">
                {'FSC Certified • ΔE < 0.8 • 1:1 CNC'}
              </span>
            </div>
            <nav
              aria-label="Các phần của Brand Kit"
              className="relative flex items-center gap-1.5 ambient-pill p-1.5 rounded-full text-xs font-label-ui shadow-sm self-start max-w-full overflow-x-auto"
            >
              {STEPS.map((step, index) => (
                <a
                  key={step.href}
                  href={step.href}
                  className={`shrink-0 min-h-[44px] md:min-h-0 flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] transition-all whitespace-nowrap focus-visible:ring-2 focus-visible:ring-primary ${
                    index === 0
                      ? 'bg-on-surface text-surface-bright font-semibold shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-white/60'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                      index === 0 ? 'bg-white/20 text-white' : 'bg-on-surface-variant/20'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span>{step.label}</span>
                </a>
              ))}
            </nav>
          </div>
          <div className="w-full flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0 items-stretch">
            {/* COLUMN 1: BẢNG MÀU & MỰC IN CHUẨN */}
            <section
              id="bk-colors"
              aria-labelledby="bk-colors-title"
              className="scroll-mt-28 ambient-card rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all duration-300 hover:shadow-lg h-full overflow-hidden"
            >
              <div className="flex flex-col gap-3 min-h-0">
                <div className="flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-bold font-cad-dimension">
                      01
                    </span>
                    <div>
                      <h2
                        id="bk-colors-title"
                        className="font-label-ui text-xs font-bold text-on-surface tracking-wide uppercase"
                      >
                        {'Hệ Màu & Mực In Chuẩn'}
                      </h2>
                      <p className="font-cad-spec-micro text-[10px] text-on-surface-variant/80">
                        {`${MIN_COLORS}–${MAX_COLORS} màu: màu chính, màu nhấn, màu nền`}
                      </p>
                    </div>
                  </div>
                  <span className="font-cad-spec-micro text-[9px] px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-medium">
                    {draft.colors.length}/{MAX_COLORS} MÀU
                  </span>
                </div>
                {/* Swatches Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  {draft.colors.map((color, index) => (
                    <BrandSwatch
                      // Positions carry the meaning (primary, accent…): the index is the identity.
                      key={index}
                      index={index}
                      role={COLOR_ROLES[index]}
                      color={color}
                      onChange={(next) => setColor(index, next)}
                      onRemove={
                        draft.colors.length > MIN_COLORS
                          ? () => update({ colors: draft.colors.filter((_, position) => position !== index) })
                          : undefined
                      }
                    />
                  ))}
                  {draft.colors.length < MAX_COLORS && (
                    <button
                      type="button"
                      onClick={() =>
                        update({
                          colors: [...draft.colors, EXTRA_COLORS[draft.colors.length - MIN_COLORS] ?? '#2563EB'],
                        })
                      }
                      className="min-h-[140px] rounded-xl bg-white/50 hover:bg-white ring-1 ring-on-surface-variant/25 flex flex-col items-center justify-center gap-1.5 text-on-surface-variant hover:text-primary transition-all focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-2xl">
                        add_circle
                      </span>
                      <span className="font-label-ui text-[11px] font-semibold">
                        Thêm {COLOR_ROLES[draft.colors.length].toLowerCase()}
                      </span>
                    </button>
                  )}
                </div>
                {/* Gradient Blend Strip of the kit */}
                <div className="bg-white/60 rounded-xl p-2.5 flex flex-col gap-1.5 shadow-sm">
                  <div className="flex items-center justify-between font-cad-spec-micro text-[9px] text-on-surface-variant">
                    <span className="font-semibold uppercase tracking-wider">Dải màu thương hiệu</span>
                    <span className="font-bold text-primary">{swatchColors.length} màu</span>
                  </div>
                  <div className="h-3 w-full rounded-full overflow-hidden flex shadow-inner">
                    {swatchColors.map((color, index) => (
                      <div
                        key={`${color}-${index}`}
                        className={index === 2 ? 'w-12 h-full' : 'flex-1 h-full'}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div
                role={problems.colors ? 'alert' : undefined}
                className="ambient-pill px-3 py-2 rounded-xl flex items-center justify-between gap-2 font-cad-spec-micro text-[10px] text-on-surface-variant shrink-0"
              >
                <span className={`flex items-center gap-1.5 ${problems.colors ? 'text-error' : ''}`}>
                  <span
                    className={`w-1.5 h-1.5 shrink-0 rounded-full ${problems.colors ? 'bg-error' : 'bg-emerald-500'}`}
                  />
                  {problems.colors ?? 'Mã HEX 6 ký tự, lưu đúng thứ tự trên'}
                </span>
                <span className="text-primary font-semibold">Chi tiết ICC Profile</span>
              </div>
            </section>
            {/* COLUMN 2: TYPOGRAPHY & CON DẤU KÝ SỐ */}
            <section
              id="bk-type"
              aria-labelledby="bk-type-title"
              className="scroll-mt-28 ambient-card rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all duration-300 hover:shadow-lg h-full overflow-hidden"
            >
              <div className="flex flex-col gap-3 min-h-0">
                <div className="flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-secondary/15 text-secondary flex items-center justify-center text-[11px] font-bold font-cad-dimension">
                      02
                    </span>
                    <div>
                      <h2
                        id="bk-type-title"
                        className="font-label-ui text-xs font-bold text-on-surface tracking-wide uppercase"
                      >
                        {'Typography & Con Dấu Ký Số'}
                      </h2>
                      <p className="font-cad-spec-micro text-[10px] text-on-surface-variant/80">
                        {'Font chữ, slogan & logo thương hiệu'}
                      </p>
                    </div>
                  </div>
                  <span className="font-cad-spec-micro text-[9px] px-2 py-0.5 rounded-full bg-secondary-container text-secondary font-semibold">
                    RELIEF SAFE
                  </span>
                </div>
                {/* Typography Multi-Scale Specimen */}
                <div className="bg-white/80 rounded-xl p-3 flex flex-col gap-2 shadow-sm">
                  <div className="flex items-center justify-between gap-2 font-cad-spec-micro text-[9px] text-on-surface-variant">
                    <span className="tracking-wider uppercase font-semibold truncate">
                      Headline Khắc Nổi Cắt Laze • {headingFont ?? 'Playfair Display'}
                    </span>
                    <span className="shrink-0 font-cad-dimension text-[9px] text-primary font-medium">
                      Caliper Test: 0.45mm
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div
                      className="font-headline-lg text-lg text-on-surface italic tracking-tight leading-snug break-words"
                      style={headingFont ? { fontFamily: `"${headingFont}", serif` } : undefined}
                    >
                      {draft.slogan.trim() || 'Bespoke Luxury Outer Box'}
                    </div>
                    <div
                      className="font-display-hero text-sm text-on-surface-variant/90 tracking-wide"
                      style={bodyFont ? { fontFamily: `"${bodyFont}", serif` } : undefined}
                    >
                      The Quick Brown Fox 0123456789
                    </div>
                    <div
                      className="font-body-md text-xs text-on-surface-variant/75"
                      style={accentFont ? { fontFamily: `"${accentFont}", sans-serif` } : undefined}
                    >
                      Độ tương phản nét thanh nét đậm chuẩn xác dập nhiệt
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 pt-1 font-cad-spec-micro text-[9px] text-on-surface-variant">
                    <div className="bg-white/90 p-1.5 rounded-lg flex flex-col">
                      <span className="text-on-surface-variant/70 text-[8px]">KERNING</span>
                      <span className="text-on-surface font-semibold text-[10px]">Optical +25</span>
                    </div>
                    <div className="bg-white/90 p-1.5 rounded-lg flex flex-col">
                      <span className="text-on-surface-variant/70 text-[8px]">MIN EMBOSS</span>
                      <span className="text-on-surface font-semibold text-[10px]">18pt / 0.4mm</span>
                    </div>
                    <div className="bg-white/90 p-1.5 rounded-lg flex flex-col">
                      <span className="text-on-surface-variant/70 text-[8px]">CREASE RULE</span>
                      <span className="text-on-surface font-semibold text-[10px]">0.50mm Crease</span>
                    </div>
                  </div>
                </div>
                <FontListEditor fonts={draft.fonts} onChange={(fonts) => update({ fonts })} />
                {/* Slogan */}
                <div className="bg-white/80 rounded-xl p-3 flex flex-col gap-1.5 shadow-sm">
                  <div className="flex items-center justify-between font-cad-spec-micro text-[9px] text-on-surface-variant">
                    <label htmlFor="bk-slogan" className="tracking-wider uppercase font-semibold">
                      Slogan
                    </label>
                    <span className={`font-cad-dimension text-[9px] ${problems.slogan ? 'text-error font-bold' : ''}`}>
                      {sloganLength}/{SLOGAN_MAX_LENGTH}
                    </span>
                  </div>
                  <input
                    id="bk-slogan"
                    value={draft.slogan}
                    onChange={(event) => update({ slogan: event.target.value })}
                    placeholder="Ví dụ: Gói trọn yêu thương"
                    autoComplete="off"
                    aria-invalid={Boolean(problems.slogan)}
                    aria-describedby={problems.slogan ? 'bk-slogan-error' : undefined}
                    className="w-full min-h-[44px] px-3 rounded-lg bg-surface-container-low/70 text-sm text-on-surface placeholder:text-on-surface-variant/60 select-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-error"
                  />
                  {problems.slogan && (
                    <p id="bk-slogan-error" className="font-body-md text-[11px] text-error">
                      {problems.slogan}
                    </p>
                  )}
                </div>
                {/* Brand logo & Digital Vector Seal */}
                <div className="grid grid-cols-2 gap-2.5">
                  <BrandLogoTile
                    logoUrl={draft.logoUrl}
                    placeholder={user?.shopName || 'Logo'}
                    onChange={(logoUrl) => update({ logoUrl })}
                  />
                  <div className="bg-white/80 hover:bg-white rounded-xl p-2.5 flex flex-col justify-between items-center text-center group transition-all shadow-sm">
                    <div className="h-20 flex items-center justify-center">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center shadow-sm"
                        style={{ backgroundColor: swatchColors[0] ?? '#1A362B' }}
                      >
                        <svg
                          className="text-tertiary-fixed"
                          fill="none"
                          height="20"
                          viewBox="0 0 48 48"
                          width="20"
                          aria-hidden="true"
                        >
                          <circle cx="24" cy="24" r="21" stroke="currentColor" strokeDasharray="2 3" strokeWidth="2" />
                          <path d="M24 10V38M14 18L34 30M14 30L34 18" stroke="currentColor" strokeWidth="2" />
                        </svg>
                      </div>
                    </div>
                    <div className="w-full flex items-center justify-between font-cad-spec-micro text-[9px] text-on-surface-variant pt-1.5 border-t border-black/5">
                      <span className="font-medium">Sáp Nổi Đồng 0.8mm</span>
                      <span className="material-symbols-outlined text-[14px] text-outline group-hover:text-primary transition-colors">
                        download
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="ambient-pill px-3 py-2 rounded-xl flex items-center justify-between gap-2 font-cad-spec-micro text-[10px] text-on-surface-variant shrink-0">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                  {'Đã kiểm tra an toàn vát cạnh CNC & Dập nổi'}
                </span>
                <span className="text-primary font-semibold">Tải trọn bộ Vector (.AI/.DXF)</span>
              </div>
            </section>
            {/* COLUMN 3: CHẤT LIỆU GIẤY & BÌA KÝ GỬI (no API, D6) */}
            <section
              id="bk-materials"
              className="scroll-mt-28 ambient-card rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all duration-300 hover:shadow-lg h-full overflow-hidden"
            >
              <div className="flex flex-col gap-3 min-h-0">
                <div className="flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-tertiary/15 text-tertiary flex items-center justify-center text-[11px] font-bold font-cad-dimension">
                      03
                    </span>
                    <div>
                      <h2 className="font-label-ui text-xs font-bold text-on-surface tracking-wide uppercase">
                        {'Chất Liệu Giấy & Bìa Ký Gửi'}
                      </h2>
                      <p className="font-cad-spec-micro text-[10px] text-on-surface-variant/80">
                        {'Mẫu bề mặt xúc giác & định lượng PBR'}
                      </p>
                    </div>
                  </div>
                  <span className="font-cad-spec-micro text-[9px] px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-medium">
                    PBR SHADERS
                  </span>
                </div>
                {/* Material Grid with Rich Specs */}
                <div className="grid grid-cols-2 gap-2.5">
                  {MATERIAL_SAMPLES.map((sample) => (
                    <div
                      key={sample.name}
                      className="bg-white/80 hover:bg-white rounded-xl p-2 flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-sm group"
                    >
                      <div
                        className="h-16 w-full rounded-lg bg-cover bg-center relative overflow-hidden shadow-inner group-hover:scale-[1.01] transition-transform"
                        style={{ backgroundImage: `url('${sample.image}')` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent flex items-end justify-between p-1.5">
                          <span className="font-cad-dimension text-[9px] text-white font-medium">
                            {sample.thickness}
                          </span>
                          <span className="font-cad-spec-micro text-[8px] px-1 py-0.5 rounded bg-white/20 text-white backdrop-blur-md">
                            {sample.tag}
                          </span>
                        </div>
                      </div>
                      <div className="px-1 pt-1.5 flex flex-col gap-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-headline-sm text-xs font-semibold text-on-surface truncate">
                            {sample.name}
                          </span>
                          <span className="font-cad-spec-micro text-[8px] px-1.5 py-0.5 rounded-full bg-surface-container-high font-bold text-on-surface-variant">
                            {sample.gsm}
                          </span>
                        </div>
                        <div className="flex items-center justify-between font-cad-spec-micro text-[8px] text-on-surface-variant/75">
                          <span className="">{sample.specs[0]}</span>
                          <span className="">{sample.specs[1]}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="ambient-pill px-3 py-2 rounded-xl flex items-center justify-between gap-2 font-cad-spec-micro text-[10px] text-on-surface-variant shrink-0">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
                  Mẫu vật lý sẵn sàng tại kho ký gửi (3.200 tờ)
                </span>
                <span className="text-primary font-semibold">Đặt hộp swatch mẫu</span>
              </div>
            </section>
          </div>
          {/* Save bar: stays in reach of the thumb above the mobile bottom navigation */}
          <div className="sticky bottom-24 md:bottom-4 z-30 ambient-pill px-4 py-2 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-cad-spec-micro text-[11px] text-on-surface shrink-0 shadow-sm">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${dirty ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                <span className="font-semibold text-primary" aria-live="polite">
                  {save.isPending ? 'ĐANG LƯU…' : dirty ? 'CHƯA LƯU:' : kit ? 'ĐÃ LƯU:' : 'CHƯA CÓ BRAND KIT:'}
                </span>
                <span>
                  {`${draft.colors.length} màu · ${draft.fonts.length} font${draft.logoUrl ? ' · có logo' : ''}`}
                </span>
              </div>
              <span className="text-on-surface-variant/40 hidden md:inline">|</span>
              <div className="hidden md:flex items-center gap-2 text-on-surface-variant">
                <span className="">
                  {'Vật liệu đã gán: '}
                  <strong className="text-on-surface font-semibold">Giấy Kẹp Bông 350 GSM + Carton 2.1mm</strong>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {dirty && (
                <button
                  type="button"
                  onClick={reset}
                  disabled={save.isPending}
                  className="min-h-[44px] px-3.5 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low font-label-ui text-[11px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
                >
                  Huỷ thay đổi
                </button>
              )}
              <button
                type="button"
                onClick={submit}
                disabled={!canSave}
                aria-disabled={save.isPending}
                className="min-h-[44px] px-5 rounded-full bg-primary text-on-primary enabled:hover:bg-primary-container font-label-ui text-[12px] font-semibold shadow-sm flex items-center gap-1.5 transition-all enabled:active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed aria-disabled:cursor-wait focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <span
                  aria-hidden="true"
                  className={`material-symbols-outlined text-[16px] ${save.isPending ? 'animate-spin motion-reduce:animate-none' : ''}`}
                >
                  {save.isPending ? 'progress_activity' : 'save'}
                </span>
                {save.isPending ? 'Đang lưu…' : 'Lưu Brand Kit'}
              </button>
            </div>
          </div>
        </main>{' '}
      </div>
      <MainFooter />{' '}
    </div>
  );
}

/** Paper samples of column 3: static content of the Stitch screen. */
const MATERIAL_SAMPLES = [
  {
    name: 'Giấy Kẹp Bông',
    image: '/stitch/img/eccd4e30f0e4768a.jpg',
    thickness: 'Dày: 0.42 mm',
    tag: 'FSC® 100%',
    gsm: '350 GSM',
    specs: ['Độ xốp Bulk: 1.45', 'Độ ẩm: 6.5%'],
  },
  {
    name: 'Kraft Nâu Mộc',
    image: '/stitch/img/7b5628e1ca1cb23e.jpg',
    thickness: 'Dày: 0.38 mm',
    tag: 'Eco Kraft',
    gsm: '300 GSM',
    specs: ['Kháng rách: 240 mN', 'Tái sinh 100%'],
  },
  {
    name: 'Carton Lạnh',
    image: '/stitch/img/99a87a6ce2e2b8e8.jpg',
    thickness: 'Dày: 2.10 mm',
    tag: 'Cốt Cứng Hộp',
    gsm: '1400 GSM',
    specs: ['Chịu nén: 8.5 kN/m', 'Cắt CNC 90°'],
  },
  {
    name: 'Couche Velvet',
    image: '/stitch/img/25e7980e3c0cb668.jpg',
    thickness: 'Dày: 0.32 mm',
    tag: 'Phủ Mờ Mịn',
    gsm: '300 GSM',
    specs: ['Độ bóng 15%', 'Phủ UV cục bộ OK'],
  },
] as const;
