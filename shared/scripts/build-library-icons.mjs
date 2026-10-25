// Builds src/library/icons.ts from the Lucide icons installed with the frontend (lucide-react, ISC licence):
// every element of the chosen icons becomes absolute path data with only M L C Q Z commands (arcs as cubic Béziers,
// circles / rects / lines as paths), so the print renderers, the browser PDF writer and the canvas all draw it.
// Run after changing ICONS:  node shared/scripts/build-library-icons.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "../../fe/package.json"));
const lucideDir = join(dirname(require.resolve("lucide-react/package.json")), "dist/esm/icons");
const lucideVersion = JSON.parse(readFileSync(join(lucideDir, "../../../package.json"), "utf8")).version;

/** Lucide icon -> Vietnamese name, search words, group. */
const ICONS = {
  // Quà, lễ hội
  gift: ["Hộp quà", "quà tặng gift", "qua"],
  "party-popper": ["Pháo giấy", "tiệc chúc mừng", "le"],
  cake: ["Bánh kem", "sinh nhật bánh", "an"],
  "candy-cane": ["Kẹo gậy", "noel giáng sinh kẹo", "le"],
  sparkles: ["Lấp lánh", "sang trọng mới", "trang-tri"],
  sparkle: ["Ánh sao", "lấp lánh", "trang-tri"],
  star: ["Ngôi sao", "sao", "trang-tri"],
  crown: ["Vương miện", "sang trọng vip", "trang-tri"],
  gem: ["Đá quý", "trang sức kim cương", "trang-suc"],
  diamond: ["Kim cương", "trang sức", "trang-suc"],
  medal: ["Huy chương", "chất lượng", "chat-luong"],
  award: ["Giải thưởng", "chất lượng uy tín", "chat-luong"],
  trophy: ["Cúp", "chiến thắng", "chat-luong"],
  "badge-check": ["Tem xác nhận", "chính hãng đảm bảo", "chat-luong"],
  "shield-check": ["Khiên an toàn", "an toàn bảo vệ", "chat-luong"],
  "badge-percent": ["Giảm giá", "khuyến mãi sale", "ban-hang"],
  tag: ["Nhãn giá", "giá tag", "ban-hang"],
  ticket: ["Vé", "voucher phiếu quà", "ban-hang"],
  bell: ["Chuông", "noel thông báo", "le"],
  music: ["Nốt nhạc", "âm nhạc", "trang-tri"],
  heart: ["Trái tim", "yêu thương valentine", "tinh-cam"],
  "heart-handshake": ["Tay trong tay", "tri ân đối tác", "tinh-cam"],
  "hand-heart": ["Bàn tay trái tim", "trao gửi yêu thương", "tinh-cam"],
  smile: ["Mặt cười", "vui vẻ cảm ơn", "tinh-cam"],
  baby: ["Em bé", "baby sơ sinh", "tinh-cam"],
  // Thiên nhiên
  flower: ["Bông hoa", "hoa", "thien-nhien"],
  "flower-2": ["Hoa cúc", "hoa", "thien-nhien"],
  leaf: ["Chiếc lá", "lá thiên nhiên organic", "thien-nhien"],
  "leafy-green": ["Rau lá", "rau sạch organic", "thien-nhien"],
  sprout: ["Mầm cây", "nảy mầm organic", "thien-nhien"],
  clover: ["Cỏ bốn lá", "may mắn", "thien-nhien"],
  "tree-pine": ["Cây thông", "noel giáng sinh", "thien-nhien"],
  "tree-deciduous": ["Cây xanh", "cây", "thien-nhien"],
  "tree-palm": ["Cây dừa", "biển nhiệt đới", "thien-nhien"],
  wheat: ["Bông lúa", "lúa nông sản", "thien-nhien"],
  sun: ["Mặt trời", "nắng", "thien-nhien"],
  moon: ["Mặt trăng", "trung thu trăng", "thien-nhien"],
  "moon-star": ["Trăng sao", "trung thu đêm", "thien-nhien"],
  cloud: ["Đám mây", "mây", "thien-nhien"],
  rainbow: ["Cầu vồng", "vui tươi", "thien-nhien"],
  snowflake: ["Bông tuyết", "noel mùa đông", "thien-nhien"],
  flame: ["Ngọn lửa", "nến lửa", "thien-nhien"],
  droplet: ["Giọt nước", "nước tinh dầu", "thien-nhien"],
  droplets: ["Giọt sương", "dưỡng ẩm", "thien-nhien"],
  waves: ["Sóng nước", "biển", "thien-nhien"],
  mountain: ["Núi", "núi rừng", "thien-nhien"],
  feather: ["Lông vũ", "nhẹ nhàng", "thien-nhien"],
  shell: ["Vỏ ốc", "biển", "thien-nhien"],
  // Ăn uống
  coffee: ["Ly cà phê", "cà phê cafe", "an"],
  "cup-soda": ["Ly nước", "đồ uống", "an"],
  "glass-water": ["Cốc nước", "nước", "an"],
  milk: ["Chai sữa", "sữa", "an"],
  wine: ["Ly rượu vang", "rượu vang", "an"],
  beer: ["Cốc bia", "bia", "an"],
  cookie: ["Bánh quy", "bánh cookie", "an"],
  croissant: ["Bánh sừng bò", "bánh mì", "an"],
  donut: ["Bánh donut", "bánh ngọt", "an"],
  "cake-slice": ["Miếng bánh", "bánh ngọt", "an"],
  "ice-cream-cone": ["Kem ốc quế", "kem", "an"],
  lollipop: ["Kẹo mút", "kẹo", "an"],
  candy: ["Viên kẹo", "kẹo", "an"],
  dessert: ["Tráng miệng", "bánh flan", "an"],
  cherry: ["Anh đào", "trái cây", "an"],
  apple: ["Quả táo", "trái cây", "an"],
  citrus: ["Lát cam", "cam chanh trái cây", "an"],
  grape: ["Chùm nho", "trái cây", "an"],
  banana: ["Quả chuối", "trái cây", "an"],
  egg: ["Quả trứng", "trứng", "an"],
  soup: ["Bát canh", "món ăn", "an"],
  "chef-hat": ["Mũ đầu bếp", "nhà làm bếp", "an"],
  utensils: ["Dao nĩa", "món ăn nhà hàng", "an"],
  // Thủ công, làm đẹp
  palette: ["Bảng màu", "nghệ thuật vẽ", "thu-cong"],
  brush: ["Cọ vẽ", "nghệ thuật", "thu-cong"],
  scissors: ["Cây kéo", "thủ công cắt", "thu-cong"],
  ruler: ["Thước kẻ", "đo đạc", "thu-cong"],
  "pen-tool": ["Bút vẽ", "thiết kế", "thu-cong"],
  pencil: ["Bút chì", "viết vẽ", "thu-cong"],
  spool: ["Cuộn chỉ", "may vá thủ công", "thu-cong"],
  shirt: ["Áo thun", "thời trang quần áo", "thu-cong"],
  glasses: ["Mắt kính", "phụ kiện", "trang-suc"],
  watch: ["Đồng hồ đeo tay", "phụ kiện", "trang-suc"],
  "hand-metal": ["Bàn tay", "cá tính", "tinh-cam"],
  lamp: ["Đèn bàn", "nội thất", "thu-cong"],
  lightbulb: ["Bóng đèn", "ý tưởng", "thu-cong"],
  key: ["Chìa khóa", "nhà mới", "thu-cong"],
  anchor: ["Mỏ neo", "biển vintage", "trang-tri"],
  // Vận chuyển, cửa hàng
  package: ["Gói hàng", "đóng gói hộp", "van-chuyen"],
  "package-check": ["Đã đóng gói", "kiểm hàng", "van-chuyen"],
  box: ["Chiếc hộp", "hộp", "van-chuyen"],
  truck: ["Xe giao hàng", "giao hàng vận chuyển", "van-chuyen"],
  mail: ["Phong thư", "thư thiệp", "van-chuyen"],
  send: ["Gửi đi", "gửi quà", "van-chuyen"],
  store: ["Cửa hàng", "tiệm shop", "ban-hang"],
  "shopping-bag": ["Túi mua sắm", "mua sắm", "ban-hang"],
  house: ["Ngôi nhà", "nhà làm", "ban-hang"],
  "map-pin": ["Định vị", "địa chỉ", "ban-hang"],
  phone: ["Điện thoại", "liên hệ hotline", "ban-hang"],
  globe: ["Website", "trang web", "ban-hang"],
  recycle: ["Tái chế", "thân thiện môi trường", "chat-luong"],
  hourglass: ["Đồng hồ cát", "thời gian", "trang-tri"],
  calendar: ["Lịch", "ngày", "trang-tri"],
  // Thú cưng
  cat: ["Con mèo", "mèo thú cưng", "thu-cung"],
  dog: ["Con chó", "chó thú cưng", "thu-cung"],
  bird: ["Chú chim", "chim", "thu-cung"],
  fish: ["Con cá", "cá", "thu-cung"],
  rabbit: ["Con thỏ", "thỏ", "thu-cung"],
  "paw-print": ["Dấu chân", "thú cưng", "thu-cung"],
  turtle: ["Con rùa", "rùa", "thu-cung"],
};

