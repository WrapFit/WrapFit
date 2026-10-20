"use client";

import { Bell, Box, ChevronDown, CircleAlert, Download, FileDown, Heart, Layers, Package, Plus, Ruler, Settings, Share2, Trash2 } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import {
  BREAKPOINTS,
  GRID,
  MIN_TEXT_PX,
  PALETTE,
  RADII,
  SEMANTIC_COLORS,
  contrastRatio,
  type ThemeMode,
  SPACING,
  TOKEN_CHANGELOG,
  TOKENS_VERSION,
  TYPE_SCALE,
} from "@/assets/styles/tokens";
import { Carousel, Container } from "@/components/landing";
import { useToast } from "@/components/common/Toast";
import { SitePage, PageHero } from "@/components/site";
import {
  Accordion,
  Alert,
  Avatar,
  Badge,
  Banner,
  Breadcrumb,
  Button,
  ButtonLink,
  Card,
  CardHeader,
  Checkbox,
  CountBadge,
  DataTable,
  DatePicker,
  Dialog,
  Drawer,
  DropdownMenu,
  FadeIn,
  Field,
  Input,
  LoadingState,
  NumberStepper,
  RadioGroup,
  SearchBar,
  Select,
  Skeleton,
  SkeletonText,
  Slider,
  Spinner,
  Switch,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Textarea,
  Tooltip,
  ProductTour,
  VirtualList,
  startTour,
  type DateRange,
  type TourStep,
} from "@/components/ui";
import { cn } from "@/utils/helpers";

/** Value of a semantic token in one theme; "#FFFFFF"-style literals pass through. */
const tokenValue = (name: string, mode: ThemeMode) => {
  if (name.startsWith("#")) return name;
  const found = SEMANTIC_COLORS.find((t) => t.name === name);
  if (!found) throw new Error(`Unknown token ${name}`);
  return mode === "dark" ? found.dark : found.value;
};

/** Pairs checked in each theme: [text, background]. `large` = 3:1 rule (large text, icons, control borders). */
const PAIRS: { fg: string; bg: string; label: string; large?: boolean }[] = [
  { fg: "fg", bg: "canvas", label: "fg trên canvas" },
  { fg: "fg", bg: "surface-raised", label: "fg trên surface-raised" },
  { fg: "fg-muted", bg: "surface-raised", label: "fg-muted trên surface-raised" },
  { fg: "fg-muted", bg: "surface-sunken", label: "fg-muted trên surface-sunken" },
  { fg: "action-fg", bg: "action", label: "chữ trắng trên action (nút chính cam, lựa chọn thương hiệu: chỉ đạt mức chữ lớn)", large: true },
  { fg: "fg-inverse", bg: "fg", label: "fg-inverse trên fg (nút tối, tab đang chọn)" },
  { fg: "accent-contrast", bg: "accent", label: "accent-contrast trên accent (ô đã chọn)" },
  { fg: "accent-fg", bg: "accent-bg", label: "accent-fg trên accent-bg" },
  { fg: "success-fg", bg: "success-bg", label: "success-fg trên success-bg" },
  { fg: "warning-fg", bg: "warning-bg", label: "warning-fg trên warning-bg" },
  { fg: "danger-fg", bg: "danger-bg", label: "danger-fg trên danger-bg" },
  { fg: "info-fg", bg: "info-bg", label: "info-fg trên info-bg" },
  { fg: "#FFFFFF", bg: "danger-solid", label: "chữ trắng trên danger-solid (nút xoá, badge)" },
  { fg: "#FFFFFF", bg: "success-solid", label: "chữ trắng trên success-solid (badge đặc)" },
  { fg: "line-strong", bg: "surface-raised", label: "line-strong (viền input)", large: true },
  { fg: "focus", bg: "surface-raised", label: "focus ring trên surface-raised", large: true },
  { fg: "danger", bg: "surface-raised", label: "icon lỗi trên surface-raised", large: true },
];

/** Colour-vision filters (Machado et al. 2009, full severity), applied to the page to check states stay readable. */
const VISION = [
  { id: "none", label: "Thị lực thường", matrix: "" },
  { id: "protanopia", label: "Protanopia (mù đỏ)", matrix: "0.152286 1.052583 -0.204868 0 0 0.114503 0.786281 0.099216 0 0 -0.003882 -0.048116 1.051998 0 0 0 0 0 1 0" },
  { id: "deuteranopia", label: "Deuteranopia (mù lục)", matrix: "0.367322 0.860646 -0.227968 0 0 0.280085 0.672501 0.047413 0 0 -0.01182 0.04294 0.968881 0 0 0 0 0 1 0" },
  { id: "tritanopia", label: "Tritanopia (mù lam)", matrix: "1.255528 -0.076749 -0.178779 0 0 -0.078411 0.930809 0.147602 0 0 0.004733 0.691367 0.3039 0 0 0 0 0 1 0" },
  { id: "achromatopsia", label: "Mù màu hoàn toàn", matrix: "0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0 0 0 1 0" },
] as const;

const NAV = [
  { id: "nguyen-tac", label: "Nguyên tắc" },
  { id: "mau", label: "Màu" },
  { id: "chu", label: "Chữ" },
  { id: "khoang-cach", label: "Khoảng cách & lưới" },
  { id: "tiep-can", label: "Tiếp cận" },
  { id: "thanh-phan", label: "Thành phần" },
  { id: "thay-doi", label: "Thay đổi" },
];

/**
 * One part of the catalogue: a heading button with the lead, and a panel that slides open (grid rows 0fr → 1fr, so
 * the height animates without measuring). Closed panels stay mounted but inert, out of the tab order.
 */
