import { CURRENT_FORMULA_VERSION, generateDielinePieces, type BoxDimensions } from "@wrapfit/shared";
import React from "react";

// Technical sheet of a WrapFit tuck-top box, after a packaging spec-sheet reference: front, top and side views with
// their sizes, an isometric view, print colours, material and the flat dieline. Static SVG (no WebGL, no animation);
// the dieline is the real one of the size shown, from the formulas of the print file.

const BOX: BoxDimensions = { length: 80, width: 60, height: 120, paperThickness: 0.42 };
const { length: L, width: W, height: H } = BOX;

const INK = "#152B07";
const GREEN = "#2D5C0F";
const LIME = "#98E665";
const CREAM = "#EAFAE0";
const LINE = "#53647D";
const HEADING = { fontFamily: "var(--font-landing-heading), sans-serif" } as const;
const MONO = { fontFamily: "var(--font-landing-body), Inter, sans-serif", fontVariantNumeric: "tabular-nums" } as const;

/** Flat dieline of the box, computed once (module scope: the sheet never changes). */
const DIELINE = (() => {
  try {
    const piece = generateDielinePieces("tuck-top", BOX, CURRENT_FORMULA_VERSION)[0];
    return { segments: piece.geometry.segments, ...piece.geometry.totalBoundingBox };
  } catch {
    return null;
  }
})();

/** Artwork of the front panel, in its own millimetres (L × H). */
function FrontArt() {
  return (
    <>
      <rect width={L} height={H} fill={INK} />
      <path d={`M0 74 C 16 62, 34 90, 52 80 S 74 66, ${L} 70 L${L} ${H} L0 ${H} Z`} fill={LIME} />
      <path d={`M0 90 C 20 80, 42 106, 62 96 S 76 92, ${L} 94 L${L} ${H} L0 ${H} Z`} fill={CREAM} />
      <path d="M58 108 q 8 -14 18 -16 q -4 12 -18 16 Z" fill={GREEN} opacity="0.7" />
      <g transform="translate(32 12) scale(0.5)">
        <path d="M16 2 L29 9 L16 16 L3 9 Z" fill={CREAM} />
        <path d="M3 9 L16 16 L16 30 L3 23 Z" fill={LIME} />
        <path d="M16 16 L29 9 L29 23 L16 30 Z" fill="#7BCB4A" />
      </g>
      <text x={L / 2} y="42" textAnchor="middle" fontSize="10.5" fontWeight="700" fill={CREAM} style={HEADING}>
        WRAPFIT
      </text>
      <text x={L / 2} y="51" textAnchor="middle" fontSize="5" letterSpacing="1.2" fill={LIME} style={HEADING}>
        GIFT BOX
      </text>
      <text x={L / 2} y="58" textAnchor="middle" fontSize="3.2" fill={CREAM} opacity="0.75" style={HEADING}>
        Make Every Present, Present.
      </text>
    </>
  );
}

/** Artwork of a side panel (W × H). */
function SideArt() {
  return (
    <>
      <rect width={W} height={H} fill={GREEN} />
      <rect y="70" width={W} height="7" fill={LIME} />
      <rect y="98" width={W} height={H - 98} fill={CREAM} />
      <text x={W / 2} y="40" textAnchor="middle" fontSize="7" fontWeight="700" fill={CREAM} transform={`rotate(-90 ${W / 2} 40)`} style={HEADING}>
        WRAPFIT
      </text>
    </>
  );
}

/** Artwork of the lid (L × W): the tuck flap crease near the front edge. */
function TopArt() {
  return (
    <>
      <rect width={L} height={W} fill={GREEN} />
      <g transform={`translate(${L / 2 - 8} ${W / 2 - 8}) scale(0.5)`}>
        <path d="M16 2 L29 9 L16 16 L3 9 Z" fill={CREAM} />
        <path d="M3 9 L16 16 L16 30 L3 23 Z" fill={LIME} />
        <path d="M16 16 L29 9 L29 23 L16 30 Z" fill="#7BCB4A" />
      </g>
      <line x1="0" y1={W - 8} x2={L} y2={W - 8} stroke={CREAM} strokeWidth="0.6" strokeDasharray="2 1.5" opacity="0.7" />
    </>
  );
}

/** Isometric projection of the box (x = length, y = width, z = height), scaled and moved to `origin`. */
const COS30 = Math.cos(Math.PI / 6);
function isoPoint([x, y, z]: [number, number, number], scale: number, origin: [number, number]): [number, number] {
  return [origin[0] + (x - y) * COS30 * scale, origin[1] + ((x + y) * 0.5 - z) * scale];
}

/** SVG matrix that maps a face's own (u right, v down) millimetres onto the parallelogram `topLeft → topRight / bottomLeft`. */
function faceMatrix(topLeft: [number, number], topRight: [number, number], bottomLeft: [number, number], uSize: number, vSize: number) {
  const a = (topRight[0] - topLeft[0]) / uSize;
  const b = (topRight[1] - topLeft[1]) / uSize;
  const c = (bottomLeft[0] - topLeft[0]) / vSize;
  const d = (bottomLeft[1] - topLeft[1]) / vSize;
  return `matrix(${a} ${b} ${c} ${d} ${topLeft[0]} ${topLeft[1]})`;
}

