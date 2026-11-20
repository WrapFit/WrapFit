/**
 * Partner print shops of the offline demo: the same four partners the migration seeds
 * (`be/prisma/migrations/20261120000100_print_partners`), ranked with the same function as the API
 * (`matchPrintShops` of @wrapfit/shared), so the demo recommends the same shop as the real site.
 */

import {
  type BoxDimensions,
  type MatchableShop,
  generateDielinePieces,
  matchPrintShops,
  platformFeeSplit,
  PROVINCES,
  provinceOf,
} from "@wrapfit/shared";
import type { AdminPrintShop, PrintShop, PrintShopMatch } from "@/types/api";
import { badRequest, currentUser, MockHttpError, notFound, type Handler } from "../http";
import { db } from "../store";
import { ownProject } from "./projects";

const NOW = "2026-11-20T00:00:00.000Z";

export const MOCK_SHOPS: AdminPrintShop[] = [
  {
    id: "ps-sg-01",
    name: "In Bao Bì Sài Gòn Xanh",
    legalName: null,
    taxCode: null,
    provinceCode: "ho-chi-minh",
    city: "TP. Hồ Chí Minh",
    address: "Khu Công Nghiệp Tân Bình, P. Tây Thạnh, TP. Hồ Chí Minh",
    latitude: 10.807,
    longitude: 106.618,
    sheet: "B1 · 1020 × 720 mm",
    sheetSize: "B1 · 1020 × 720 mm",
    maxSheetMm: { width: 1020, height: 720 },
    services: ["Offset 4 màu", "Bế tự động", "Ép kim vàng", "Cắt kỹ thuật số phẳng Zero-MOQ"],
    methods: ["digital", "offset"],
    papers: ["ivory", "kraft", "duplex"],
    finishes: ["matte-lamination", "gloss-lamination", "foil"],
    windowPatching: true,
    minQuantity: 1,
    maxQuantity: 20000,
    leadTime: "3–5 ngày (Mẫu thử 24h)",
    leadTimeDays: 3,
    sampleLeadTimeDays: 1,
    dailyCapacity: 20,
    serviceProvinces: [],
    state: "active",
    status: "active",
    pausedUntil: null,
    probationUntil: null,
    rating: 4.9,
    completedOrders: 1420,
    contactEmail: "partner@saigonxanhprint.vn",
    phone: "028 3816 xxxx",
    zalo: null,
    platformFeeBps: 1500,
    activeOrders: 0,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "ps-hn-02",
    name: "Hộp Giấy Hà Thành",
    legalName: null,
    taxCode: null,
    provinceCode: "ha-noi",
    city: "Hà Nội",
    address: "Cụm Công Nghiệp Hai Bà Trưng, P. Vĩnh Tuy, Hà Nội",
    latitude: 21.0,
    longitude: 105.873,
    sheet: "B1 · 1020 × 720 mm",
    sheetSize: "B1 · 1020 × 720 mm",
    maxSheetMm: { width: 1020, height: 720 },
    services: ["Hộp cứng cao cấp", "Bồi carton sóng E", "Cán màng mờ Soft-Touch", "In mẫu thử"],
    methods: ["offset"],
    papers: ["ivory", "duplex", "rigid"],
    finishes: ["matte-lamination", "soft-touch-lamination", "foil", "emboss"],
    windowPatching: false,
    minQuantity: 1,
    maxQuantity: 20000,
    leadTime: "5–7 ngày (Mẫu thử 48h)",
    leadTimeDays: 5,
    sampleLeadTimeDays: 2,
    dailyCapacity: 15,
    serviceProvinces: [],
    state: "active",
    status: "active",
    pausedUntil: null,
    probationUntil: null,
    rating: 4.8,
    completedOrders: 980,
    contactEmail: "xuongin@hathanhbox.vn",
    phone: "024 3972 xxxx",
    zalo: null,
    platformFeeBps: 1500,
    activeOrders: 0,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "ps-dn-03",
    name: "Kraft Đà Nẵng CNC",
    legalName: null,
    taxCode: null,
    provinceCode: "da-nang",
    city: "Đà Nẵng",
    address: "Khu Công Nghiệp Hòa Khánh, Đà Nẵng",
    latitude: 16.073,
    longitude: 108.15,
    sheet: "B2 · 720 × 520 mm",
    sheetSize: "B2 · 720 × 520 mm",
    maxSheetMm: { width: 720, height: 520 },
    services: ["In kỹ thuật số nhanh", "Cắt laser & dao rung", "Giấy kraft tái chế"],
    methods: ["digital"],
    papers: ["ivory", "kraft"],
    finishes: [],
    windowPatching: false,
    minQuantity: 1,
    maxQuantity: 1000,
    leadTime: "2–3 ngày",
    leadTimeDays: 2,
    sampleLeadTimeDays: 2,
    dailyCapacity: 10,
    serviceProvinces: [],
    state: "active",
    status: "active",
    pausedUntil: null,
    probationUntil: null,
    rating: 4.7,
    completedOrders: 560,
    contactEmail: "danang@kraftprint.vn",
    phone: "0236 373 xxxx",
    zalo: null,
    platformFeeBps: 1500,
    activeOrders: 0,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "ps-ct-04",
    name: "Xưởng In Mộc Cần Thơ",
    legalName: null,
    taxCode: null,
    provinceCode: "can-tho",
    city: "Cần Thơ",
    address: "Khu Công Nghiệp Trà Nóc, Cần Thơ",
    latitude: 10.09,
    longitude: 105.72,
    sheet: "B2 · 720 × 520 mm",
    sheetSize: "B2 · 720 × 520 mm",
    maxSheetMm: { width: 720, height: 520 },
    services: ["In offset", "Cán màng bóng/mờ", "Bao bì nông sản"],
    methods: ["offset"],
    papers: ["ivory", "kraft", "duplex"],
    finishes: ["matte-lamination", "gloss-lamination"],
    windowPatching: false,
    minQuantity: 1,
    maxQuantity: 20000,
    leadTime: "5–7 ngày",
    leadTimeDays: 5,
    sampleLeadTimeDays: 3,
    dailyCapacity: 8,
    serviceProvinces: [],
    state: "review",
    status: "review",
    pausedUntil: null,
    probationUntil: null,
    rating: 4.6,
    completedOrders: 310,
    contactEmail: "cantho@mocprint.vn",
    phone: "0292 384 xxxx",
    zalo: null,
    platformFeeBps: 1500,
    activeOrders: 0,
    createdAt: NOW,
    updatedAt: NOW,
  },
];