// ---------------------------------------------------------------- path normalizer

const n = (v) => Number(v.toFixed(3)).toString();
const K = 0.5523;

/** Arc (SVG endpoint form) to cubic Béziers, in absolute coordinates. */
function arcToCubics(x1, y1, rx, ry, phi, largeArc, sweep, x2, y2) {
  if (rx === 0 || ry === 0) return [[x1, y1, x2, y2, x2, y2]];
  const rad = (phi * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const x1p = cos * dx + sin * dy;
  const y1p = -sin * dx + cos * dy;
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
  }
  const sign = largeArc === sweep ? -1 : 1;
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const coef = sign * Math.sqrt(Math.max(0, num / (rx * rx * y1p * y1p + ry * ry * x1p * x1p)));
  const cxp = (coef * (rx * y1p)) / ry;
  const cyp = (coef * -(ry * x1p)) / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2;
  const cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const angle = (ux, uy, vx, vy) => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    return a;
  };
  const theta1 = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let delta = angle((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!sweep && delta > 0) delta -= 2 * Math.PI;
  if (sweep && delta < 0) delta += 2 * Math.PI;
  const segments = Math.ceil(Math.abs(delta) / (Math.PI / 2));
  const step = delta / segments;
  const t = (4 / 3) * Math.tan(step / 4);
  const out = [];
  let a = theta1;
  const point = (ang) => {
    const x = rx * Math.cos(ang);
    const y = ry * Math.sin(ang);
    return [cos * x - sin * y + cx, sin * x + cos * y + cy];
  };
  const deriv = (ang) => {
    const x = -rx * Math.sin(ang);
    const y = ry * Math.cos(ang);
    return [cos * x - sin * y, sin * x + cos * y];
  };
  for (let i = 0; i < segments; i++) {
    const b = a + step;
    const [p0x, p0y] = point(a);
    const [p1x, p1y] = point(b);
    const [d0x, d0y] = deriv(a);
    const [d1x, d1y] = deriv(b);
    out.push([p0x + t * d0x, p0y + t * d0y, p1x - t * d1x, p1y - t * d1y, p1x, p1y]);
    a = b;
  }
  return out;
}