function Fold({ id, title, lead, open, onToggle, children }: { id: string; title: string; lead?: React.ReactNode; open: boolean; onToggle(): void; children: React.ReactNode }) {
  const headId = `${id}-head`;
  const panelId = `${id}-panel`;
  return (
    <section id={id} className="scroll-mt-24">
      <h2>
        <button
          id={headId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="group flex w-full items-start justify-between gap-4 rounded-panel py-5 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40 sm:py-6"
        >
          <span className="flex min-w-0 flex-col gap-1">
            <span className="font-landing-heading text-heading-md text-fg transition-colors group-hover:text-fpt-orange-ink">{title}</span>
            {lead && <span className="text-body-sm text-fg-muted">{lead}</span>}
          </span>
          <span
            aria-hidden
            className={cn(
              "mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full transition-[transform,background-color,color] duration-300 motion-reduce:transition-none",
              open ? "rotate-180 bg-fpt-orange text-white" : "bg-surface-sunken text-fg group-hover:bg-fpt-orange-light group-hover:text-fpt-orange-ink",
            )}
          >
            <ChevronDown className="size-5" />
          </span>
        </button>
      </h2>
      <div
        id={panelId}
        role="region"
        aria-labelledby={headId}
        className="grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none"
        style={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0 }}
      >
        <div className="min-h-0 overflow-hidden" inert={!open}>
          <div className="pb-8 pt-1">{children}</div>
        </div>
      </div>
    </section>
  );
}

function Demo({ title, note, children, className }: { title: string; note?: React.ReactNode; children: React.ReactNode; className?: string }) {
  const id = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <Card as="article" padding="md" aria-labelledby={id} className={cn("flex flex-col gap-4", className)}>
      <div>
        <h3 id={id} className="font-landing-heading text-heading-sm text-fg">
          {title}
        </h3>
        {note && <p className="mt-1 text-body-sm text-fg-muted">{note}</p>}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </Card>
  );
}

const DEMO_TOUR_ID = "design-system-demo";
const DEMO_TOUR: TourStep[] = [
  { target: '[data-tour="ds-tour-start"]', title: "Một tính năng được làm nổi bật", body: "Phần còn lại tối đi, tooltip nằm cạnh phần tử, tự đổi phía khi thiếu chỗ.", mascot: "presenting" },
  { target: '[data-tour="ds-tour-badge"]', title: "Gắn data-tour lên phần tử", body: "Mỗi bước trỏ tới một bộ chọn CSS; phần tử không có trên màn hình thì bước đó được bỏ qua.", mascot: "folding" },
  { title: "Bước không có đích", body: "Thẻ nằm giữa màn hình: dùng cho lời chào và lời kết.", mascot: "celebration" },
];

const VIRTUAL_ROWS = Array.from({ length: 5000 }, (_, index) => ({ id: index + 1, name: `Hộp nắp gài · đơn ${index + 1}` }));

const ROWS = [
  { id: "1", name: "Hộp nắp gài · Nến thơm", format: "PDF CMYK", status: "Đã xuất", score: 96, date: new Date(2026, 9, 12) },
  { id: "2", name: "Hộp âm dương · Trà", format: "DXF", status: "Đang xử lý", score: 88, date: new Date(2026, 9, 14) },
  { id: "3", name: "Hộp gối · Trang sức", format: "SVG", status: "Lỗi", score: 71, date: new Date(2026, 9, 2) },
];

