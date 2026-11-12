// Copy of be/src/ai/pattern/procedural-pattern.generator.ts: the offline demo (no backend) draws the same free procedural patterns.
import { HEX_COLOR } from './pattern-svg';
import type { GeneratedPattern, PatternDesign, PatternGenerator, PatternRequest, PatternTile } from './pattern.types';

interface Mood {
  keywords: string[];
  themeName: string;
  description: string;
  palette: string[]; // background first
  motifs: Motif[];
}

type Motif = 'dots' | 'stripes' | 'blossoms' | 'diamonds' | 'hearts' | 'stars' | 'grid';

// Palettes follow the warm, tactile tones of AGENTS.md (kraft, ivory, forest green, espresso, gold foil).
const MOODS: Mood[] = [
  {
    keywords: ['tết', 'tet', 'xuân', 'xuan', 'lunar', 'đào', 'mai', 'lì xì'],
    themeName: 'Xuân Lộc Đỏ Son',
    description: 'Hoa đào cách điệu đỏ son và vàng kim trên nền giấy ngà, hợp hộp quà Tết.',
    palette: ['#FAEDCD', '#C0392B', '#D4AF37', '#2B1E16', '#E9D8A6'],
    motifs: ['blossoms', 'dots'],
  },
  {
    keywords: ['noel', 'christmas', 'giáng sinh', 'giang sinh', 'xmas', 'thông'],
    themeName: 'Giáng Sinh Rừng Thông',
    description: 'Ngôi sao và chấm tuyết xanh rừng điểm đỏ, sang trọng mà ấm áp.',
    palette: ['#FEFAE0', '#1A3026', '#C1121F', '#D4AF37', '#2D5A27'],
    motifs: ['stars', 'dots'],
  },
  {
    keywords: ['cưới', 'cuoi', 'wedding', 'hỷ', 'đính hôn', 'bride'],
    themeName: 'Hỷ Sự Ngà Vàng',
    description: 'Họa tiết kim cương mảnh ánh vàng trên nền ngà, thanh lịch cho quà cưới.',
    palette: ['#FEFAE0', '#D4AF37', '#E9D8A6', '#2B1E16'],
    motifs: ['diamonds', 'grid'],
  },
  {
    keywords: ['valentine', 'tình', 'love', 'yêu', 'heart', 'tim'],
    themeName: 'Valentine Hồng Phấn',
    description: 'Trái tim nhỏ hồng phấn và đỏ rượu vang, ngọt ngào cho quà tặng người thương.',
    palette: ['#FFF1F2', '#E11D48', '#F9A8D4', '#7F1D1D'],
    motifs: ['hearts', 'dots'],
  },
  {
    keywords: ['sinh nhật', 'sinh nhat', 'birthday', 'pastel', 'baby', 'bé'],
    themeName: 'Tiệc Pastel',
    description: 'Chấm bi và sọc pastel vui tươi cho quà sinh nhật hoặc đồ em bé.',
    palette: ['#FFFBF0', '#FFD1DC', '#BEE1E6', '#CDB4DB', '#FFE5A8'],
    motifs: ['dots', 'stripes'],
  },
  {
    keywords: ['tối giản', 'toi gian', 'minimal', 'đơn giản', 'skincare', 'mỹ phẩm'],
    themeName: 'Tối Giản Trung Tính',
    description: 'Lưới mảnh và chấm nhỏ tông trung tính, để sản phẩm tự lên tiếng.',
    palette: ['#F5F1EA', '#2B1E16', '#BFB5A8', '#D4A373'],
    motifs: ['grid', 'dots'],
  },
];

const DEFAULT_MOOD: Mood = {
  keywords: [],
  themeName: 'Kraft Thủ Công',
  description: 'Kẻ chéo và chấm mộc mạc phong cách giấy kraft của tiệm đồ thủ công.',
  palette: ['#E9D8A6', '#D4A373', '#2B1E16', '#FAEDCD', '#D4AF37'],
  motifs: ['stripes', 'dots'],
};

/** Small deterministic PRNG: the same theme always gives the same pattern. */
function random(seedText: string): () => number {
  let seed = 2166136261;
  for (const char of seedText) seed = Math.imul(seed ^ char.codePointAt(0)!, 16777619);
  return () => {
    seed = Math.imul(seed ^ (seed >>> 15), 2246822507);
    seed = Math.imul(seed ^ (seed >>> 13), 3266489909);
    return ((seed ^= seed >>> 16) >>> 0) / 4294967296;
  };
}

const emptyTile = (size: number, background: string): PatternTile => ({
  size,
  background,
  circles: [],
  rects: [],
  lines: [],
  paths: [],
});