/** Any SVG path data -> absolute M L C Q Z. */
function normalizePath(d) {
  const tokens = d.match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
  const out = [];
  let i = 0;
  let cmd = "";
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  let lastC = null;
  let lastQ = null;
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++];
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    const ox = rel ? cx : 0;
    const oy = rel ? cy : 0;
    if (C === "M") {
      cx = num() + ox;
      cy = num() + oy;
      sx = cx;
      sy = cy;
      out.push(`M ${n(cx)} ${n(cy)}`);
      cmd = rel ? "l" : "L";
      lastC = lastQ = null;
    } else if (C === "L") {
      cx = num() + ox;
      cy = num() + oy;
      out.push(`L ${n(cx)} ${n(cy)}`);
      lastC = lastQ = null;
    } else if (C === "H") {
      cx = num() + (rel ? cx : 0);
      out.push(`L ${n(cx)} ${n(cy)}`);
      lastC = lastQ = null;
    } else if (C === "V") {
      cy = num() + (rel ? cy : 0);
      out.push(`L ${n(cx)} ${n(cy)}`);
      lastC = lastQ = null;
    } else if (C === "C" || C === "S") {
      let x1;
      let y1;
      if (C === "C") {
        x1 = num() + ox;
        y1 = num() + oy;
      } else {
        [x1, y1] = lastC ? [2 * cx - lastC[0], 2 * cy - lastC[1]] : [cx, cy];
      }
      const x2 = num() + ox;
      const y2 = num() + oy;
      const x = num() + ox;
      const y = num() + oy;
      out.push(`C ${n(x1)} ${n(y1)} ${n(x2)} ${n(y2)} ${n(x)} ${n(y)}`);
      lastC = [x2, y2];
      lastQ = null;
      cx = x;
      cy = y;
    } else if (C === "Q" || C === "T") {
      let qx;
      let qy;
      if (C === "Q") {
        qx = num() + ox;
        qy = num() + oy;
      } else {
        [qx, qy] = lastQ ? [2 * cx - lastQ[0], 2 * cy - lastQ[1]] : [cx, cy];
      }
      const x = num() + ox;
      const y = num() + oy;
      out.push(`Q ${n(qx)} ${n(qy)} ${n(x)} ${n(y)}`);
      lastQ = [qx, qy];
      lastC = null;
      cx = x;
      cy = y;
    } else if (C === "A") {
      const [rx, ry, phi, large, sweep] = [num(), num(), num(), num(), num()];
      const x = num() + ox;
      const y = num() + oy;
      for (const c of arcToCubics(cx, cy, rx, ry, phi, large ? 1 : 0, sweep ? 1 : 0, x, y)) {
        out.push(`C ${c.map(n).join(" ")}`);
      }
      cx = x;
      cy = y;
      lastC = lastQ = null;
    } else if (C === "Z") {
      out.push("Z");
      cx = sx;
      cy = sy;
      lastC = lastQ = null;
    } else {
      i++;
    }
  }
  return out.join(" ");
}

