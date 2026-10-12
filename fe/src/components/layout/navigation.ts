import { ROUTES } from "@/constants";
import { INDUSTRIES, INDUSTRY_LABELS, OCCASIONS, OCCASION_LABELS } from "@/features/templates/labels";
import type { BoxStructure } from "@/types/api";

// Menus of the site header and footer. Every entry is a page of the app or a filter of the template hub
// (`GET /templates/hub`); the box structures come from `GET /templates/structures`.

export interface NavLink {
  label: string;
  href: string;
  description?: string;
}

export interface NavGroup {
  id: string;
  label: string;
  links: NavLink[];
  /** Two columns in the dropdown. */
  wide?: boolean;
}

export const STUDIO_LINKS: NavLink[] = [
  { label: "Tạo dự án mới", href: ROUTES.editorNew, description: "Chọn cấu trúc hộp và nhập kích thước món quà" },
  { label: "Studio dùng thử", href: ROUTES.editorDemo, description: "Khuôn 2D và hộp 3D, không cần đăng nhập" },
  { label: "Dự án của tôi", href: ROUTES.projects, description: "Mở lại các thiết kế đã lưu" },
  { label: "Mở hộp bằng mã QR", href: ROUTES.unboxCode, description: "Nhập mã in kèm món quà để mở hộp 3D" },
];

export const RESOURCE_LINKS: NavLink[] = [
  { label: "Trung tâm hỗ trợ", href: "/support", description: "Câu trả lời về kích thước, FitCheck™, file in" },
  { label: "Bảng giá", href: "/pricing", description: "Gói Free, Starter và Pro Business" },
  { label: "Thiết kế cộng đồng", href: `${ROUTES.templates}?tab=community`, description: "Thiết kế công khai đạt FitCheck™ từ 90 điểm" },
  { label: "Đội ngũ & xưởng in", href: "/team", description: "Thành viên, quyền và xưởng in đối tác" },
];

export const INDUSTRY_LINKS: NavLink[] = [
  ...INDUSTRIES.map((industry) => ({ label: INDUSTRY_LABELS[industry], href: `${ROUTES.templates}?industry=${industry}` })),
  ...OCCASIONS.map((occasion) => ({ label: OCCASION_LABELS[occasion], href: `${ROUTES.templates}?occasion=${occasion}` })),
];

/** "Mẫu hộp": one entry per structure of the API, then the whole library. */
export function structureLinks(structures: BoxStructure[] | undefined): NavLink[] {
  return [
    ...(structures ?? []).map((structure) => ({
      label: structure.name,
      href: `${ROUTES.templates}?structure=${structure.id}`,
      description: structure.description ?? undefined,
    })),
    { label: "Tất cả mẫu hộp", href: ROUTES.templates, description: "Mẫu WrapFit Curated và thiết kế cộng đồng" },
  ];
}

export function navGroups(structures: BoxStructure[] | undefined): NavGroup[] {
  return [
    { id: "studio", label: "Studio", links: STUDIO_LINKS },
    { id: "mau-hop", label: "Mẫu hộp", links: structureLinks(structures) },
    { id: "nganh-hang", label: "Ngành hàng", links: INDUSTRY_LINKS, wide: true },
    { id: "tai-nguyen", label: "Tài nguyên", links: RESOURCE_LINKS },
  ];
}
