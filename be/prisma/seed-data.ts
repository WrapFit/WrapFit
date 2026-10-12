// Data of the seed (be/prisma/seed.ts): box structures and the curated designs of the template hub. Kept apart from
// the script so tests can check it without a database (src/templates/seed-data.spec.ts).
import { Prisma } from '@prisma/client';
import { CURRENT_FORMULA_VERSION } from '@wrapfit/shared';

// Kích thước tối thiểu (mm) khớp với IT1-02: L >= 40, W >= 30, H >= 20.
const dimensionParams = {
  length: { unit: 'mm', min: 40, max: 600 },
  width: { unit: 'mm', min: 30, max: 600 },
  height: { unit: 'mm', min: 20, max: 600 },
  paperThickness: { unit: 'mm', min: 0.2, max: 1.5 },
};

/**
 * The 4 box structures. Every start of the seed sets their `formulaVersion` to the current dieline formulas of
 * @wrapfit/shared: new projects get it, existing projects keep the version they were created with.
 */
export const boxTemplates: Prisma.BoxTemplateCreateInput[] = [
  {
    id: 'tuck-top',
    name: 'Hộp Nắp Gài Đáy Khóa',
    category: 'retail',
    description:
      'Hộp gài nắp trên, đáy khóa cài — phổ biến cho mỹ phẩm, nến thơm.',
    formulaSchema: {
      generator: 'generateTuckTopDieline',
      params: dimensionParams,
    },
    formulaVersion: CURRENT_FORMULA_VERSION,
  },
  {
    id: 'sleeve-drawer',
    name: 'Hộp Kéo Bao Diêm',
    category: 'luxury',
    description:
      'Phôi 2 mảnh: vỏ ngoài và khay kéo rút theo chiều dài, khe trượt 1 mm.',
    formulaSchema: {
      generator: 'generateSleeveDrawerDieline',
      params: dimensionParams,
    },
    formulaVersion: CURRENT_FORMULA_VERSION,
  },
  {
    id: 'lid-base',
    name: 'Hộp Âm Dương',
    category: 'luxury',
    description: 'Phôi 2 mảnh: nắp trùm khít đáy, tai dán 4 góc.',
    formulaSchema: {
      generator: 'generateLidBaseDieline',
      params: dimensionParams,
    },
    formulaVersion: CURRENT_FORMULA_VERSION,
  },
  {
    id: 'pillow',
    name: 'Hộp Gối Bầu Cong',
    category: 'accessories',
    description:
      'Hai mặt phồng, hai đầu gập theo nếp cong, hợp cho trang sức, phụ kiện nhỏ.',
    formulaSchema: {
      generator: 'generatePillowDieline',
      params: dimensionParams,
    },
    formulaVersion: CURRENT_FORMULA_VERSION,
  },
];

/**
 * A text element (CanvasElement of @wrapfit/shared) on a panel of the box. Use the full panel id of the structure's
 * dieline (`panel_front`, `lid_top`, `pillow_front`, `sleeve_top`…): other ids match no panel, so the text is not drawn,
 * not checked by FitCheck and not printed. Position and width in mm from the panel's top-left corner.
 */
const text = (
  id: string,
  panelId: string,
  content: string,
  { x, y, width }: { x: number; y: number; width: number },
  fontSize: number,
  color: string,
) => ({
  id,
  type: 'text',
  panelId,
  x,
  y,
  width,
  height: fontSize * 0.6,
  rotation: 0,
  content,
  style: { fontFamily: 'Playfair Display', fontSize, color },
});