const ellipse = (cx, cy, rx, ry) =>
  [
    `M ${n(cx - rx)} ${n(cy)}`,
    `C ${n(cx - rx)} ${n(cy - ry * K)} ${n(cx - rx * K)} ${n(cy - ry)} ${n(cx)} ${n(cy - ry)}`,
    `C ${n(cx + rx * K)} ${n(cy - ry)} ${n(cx + rx)} ${n(cy - ry * K)} ${n(cx + rx)} ${n(cy)}`,
    `C ${n(cx + rx)} ${n(cy + ry * K)} ${n(cx + rx * K)} ${n(cy + ry)} ${n(cx)} ${n(cy + ry)}`,
    `C ${n(cx - rx * K)} ${n(cy + ry)} ${n(cx - rx)} ${n(cy + ry * K)} ${n(cx - rx)} ${n(cy)} Z`,
  ].join(" ");

function rect({ x = 0, y = 0, width, height, rx, ry }) {
  [x, y, width, height] = [x, y, width, height].map(Number);
  const r = Math.min(Number(rx ?? ry ?? 0), width / 2, height / 2);
  if (!r) return `M ${n(x)} ${n(y)} L ${n(x + width)} ${n(y)} L ${n(x + width)} ${n(y + height)} L ${n(x)} ${n(y + height)} Z`;
  const k = r * (1 - K);
  return [
    `M ${n(x + r)} ${n(y)} L ${n(x + width - r)} ${n(y)} C ${n(x + width - k)} ${n(y)} ${n(x + width)} ${n(y + k)} ${n(x + width)} ${n(y + r)}`,
    `L ${n(x + width)} ${n(y + height - r)} C ${n(x + width)} ${n(y + height - k)} ${n(x + width - k)} ${n(y + height)} ${n(x + width - r)} ${n(y + height)}`,
    `L ${n(x + r)} ${n(y + height)} C ${n(x + k)} ${n(y + height)} ${n(x)} ${n(y + height - k)} ${n(x)} ${n(y + height - r)}`,
    `L ${n(x)} ${n(y + r)} C ${n(x)} ${n(y + k)} ${n(x + k)} ${n(y)} ${n(x + r)} ${n(y)} Z`,
  ].join(" ");
}