const statusOf = (shop: AdminPrintShop) => shop.status ?? "active";

/** What a customer sees: no contact, no contract (like `toPublicShop` of the API). */
export function publicShop(shop: AdminPrintShop): PrintShop {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const { legalName, taxCode, latitude, longitude, dailyCapacity, serviceProvinces, probationUntil, contactEmail, phone, zalo, platformFeeBps, activeOrders, createdAt, updatedAt, ...rest } = shop;
  /* eslint-enable @typescript-eslint/no-unused-vars */
  return rest;
}

function queue(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const order of db().orders) {
    if (order.orderStatus === "PAID" || order.orderStatus === "IN_PRODUCTION") counts[order.printShopId ?? ""] = (counts[order.printShopId ?? ""] ?? 0) + 1;
  }
  return counts;
}

const matchable = (shop: AdminPrintShop): MatchableShop => ({
  id: shop.id,
  provinceCode: shop.provinceCode,
  lat: shop.latitude,
  lng: shop.longitude,
  status: statusOf(shop).toUpperCase() as MatchableShop["status"],
  pausedUntil: shop.pausedUntil ?? null,
  probationUntil: shop.probationUntil,
  maxSheetMm: shop.maxSheetMm ?? { width: 720, height: 520 },
  minQuantity: shop.minQuantity ?? 1,
  maxQuantity: shop.maxQuantity ?? 10000,
  leadTimeDays: shop.leadTimeDays ?? 3,
  sampleLeadTimeDays: shop.sampleLeadTimeDays ?? 2,
  dailyCapacity: shop.dailyCapacity,
  serviceProvinces: shop.serviceProvinces,
  rating: shop.rating ?? 0,
  completedOrders: shop.completedOrders ?? 0,
});

function flatOf(structure: string, dimensions: BoxDimensions, formulaVersion?: number) {
  try {
    let width = 0;
    let height = 0;
    for (const { geometry } of generateDielinePieces(structure, dimensions, formulaVersion)) {
      const { width: w, height: h } = geometry.totalBoundingBox;
      if (Math.max(w, h) > Math.max(width, height)) [width, height] = [w, h];
    }
    return { flatWidthMm: width, flatHeightMm: height };
  } catch {
    return { flatWidthMm: 0, flatHeightMm: 0 };
  }
}

