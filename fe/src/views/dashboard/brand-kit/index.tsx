'use client';

/**
 * `/dashboard/brand-kit` in the pacdora.com workspace style, wired to `PATCH /users/me/brand-kit`: 3–5 colours, up to
 * 3 fonts, a slogan and a logo (upload purpose LOGO), saved as a whole. The preview applies the draft to a box face.
 */

import { Plus, Save } from 'lucide-react';
import React from 'react';
import { outlineButton, primaryButton } from '@/components/library';
import { Badge, Panel, PanelTitle, WORKSPACE_INPUT, WorkspaceShell } from '@/components/workspace';
import { useToast } from '@/components/common/Toast';
import { RequireAuth, useAuth } from '@/features/auth';
import { HEX_COLOR, readableInk } from '@/features/dashboard';
import {
  BrandLogoTile,
  BrandSwatch,
  COLOR_ROLES,
  EXTRA_COLORS,
  FontListEditor,
  MAX_COLORS,
  MAX_FONTS,
  MIN_COLORS,
  SLOGAN_MAX_LENGTH,
  brandKitProblems,
  isPdfUrl,
  toBrandKitRequest,
  useBrandKitDraft,
  useUpdateBrandKit,
  type BrandKitDraft,
} from '@/features/profile';
import { cn } from '@/utils/helpers';

export default function DashboardBrandKitPage() {
  return (
    <RequireAuth>
      <DashboardBrandKitScreen />
    </RequireAuth>
  );
}

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

  const setColor = (index: number, color: string) => update({ colors: draft.colors.map((current, position) => (position === index ? color : current)) });

  const submit = () => {
    if (!canSave || save.isPending) return;
    save.mutate(toBrandKitRequest(draft), {
      onSuccess: (saved) => {
        markSaved(saved.brandKit);
        toast.show({ tone: 'success', title: 'Đã lưu bộ nhận diện', description: 'Màu, font, logo và slogan sẵn sàng để dùng trong studio.' });
      },
      onError: (error) => toast.error(error, 'Không lưu được bộ nhận diện'),
    });
  };

  const status = save.isPending ? 'Đang lưu…' : dirty ? 'Có thay đổi chưa lưu' : kit ? 'Đã lưu' : 'Chưa có bộ nhận diện';
  const actions = (
    <>
      {dirty && (
        <button type="button" onClick={reset} disabled={save.isPending} className={outlineButton}>
          Huỷ thay đổi
        </button>
      )}
      <button type="button" onClick={submit} disabled={!canSave} aria-disabled={save.isPending} className={cn(primaryButton, 'disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-wait')}>
        <Save className={cn('size-4', save.isPending && 'animate-pulse motion-reduce:animate-none')} aria-hidden />
        {save.isPending ? 'Đang lưu…' : 'Lưu bộ nhận diện'}
      </button>
    </>
  );

  return (
    <WorkspaceShell title="Bộ nhận diện" description="Logo, bảng màu, font và slogan của thương hiệu: áp lên mọi hộp chỉ với một cú nhấp trong studio." actions={actions}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-7">
          <Panel aria-labelledby="bk-colors">
            <PanelTitle id="bk-colors" action={<Badge>{`${draft.colors.length}/${MAX_COLORS} màu`}</Badge>}>
              Bảng màu
            </PanelTitle>
            <p className="-mt-2 mb-4 text-sm text-library-sub">
              {MIN_COLORS}–{MAX_COLORS} màu theo thứ tự: màu chính, màu nhấn, màu nền, rồi các màu phụ.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {draft.colors.map((color, index) => (
                <BrandSwatch
                  // Positions carry the meaning (primary, accent…): the index is the identity.
                  key={index}
                  index={index}
                  role={COLOR_ROLES[index]}
                  color={color}
                  onChange={(next) => setColor(index, next)}
                  onRemove={draft.colors.length > MIN_COLORS ? () => update({ colors: draft.colors.filter((_, position) => position !== index) }) : undefined}
                />
              ))}
              {draft.colors.length < MAX_COLORS && (
                <button
                  type="button"
                  onClick={() => update({ colors: [...draft.colors, EXTRA_COLORS[draft.colors.length - MIN_COLORS] ?? '#2563EB'] })}
                  className="flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-library-ink/40 text-sm text-library-sub transition-colors hover:border-library-ink hover:bg-library-panel hover:text-library-ink outline-none focus-visible:ring-[3px] focus-visible:ring-library-ink/20"
                >
                  <Plus className="size-5" aria-hidden />
                  Thêm {COLOR_ROLES[draft.colors.length].toLowerCase()}
                </button>
              )}
            </div>
            <p role={problems.colors ? 'alert' : undefined} className={cn('mt-3 text-sm', problems.colors ? 'text-danger-fg' : 'text-library-muted')}>
              {problems.colors ?? 'Mã HEX 6 ký tự, ví dụ #2D5C0F.'}
            </p>
          </Panel>

          <Panel aria-labelledby="bk-fonts">
            <PanelTitle id="bk-fonts" action={<Badge>{`${draft.fonts.length}/${MAX_FONTS} font`}</Badge>}>
              Font chữ
            </PanelTitle>
            <FontListEditor fonts={draft.fonts} onChange={(fonts) => update({ fonts })} />
          </Panel>

          <Panel aria-labelledby="bk-identity">
            <PanelTitle id="bk-identity">Logo &amp; slogan</PanelTitle>
            <BrandLogoTile logoUrl={draft.logoUrl} placeholder={user?.shopName || 'Logo'} onChange={(logoUrl) => update({ logoUrl })} />
            <div className="mt-5 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="bk-slogan" className="text-sm font-medium text-library-ink">
                  Slogan
                </label>
                <span className={cn('font-mono text-xs', problems.slogan ? 'text-danger-fg' : 'text-library-muted')}>
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
                className={WORKSPACE_INPUT}
              />
              {problems.slogan && (
                <p id="bk-slogan-error" className="text-sm text-danger-fg">
                  {problems.slogan}
                </p>
              )}
            </div>
          </Panel>
        </div>

        <div className="lg:col-span-5">
          <div className="flex flex-col gap-4 lg:sticky lg:top-24">
            <BrandPreview draft={draft} shopName={user?.shopName ?? null} />
            <p aria-live="polite" className="flex items-center gap-2 text-sm text-library-sub">
              <span aria-hidden className={cn('size-2 rounded-full', dirty || !kit ? 'bg-warning' : 'bg-fpt-orange')} />
              {status} · {draft.colors.length} màu · {draft.fonts.length} font{draft.logoUrl ? ' · có logo' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Phones: the save buttons stay in reach above the bottom navigation. */}
      <div className="sticky bottom-24 z-30 mt-6 flex justify-end gap-2 rounded-2xl border border-library-line bg-white/95 p-2 shadow-soft-16 lg:hidden">{actions}</div>
    </WorkspaceShell>
  );
}