function IsoBox({ origin, scale }: { origin: [number, number]; scale: number }) {
  const p = (x: number, y: number, z: number) => isoPoint([x, y, z], scale, origin);
  // Visible faces: front (y = W), right side (x = L), lid (z = H).
  const front = faceMatrix(p(0, W, H), p(L, W, H), p(0, W, 0), L, H);
  const side = faceMatrix(p(L, W, H), p(L, 0, H), p(L, W, 0), W, H);
  const top = faceMatrix(p(0, 0, H), p(L, 0, H), p(0, W, H), L, W);
  const outline = [p(0, W, 0), p(L, W, 0), p(L, 0, 0), p(L, 0, H), p(0, 0, H), p(0, W, H)].map((q) => q.join(",")).join(" ");
  const [hx1, hy1] = p(L, 0, H);
  const [hx2, hy2] = p(L, 0, 0);
  const [lx1, ly1] = p(0, W, 0);
  const [lx2, ly2] = p(L, W, 0);
  const [wx2, wy2] = p(L, 0, 0);
  return (
    <g>
      <ellipse cx={origin[0] + 10} cy={p(L, W, 0)[1] + 6} rx={95} ry={14} fill="#1D293D" opacity="0.08" />
      <g transform={front}>
        <FrontArt />
      </g>
      <g transform={side}>
        <SideArt />
        <rect width={W} height={H} fill="#000" opacity="0.18" />
      </g>
      <g transform={top}>
        <TopArt />
        <rect width={L} height={W} fill="#fff" opacity="0.08" />
      </g>
      <polygon points={outline} fill="none" stroke={INK} strokeWidth="1" strokeLinejoin="round" />
      <line x1={p(L, W, 0)[0]} y1={p(L, W, 0)[1]} x2={p(L, W, H)[0]} y2={p(L, W, H)[1]} stroke={INK} strokeWidth="0.8" opacity="0.6" />
      {/* Dimensions */}
      <g stroke={LINE} strokeWidth="0.8" fill="none">
        <line x1={hx1 + 14} y1={hy1} x2={hx2 + 14} y2={hy2} />
        <line x1={lx1 - 6} y1={ly1 + 12} x2={lx2 - 6} y2={ly2 + 12} />
        <line x1={lx2 + 8} y1={ly2 + 8} x2={wx2 + 8} y2={wy2 + 8} />
      </g>
      <g fontSize="10" fill={LINE} style={MONO}>
        <text x={hx1 + 20} y={(hy1 + hy2) / 2}>H = {H} mm</text>
        <text x={(lx1 + lx2) / 2 - 40} y={(ly1 + ly2) / 2 + 30}>L = {L} mm</text>
        <text x={(lx2 + wx2) / 2 + 14} y={(ly2 + wy2) / 2 + 24}>W = {W} mm</text>
      </g>
    </g>
  );
}

/** Horizontal or vertical dimension line with end ticks and its label. */
function Dim({ x1, y1, x2, y2, label, vertical = false }: { x1: number; y1: number; x2: number; y2: number; label: string; vertical?: boolean }) {
  const tick = 4;
  return (
    <g stroke={LINE} strokeWidth="0.8">
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      {vertical ? (
        <>
          <line x1={x1 - tick} y1={y1} x2={x1 + tick} y2={y1} />
          <line x1={x2 - tick} y1={y2} x2={x2 + tick} y2={y2} />
          <text x={x1 - 8} y={(y1 + y2) / 2} textAnchor="middle" fontSize="9" fill={LINE} stroke="none" transform={`rotate(-90 ${x1 - 8} ${(y1 + y2) / 2})`} style={MONO}>
            {label}
          </text>
        </>
      ) : (
        <>
          <line x1={x1} y1={y1 - tick} x2={x1} y2={y1 + tick} />
          <line x1={x2} y1={y2 - tick} x2={x2} y2={y2 + tick} />
          <text x={(x1 + x2) / 2} y={y1 + 14} textAnchor="middle" fontSize="9" fill={LINE} stroke="none" style={MONO}>
            {label}
          </text>
        </>
      )}
    </g>
  );
}

function Label({ x, y, children, anchor = "start" }: { x: number; y: number; children: React.ReactNode; anchor?: "start" | "middle" | "end" }) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize="9.5" fontWeight="600" letterSpacing="1" fill={INK} style={HEADING}>
      {children}
    </text>
  );
}