export default function DesignSystemPage() {
  const toast = useToast();
  const [tab, setTab] = useState("flat");
  const [radio, setRadio] = useState("tuck");
  const [checked, setChecked] = useState(true);
  const [on, setOn] = useState(true);
  const [length, setLength] = useState(120);
  const [fold, setFold] = useState(60);
  const [query, setQuery] = useState("");
  const [date, setDate] = useState<Date | null>(new Date(2026, 9, 20, 9, 30));
  const [range, setRange] = useState<DateRange>({ from: null, to: null });
  const [dialog, setDialog] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [alertOpen, setAlertOpen] = useState(true);
  const [loaded, setLoaded] = useState(true);
  const virtualScrollRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<ThemeMode>("light");
  const [vision, setVision] = useState<(typeof VISION)[number]["id"]>("none");
  const [openFolds, setOpenFolds] = useState<ReadonlySet<string>>(() => new Set());
  const toggleFold = (id: string) =>
    setOpenFolds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  useEffect(() => {
    const openFromHash = () => {
      const id = window.location.hash.slice(1);
      if (NAV.some((item) => item.id === id)) setOpenFolds((current) => new Set(current).add(id));
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, []);

  return (
    <SitePage theme={mode}>
      <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
        {VISION.filter((v) => v.matrix).map((v) => (
          <filter key={v.id} id={`vision-${v.id}`}>
            <feColorMatrix type="matrix" values={v.matrix} />
          </filter>
        ))}
      </svg>
      <div style={vision === "none" ? undefined : { filter: `url(#vision-${vision})` }}>
      <PageHero
        breadcrumb={[{ label: "Trang chủ", href: "/" }, { label: "Design system" }]}
        title="WrapFit Design System"
        subtitle={`Token ${TOKENS_VERSION} · ${SEMANTIC_COLORS.length} màu ngữ nghĩa · ${TYPE_SCALE.length} kiểu chữ`}
        lead="Một nguồn cho màu, chữ, khoảng cách và thành phần giao diện của WrapFit: dáng pack.ly cho trang giới thiệu (mực slate, nút lime, thẻ trắng bo 32 px), dáng Pacdora cho thư viện mẫu và workspace (ô xám, viền đen mảnh). Mọi ví dụ dưới đây là component thật trong code."
        meta={
          <div className="flex flex-col gap-4">
            <nav aria-label="Mục lục design system" className="flex flex-wrap gap-2">
              {NAV.map((item) => (
                <a key={item.id} href={`#${item.id}`} onClick={() => setOpenFolds((current) => new Set(current).add(item.id))} className="rounded-full bg-surface-raised px-3 py-1.5 text-label text-fg ring-1 ring-line hover:bg-surface-sunken">
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
              <Switch
                checked={mode === "dark"}
                onChange={(next) => setMode(next ? "dark" : "light")}
                label="Xem ở chế độ tối"
                description="Đổi data-theme của trang; component đổi màu theo token."
              />
              <div className="w-full sm:w-64">
                <Field label="Mô phỏng thị lực màu">
                  {(props) => (
                    <Select {...props} value={vision} onChange={(event) => setVision(event.target.value as typeof vision)}>
                      {VISION.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.label}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              </div>
            </div>
          </div>
        }
      />

      <Container className="py-section lg:py-section-lg">
        <div className="divide-y divide-line rounded-card bg-surface-raised px-5 ring-1 ring-line sm:px-8">
      <Fold id="nguyen-tac" open={openFolds.has("nguyen-tac")} onToggle={() => toggleFold("nguyen-tac")} title="Nguyên tắc" lead="Ba tầng token: primitive → ngữ nghĩa → component. Trang dùng component, component dùng token ngữ nghĩa.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { title: "Token trước, giá trị tay sau", text: "Màu, cỡ chữ, khoảng cách, bo góc lấy từ src/assets/styles/tokens.ts. Một hex, rounded-[…] hay text-[Npx] trong className cần chú thích lý do; npm run tokens:check liệt kê chúng." },
            { title: "Một component cho một việc", text: "Nút là Button, thẻ là Card, hộp thoại là Dialog. Không viết lại chuỗi class nút trong từng trang: thêm variant vào component nếu thiếu." },
            { title: "WCAG 2.2 AA", text: "Chữ ≥ 4.5:1 (chữ lớn và viền control ≥ 3:1), focus nhìn thấy được, dùng được bằng bàn phím, không truyền nghĩa chỉ bằng màu, chữ đọc ≥ 12 px." },
          ].map((item) => (
            <Card key={item.title}>
              <h3 className="text-title text-fg">{item.title}</h3>
              <p className="mt-2 text-body-sm text-fg-muted">{item.text}</p>
            </Card>
          ))}
        </div>
      </Fold>

      <Fold id="mau" open={openFolds.has("mau")} onToggle={() => toggleFold("mau")} title="Màu ngữ nghĩa" lead="Đặt tên theo mục đích, không theo sắc độ. Dùng: text-fg, bg-canvas, bg-action, text-danger-fg, border-line-strong… Mỗi màu là biến CSS --ds-* nên có thể đổi theme mà không sửa component.">
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SEMANTIC_COLORS.map((token) => (
            <li key={token.name} className="flex gap-3 rounded-panel border border-line bg-surface-raised p-3">
              <span className="flex size-12 shrink-0 overflow-hidden rounded-xl ring-1 ring-inset ring-fg/10" aria-hidden>
                <span className="flex-1" style={{ backgroundColor: token.value }} />
                <span className="flex-1" style={{ backgroundColor: token.dark }} />
              </span>
              <div className="min-w-0">
                <p className="font-mono text-label-sm text-fg">{token.name}</p>
                <p className="font-mono text-caption text-fg-muted">
                  sáng {token.value} · tối {token.dark} · {token.cssVar}
                </p>
                <p className="mt-1 text-caption text-fg">{token.use}</p>
                {token.avoid && <p className="text-caption text-danger-fg">Không dùng: {token.avoid}</p>}
              </div>
            </li>
          ))}
        </ul>

        <h3 className="mt-10 font-landing-heading text-heading-sm text-fg">Dải primitive</h3>
        <p className="mt-1 text-body-sm text-fg-muted">
          Token ngữ nghĩa trỏ vào một bước của các dải này (ví dụ fg = neutral 800 ở theme sáng, neutral 100 ở theme tối). Trang không dùng dải trực tiếp.
        </p>
        <div className="mt-4 flex flex-col gap-3">
          {Object.entries(PALETTE).map(([name, ramp]) => (
            <div key={name} className="grid grid-cols-1 gap-2 sm:grid-cols-[6rem_minmax(0,1fr)] sm:items-center">
              <p className="font-mono text-label-sm text-fg">{name}</p>
              <ul className="grid grid-cols-6 gap-1 sm:grid-cols-[repeat(13,minmax(0,1fr))]">
                {Object.entries(ramp).map(([step, hex]) => (
                  <li key={step} className="flex flex-col gap-1">
                    <span className="h-9 rounded-md ring-1 ring-inset ring-fg/10" style={{ backgroundColor: hex }} aria-hidden />
                    <span className="font-mono text-cad-spec-micro text-fg-muted">
                      {step}
                      <span className="sr-only"> {hex}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <h3 className="mt-10 font-landing-heading text-heading-sm text-fg">Tương phản đã kiểm tra · theme {mode === "dark" ? "tối" : "sáng"}</h3>
        <p className="mt-1 text-body-sm text-fg-muted">
          Tính trực tiếp theo công thức WCAG từ giá trị token của theme đang xem. Chữ thường cần 4.5:1; chữ lớn, icon và viền control cần 3:1.
        </p>
        <div role="region" aria-label="Bảng tương phản" tabIndex={0} className="mt-4 overflow-x-auto rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40">
          <table className="w-full min-w-[560px] text-left text-body-sm">
            <thead>
              <tr className="border-b border-line text-fg-muted">
                <th scope="col" className="py-2 pr-3 font-medium">Mẫu</th>
                <th scope="col" className="px-3 py-2 font-medium">Cặp màu</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Tỉ lệ</th>
                <th scope="col" className="py-2 pl-3 text-right font-medium">Kết quả</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {PAIRS.map((pair) => {
                const [fgHex, bgHex] = [tokenValue(pair.fg, mode), tokenValue(pair.bg, mode)];
                const ratio = contrastRatio(fgHex, bgHex);
                const pass = ratio >= (pair.large ? 3 : 4.5);
                return (
                  <tr key={pair.label}>
                    <td className="py-2 pr-3">
                      {pair.large ? (
                        // Non-text pairs (control border, focus ring, icon) are shown as what they are: a border and an icon.
                        <span className="inline-flex h-8 items-center gap-2 rounded-lg px-3" style={{ backgroundColor: bgHex, boxShadow: "inset 0 0 0 1px rgba(124,139,161,.35)" }} aria-hidden>
                          <span className="size-5 rounded-md" style={{ boxShadow: `inset 0 0 0 2px ${fgHex}` }} />
                          <CircleAlert className="size-5" style={{ color: fgHex }} />
                        </span>
                      ) : (
                        <span className="inline-flex h-8 items-center rounded-lg px-3 font-semibold" style={{ color: fgHex, backgroundColor: bgHex, boxShadow: "inset 0 0 0 1px rgba(124,139,161,.35)" }}>
                          Aa Hộp quà
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-fg">{pair.label}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-fg">{ratio.toFixed(2)}:1</td>
                    <td className="py-2 pl-3 text-right">
                      <Badge tone={pass ? "success" : "danger"} dot>
                        {pass ? (pair.large ? "AA (≥ 3:1)" : ratio >= 7 ? "AAA" : "AA") : "Chưa đạt"}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <h3 className="mt-10 font-landing-heading text-heading-sm text-fg">Mù màu</h3>
        <p className="mt-1 text-body-sm text-fg-muted">
          Chọn “Mô phỏng thị lực màu” ở đầu trang để xem cả trang qua bộ lọc. Các trạng thái dưới đây phải phân biệt được ở mọi chế độ: mỗi lớp dieline có kiểu nét riêng, mỗi trạng thái có chữ và icon.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card variant="panel" padding="sm">
            <p className="mb-3 text-label text-fg">Lớp dieline</p>
            <ul className="flex flex-col gap-2.5">
              {[
                { label: "Đường cắt", note: "liền", className: "dieline-cut" },
                { label: "Đường gấp", note: "gạch 4-4", className: "dieline-crease" },
                { label: "Tràn lề", note: "chấm 2-2", className: "dieline-bleed" },
                { label: "Vùng an toàn", note: "chấm 3-3", className: "dieline-safe-margin" },
              ].map((layer) => (
                <li key={layer.label} className="flex items-center gap-3">
                  <svg width="72" height="8" viewBox="0 0 72 8" aria-hidden>
                    <line x1="0" y1="4" x2="72" y2="4" className={layer.className} style={{ strokeWidth: 2 }} />
                  </svg>
                  <span className="text-body-sm text-fg">{layer.label}</span>
                  <span className="font-mono text-caption text-fg-muted">{layer.note}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card variant="panel" padding="sm">
            <p className="mb-3 text-label text-fg">Kết quả FitCheck</p>
            <div className="flex flex-col gap-2">
              <Alert tone="success" title="Đạt: mọi chữ nằm trong vùng an toàn 3 mm" />
              <Alert tone="warning" title="Cảnh báo: ảnh nền chỉ tràn 1.5 mm (cần ≥ 2 mm)" />
              <Alert tone="danger" title="Lỗi: logo đè lên tai dán" />
            </div>
          </Card>
        </div>
      </Fold>

      <Fold id="chu" open={openFolds.has("chu")} onToggle={() => toggleFold("chu")} title="Chữ" lead={`Be Vietnam Pro cho tiêu đề, Inter cho nội dung, control và số đo mm (chữ số đều độ rộng). Thang tỉ lệ ~1.25; cỡ display co giãn theo màn hình bằng clamp(). Cỡ nhỏ nhất: ${MIN_TEXT_PX.reading} px cho chữ đọc, ${MIN_TEXT_PX.monoLabel} px cho nhãn kỹ thuật mono.`}>
        <div className="divide-y divide-line rounded-card bg-surface-raised px-5 ring-1 ring-fg/10 sm:px-8">
          {TYPE_SCALE.map((style) => (
            <div key={style.name} className="grid grid-cols-1 gap-2 py-5 md:grid-cols-[14rem_minmax(0,1fr)] md:items-baseline">
              <div>
                <p className="font-mono text-label-sm text-fg">text-{style.name}</p>
                <p className="font-mono text-caption text-fg-muted">
                  {style.size.startsWith("clamp") ? style.size.replace("clamp(", "").replace(")", "").split(",").filter((_, i) => i !== 1).join(" → ") : style.size} · lh {style.lineHeight}
                  {style.letterSpacing ? ` · ls ${style.letterSpacing}` : ""} · {style.weight ?? "đậm kế thừa"}
                </p>
              </div>
              <div className="min-w-0">
                <p className={cn(`text-${style.name}`, style.name.startsWith("cad") ? "font-mono" : style.name.startsWith("display") || style.name.startsWith("heading") || style.name === "title" ? "font-landing-heading" : "", style.name === "overline" && "uppercase", "text-fg")}>
                  {style.name.startsWith("cad") ? "L 120 × W 80 × H 60 · t 0.42 mm" : "Thiết kế chiếc hộp ôm trọn món quà"}
                </p>
                <p className="mt-1 text-caption text-fg-muted">{style.use}</p>
              </div>
            </div>
          ))}
        </div>
      </Fold>

      <Fold id="khoang-cach" open={openFolds.has("khoang-cach")} onToggle={() => toggleFold("khoang-cach")} title="Khoảng cách, lưới và breakpoint" lead="Nền là thang 4 px của Tailwind. Token có tên cho các quyết định lặp lại: chiều cao control, padding thẻ, khoảng giữa section.">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card variant="panel">
            <CardHeader title="Token khoảng cách" description="Trong component: control-*, stack-*, card-*. Giữa các khối trang: section-*." />
            <ul className="flex flex-col gap-2">
              {Object.entries(SPACING).map(([name, token]) => (
                <li key={name} className="grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-3">
                  <span className="font-mono text-caption text-fg">{name}</span>
                  <span className="flex items-center gap-2">
                    <span className="h-3 rounded-sm bg-action" style={{ width: token.value }} aria-hidden />
                    <span className="text-caption text-fg-muted">
                      {token.value} · {token.use}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
          <div className="flex flex-col gap-6">
            <Card variant="panel">
              <CardHeader title="Lưới cột" description="Container giữ lề; cột chỉ để căn bố cục, không bắt buộc mọi khối." />
              <DataTable
                label="Lưới cột theo breakpoint"
                columns={[
                  { key: "at", label: "Màn hình", render: (row) => row.at },
                  { key: "columns", label: "Cột", align: "right", render: (row) => row.columns },
                  { key: "gutter", label: "Gutter", align: "right", render: (row) => row.gutter },
                  { key: "margin", label: "Lề", align: "right", render: (row) => row.margin },
                ]}
                rows={[...GRID]}
                rowKey={(row) => row.at}
                density="compact"
              />
            </Card>
            <Card variant="panel">
              <CardHeader title="Breakpoint" description="Dùng sm/md/lg/xl/2xl trong class; trong script dùng mediaUp('md')." />
              <ul className="flex flex-wrap gap-2">
                {Object.entries(BREAKPOINTS).map(([name, px]) => (
                  <li key={name}>
                    <Badge variant="outline">
                      {name} · {px}px
                    </Badge>
                  </li>
                ))}
              </ul>
            </Card>
            <Card variant="panel">
              <CardHeader title="Bo góc" />
              <ul className="flex flex-wrap gap-4">
                {Object.entries(RADII).map(([name, token]) => (
                  <li key={name} className="flex flex-col items-center gap-1.5">
                    <span className="size-16 border-2 border-fg bg-surface-sunken" style={{ borderRadius: token.value }} aria-hidden />
                    <span className="font-mono text-caption text-fg">rounded-{name}</span>
                    <span className="text-caption text-fg-muted">{token.value}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </Fold>

      <Fold id="tiep-can" open={openFolds.has("tiep-can")} onToggle={() => toggleFold("tiep-can")} title="Tiếp cận" lead="Mục tiêu WCAG 2.2 AA cho mọi trang mới và mọi component chung.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <h3 className="text-title text-fg">Bàn phím</h3>
            <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-body-sm text-fg-muted">
              <li>Tab đi qua mọi control theo thứ tự đọc; focus luôn có viền cobalt 2–3 px.</li>
              <li>Tabs, menu, radio: ←/→ hoặc ↑/↓ di chuyển; Home/End về đầu/cuối.</li>
              <li>Enter và Space kích hoạt; Escape đóng menu, dialog, drawer, tooltip, lịch.</li>
              <li>Dialog giữ focus bên trong và trả focus về nút đã mở nó.</li>
            </ul>
          </Card>
          <Card>
            <h3 className="text-title text-fg">Trước khi gộp một component</h3>
            <ul className="mt-3 flex flex-col gap-1">
              {["Tương phản chữ ≥ 4.5:1, viền control ≥ 3:1", "Dùng được hoàn toàn bằng bàn phím", "Vai trò, nhãn và trạng thái ARIA đúng mẫu WAI-ARIA", "Vùng chạm ≥ 44 × 44 px trên mobile", "Không truyền nghĩa chỉ bằng màu", "Zoom 200% không mất nội dung", "Thử với VoiceOver (Safari) và NVDA (Chrome)", "Có prefers-reduced-motion"].map((item) => (
                <li key={item}>
                  <Checkbox compact checked readOnly label={item} />
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </Fold>

      <Fold id="thanh-phan" open={openFolds.has("thanh-phan")} onToggle={() => toggleFold("thanh-phan")} title="Thành phần" lead="Import từ @/components/ui. Mỗi ví dụ dùng được thật: bấm, gõ, dùng bàn phím.">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Demo title="Button" note="primary (lime) một lần mỗi màn hình; secondary, outline, dark, ghost, danger, link. Ba cỡ, hình pill hoặc rounded, trạng thái loading.">
            <div className="flex flex-wrap gap-2">
              <Button leadingIcon={<Plus />}>Tạo hộp mới</Button>
              <Button variant="secondary">Xem mẫu</Button>
              <Button variant="outline" shape="rounded">
                Xuất PDF
              </Button>
              <Button variant="dark">Đăng nhập</Button>
              <Button variant="ghost" leadingIcon={<Share2 />}>
                Chia sẻ
              </Button>
              <Button variant="danger" leadingIcon={<Trash2 />}>
                Xoá
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm">Nhỏ 36</Button>
              <Button size="md">Vừa 40</Button>
              <Button size="lg">Lớn 44</Button>
              <Button loading loadingLabel="Đang xuất…">
                Xuất
              </Button>
              <Button disabled>Không khả dụng</Button>
              <Tooltip content="Tải file in đã xuất">
                <Button variant="secondary" size="icon" aria-label="Tải xuống">
                  <Download />
                </Button>
              </Tooltip>
              <ButtonLink href="#thanh-phan" variant="link">
                Xem thêm
              </ButtonLink>
            </div>
          </Demo>

          <Demo title="Badge" note="Trạng thái theo tone, luôn có chữ; CountBadge đặt lệch ra ngoài góc của phần tử.">
            <div className="flex flex-wrap gap-2">
              <Badge tone="success" dot>
                Đã xuất
              </Badge>
              <Badge tone="warning" dot>
                Dữ liệu mẫu
              </Badge>
              <Badge tone="danger" dot>
                Lỗi FitCheck
              </Badge>
              <Badge tone="info">Mới</Badge>
              <Badge>Bản nháp</Badge>
              <Badge tone="success" variant="solid">
                Pro
              </Badge>
            </div>
            <div className="flex items-center gap-6">
              <CountBadge count={3} label="3 thông báo chưa đọc">
                <Button variant="secondary" size="icon" aria-label="Thông báo">
                  <Bell />
                </Button>
              </CountBadge>
              <CountBadge count={128} label="128 hộp trong giỏ">
                <Button variant="secondary" size="icon" aria-label="Giỏ in mẫu">
                  <Package />
                </Button>
              </CountBadge>
              <Avatar name="Nguyễn Văn An" size="lg" status="online" />
              <Avatar name="Trần Thị Bích" src={null} size="md" />
              <Avatar name="Lê Minh" size="sm" fallbackClassName="bg-fg text-fg-inverse" />
            </div>
          </Demo>

          <Demo title="Field, Input, Select, Textarea" note="Nhãn luôn hiện, hint dưới field, lỗi có icon và nối aria-describedby.">
            <Field label="Tên shop" hint="Hiện trên hộp và trên trang chia sẻ." required>
              {(props) => <Input {...props} placeholder="Ví dụ: Tiệm nến Hạ" />}
            </Field>
            <Field label="Email nhận hoá đơn" error="Email chưa đúng dạng, ví dụ ten@cuahang.vn">
              {(props) => <Input {...props} type="email" defaultValue="ten@cuahang" leadingIcon={<FileDown />} />}
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Chất liệu">
                {(props) => (
                  <Select {...props} defaultValue="ivory">
                    <option value="ivory">Ivory 300 GSM</option>
                    <option value="kraft">Kraft 350 GSM</option>
                  </Select>
                )}
              </Field>
              <Field label="Độ dày giấy t" hint="mm, theo định lượng giấy">
                {(props) => <Input {...props} inputMode="decimal" defaultValue="0.42" trailing="mm" />}
              </Field>
            </div>
            <Field label="Lời nhắn trên hộp">
              {(props) => <Textarea {...props} placeholder="Chúc mừng sinh nhật!" />}
            </Field>
          </Demo>

          <Demo title="Checkbox, Radio, Switch" note="Cả hàng là vùng bấm; radio luôn có một lựa chọn sẵn; switch áp dụng ngay.">
            <Checkbox checked={checked} onChange={(event) => setChecked(event.target.checked)} label="Hiện đường bleed 2 mm" description="Nền phải tràn ra ngoài đường cắt." />
            <Checkbox checked={false} indeterminate onChange={() => undefined} label="Tất cả lớp dieline" />
            <Checkbox disabled checked={false} onChange={() => undefined} label="Xuất DXF (gói Pro)" />
            <RadioGroup
              label="Cấu trúc hộp"
              value={radio}
              onChange={setRadio}
              variant="card"
              options={[
                { value: "tuck", label: "Hộp nắp gài", description: "Bán lẻ, quà tặng", icon: <Box /> },
                { value: "lid", label: "Hộp âm dương", description: "Hộp cứng hai mảnh", icon: <Layers /> },
                { value: "pillow", label: "Hộp gối", description: "Trang sức, phụ kiện", disabled: true },
              ]}
            />
            <Switch checked={on} onChange={setOn} label="Tự lưu khi chỉnh sửa" description="Lưu bản nháp mỗi 30 giây." />
          </Demo>

          <Demo title="NumberStepper, Slider" note="Số đo mm: − / +, gõ trực tiếp, ↑/↓ (Shift ×10), giới hạn min/max, làm tròn theo bước.">
            <div className="flex flex-wrap items-center gap-4">
              <NumberStepper label="Chiều dài" unit="mm" value={length} onChange={setLength} min={20} max={600} size="lg" />
              <NumberStepper label="Số lượng" unit="hộp" value={20} onChange={() => undefined} min={20} max={500} step={10} size="sm" />
            </div>
            <Slider label="Độ gập" value={fold} onChange={setFold} min={0} max={100} format={(value) => `${value}%`} marks={[{ value: 0, label: "Phẳng" }, { value: 50, label: "Nửa gập" }, { value: 100, label: "Đóng" }]} />
          </Demo>

          <Demo title="DatePicker" note="Tuần bắt đầu thứ Hai, DD/MM/YYYY, gõ hoặc chọn trên lịch, ngày quá khứ bị khoá, có giờ hoặc khoảng ngày.">
            <DatePicker label="Ngày giao mẫu in" value={date} onChange={setDate} min={new Date()} withTime hint="Xưởng giao trong giờ hành chính." />
            <DatePicker mode="range" label="Khoảng ngày xuất file" value={range} onChange={setRange} />
          </Demo>

          <Demo title="SearchBar" note="Gợi ý khi gõ, tìm gần đây khi ô trống, nút Tìm, ↓/↑ và Escape.">
            <SearchBar
              label="Tìm mẫu hộp"
              placeholder="Tìm mẫu hộp, cấu trúc…"
              value={query}
              onChange={setQuery}
              onSubmit={(value) => toast.show({ title: `Tìm “${value}”` })}
              suggestions={["Hộp nắp gài nến thơm", "Hộp gối trang sức", "Hộp âm dương trà"].filter((item) => item.toLowerCase().includes(query.toLowerCase())).map((label) => ({ id: label, label, hint: "Mẫu hộp" }))}
              historyKey="design-system-demo"
              size="md"
            />
          </Demo>

          <Demo title="Tabs, Accordion" note="Tabs theo mẫu WAI-ARIA (←/→); accordion một hoặc nhiều mục mở.">
            <Tabs value={tab} onValueChange={setTab}>
              <TabList label="Chế độ xem">
                <Tab value="flat" icon={<Ruler />}>
                  Dieline 2D
                </Tab>
                <Tab value="box" icon={<Box />}>
                  Hộp 3D
                </Tab>
                <Tab value="spec" count={4}>
                  Thông số
                </Tab>
              </TabList>
              <TabPanel value="flat" className="pt-3 text-body-sm text-fg-muted">Bản vẽ phẳng với đường cắt, đường gấp và bleed.</TabPanel>
              <TabPanel value="box" className="pt-3 text-body-sm text-fg-muted">Hộp gập 3D, xoay và mở nắp.</TabPanel>
              <TabPanel value="spec" className="pt-3 text-body-sm text-fg-muted">L, W, H, t và chất liệu.</TabPanel>
            </Tabs>
            <Tabs value={tab} onValueChange={setTab} variant="segmented">
              <TabList label="Chế độ xem (Pacdora)">
                <Tab value="flat">2D</Tab>
                <Tab value="box">3D</Tab>
                <Tab value="spec">Spec</Tab>
              </TabList>
            </Tabs>
            <Accordion
              items={[
                { id: "a", title: "Bleed là gì?", content: "Phần nền tràn ra ngoài đường cắt ≥ 2 mm để không lộ viền trắng khi bế." },
                { id: "b", title: "Vùng an toàn bao nhiêu?", content: "Chữ, logo, mã vạch cách đường gấp và đường cắt ≥ 3 mm." },
                { id: "c", title: "Xuất DXF (gói Pro)", content: "", disabled: true },
              ]}
              defaultOpen={["a"]}
            />
          </Demo>

          <Demo title="Alert, Banner" note="Nói rõ chuyện gì xảy ra và cần làm gì; icon riêng mỗi loại; chỉ info/success đóng được.">
            {alertOpen && (
              <Alert tone="success" title="Đã lưu thiết kế" onDismiss={() => setAlertOpen(false)}>
                Bản nháp được lưu lúc 09:41. Bạn có thể đóng tab an toàn.
              </Alert>
            )}
            <Alert tone="danger" title="Logo đè lên nếp gấp" action={<Button size="sm" variant="danger">Tự sửa (dời 3 mm)</Button>}>
              Logo nằm cách đường gấp 1,2 mm, cần ≥ 3 mm để không bị gãy khi gập.
            </Alert>
            <Banner tone="info" title="Gói Pro có thêm xuất DXF" description="Dùng cho máy bế phẳng của xưởng in." dismissKey="design-system-demo" action={<Button size="sm" variant="secondary">Xem gói</Button>} />
            <Banner tone="warning" title="Bảo trì 22:00–23:00 hôm nay" description="Xuất file in tạm dừng trong thời gian này." />
          </Demo>

          <Demo title="Toast" note="Góc dưới phải (trên cùng ở mobile); tự ẩn sau 4.5–8 s, dừng khi rê chuột hoặc focus; có nút đóng.">
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => toast.show({ tone: "success", title: "Đã xuất PDF", description: "File in đã sẵn sàng trong Đơn hàng." })}>
                Thành công
              </Button>
              <Button variant="secondary" onClick={() => toast.show({ tone: "warning", title: "Ảnh dưới 200 DPI", description: "In ra có thể bị mờ ở kích thước này." })}>
                Cảnh báo
              </Button>
              <Button variant="secondary" onClick={() => toast.show({ tone: "error", title: "Không xuất được file", description: "Kiểm tra mạng rồi thử lại." })}>
                Lỗi
              </Button>
              <Button variant="secondary" onClick={() => toast.show({ title: "Đã sao chép link" })}>
                Thông tin
              </Button>
            </div>
          </Demo>

          <Demo title="Dialog, Drawer, Dropdown menu, Breadcrumb">
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setDialog(true)}>
                Mở dialog
              </Button>
              <Button variant="secondary" onClick={() => setDrawer(true)}>
                Mở drawer
              </Button>
              <DropdownMenu
                label="Thao tác với dự án"
                items={[
                  { id: "label", type: "label", label: "Dự án" },
                  { id: "dup", label: "Nhân bản", icon: <Plus />, shortcut: "Ctrl+D" },
                  { id: "share", label: "Chia sẻ", icon: <Share2 />, children: [{ id: "link", label: "Sao chép link" }, { id: "qr", label: "Mã QR mở hộp" }] },
                  { id: "pro", label: "Xuất DXF (Pro)", icon: <FileDown />, disabled: true },
                  { id: "sep", type: "separator" },
                  { id: "del", label: "Chuyển vào thùng rác", icon: <Trash2 />, danger: true },
                ]}
                renderTrigger={(props) => (
                  <Button {...props} variant="secondary" trailingIcon={<Settings />}>
                    Thao tác
                  </Button>
                )}
              />
            </div>
            <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Dự án", href: "/dashboard/projects" }, { label: "Bộ sưu tập Tết", href: "/dashboard/projects" }, { label: "Hộp nắp gài", href: "/dashboard/projects" }, { label: "Hộp nến thơm 120 × 80 × 60" }]} />
          </Demo>

          <Demo title="Card" note="soft (marketing), outline (Pacdora), panel (workspace), tile (khối lồng).">
            <div className="grid grid-cols-2 gap-3">
              <Card padding="sm">
                <p className="text-label text-fg">soft</p>
              </Card>
              <Card variant="outline" padding="sm">
                <p className="text-label text-fg">outline</p>
              </Card>
              <Card variant="panel" padding="sm">
                <p className="text-label text-fg">panel</p>
              </Card>
              <Card variant="tile" padding="sm">
                <p className="text-label text-fg">tile</p>
              </Card>
            </div>
          </Demo>

          <Demo title="Skeleton, Loading" note="Skeleton cùng kích thước nội dung, mờ dần sang nội dung thật; spinner chỉ hiện sau 300 ms.">
            <Button variant="secondary" size="sm" onClick={() => setLoaded((value) => !value)}>
              {loaded ? "Xem trạng thái đang tải" : "Hiện nội dung"}
            </Button>
            {loaded ? (
              <FadeIn className="flex items-center gap-3">
                <Avatar name="Tiệm nến Hạ" />
                <div>
                  <p className="text-body-sm font-semibold text-fg">Tiệm nến Hạ</p>
                  <p className="text-caption text-fg-muted">12 dự án · FitCheck trung bình 92</p>
                </div>
              </FadeIn>
            ) : (
              <div className="flex items-center gap-3">
                <Skeleton shape="circle" className="size-10" />
                <SkeletonText lines={2} className="w-48" />
              </div>
            )}
            <div className="flex items-center gap-4">
              <Spinner label="Đang tải" />
              <LoadingState label="Đang xuất file in…" detail="Thường mất khoảng 20 giây." mascot="delivery" delayMs={0} className="py-2" />
            </div>
          </Demo>

          <Demo title="Product tour" note="Lần đầu vào trang: màn hình tối đi, một tính năng được khoét sáng, tooltip giải thích. Phím → / ← / Esc, Tab nằm trong tooltip; đã xem thì không tự mở lại.">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="brand" size="sm" onClick={() => startTour(DEMO_TOUR_ID)} data-tour="ds-tour-start">
                Chạy thử hướng dẫn
              </Button>
              <span data-tour="ds-tour-badge">
                <Badge tone="info">data-tour=&quot;…&quot;</Badge>
              </span>
            </div>
            <ProductTour id={DEMO_TOUR_ID} steps={DEMO_TOUR} autoStart={false} />
          </Demo>

          <Demo title="VirtualList" note="5 000 dòng nhưng chỉ vài chục dòng gần màn hình nằm trong DOM; chiều cao từng dòng được đo khi hiện ra, vị trí dùng transform.">
            <div ref={virtualScrollRef} className="h-72 overflow-y-auto rounded-panel border border-line" tabIndex={0} aria-label="Danh sách 5 000 file in mẫu">
              <VirtualList
                items={VIRTUAL_ROWS}
                getKey={(row) => row.id}
                estimateHeight={48}
                scrollRef={virtualScrollRef}
                aria-label="File in mẫu"
                renderItem={(row) => (
                  <div className="flex h-12 items-center justify-between border-b border-line px-4 text-body-sm">
                    <span className="text-fg">{row.name}</span>
                    <span className="font-mono text-caption tabular-nums text-fg-muted">#{row.id}</span>
                  </div>
                )}
              />
            </div>
          </Demo>

          <Demo title="DataTable" note="Ô lọc (bỏ dấu, không phân biệt hoa thường), bấm tiêu đề cột để sắp xếp (aria-sort); dưới md mỗi hàng thành một thẻ." className="lg:col-span-2">
            <DataTable
              label="File in mẫu"
              search={{ label: "Lọc file in", placeholder: "Tên dự án, định dạng…", text: (row) => `${row.name} ${row.format} ${row.status}` }}
              mobile="cards"
              rows={ROWS}
              rowKey={(row) => row.id}
              initialSort={{ key: "date", direction: "desc" }}
              columns={[
                { key: "name", label: "Dự án", primary: true, sortValue: (row) => row.name, render: (row) => <span className="font-medium">{row.name}</span> },
                { key: "format", label: "Định dạng", sortValue: (row) => row.format, render: (row) => <span className="font-mono text-caption">{row.format}</span> },
                { key: "status", label: "Trạng thái", render: (row) => <Badge tone={row.status === "Đã xuất" ? "success" : row.status === "Lỗi" ? "danger" : "info"} dot>{row.status}</Badge> },
                { key: "score", label: "FitCheck", align: "right", sortValue: (row) => row.score, render: (row) => <span className="font-mono tabular-nums">{row.score}</span> },
                { key: "date", label: "Ngày", align: "right", sortValue: (row) => row.date, render: (row) => row.date.toLocaleDateString("vi-VN") },
              ]}
            />
          </Demo>

          <Demo title="Carousel" note="Nút trước/sau, vuốt, thanh vị trí “3–4 / 8”." className="lg:col-span-2">
            <Carousel label="Mẫu hộp nổi bật" slideClassName="w-56">
              {Array.from({ length: 8 }, (_, i) => (
                <Card key={i} padding="sm" className="flex h-36 flex-col justify-between">
                  <Heart className="size-5 text-fg-muted" aria-hidden />
                  <p className="text-label text-fg">Mẫu hộp {i + 1}</p>
                </Card>
              ))}
            </Carousel>
          </Demo>
        </div>
      </Fold>

      <Fold id="thay-doi" open={openFolds.has("thay-doi")} onToggle={() => toggleFold("thay-doi")} title="Thay đổi token" lead="Mỗi thay đổi giá trị token được ghi kèm phiên bản và ngày để các trang biết ảnh hưởng.">
        <Container className="px-0 lg:px-0">
          {TOKEN_CHANGELOG.map((entry) => (
            <Card key={entry.version} variant="panel">
              <CardHeader title={`v${entry.version}`} description={entry.date} />
              <ul className="flex list-disc flex-col gap-1 pl-5 text-body-sm text-fg-muted">
                {entry.changes.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
            </Card>
          ))}
        </Container>
      </Fold>
        </div>
      </Container>

      {dialog && (
        <Dialog
          title="Xuất file in"
          description="PDF CMYK 300 DPI · lớp CutContour, Crease, Artwork"
          icon={<FileDown />}
          onClose={() => setDialog(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDialog(false)}>
                Huỷ
              </Button>
              <Button onClick={() => setDialog(false)}>Xuất PDF</Button>
            </>
          }
        >
          <RadioGroup
            label="Định dạng"
            value="pdf"
            onChange={() => undefined}
            variant="card"
            options={[
              { value: "pdf", label: "PDF CMYK", description: "Cho xưởng in offset" },
              { value: "svg", label: "SVG", description: "Chỉnh sửa tiếp trong Illustrator" },
            ]}
          />
        </Dialog>
      )}
      {drawer && (
        <Drawer
          title="Chi tiết dự án"
          description="Hộp nến thơm 120 × 80 × 60 mm"
          onClose={() => setDrawer(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDrawer(false)}>
                Huỷ
              </Button>
              <Button onClick={() => setDrawer(false)}>Lưu</Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <Field label="Tên dự án">{(props) => <Input {...props} defaultValue="Hộp nến thơm" />}</Field>
            <Switch checked={on} onChange={setOn} label="Công khai trong thư viện cộng đồng" />
          </div>
        </Drawer>
      )}
      </div>
    </SitePage>
  );
}