// "WrapFit Curated" designs of the template hub (UC-12). Fixed ids so the seed can run on every start.
export const designTemplates: Prisma.DesignTemplateUncheckedCreateInput[] = [
  {
    id: '6f1c2a80-0001-4c3e-9a51-7d0e5a1f0001',
    boxTemplateId: 'tuck-top',
    title: 'Hộp Nến Tết Lộc Xuân',
    description:
      'Nắp gài đáy khóa giấy kraft, chữ đỏ son cho nến thơm mùa Tết.',
    occasion: 'TET',
    industry: 'CANDLES',
    dimensions: { length: 90, width: 90, height: 110, paperThickness: 0.4 },
    materialSpec: { type: 'kraft', gsm: 300, caliper: 0.4, finish: 'matte' },
    canvasState: {
      elements: [
        text(
          'title',
          'panel_front',
          'Lộc Xuân',
          { x: 15, y: 20, width: 60 },
          18,
          '#C0392B',
        ),
        text(
          'note',
          'panel_front',
          'Nến thơm thủ công',
          { x: 15, y: 40, width: 60 },
          9,
          '#2B1E16',
        ),
      ],
    },
    tags: ['tet', 'nen-thom', 'kraft'],
    sortOrder: 10,
  },
  {
    id: '6f1c2a80-0002-4c3e-9a51-7d0e5a1f0002',
    boxTemplateId: 'pillow',
    title: 'Hộp Gối Trang Sức Valentine',
    description: 'Hộp gối ivory nhỏ gọn cho nhẫn, dây chuyền.',
    occasion: 'VALENTINE',
    industry: 'JEWELRY',
    dimensions: { length: 100, width: 60, height: 30, paperThickness: 0.35 },
    materialSpec: { type: 'ivory', gsm: 300, caliper: 0.35, finish: 'glossy' },
    canvasState: {
      elements: [
        text(
          'title',
          'pillow_front',
          'With Love',
          { x: 8, y: 10, width: 56 },
          14,
          '#D4AF37',
        ),
      ],
    },
    tags: ['valentine', 'trang-suc'],
    sortOrder: 20,
  },
  {
    id: '6f1c2a80-0003-4c3e-9a51-7d0e5a1f0003',
    boxTemplateId: 'lid-base',
    title: 'Hộp Âm Dương Quà Cưới',
    description: 'Hộp cứng hai mảnh, nắp ivory ép kim cho quà cưới.',
    occasion: 'WEDDING',
    dimensions: { length: 200, width: 150, height: 60, paperThickness: 0.45 },
    materialSpec: { type: 'ivory', gsm: 350, caliper: 0.45, finish: 'glossy' },
    canvasState: {
      elements: [
        text(
          'title',
          'lid_top',
          'Hỷ',
          { x: 71, y: 30, width: 60 },
          28,
          '#D4AF37',
        ),
      ],
    },
    tags: ['cuoi', 'cao-cap'],
    sortOrder: 30,
  },
  {
    id: '6f1c2a80-0004-4c3e-9a51-7d0e5a1f0004',
    boxTemplateId: 'sleeve-drawer',
    title: 'Hộp Kéo Bánh Quy Sinh Nhật',
    description: 'Hộp bao diêm kraft cho bánh quy, khay kéo chắc chắn.',
    occasion: 'BIRTHDAY',
    industry: 'BAKERY',
    dimensions: { length: 160, width: 110, height: 45, paperThickness: 0.4 },
    materialSpec: { type: 'kraft', gsm: 300, caliper: 0.4, finish: 'raw' },
    canvasState: {
      elements: [
        text(
          'title',
          'sleeve_top',
          'Happy Birthday',
          { x: 41, y: 15, width: 80 },
          14,
          '#2D5A27',
        ),
      ],
    },
    tags: ['sinh-nhat', 'banh-quy'],
    sortOrder: 40,
  },
  {
    id: '6f1c2a80-0005-4c3e-9a51-7d0e5a1f0005',
    boxTemplateId: 'tuck-top',
    title: 'Hộp Skincare Tối Giản',
    description: 'Hộp đứng thanh mảnh cho serum, tông màu trung tính.',
    occasion: 'MINIMAL',
    industry: 'COSMETICS',
    dimensions: { length: 60, width: 60, height: 150, paperThickness: 0.35 },
    materialSpec: { type: 'ivory', gsm: 300, caliper: 0.35, finish: 'matte' },
    canvasState: {
      elements: [
        text(
          'title',
          'panel_front',
          'serum no.1',
          { x: 8, y: 60, width: 44 },
          10,
          '#2B1E16',
        ),
      ],
    },
    tags: ['skincare', 'toi-gian'],
    sortOrder: 50,
  },
  {
    id: '6f1c2a80-0006-4c3e-9a51-7d0e5a1f0006',
    boxTemplateId: 'lid-base',
    title: 'Hộp Trà Hoa Giáng Sinh',
    description: 'Hộp âm dương duplex cho trà hoa và nông sản biếu tặng.',
    occasion: 'CHRISTMAS',
    industry: 'TEA_AGRI',
    dimensions: { length: 120, width: 120, height: 80, paperThickness: 0.45 },
    materialSpec: { type: 'duplex', gsm: 350, caliper: 0.45, finish: 'matte' },
    canvasState: {
      elements: [
        text(
          'title',
          'lid_top',
          'Merry Christmas',
          { x: 21, y: 20, width: 80 },
          14,
          '#1A3026',
        ),
      ],
    },
    tags: ['noel', 'tra'],
    sortOrder: 60,
  },
];