/** The draft applied to the front of a box and a round sticker, as the studio would. */
function BrandPreview({ draft, shopName }: { draft: BrandKitDraft; shopName: string | null }) {
  const colors = draft.colors.filter((color) => HEX_COLOR.test(color));
  const primary = colors[0] ?? '#2D5C0F';
  const accent = colors[1] ?? '#98E665';
  const background = colors[2] ?? '#F7F5F0';
  const heading = draft.fonts[0] ? `"${draft.fonts[0]}", serif` : undefined;
  const body = draft.fonts[1] ? `"${draft.fonts[1]}", sans-serif` : heading;
  const wordmark = shopName || 'Thương hiệu';
  const showLogo = draft.logoUrl && !isPdfUrl(draft.logoUrl);

  return (
    <section aria-label="Xem trước" className="rounded-squircle-md border-[1.5px] border-library-ink bg-library-tile p-5 shadow-hard">
      <p className="text-sm font-medium text-library-ink">Xem trước trên hộp</p>
      <div className="mt-4 flex items-end justify-center gap-5">
        <div className="relative flex aspect-[4/5] w-[58%] max-w-[240px] flex-col overflow-hidden rounded-md border border-black/15 shadow-soft-16" style={{ backgroundColor: background }}>
          <div className="h-[14%]" style={{ backgroundColor: primary }} />
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
            {showLogo ? (
              <img src={draft.logoUrl!} alt="" className="max-h-14 max-w-[80%] object-contain" />
            ) : (
              <span className="truncate text-sm font-medium uppercase tracking-[0.25em]" style={{ color: primary, fontFamily: heading }}>
                {wordmark}
              </span>
            )}
            <span className="h-px w-10" style={{ backgroundColor: accent }} />
            <span className="line-clamp-3 break-words text-lg leading-snug" style={{ color: primary, fontFamily: heading }}>
              {draft.slogan.trim() || 'Gói trọn yêu thương'}
            </span>
          </div>
          {/* ds-allow: band of the miniature box preview, scaled with the box (artwork, not reading text). */}
          <div className="flex h-[10%] items-center justify-center text-cad-spec-micro uppercase tracking-[0.2em]" style={{ backgroundColor: accent, color: readableInk(accent), fontFamily: body }}>
            Handmade · Gift box
          </div>
        </div>
        <div
          className="mb-2 flex size-20 shrink-0 items-center justify-center rounded-full border-4 text-center text-overline uppercase leading-tight tracking-wider"
          style={{ backgroundColor: primary, borderColor: accent, color: readableInk(primary), fontFamily: body }}
        >
          Thank
          <br />
          you
        </div>
      </div>
      <div className="mt-5 flex h-3 overflow-hidden rounded-full" aria-hidden>
        {colors.map((color, index) => (
          <span key={`${color}-${index}`} className="flex-1" style={{ backgroundColor: color }} />
        ))}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-white px-3 py-2">
          <dt className="text-xs text-library-muted">Tiêu đề</dt>
          <dd className="truncate text-library-ink" style={{ fontFamily: heading }}>
            {draft.fonts[0] ?? 'Mặc định'}
          </dd>
        </div>
        <div className="rounded-lg bg-white px-3 py-2">
          <dt className="text-xs text-library-muted">Nội dung</dt>
          <dd className="truncate text-library-ink" style={{ fontFamily: body }}>
            {draft.fonts[1] ?? draft.fonts[0] ?? 'Mặc định'}
          </dd>
        </div>
      </dl>
    </section>
  );
}
