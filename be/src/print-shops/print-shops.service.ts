import { Injectable } from '@nestjs/common';

export interface PrintShopPartner {
  id: string;
  name: string;
  city: string;
  address: string;
  sheet: string;
  sheetSize: string;
  maxSheetMm: { width: number; height: number };
  services: string[];
  leadTime: string;
  leadTimeDays: number;
  state: 'active' | 'review' | 'paused';
  status: 'active' | 'review' | 'paused';
  rating: number;
  completedOrders: number;
  contactEmail: string;
  phone: string;
  minQuantity: number;
}

const PARTNERS: PrintShopPartner[] = [
  {
    id: 'ps-sg-01',
    name: 'In Bao Bì Sài Gòn Xanh',
    city: 'TP. Hồ Chí Minh',
    address: 'Khu Công Nghiệp Tân Bình, P. Tây Thạnh, Q. Tân Phú',
    sheet: 'B1 · 1020 × 720 mm',
    sheetSize: 'B1 · 1020 × 720 mm',
    maxSheetMm: { width: 1020, height: 720 },
    services: ['Offset 4 màu', 'Bế tự động', 'Ép kim vàng', 'Cắt kỹ thuật số phẳng Zero-MOQ'],
    leadTime: '3–5 ngày (Mẫu thử 24h)',
    leadTimeDays: 3,
    state: 'active',
    status: 'active',
    rating: 4.9,
    completedOrders: 1420,
    contactEmail: 'partner@saigonxanhprint.vn',
    phone: '028 3816 xxxx',
    minQuantity: 1,
  },
  {
    id: 'ps-hn-02',
    name: 'Hộp Giấy Hà Thành',
    city: 'Hà Nội',
    address: 'Cụm Công Nghiệp Hai Bà Trưng, P. Vĩnh Tuy, Q. Hai Bà Trưng',
    sheet: 'B1 · 1020 × 720 mm',
    sheetSize: 'B1 · 1020 × 720 mm',
    maxSheetMm: { width: 1020, height: 720 },
    services: ['Hộp cứng cao cấp', 'Bồi carton sóng E', 'Cán màng mờ Soft-Touch', 'In mẫu thử'],
    leadTime: '5–7 ngày (Mẫu thử 48h)',
    leadTimeDays: 5,
    state: 'active',
    status: 'active',
    rating: 4.8,
    completedOrders: 980,
    contactEmail: 'xuongin@hathanhbox.vn',
    phone: '024 3972 xxxx',
    minQuantity: 1,
  },
  {
    id: 'ps-dn-03',
    name: 'Kraft Đà Nẵng CNC',
    city: 'Đà Nẵng',
    address: 'Khu Công Nghiệp Hòa Khánh, Q. Liên Chiểu',
    sheet: 'B2 · 720 × 520 mm',
    sheetSize: 'B2 · 720 × 520 mm',
    maxSheetMm: { width: 720, height: 520 },
    services: ['In kỹ thuật số nhanh', 'Cắt laser & dao rung', 'Giấy kraft tái chế'],
    leadTime: '2–3 ngày',
    leadTimeDays: 2,
    state: 'active',
    status: 'active',
    rating: 4.7,
    completedOrders: 560,
    contactEmail: 'danang@kraftprint.vn',
    phone: '0236 373 xxxx',
    minQuantity: 1,
  },
  {
    id: 'ps-ct-04',
    name: 'Xưởng In Mộc Cần Thơ',
    city: 'Cần Thơ',
    address: 'Khu Công Nghiệp Trà Nóc, Q. Bình Thủy',
    sheet: 'B2 · 720 × 520 mm',
    sheetSize: 'B2 · 720 × 520 mm',
    maxSheetMm: { width: 720, height: 520 },
    services: ['In offset', 'Cán màng bóng/mờ', 'Bao bì nông sản'],
    leadTime: '5–7 ngày',
    leadTimeDays: 5,
    state: 'review',
    status: 'review',
    rating: 4.6,
    completedOrders: 310,
    contactEmail: 'cantho@mocprint.vn',
    phone: '0292 384 xxxx',
    minQuantity: 1,
  },
];

@Injectable()
export class PrintShopsService {
  list(filterCity?: string): PrintShopPartner[] {
    if (!filterCity) return PARTNERS;
    return PARTNERS.filter((p) => p.city.toLowerCase().includes(filterCity.toLowerCase()));
  }

  get(id: string): PrintShopPartner | undefined {
    return PARTNERS.find((p) => p.id === id);
  }

  getDefaultPartner(): PrintShopPartner {
    return PARTNERS[0];
  }
}