function drawMotif(tile: PatternTile, motif: Motif, colors: string[], rand: () => number): void {
  const s = tile.size;
  const pick = () => colors[Math.floor(rand() * colors.length)];
  switch (motif) {
    case 'dots':
      for (let i = 0; i < 6; i++) {
        tile.circles.push({ cx: rand() * s, cy: rand() * s, r: 1.5 + rand() * 3, fill: pick(), opacity: 0.55 });
      }
      break;
    case 'stripes':
      for (const offset of [0, s / 2]) {
        tile.lines.push({ x1: offset - s / 2, y1: s, x2: offset + s / 2, y2: 0, stroke: colors[0], strokeWidth: 1.2, opacity: 0.35 });
        tile.lines.push({ x1: offset + s / 2, y1: s, x2: offset + s, y2: s / 2, stroke: colors[0], strokeWidth: 1.2, opacity: 0.35 });
      }
      break;
    case 'grid':
      tile.lines.push({ x1: 0, y1: 0, x2: s, y2: 0, stroke: colors[0], strokeWidth: 0.6, opacity: 0.3 });
      tile.lines.push({ x1: 0, y1: 0, x2: 0, y2: s, stroke: colors[0], strokeWidth: 0.6, opacity: 0.3 });
      break;
    case 'diamonds': {
      const c = s / 2;
      const r = s / 5;
      tile.paths.push({ d: `M${c} ${c - r} L${c + r} ${c} L${c} ${c + r} L${c - r} ${c} Z`, fill: null, stroke: colors[0], strokeWidth: 1, opacity: 0.8 });
      tile.paths.push({ d: `M0 ${-r / 2} L${r / 2} 0 L0 ${r / 2} L${-r / 2} 0 Z`, fill: pick(), stroke: null, strokeWidth: 0, opacity: 0.6 });
      break;
    }
    case 'blossoms':
      for (let i = 0; i < 2; i++) {
        const cx = (i + 0.3 + rand() * 0.4) * (s / 2);
        const cy = (i === 0 ? 0.3 : 0.75) * s;
        const petal = 3.5 + rand() * 2;
        for (let k = 0; k < 5; k++) {
          const angle = (k * 2 * Math.PI) / 5;
          tile.circles.push({ cx: cx + Math.cos(angle) * petal, cy: cy + Math.sin(angle) * petal, r: petal * 0.8, fill: colors[0], opacity: 0.75 });
        }
        tile.circles.push({ cx, cy, r: petal * 0.45, fill: colors[1] ?? colors[0], opacity: 0.95 });
      }
      break;
    case 'hearts':
      for (const [cx, cy] of [
        [s * 0.25, s * 0.3],
        [s * 0.75, s * 0.8],
      ]) {
        const k = s / 14;
        tile.paths.push({
          d: `M${cx} ${cy + k} C${cx - 2 * k} ${cy - 0.5 * k} ${cx - k} ${cy - 2 * k} ${cx} ${cy - k} C${cx + k} ${cy - 2 * k} ${cx + 2 * k} ${cy - 0.5 * k} ${cx} ${cy + k} Z`,
          fill: pick(),
          stroke: null,
          strokeWidth: 0,
          opacity: 0.8,
        });
      }
      break;
    case 'stars':
      for (const [cx, cy] of [
        [s * 0.3, s * 0.3],
        [s * 0.8, s * 0.75],
      ]) {
        const outer = s / 9;
        const points = Array.from({ length: 10 }, (_, k) => {
          const radius = k % 2 ? outer / 2.5 : outer;
          const angle = -Math.PI / 2 + (k * Math.PI) / 5;
          return `${(cx + Math.cos(angle) * radius).toFixed(2)} ${(cy + Math.sin(angle) * radius).toFixed(2)}`;
        });
        tile.paths.push({ d: `M${points.join(' L')} Z`, fill: pick(), stroke: null, strokeWidth: 0, opacity: 0.85 });
      }
      break;
  }
}

/**
 * Free fallback when no AI is configured (or the AI fails): a deterministic geometric pattern chosen from
 * keywords of the theme (Tết, Noel, cưới, valentine, sinh nhật, tối giản...).
 */
export class ProceduralPatternGenerator implements PatternGenerator {
  async generate(request: PatternRequest): Promise<GeneratedPattern> {
    return { design: this.design(request) };
  }

  design({ theme, preferredColors }: PatternRequest): PatternDesign {
    const text = theme.toLowerCase();
    const mood = MOODS.find((m) => m.keywords.some((keyword) => text.includes(keyword))) ?? DEFAULT_MOOD;
    const brand = preferredColors.filter((c) => HEX_COLOR.test(c)).slice(0, 3);
    const palette = [...new Set([mood.palette[0], ...brand, ...mood.palette.slice(1)].map((c) => c.toUpperCase()))].slice(0, 6);

    const rand = random(text);
    const tile = emptyTile(60, palette[0]);
    const ink = palette.slice(1);
    for (const motif of mood.motifs) drawMotif(tile, motif, ink, rand);

    return { themeName: mood.themeName, description: mood.description, palette, tile };
  }
}