function elementToPath([tag, a]) {
  switch (tag) {
    case "path":
      return normalizePath(a.d);
    case "circle":
      return ellipse(Number(a.cx), Number(a.cy), Number(a.r), Number(a.r));
    case "ellipse":
      return ellipse(Number(a.cx), Number(a.cy), Number(a.rx), Number(a.ry));
    case "rect":
      return rect(a);
    case "line":
      return `M ${n(Number(a.x1))} ${n(Number(a.y1))} L ${n(Number(a.x2))} ${n(Number(a.y2))}`;
    case "polyline":
    case "polygon": {
      const pts = a.points.trim().split(/[\s,]+/).map(Number);
      const parts = [];
      for (let i = 0; i < pts.length; i += 2) parts.push(`${i ? "L" : "M"} ${n(pts[i])} ${n(pts[i + 1])}`);
      return parts.join(" ") + (tag === "polygon" ? " Z" : "");
    }
    default:
      throw new Error(`Unsupported element <${tag}>`);
  }
}

// ---------------------------------------------------------------- build

const entries = [];
const missing = [];
for (const [id, [name, words, group]] of Object.entries(ICONS)) {
  let source;
  try {
    source = readFileSync(join(lucideDir, `${id}.js`), "utf8");
  } catch {
    missing.push(id);
    continue;
  }
  const literal = source.slice(source.indexOf("[", source.indexOf("createLucideIcon(")), source.lastIndexOf("]);") + 1);
  // Data only (tag + attributes), from the installed package.
  const node = new Function(`return ${literal}`)();
  const d = node.map(elementToPath).join(" ");
  if (/[aAhHvVsStT]|[a-z]/.test(d.replace(/e[-+]?\d/g, ""))) throw new Error(`${id}: unexpected command left in ${d}`);
  entries.push(`  ${JSON.stringify(id)}: { name: ${JSON.stringify(name)}, keywords: ${JSON.stringify(words)}, group: ${JSON.stringify(group)}, d: ${JSON.stringify(d)} },`);
}

const file = `/**
 * Line icons of the library, from Lucide ${lucideVersion} (https://lucide.dev, ISC licence: free to use, modify and
 * print commercially; copyright notice: "Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of
 * Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2022.").
 * GENERATED by shared/scripts/build-library-icons.mjs, do not edit. Paths are absolute M L C Q Z on a 24 × 24 grid,
 * drawn as 2-unit strokes with round caps and joins.
 */

export interface LibraryIcon {
  /** Vietnamese name. */
  name: string;
  /** Search words. */
  keywords: string;
  group: string;
  d: string;
}

export const LIBRARY_ICONS: Record<string, LibraryIcon> = {
${entries.join("\n")}
};
`;
writeFileSync(join(here, "../src/library/icons.ts"), file);
console.log(`${entries.length} icons written${missing.length ? `; not in Lucide ${lucideVersion}: ${missing.join(", ")}` : ""}`);