/** The whole sheet, scaled to its card. */
export function PackagingSpecSheet({ className }: { className?: string }) {
  const dieScale = DIELINE ? Math.min(330 / DIELINE.width, 175 / DIELINE.height) : 1;
  const dieX = DIELINE ? 200 + (330 - DIELINE.width * dieScale) / 2 : 0;
  return (
    <svg viewBox="0 0 560 640" className={className} role="img" aria-label={`Bản vẽ kỹ thuật hộp nắp gài ${L} × ${W} × ${H} mm: mặt trước, mặt trên, mặt bên, phối cảnh, màu in, chất liệu và khuôn bế`}>
      <defs>
        <pattern id="spec-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0 L0 0 0 20" fill="none" stroke="#1D293D" strokeOpacity="0.05" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="560" height="640" fill="url(#spec-grid)" />

      <text x="28" y="34" fontSize="10" letterSpacing="1.5" fill={LINE} style={MONO}>
        BẢN VẼ KỸ THUẬT · HỘP NẮP GÀI
      </text>
      <text x="532" y="34" textAnchor="end" fontSize="10" fill={LINE} style={MONO}>
        WF-001
      </text>

      {/* Front view */}
      <g transform="translate(48 62) scale(1.15)">
        <FrontArt />
        <rect width={L} height={H} fill="none" stroke={INK} strokeWidth="0.8" />
      </g>
      <Dim x1={38} y1={62} x2={38} y2={62 + H * 1.15} label={`H = ${H} mm`} vertical />
      <Dim x1={48} y1={210} x2={48 + L * 1.15} y2={210} label={`L = ${L} mm`} />
      <Label x={48} y={244}>MẶT TRƯỚC</Label>

      {/* Top view */}
      <g transform="translate(176 62)">
        <TopArt />
        <rect width={L} height={W} fill="none" stroke={INK} strokeWidth="0.8" />
      </g>
      <Dim x1={176} y1={132} x2={176 + L} y2={132} label={`L = ${L} mm`} />
      <Label x={176} y={166}>MẶT TRÊN</Label>

      {/* Print colours and material */}
      <Label x={440} y={62}>MÀU IN</Label>
      {[
        [INK, "#152B07"],
        [LIME, "#98E665"],
        [CREAM, "#EAFAE0"],
      ].map(([fill, hex], index) => (
        <g key={hex} transform={`translate(440 ${74 + index * 30})`}>
          <rect width="22" height="22" rx="4" fill={fill} stroke={INK} strokeOpacity="0.2" />
          <text x="30" y="15" fontSize="9.5" fill={LINE} style={MONO}>
            {hex}
          </text>
        </g>
      ))}
      <Label x={440} y={188}>CHẤT LIỆU</Label>
      <text x="440" y="204" fontSize="10" fill={INK} style={HEADING}>
        Ivory 300 GSM
      </text>
      <text x="440" y="218" fontSize="9" fill={LINE} style={HEADING}>
        In CMYK · cán mờ
      </text>
      <g transform="translate(440 230)">
        <rect width="92" height="22" rx="11" fill={LIME} />
        <text x="46" y="15" textAnchor="middle" fontSize="9.5" fontWeight="600" fill={INK} style={HEADING}>
          FitCheck™ 100
        </text>
      </g>

      {/* Isometric view */}
      <IsoBox origin={[322, 300]} scale={1.05} />
      <Label x={262} y={166}>PHỐI CẢNH 3D</Label>

      {/* Side view */}
      <g transform="translate(48 282)">
        <SideArt />
        <rect width={W} height={H} fill="none" stroke={INK} strokeWidth="0.8" />
      </g>
      <Dim x1={48} y1={414} x2={48 + W} y2={414} label={`W = ${W} mm`} />
      <Label x={48} y={448}>MẶT BÊN</Label>

      {/* Flat dieline */}
      <Label x={200} y={442}>KHUÔN BẾ TRẢI PHẲNG</Label>
      {DIELINE && (
        <g transform={`translate(${dieX} 452) scale(${dieScale})`} fill="none">
          {DIELINE.segments.map((segment) => {
            const cut = segment.type === "cut";
            if (!cut && segment.type !== "crease") return null;
            const stroke = {
              stroke: cut ? "#E53E3E" : "#3182CE",
              strokeWidth: 1,
              strokeDasharray: cut ? undefined : "4 3",
              vectorEffect: "non-scaling-stroke" as const,
            };
            return segment.pathString ? (
              <path key={segment.id} d={segment.pathString} {...stroke} />
            ) : (
              <line key={segment.id} x1={segment.start.x} y1={segment.start.y} x2={segment.end.x} y2={segment.end.y} {...stroke} />
            );
          })}
        </g>
      )}
      <g transform="translate(48 480)" fontSize="9.5" fill={LINE} style={HEADING}>
        <line x1="0" y1="0" x2="18" y2="0" stroke="#E53E3E" strokeWidth="1.5" />
        <text x="24" y="3.5">Nét cắt</text>
        <line x1="0" y1="18" x2="18" y2="18" stroke="#3182CE" strokeWidth="1.5" strokeDasharray="4 3" />
        <text x="24" y="21.5">Nét gấp</text>
        <text x="0" y="48">Tai gài · Tai chống bụi</text>
        <text x="0" y="62">Tai dán · Khoá đáy</text>
        <text x="0" y="90" fontSize="8.5">t = {BOX.paperThickness} mm</text>
      </g>
    </svg>
  );
}