/** Ranks the shops for these cart lines, like `PrintShopsService.match` (shops under review do not take part). */
export function matchShops(lines: { projectId: string; quantity?: number }[], provinceCode: string | null): PrintShopMatch {
  if (provinceCode && !provinceOf(provinceCode)) throw badRequest("Tỉnh / thành không hợp lệ");
  const user = currentUser();
  const items = lines.map((line) => {
    const project = ownProject(line.projectId);
    const formulaVersion = (project as unknown as { formulaVersion?: number }).formulaVersion;
    return { ...flatOf(project.template.id, project.dimensions as BoxDimensions, formulaVersion), quantity: Math.min(10, Math.max(1, Number(line.quantity) || 1)) };
  });
  const shops = MOCK_SHOPS.filter((shop) => statusOf(shop) !== "review");
  const returning = db()
    .orders.filter((o) => o.userId === user.id && o.orderStatus === "DELIVERED")
    .map((o) => o.printShopId ?? "");
  const result = matchPrintShops(shops.map(matchable), queue(), { kind: "sample", provinceCode, items, now: new Date(), returningShopIds: returning });
  const byId = new Map(shops.map((shop) => [shop.id, shop]));
  return {
    provinceCode,
    recommendedId: result.recommendedId,
    offers: result.matches.map(({ shopId, ...offer }) => ({ shop: publicShop(byId.get(shopId)!), ...offer })),
    excluded: result.excluded
      .filter(({ shopId }) => statusOf(byId.get(shopId)!) !== "suspended")
      .map(({ shopId, reasons }) => ({ shop: publicShop(byId.get(shopId)!), reasons })),
  };
}

/** The platform fee an order fixes at the shop's rate (docs/19 BR-A3). */
export function feeAt(shopId: string, subtotalVnd: number) {
  const shop = MOCK_SHOPS.find((s) => s.id === shopId);
  return platformFeeSplit({ subtotalVnd, totalVnd: subtotalVnd }, shop?.platformFeeBps);
}

const list: Handler = () => MOCK_SHOPS.filter((shop) => ["active", "paused"].includes(statusOf(shop))).map(publicShop);

const detail: Handler = ({ params }) => {
  const shop = MOCK_SHOPS.find((s) => s.id === params.id && ["active", "paused"].includes(statusOf(s)));
  if (!shop) throw notFound("Print shop partner not found");
  return publicShop(shop);
};

const provinces: Handler = () => PROVINCES.map(({ code, name, region }) => ({ code, name, region }));

const match: Handler = ({ body }) =>
  matchShops((Array.isArray(body.items) ? body.items : []) as { projectId: string; quantity?: number }[], (body.provinceCode as string) || null);

function requireAdmin() {
  if (currentUser().role !== "ADMIN") throw new MockHttpError(403, "Chỉ quản trị viên.");
}

const adminList: Handler = () => {
  requireAdmin();
  const counts = queue();
  return MOCK_SHOPS.map((shop) => ({ ...shop, activeOrders: counts[shop.id] ?? 0 }));
};

const adminUpdate: Handler = ({ params, body }) => {
  requireAdmin();
  const shop = MOCK_SHOPS.find((s) => s.id === params.id);
  if (!shop) throw notFound("Print shop partner not found");
  if (typeof body.status === "string") {
    shop.status = body.status.toLowerCase() as AdminPrintShop["status"];
    shop.state = shop.status;
  }
  for (const key of ["pausedUntil", "probationUntil", "platformFeeBps", "dailyCapacity", "minQuantity", "maxQuantity", "leadTimeDays", "sampleLeadTimeDays", "serviceProvinces"] as const) {
    if (key in body) (shop as unknown as Record<string, unknown>)[key] = body[key];
  }
  if ((shop.maxQuantity ?? 0) < (shop.minQuantity ?? 1)) throw badRequest("Số lượng tối đa phải từ số lượng tối thiểu trở lên");
  shop.updatedAt = new Date().toISOString();
  return { ...shop, activeOrders: queue()[shop.id] ?? 0 };
};

export const printShopRoutes: [string, string, Handler][] = [
  ["GET", "/print-shops", list],
  ["GET", "/print-shops/provinces", provinces],
  ["GET", "/print-shops/:id", detail],
  ["POST", "/orders/sample/match", match],
  ["GET", "/admin/print-shops", adminList],
  ["PATCH", "/admin/print-shops/:id", adminUpdate],
];
