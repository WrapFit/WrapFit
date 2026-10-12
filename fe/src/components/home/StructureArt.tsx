import React from "react";
import type { BoxStructureType } from "@wrapfit/shared";

// Line drawings of the four box structures, in the style of the category tiles of pack.ly: slate outline,
// white faces, the inside and the shaded faces a shade darker.
const STROKE = "#5B6B85";
const FACE = "#FFFFFF";
const SIDE = "#F4F7FA";
const INSIDE = "#DCE4EE";

function TuckTop() {
  return (
    <>
      {/* Opening, with the back walls seen through it */}
      <path d="M62 78 L106 60 L142 78 L98 97 Z" fill={INSIDE} />
      <path d="M106 60 L106 74 M106 74 L62 92 M106 74 L142 92" stroke={STROKE} strokeWidth="1.5" opacity="0.5" />
      {/* Lid on the back panel, opened up, and its tuck flap */}
      <path d="M106 60 L142 78 L146 38 L110 21 Z" fill={FACE} />
      <path d="M110 21 L146 38 L149 30 Q150 27 147 26 L115 11 Q112 10 111 13 Z" fill={SIDE} />
      {/* Dust flap of the back side panel */}
      <path d="M62 78 L106 60 L97 44 Q96 42 93 43 L57 58 Q55 59 55 62 Z" fill={SIDE} />
      {/* Front and right panels */}
      <path d="M62 78 L98 97 L98 182 L62 163 Z" fill={FACE} />
      <path d="M98 97 L142 78 L142 163 L98 182 Z" fill={SIDE} />
      {/* Dust flap of the right side panel, opened outwards */}
      <path d="M98 97 L142 78 L154 63 Q155 61 153 61 L112 78 Q110 79 109 81 Z" fill={FACE} />
    </>
  );
}

function SleeveDrawer() {
  return (
    <>
      {/* Sleeve: top, front, and the open end with its dark inside */}
      <path d="M86 66 L158 42 L188 60 L116 84 Z" fill={FACE} />
      <path d="M116 84 L188 60 L188 98 L116 122 Z" fill={SIDE} />
      <path d="M86 66 L116 84 L116 122 L86 104 Z" fill={INSIDE} />
      {/* Tray pulled out of the sleeve */}
      <path d="M44 86 L72 76 L102 94 L74 104 Z" fill={INSIDE} />
      <path d="M44 86 L74 104 L74 132 L44 114 Z" fill={FACE} />
      <path d="M74 104 L102 94 L110 99 L110 127 L74 132 Z" fill={SIDE} />
      <path d="M52 92 L74 84 L96 97" stroke={STROKE} strokeWidth="1.5" opacity="0.5" />
      {/* Ribbon pull tab */}
      <path d="M44 100 Q32 104 30 112 Q36 112 44 107" fill={FACE} />
    </>
  );
}

function LidBase() {
  return (
    <>
      {/* Lid, lifted above the base */}
      <path d="M28 52 L104 80 L176 50 L100 24 Z" fill={FACE} />
      <path d="M28 52 L104 80 L104 96 L28 68 Z" fill={SIDE} />
      <path d="M104 80 L176 50 L176 66 L104 96 Z" fill={FACE} />
      {/* Base: open top with the inside, then its two outer walls */}
      <path d="M34 124 L104 150 L170 122 L100 98 Z" fill={INSIDE} />
      <path d="M100 98 L100 112 M100 112 L34 138 M100 112 L170 136" stroke={STROKE} strokeWidth="1.5" opacity="0.5" />
      <path d="M34 124 L104 150 L104 184 L34 158 Z" fill={FACE} />
      <path d="M104 150 L170 122 L170 156 L104 184 Z" fill={SIDE} />
    </>
  );
}

function Pillow() {
  return (
    <>
      <path d="M26 112 Q100 52 176 94 Q186 108 176 122 Q100 168 26 140 Q16 126 26 112 Z" fill={FACE} />
      {/* Lower face, in the shade */}
      <path d="M28 128 Q100 104 178 108 Q186 116 176 122 Q100 168 26 140 Q22 134 28 128 Z" fill={SIDE} />
      {/* Curved end flaps */}
      <path d="M26 112 Q40 126 26 140" fill="none" />
      <path d="M176 94 Q162 108 176 122" fill="none" />
      {/* Crease along the body */}
      <path d="M28 128 Q100 104 178 108" fill="none" strokeWidth="1.5" opacity="0.6" />
    </>
  );
}

const ART: Record<BoxStructureType, () => React.JSX.Element> = {
  "tuck-top": TuckTop,
  "sleeve-drawer": SleeveDrawer,
  "lid-base": LidBase,
  pillow: Pillow,
};

/** Line drawing of a box structure, scaled to its square tile. */
export function StructureArt({ structure, className }: { structure: BoxStructureType; className?: string }) {
  const Art = ART[structure] ?? TuckTop;
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden>
      <g stroke={STROKE} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round">
        <Art />
      </g>
    </svg>
  );
}
