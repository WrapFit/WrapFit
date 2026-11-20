/**
 * Provinces of Vietnam after the 2025 reorganisation (34 provinces and cities, two administrative levels from
 * 2025-07-01), for structured shipping addresses and choosing a print shop (docs/19 BR-G15). `lat` / `lng` are the
 * approximate administrative centre: enough to rank shops by distance and estimate shipping days, not for routing.
 * Check the list against the official catalogue before going live (docs/19 G.3).
 */

export type Region = "north" | "central" | "south";

export interface Province {
  /** Stable slug used by the API and the database. */
  code: string;
  name: string;
  region: Region;
  lat: number;
  lng: number;
}

export const PROVINCES: readonly Province[] = [
  { code: "ha-noi", name: "Hà Nội", region: "north", lat: 21.028, lng: 105.854 },
  { code: "hai-phong", name: "Hải Phòng", region: "north", lat: 20.845, lng: 106.688 },
  { code: "quang-ninh", name: "Quảng Ninh", region: "north", lat: 20.959, lng: 107.042 },
  { code: "bac-ninh", name: "Bắc Ninh", region: "north", lat: 21.273, lng: 106.194 },
  { code: "hung-yen", name: "Hưng Yên", region: "north", lat: 20.646, lng: 106.051 },
  { code: "ninh-binh", name: "Ninh Bình", region: "north", lat: 20.251, lng: 105.975 },
  { code: "phu-tho", name: "Phú Thọ", region: "north", lat: 21.322, lng: 105.402 },
  { code: "thai-nguyen", name: "Thái Nguyên", region: "north", lat: 21.594, lng: 105.848 },
  { code: "tuyen-quang", name: "Tuyên Quang", region: "north", lat: 21.823, lng: 105.214 },
  { code: "lao-cai", name: "Lào Cai", region: "north", lat: 21.705, lng: 104.875 },
  { code: "lang-son", name: "Lạng Sơn", region: "north", lat: 21.853, lng: 106.761 },
  { code: "cao-bang", name: "Cao Bằng", region: "north", lat: 22.666, lng: 106.258 },
  { code: "son-la", name: "Sơn La", region: "north", lat: 21.327, lng: 103.914 },
  { code: "dien-bien", name: "Điện Biên", region: "north", lat: 21.386, lng: 103.023 },
  { code: "lai-chau", name: "Lai Châu", region: "north", lat: 22.396, lng: 103.458 },
  { code: "thanh-hoa", name: "Thanh Hóa", region: "central", lat: 19.807, lng: 105.776 },
  { code: "nghe-an", name: "Nghệ An", region: "central", lat: 18.679, lng: 105.681 },
  { code: "ha-tinh", name: "Hà Tĩnh", region: "central", lat: 18.343, lng: 105.906 },
  { code: "quang-tri", name: "Quảng Trị", region: "central", lat: 17.468, lng: 106.622 },
  { code: "hue", name: "Huế", region: "central", lat: 16.463, lng: 107.585 },
  { code: "da-nang", name: "Đà Nẵng", region: "central", lat: 16.054, lng: 108.202 },
  { code: "quang-ngai", name: "Quảng Ngãi", region: "central", lat: 15.12, lng: 108.792 },
  { code: "gia-lai", name: "Gia Lai", region: "central", lat: 13.776, lng: 109.224 },
  { code: "dak-lak", name: "Đắk Lắk", region: "central", lat: 12.667, lng: 108.038 },
  { code: "khanh-hoa", name: "Khánh Hòa", region: "central", lat: 12.238, lng: 109.197 },
  { code: "lam-dong", name: "Lâm Đồng", region: "central", lat: 11.94, lng: 108.458 },
  { code: "ho-chi-minh", name: "TP. Hồ Chí Minh", region: "south", lat: 10.776, lng: 106.7 },
  { code: "dong-nai", name: "Đồng Nai", region: "south", lat: 10.957, lng: 106.843 },
  { code: "tay-ninh", name: "Tây Ninh", region: "south", lat: 10.535, lng: 106.413 },
  { code: "dong-thap", name: "Đồng Tháp", region: "south", lat: 10.36, lng: 106.36 },
  { code: "vinh-long", name: "Vĩnh Long", region: "south", lat: 10.253, lng: 105.972 },
  { code: "can-tho", name: "Cần Thơ", region: "south", lat: 10.045, lng: 105.746 },
  { code: "an-giang", name: "An Giang", region: "south", lat: 10.012, lng: 105.081 },
  { code: "ca-mau", name: "Cà Mau", region: "south", lat: 9.177, lng: 105.15 },
];

export const PROVINCE_CODES: readonly string[] = PROVINCES.map((p) => p.code);

export function provinceOf(code: string | null | undefined): Province | null {
  return (code && PROVINCES.find((p) => p.code === code)) || null;
}

/** Great-circle distance in km. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
