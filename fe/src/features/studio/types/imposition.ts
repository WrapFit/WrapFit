export type PressSheetId = "B1" | "B1_KOMORI" | "SHEET_65X86" | "SHEET_70X100" | "A3_DIGITAL" | "AUTO_OPTIMAL";

export interface PressSheetFormat {
  id: PressSheetId;
  name: string;
  width: number; // mm
  height: number; // mm
  description: string;
  category: "offset_large" | "offset_medium" | "digital_diy";
}

export const PRESS_SHEET_FORMATS: PressSheetFormat[] = [
  {
    id: "B1",
    name: "Khổ B1 tiêu chuẩn (790 × 1090 mm)",
    width: 1090,
    height: 790,
    description: "Khổ giấy in bao bì thương mại phổ biến nhất tại các xưởng in Việt Nam",
    category: "offset_large",
  },
  {
    id: "B1_KOMORI",
    name: "Khổ B1 Heidelberg / Komori (720 × 1020 mm)",
    width: 1020,
    height: 720,
    description: "Khổ chuẩn cho các dòng máy in offset 4–6 màu Heidelberg Speedmaster",
    category: "offset_large",
  },
  {
    id: "SHEET_65X86",
    name: "Khổ trung 65 × 86 cm (650 × 860 mm)",
    width: 860,
    height: 650,
    description: "Khổ tối ưu chi phí cho các đơn hàng hộp quà số lượng vừa và nhỏ",
    category: "offset_medium",
  },
  {
    id: "SHEET_70X100",
    name: "Khổ chẵn 70 × 100 cm (700 × 1000 mm)",
    width: 1000,
    height: 700,
    description: "Khổ giấy chia đôi từ cuộn giấy công nghiệp, tối thiểu hao hụt biên",
    category: "offset_medium",
  },
  {
    id: "A3_DIGITAL",
    name: "Khổ A3+ In nhanh KTS (320 × 450 mm)",
    width: 450,
    height: 320,
    description: "In test màu mẫu thử hoặc in kỹ thuật số số lượng ít (Fuji Xerox / Konica Minolta)",
    category: "digital_diy",
  },
];

export type IccProfileId = "FOGRA39" | "FOGRA51" | "FOGRA47" | "GRACOL2006" | "JAPAN_COLOR_2011";

export interface IccProfileSpec {
  id: IccProfileId;
  name: string;
  standard: string;
  tac: number; // Total Area Coverage (%)
  description: string;
  recommendedFor: ("ivory" | "kraft" | "duplex" | "rigid" | "forest" | "gold_foil")[];
  gamutNote: string;
}

export const ICC_PROFILES: IccProfileSpec[] = [
  {
    id: "FOGRA39",
    name: "ISO Coated v2 (FOGRA39)",
    standard: "ISO 12647-2:2004",
    tac: 300,
    description: "Tiêu chuẩn vàng cho in offset bao bì trên giấy tráng phủ tại Việt Nam & Châu Âu",
    recommendedFor: ["ivory", "duplex", "rigid"],
    gamutNote: "Màu tươi, độ sâu bóng cao, kiểm soát tram sắc nét trên giấy láng mịn.",
  },
  {
    id: "FOGRA51",
    name: "PSO Coated v3 (FOGRA51 - 2015)",
    standard: "ISO 12647-2:2013",
    tac: 300,
    description: "Tiêu chuẩn hiện đại tích hợp bù quang học OBA cho giấy Ivory siêu trắng cao cấp",
    recommendedFor: ["ivory", "forest", "gold_foil"],
    gamutNote: "Dải màu trung thực dưới ánh sáng đèn chuẩn D50 và ánh sáng tự nhiên.",
  },
  {
    id: "FOGRA47",
    name: "PSO Uncoated (FOGRA47 / ISO 12647-2)",
    standard: "ISO 12647-2 Uncoated",
    tac: 260,
    description: "Tiêu chuẩn bắt buộc cho giấy Kraft mộc mạc và giấy carton không tráng phủ",
    recommendedFor: ["kraft"],
    gamutNote: "Hạn chế độ phủ mực tối đa ≤ 260% để giấy hút mực đều, chống lem và nhanh khô.",
  },
  {
    id: "GRACOL2006",
    name: "GRACoL 2006 Coated 1",
    standard: "IDEAlliance GRACoL",
    tac: 320,
    description: "Chuẩn in bao bì thương mại chất lượng cao xuất khẩu thị trường Bắc Mỹ (Hoa Kỳ / Canada)",
    recommendedFor: ["ivory", "rigid"],
    gamutNote: "Cân bằng xám trung tính (G7 Calibration), tương thích mọi nhà in quốc tế.",
  },
  {
    id: "JAPAN_COLOR_2011",
    name: "Japan Color 2011 Coated",
    standard: "Japan Color 2011",
    tac: 350,
    description: "Chuẩn in bao bì sắc độ cao xuất khẩu thị trường Nhật Bản và Đông Nam Á",
    recommendedFor: ["ivory", "gold_foil"],
    gamutNote: "Gam màu sáng, độ tương phản cao, tối ưu cho chi tiết nhỏ và họa tiết tinh xảo.",
  },
];

export interface PrinterMarksConfig {
  registrationMarks: boolean; // Dấu chữ thập canh 4 bản kẽm CMYK
  colorBars: boolean;         // Thước đo thang màu kiểm soát mực CMYK
  cropMarks: boolean;         // Dấu xén góc và dấu cấn gập
  jobSlug: boolean;           // Dòng thông tin kỹ thuật & ngày xuất
}

export const DEFAULT_PRINTER_MARKS: PrinterMarksConfig = {
  registrationMarks: true,
  colorBars: true,
  cropMarks: true,
  jobSlug: true,
};

export interface ImpositionItem {
  id: string;
  x: number; // mm from sheet origin
  y: number; // mm from sheet origin
  width: number; // mm
  height: number; // mm
  rotated: boolean; // 90 degrees rotation
  colIndex: number;
  rowIndex: number;
}

export interface ImpositionResult {
  sheet: PressSheetFormat;
  items: ImpositionItem[];
  totalUps: number; // Số con / tờ
  rows: number;
  cols: number;
  rotated: boolean;
  itemWidth: number;
  itemHeight: number;
  gutterX: number;
  gutterY: number;
  gripperMargin: number; // Mép nhíp kẹp giấy
  usableWidth: number;
  usableHeight: number;
  paperEfficiencyPercent: number; // % diện tích phôi trên diện tích tờ
  wastePercent: number; // % giấy thừa biên
}
