/* ds-artwork: the tabletop and props of the 3D photo sets draw real materials (docs/15_DESIGN_SYSTEM.md §2). */
import * as THREE from "three";
import { BACKDROPS, type SceneId, type SurfaceKind } from "./backdrops";
import { STUDIO_PALETTES, type StudioPalette, type StudioPaletteId } from "./studioPalettes";

/**
 * The photo set of a scene (step 5): a tabletop that takes the box's shadow and fades into the backdrop, and the props
 * of the occasion around the box (mandarins and lì xì for Tết, hearts for Valentine…). Built from three.js primitives
 * and textures drawn on a canvas, so nothing is downloaded. Sizes are in "prop units"; `layout` scales them to the box
 * and places them around its footprint, never in front of the 3/4 camera.
 */
export interface SceneSet {
  group: THREE.Group;
  /** Shows or hides the props (the tabletop stays). */
  setProps(on: boolean): void;
  /** Places the set around a box standing at `center` whose footprint reaches `clear` from it; `radius` sizes it. */
  layout(center: THREE.Vector3, clear: number, radius: number): void;
  dispose(): void;
  setPalette?(palette: StudioPalette): void;
}

/** A small seeded random: the same scene always looks the same (mockups and clips match the stage). */
function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Tabletop

const TEXTURE_SIZE = 512;

function surfaceCanvas(kind: SurfaceKind, base: string, accent: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext("2d")!;
  const S = TEXTURE_SIZE;
  const rand = seeded(kind.length * 97 + 13);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, S, S);

  switch (kind) {
    case "marble": {
      // Thin grey veins with a soft halo, crossing the slab diagonally.
      for (let v = 0; v < 7; v++) {
        let x = rand() * S;
        let y = -20;
        ctx.beginPath();
        ctx.moveTo(x, y);
        while (y < S + 20) {
          x += (rand() - 0.45) * 60;
          y += 30 + rand() * 40;
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = accent;
        ctx.globalAlpha = 0.08 + rand() * 0.08;
        ctx.lineWidth = 6 + rand() * 6;
        ctx.filter = "blur(4px)";
        ctx.stroke();
        ctx.globalAlpha = 0.25 + rand() * 0.25;
        ctx.lineWidth = 0.8 + rand() * 1.2;
        ctx.filter = "blur(0.6px)";
        ctx.stroke();
      }
      break;
    }
    case "wood": {
      // Planks with a seam, each a slightly different tone, and wavy grain along them (tileable both ways).
      const planks = 4;
      const h = S / planks;
      for (let p = 0; p < planks; p++) {
        ctx.globalAlpha = 0.08 + rand() * 0.1;
        ctx.fillStyle = rand() > 0.5 ? "#FFFFFF" : accent;
        ctx.fillRect(0, p * h, S, h);
        ctx.globalAlpha = 1;
        for (let g = 0; g < 26; g++) {
          const y0 = p * h + rand() * h;
          ctx.beginPath();
          // Whole waves across the tile: the grain meets itself at the seam.
          const waves = 1 + (g % 3);
          const amp = 2 + rand() * 3;
          for (let x = 0; x <= S; x += 16) ctx.lineTo(x, y0 + Math.sin((x / S) * Math.PI * 2 * waves + g) * amp);
          ctx.strokeStyle = accent;
          ctx.globalAlpha = 0.1 + rand() * 0.18;
          ctx.lineWidth = 0.6 + rand() * 1.4;
          ctx.stroke();
        }
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = accent;
        ctx.fillRect(0, p * h, S, 2);
      }
      break;
    }
    case "velvet": {
      // Fine pile noise.
      const image = ctx.getImageData(0, 0, S, S);
      for (let i = 0; i < image.data.length; i += 4) {
        const n = (rand() - 0.5) * 22;
        image.data[i] += n;
        image.data[i + 1] += n;
        image.data[i + 2] += n;
      }
      // Noise only: it tiles without a seam; the sheen comes from the light on the rough material.
      ctx.putImageData(image, 0, 0);
      break;
    }
    case "linen":
    case "paper": {
      // Woven threads (linen) or a light laid pattern (paper).
      const step = kind === "linen" ? 4 : 7;
      ctx.strokeStyle = accent;
      for (let i = 0; i < S; i += step) {
        ctx.globalAlpha = (kind === "linen" ? 0.12 : 0.06) + rand() * 0.06;
        ctx.lineWidth = kind === "linen" ? 1.2 : 0.8;
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(S, i + (rand() - 0.5) * 2);
        ctx.stroke();
        if (kind === "linen") {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i + (rand() - 0.5) * 2, S);
          ctx.stroke();
        }
      }
      break;
    }
    case "silk": {
      // Long soft folds catching the light.
      for (let f = 0; f < 6; f++) {
        const x = rand() * S;
        const fold = ctx.createLinearGradient(x - 60, 0, x + 60, 0);
        fold.addColorStop(0, "rgba(255,255,255,0)");
        fold.addColorStop(0.5, f % 2 ? "rgba(255,255,255,0.28)" : "rgba(160,40,80,0.12)");
        fold.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = fold;
        ctx.fillRect(0, 0, S, S);
      }
      break;
    }
    case "sweep":
    default:
      break;
  }
  ctx.globalAlpha = 1;
  ctx.filter = "none";
  return canvas;
}

/** White in the middle, black at the rim: the tabletop melts into the backdrop instead of ending on a hard edge. */
function fadeTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, "#FFFFFF");
  gradient.addColorStop(0.42, "#FFFFFF");
  gradient.addColorStop(1, "#000000");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
}

const SURFACE_LOOK: Record<SurfaceKind, { roughness: number; metalness: number; repeat: number }> = {
  sweep: { roughness: 0.95, metalness: 0, repeat: 1 },
  marble: { roughness: 0.32, metalness: 0, repeat: 1.6 },
  wood: { roughness: 0.7, metalness: 0, repeat: 2 },
  velvet: { roughness: 1, metalness: 0, repeat: 3 },
  linen: { roughness: 0.95, metalness: 0, repeat: 5 },
  silk: { roughness: 0.45, metalness: 0.05, repeat: 1.2 },
  paper: { roughness: 0.9, metalness: 0, repeat: 3 },
};

// ---------------------------------------------------------------------------------------------------------------
// Props

interface Placed {
  object: THREE.Object3D;
  /** Direction around the box, degrees: 0 in front, 90 on the right (the 3/4 camera sits near 37°). */
  angle: number;
  /** How far past the footprint, in prop units. */
  gap: number;
  /** Lies flat among others (petals, confetti): scattered over a ring instead. */
  scatter?: boolean;
}

type Kit = { mesh(geometry: THREE.BufferGeometry, color: string, opts?: Partial<THREE.MeshStandardMaterialParameters>): THREE.Mesh };

function makeKit(geometries: THREE.BufferGeometry[], materials: THREE.Material[]): Kit {
  return {
    mesh(geometry, color, opts = {}) {
      geometries.push(geometry);
      const material = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0, ...opts });
      materials.push(material);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    },
  };
}

function group(...children: THREE.Object3D[]) {
  const g = new THREE.Group();
  g.add(...children);
  return g;
}

function heartShape() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.9);
  s.bezierCurveTo(-0.2, -0.65, -1, -0.2, -1, 0.3);
  s.bezierCurveTo(-1, 0.85, -0.35, 1, 0, 0.55);
  s.bezierCurveTo(0.35, 1, 1, 0.85, 1, 0.3);
  s.bezierCurveTo(1, -0.2, 0.2, -0.65, 0, -0.9);
  return s;
}

function buildProps(id: SceneId, kit: Kit, rand: () => number): Placed[] {
  const flat = (geometry: THREE.BufferGeometry, color: string, size: number, opts?: Partial<THREE.MeshStandardMaterialParameters>) => {
    const m = kit.mesh(geometry, color, opts);
    m.scale.set(size, size * 0.12, size * 0.7);
    m.position.y = size * 0.06;
    m.rotation.y = rand() * Math.PI;
    return m;
  };
  const scatter = (count: number, make: (i: number) => THREE.Object3D): Placed[] =>
    Array.from({ length: count }, (_, i) => ({ object: make(i), angle: rand() * 360, gap: 0.4 + rand() * 2.6, scatter: true }));

  switch (id) {
    case "marble": {
      const profile = [0, 0.55, 0.62, 0.5, 0.32, 0.26, 0.3].map((r, i) => new THREE.Vector2(r, i * 0.28));
      const vase = kit.mesh(new THREE.LatheGeometry(profile, 40), "#ECE7DF", { roughness: 0.85 });
      const stems = [-0.18, 0.05, 0.2].map((x, i) => {
        const stem = kit.mesh(new THREE.CylinderGeometry(0.015, 0.02, 1.8, 6), "#6B7A5E");
        stem.position.set(x, 2.3, 0);
        stem.rotation.z = (i - 1) * 0.25;
        const leaves = Array.from({ length: 5 }, (_, j) => {
          const leaf = kit.mesh(new THREE.SphereGeometry(0.13, 12, 8), "#8FA392", { roughness: 0.8 });
          leaf.scale.set(1, 0.25, 1.2);
          leaf.position.set(x + (j % 2 ? 0.12 : -0.12) + (i - 1) * 0.1 * j, 1.8 + j * 0.28, 0);
          return leaf;
        });
        return group(stem, ...leaves);
      });
      const pebble = (size: number) => {
        const p = kit.mesh(new THREE.SphereGeometry(size, 20, 14), "#B8B2AA", { roughness: 0.5 });
        p.scale.y = 0.5;
        p.position.y = size * 0.5;
        return p;
      };
      return [
        { object: group(vase, ...stems), angle: 240, gap: 1 },
        { object: pebble(0.38), angle: 300, gap: 0.5 },
        { object: pebble(0.25), angle: 138, gap: 0.6 },
      ];
    }
    case "kraft_wood": {
      const spool = group(
        kit.mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.9, 28), "#B8956A", { roughness: 1 }),
        ...[0.15, 0.35, 0.55, 0.75].map((y) => {
          const ring = kit.mesh(new THREE.TorusGeometry(0.56, 0.035, 8, 32), "#9C7A52", { roughness: 1 });
          ring.rotation.x = Math.PI / 2;
          ring.position.y = y - 0.45;
          return ring;
        })
      );
      spool.position.y = 0.45;
      const cinnamon = group(
        ...[-0.12, 0, 0.12].map((z, i) => {
          const stick = kit.mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.6, 10), "#7A4A26", { roughness: 0.9 });
          stick.rotation.z = Math.PI / 2;
          stick.position.set(0, 0.08 + (i === 1 ? 0.12 : 0), z);
          return stick;
        })
      );
      return [
        { object: spool, angle: 240, gap: 0.9 },
        { object: cinnamon, angle: 300, gap: 0.5 },
        ...scatter(4, () => flat(new THREE.SphereGeometry(0.5, 14, 8), rand() > 0.5 ? "#C98A3E" : "#A8642B", 0.7, { roughness: 0.9 })),
      ];
    }
    case "forest_velvet": {
      const pearls = group(
        ...Array.from({ length: 18 }, (_, i) => {
          const t = i / 17;
          const pearl = kit.mesh(new THREE.SphereGeometry(0.12, 18, 12), "#F3EEE4", { roughness: 0.18, metalness: 0.15 });
          pearl.position.set(Math.cos(t * Math.PI * 1.3) * 1.1, 0.12, Math.sin(t * Math.PI * 1.3) * 0.7);
          return pearl;
        })
      );
      const ring = kit.mesh(new THREE.TorusGeometry(0.32, 0.07, 16, 40), "#D8B04C", { roughness: 0.22, metalness: 1 });
      ring.rotation.x = Math.PI / 2.4;
      ring.position.y = 0.12;
      return [
        { object: pearls, angle: 292, gap: 0.6 },
        { object: ring, angle: 140, gap: 0.5 },
      ];
    }
    case "festive_glow": {
      const envelope = () => {
        const body = kit.mesh(new THREE.BoxGeometry(1.1, 0.04, 1.9), "#C8102E", { roughness: 0.55 });
        const band = kit.mesh(new THREE.BoxGeometry(1.1, 0.045, 0.22), "#D9B04C", { roughness: 0.3, metalness: 0.8 });
        band.position.z = -0.35;
        const e = group(body, band);
        e.position.y = 0.02;
        return e;
      };
      const mandarin = () => {
        const fruit = kit.mesh(new THREE.SphereGeometry(0.5, 28, 20), "#F28C1B", { roughness: 0.55 });
        fruit.scale.y = 0.86;
        fruit.position.y = 0.43;
        const leaf = kit.mesh(new THREE.SphereGeometry(0.22, 12, 8), "#2F7A3A", { roughness: 0.6 });
        leaf.scale.set(1, 0.2, 0.45);
        leaf.position.set(0.12, 0.86, 0);
        leaf.rotation.z = -0.4;
        return group(fruit, leaf);
      };
      const e1 = envelope();
      e1.rotation.y = 0.5;
      const e2 = envelope();
      e2.rotation.y = -0.2;
      e2.position.set(0.25, 0.05, 0.15);
      return [
        { object: group(e1, e2), angle: 295, gap: 0.6 },
        { object: mandarin(), angle: 240, gap: 0.6 },
        { object: mandarin(), angle: 138, gap: 0.7 },
        ...scatter(9, () => flat(new THREE.CircleGeometry(0.5, 5).rotateX(-Math.PI / 2), "#F5C518", 0.32, { side: THREE.DoubleSide, roughness: 0.7 })),
      ];
    }
    case "valentine": {
      const heart = (size: number, color: string) => {
        const h = kit.mesh(
          new THREE.ExtrudeGeometry(heartShape(), { depth: 0.35, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 4, curveSegments: 24 }),
          color,
          { roughness: 0.35 }
        );
        h.scale.setScalar(size);
        h.position.y = 0.95 * size;
        return h;
      };
      const lying = heart(0.55, "#E8456B");
      lying.rotation.x = -Math.PI / 2;
      lying.position.y = 0.15;
      return [
        { object: heart(0.7, "#D61F4E"), angle: 240, gap: 0.8 },
        { object: lying, angle: 300, gap: 0.5 },
        ...scatter(10, () => flat(new THREE.SphereGeometry(0.5, 12, 8), rand() > 0.4 ? "#C2183F" : "#F27B9B", 0.45, { roughness: 0.5 })),
      ];
    }
    case "birthday": {
      const candle = (color: string) => {
        const wax = kit.mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 14), color, { roughness: 0.5 });
        wax.position.y = 0.55;
        const flame = kit.mesh(new THREE.ConeGeometry(0.07, 0.22, 10), "#FFC93C", { emissive: "#FF9E1B", emissiveIntensity: 1.2 });
        flame.position.y = 1.24;
        flame.castShadow = false;
        return group(wax, flame);
      };
      const candles = group(candle("#F472B6"), candle("#60A5FA"), candle("#34D399"));
      candles.children[1].position.set(0.3, 0, 0.2);
      candles.children[2].position.set(-0.25, 0, 0.3);
      const colors = ["#F472B6", "#60A5FA", "#FBBF24", "#34D399", "#A78BFA"];
      return [
        { object: candles, angle: 240, gap: 0.7 },
        ...scatter(36, (i) => {
          const piece = kit.mesh(new THREE.BoxGeometry(0.22, 0.01, 0.12), colors[i % colors.length], { roughness: 0.6 });
          piece.position.y = 0.01;
          piece.rotation.y = rand() * Math.PI;
          return piece;
        }),
      ];
    }
    case "christmas": {
      const bauble = (color: string, size: number) => {
        const ball = kit.mesh(new THREE.SphereGeometry(size, 32, 24), color, { roughness: 0.18, metalness: 0.75 });
        ball.position.y = size;
        const cap = kit.mesh(new THREE.CylinderGeometry(size * 0.18, size * 0.18, size * 0.2, 12), "#D9B04C", { roughness: 0.3, metalness: 1 });
        cap.position.y = size * 2;
        return group(ball, cap);
      };
      const sprig = group(
        ...Array.from({ length: 9 }, (_, i) => {
          const tuft = kit.mesh(new THREE.ConeGeometry(0.16, 0.5, 8), "#1F4D2C", { roughness: 0.9 });
          tuft.rotation.z = Math.PI / 2 + (i % 2 ? 0.4 : -0.4);
          tuft.position.set(i * 0.16 - 0.7, 0.14, i % 2 ? 0.12 : -0.12);
          return tuft;
        })
      );
      const cone = kit.mesh(new THREE.ConeGeometry(0.32, 0.8, 14), "#7A4B2A", { roughness: 1 });
      cone.rotation.z = Math.PI / 2;
      cone.position.y = 0.3;
      return [
        { object: bauble("#B3122E", 0.45), angle: 240, gap: 0.7 },
        { object: bauble("#D9B04C", 0.32), angle: 138, gap: 0.6 },
        { object: sprig, angle: 295, gap: 0.6 },
        { object: cone, angle: 330, gap: 1.1 },
      ];
    }
    case "studio":
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------------------------

/**
 * 3D Modern Studio Mockup Scene (Pacdora & pack.ly style):
 * - Modern metal-frame coffee table (wooden slab top, black tubular steel legs, perimeter rails, magazine sling)
 * - Tabletop props: ceramic porcelain vase with leafy eucalyptus foliage + ceramic coffee mug with stirrer
 * - 3D Pleated Curtain: wavy sinusoidal fabric folds
 * - Studio contrast backdrop wall & floor
 */
export function createModernStudioSceneSet(initialPaletteId: StudioPaletteId = "monochrome"): SceneSet {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  let palette = STUDIO_PALETTES[initialPaletteId] ?? STUDIO_PALETTES.monochrome;

  const root = new THREE.Group();
  root.name = "modern-studio-scene-set";

  // --- 1. Table Top & Metal Frame ---
  const tableGroup = new THREE.Group();
  tableGroup.name = "studio-table";

  const woodMap = new THREE.CanvasTexture(surfaceCanvas("wood", palette.tableTopColor, palette.tableTopGrainColor));
  woodMap.colorSpace = THREE.SRGBColorSpace;
  woodMap.wrapS = woodMap.wrapT = THREE.RepeatWrapping;
  woodMap.repeat.set(3, 2);
  textures.push(woodMap);

  const tableTopGeo = new THREE.BoxGeometry(1, 1, 1);
  geometries.push(tableTopGeo);
  const tableTopMat = new THREE.MeshStandardMaterial({
    map: woodMap,
    color: palette.tableTopColor,
    roughness: 0.65,
    metalness: 0.05,
  });
  materials.push(tableTopMat);
  const tableTop = new THREE.Mesh(tableTopGeo, tableTopMat);
  tableTop.receiveShadow = true;
  tableTop.castShadow = true;
  tableGroup.add(tableTop);

  // Black metal frame (4 corner legs, 4 top rails, 4 bottom rails)
  const frameMat = new THREE.MeshStandardMaterial({
    color: palette.frameColor,
    roughness: 0.35,
    metalness: 0.85,
  });
  materials.push(frameMat);

  const legGeo = new THREE.BoxGeometry(1, 1, 1);
  geometries.push(legGeo);
  const legs = Array.from({ length: 4 }, () => {
    const mesh = new THREE.Mesh(legGeo, frameMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    tableGroup.add(mesh);
    return mesh;
  });

  const railGeo = new THREE.BoxGeometry(1, 1, 1);
  geometries.push(railGeo);
  const rails = Array.from({ length: 8 }, () => {
    const mesh = new THREE.Mesh(railGeo, frameMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    tableGroup.add(mesh);
    return mesh;
  });

  // Side magazine sling (curved hammock hanging on the right side)
  const slingGeo = new THREE.CylinderGeometry(1, 1, 1, 24, 1, true, 0, Math.PI);
  geometries.push(slingGeo);
  const slingMat = new THREE.MeshStandardMaterial({
    color: palette.slingColor,
    roughness: 0.85,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  materials.push(slingMat);
  const sling = new THREE.Mesh(slingGeo, slingMat);
  sling.castShadow = true;
  sling.receiveShadow = true;
  tableGroup.add(sling);

  // Subtle floor plane receiving shadows
  const floorGeo = new THREE.PlaneGeometry(1, 1);
  geometries.push(floorGeo);
  const floorMat = new THREE.MeshStandardMaterial({
    color: palette.floorColor,
    roughness: 0.9,
    metalness: 0.02,
  });
  materials.push(floorMat);
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.renderOrder = -3;
  tableGroup.add(floor);

  const gridHelper = new THREE.GridHelper(1, 24, 0x71717a, 0x3f3f46);
  (gridHelper.material as THREE.Material).transparent = true;
  (gridHelper.material as THREE.Material).opacity = 0.45;
  tableGroup.add(gridHelper);

  // --- 2. Tabletop Decor Props ---
  const propsGroup = new THREE.Group();
  propsGroup.name = "studio-props";

  // Ceramic Vase (porcelain tapered)
  const vaseGroup = new THREE.Group();
  const vaseLowerGeo = new THREE.CylinderGeometry(0.7, 1.0, 1.6, 24);
  const vaseNeckGeo = new THREE.CylinderGeometry(0.42, 0.7, 1.1, 24);
  const vaseLipGeo = new THREE.CylinderGeometry(0.52, 0.42, 0.25, 24);
  geometries.push(vaseLowerGeo, vaseNeckGeo, vaseLipGeo);

  const vaseMat = new THREE.MeshStandardMaterial({
    color: palette.vaseColor,
    roughness: 0.25,
    metalness: 0.08,
  });
  materials.push(vaseMat);

  const vaseLower = new THREE.Mesh(vaseLowerGeo, vaseMat);
  vaseLower.position.y = 0.8;
  vaseLower.castShadow = true;
  vaseLower.receiveShadow = true;

  const vaseNeck = new THREE.Mesh(vaseNeckGeo, vaseMat);
  vaseNeck.position.y = 2.15;
  vaseNeck.castShadow = true;
  vaseNeck.receiveShadow = true;

  const vaseLip = new THREE.Mesh(vaseLipGeo, vaseMat);
  vaseLip.position.y = 2.75;
  vaseLip.castShadow = true;
  vaseLip.receiveShadow = true;
  vaseGroup.add(vaseLower, vaseNeck, vaseLip);

  // Eucalyptus / Olive Foliage
  const foliageGroup = new THREE.Group();
  foliageGroup.position.y = 2.7;

  const stemGeo = new THREE.CylinderGeometry(0.04, 0.06, 2.6, 8);
  geometries.push(stemGeo);
  const stemMat = new THREE.MeshStandardMaterial({
    color: "#2C402E",
    roughness: 0.7,
  });
  materials.push(stemMat);

  const leafGeo = new THREE.CircleGeometry(0.24, 12);
  leafGeo.scale(0.65, 1.3, 1);
  geometries.push(leafGeo);
  const leavesMat = new THREE.MeshStandardMaterial({
    color: palette.leavesColor,
    roughness: 0.55,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  materials.push(leavesMat);

  const stemAngles = [-0.18, 0.05, 0.22];
  const stemRotsZ = [-0.12, 0.02, 0.15];
  stemAngles.forEach((ang, sIdx) => {
    const singleStemGroup = new THREE.Group();
    singleStemGroup.rotation.z = stemRotsZ[sIdx];
    singleStemGroup.rotation.y = ang * 4;

    const stemMesh = new THREE.Mesh(stemGeo, stemMat);
    stemMesh.position.y = 1.3;
    stemMesh.castShadow = true;
    singleStemGroup.add(stemMesh);

    const numLeafPairs = 6;
    for (let l = 0; l < numLeafPairs; l++) {
      const yPos = 0.65 + l * 0.32;
      const leafPair = new THREE.Group();
      leafPair.position.y = yPos;

      const leftLeaf = new THREE.Mesh(leafGeo, leavesMat);
      leftLeaf.position.x = -0.16;
      leftLeaf.rotation.z = 0.65;
      leftLeaf.rotation.y = 0.2;
      leftLeaf.castShadow = true;

      const rightLeaf = new THREE.Mesh(leafGeo, leavesMat);
      rightLeaf.position.x = 0.16;
      rightLeaf.rotation.z = -0.65;
      rightLeaf.rotation.y = -0.2;
      rightLeaf.castShadow = true;

      leafPair.add(leftLeaf, rightLeaf);
      leafPair.rotation.y = (l * Math.PI) / 3;
      singleStemGroup.add(leafPair);
    }
    foliageGroup.add(singleStemGroup);
  });
  vaseGroup.add(foliageGroup);

  // Ceramic Coffee Mug with Stirrer
  const mugGroup = new THREE.Group();
  const mugGeo = new THREE.CylinderGeometry(0.7, 0.58, 1.1, 24);
  const mugInnerGeo = new THREE.CircleGeometry(0.66, 24);
  geometries.push(mugGeo, mugInnerGeo);

  const mugMat = new THREE.MeshStandardMaterial({
    color: palette.cupColor,
    roughness: 0.35,
    metalness: 0.05,
  });
  materials.push(mugMat);

  const mugMesh = new THREE.Mesh(mugGeo, mugMat);
  mugMesh.position.y = 0.55;
  mugMesh.castShadow = true;
  mugMesh.receiveShadow = true;

  const coffeeMat = new THREE.MeshStandardMaterial({ color: "#1E110A", roughness: 0.2 });
  materials.push(coffeeMat);
  const coffeeMesh = new THREE.Mesh(mugInnerGeo, coffeeMat);
  coffeeMesh.rotation.x = -Math.PI / 2;
  coffeeMesh.position.y = 1.04;

  const stirrerGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.8, 8);
  geometries.push(stirrerGeo);
  const stirrerMat = new THREE.MeshStandardMaterial({
    color: palette.stirrerColor,
    roughness: 0.5,
  });
  materials.push(stirrerMat);
  const stirrerMesh = new THREE.Mesh(stirrerGeo, stirrerMat);
  stirrerMesh.position.set(0.18, 1.1, 0.08);
  stirrerMesh.rotation.z = -0.38;
  stirrerMesh.rotation.x = 0.15;
  stirrerMesh.castShadow = true;

  mugGroup.add(mugMesh, coffeeMesh, stirrerMesh);

  propsGroup.add(vaseGroup, mugGroup);

  // --- 3. Background: 3D Pleated Curtain & Studio Wall ---
  const bgGroup = new THREE.Group();
  bgGroup.name = "studio-backdrop";

  // 3D Pleated Curtain (Sine wave displacement)
  const curtainW = 10;
  const curtainH = 12;
  const curtainSegmentsX = 64;
  const curtainGeo = new THREE.PlaneGeometry(curtainW, curtainH, curtainSegmentsX, 4);
  geometries.push(curtainGeo);

  const pos = curtainGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const wave1 = Math.sin((vx / curtainW) * Math.PI * 14) * 0.42;
    const wave2 = Math.sin((vx / curtainW) * Math.PI * 28) * 0.12;
    pos.setZ(i, wave1 + wave2);
  }
  curtainGeo.computeVertexNormals();

  const curtainMat = new THREE.MeshStandardMaterial({
    color: palette.curtainColor,
    roughness: 0.88,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  materials.push(curtainMat);
  const curtain = new THREE.Mesh(curtainGeo, curtainMat);
  curtain.receiveShadow = true;

  // Studio Wall
  const wallGeo = new THREE.PlaneGeometry(28, 18);
  geometries.push(wallGeo);
  const wallMat = new THREE.MeshStandardMaterial({
    color: palette.wallColor,
    roughness: 0.95,
    metalness: 0.01,
  });
  materials.push(wallMat);
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.receiveShadow = true;

  bgGroup.add(wall, curtain);

  root.add(tableGroup, propsGroup, bgGroup);

  return {
    group: root,
    setProps(on) {
      propsGroup.visible = on;
    },
    layout(center, _clear, radius) {
      // Proportions scaled to the box dimensions
      const tw = radius * 3.6;
      const td = radius * 2.0;
      const tThick = radius * 0.09;
      const legH = radius * 1.25;
      const tube = radius * 0.045;

      // 1. Table Top: top surface touches y = -0.2 mm so box sits cleanly on top
      tableTop.scale.set(tw, tThick, td);
      tableTop.position.set(center.x, -tThick / 2 - 0.2, center.z);

      // 2. Legs:
      const halfW = tw / 2 - tube / 2;
      const halfD = td / 2 - tube / 2;
      const legY = -tThick - legH / 2;
      const legPositions = [
        [-halfW, legY, -halfD],
        [halfW, legY, -halfD],
        [-halfW, legY, halfD],
        [halfW, legY, halfD],
      ];
      legs.forEach((leg, i) => {
        leg.scale.set(tube, legH, tube);
        leg.position.set(center.x + legPositions[i][0], legPositions[i][1], center.z + legPositions[i][2]);
      });

      // Rails: 4 top perimeter rails, 4 bottom perimeter rails
      const topRailY = -tThick - tube / 2;
      const btmRailY = -tThick - legH + tube / 2;
      rails[0].scale.set(tw - tube * 2, tube, tube);
      rails[0].position.set(center.x, topRailY, center.z + halfD);
      rails[1].scale.set(tw - tube * 2, tube, tube);
      rails[1].position.set(center.x, topRailY, center.z - halfD);
      rails[2].scale.set(tube, tube, td - tube * 2);
      rails[2].position.set(center.x - halfW, topRailY, center.z);
      rails[3].scale.set(tube, tube, td - tube * 2);
      rails[3].position.set(center.x + halfW, topRailY, center.z);

      rails[4].scale.set(tw - tube * 2, tube, tube);
      rails[4].position.set(center.x, btmRailY, center.z + halfD);
      rails[5].scale.set(tw - tube * 2, tube, tube);
      rails[5].position.set(center.x, btmRailY, center.z - halfD);
      rails[6].scale.set(tube, tube, td - tube * 2);
      rails[6].position.set(center.x - halfW, btmRailY, center.z);
      rails[7].scale.set(tube, tube, td - tube * 2);
      rails[7].position.set(center.x + halfW, btmRailY, center.z);

      // 3. Magazine sling on right side:
      const slingR = tw * 0.085;
      const slingLen = td - tube * 3;
      sling.scale.set(slingR, slingLen, slingR);
      sling.rotation.z = Math.PI / 2;
      sling.rotation.x = Math.PI;
      sling.position.set(center.x + halfW - slingR, -tThick - tube - slingR * 0.9, center.z);

      // 4. Floor plane & grid:
      floor.scale.set(tw * 3.5, td * 3.5, 1);
      floor.position.set(center.x, -tThick - legH, center.z);
      gridHelper.scale.set(tw * 3.5, 1, td * 3.5);
      gridHelper.position.set(center.x, -tThick - legH + 0.01, center.z);

      // 5. Vase & Foliage on left:
      const vaseUnit = radius * 0.28;
      vaseGroup.scale.setScalar(vaseUnit);
      vaseGroup.position.set(center.x - tw * 0.32, 0, center.z - td * 0.1);

      // 6. Coffee Mug on right:
      const mugUnit = radius * 0.24;
      mugGroup.scale.setScalar(mugUnit);
      mugGroup.position.set(center.x + tw * 0.34, 0, center.z + td * 0.12);

      // 7. Background:
      const bgScale = radius * 0.42;
      wall.scale.setScalar(bgScale);
      wall.position.set(center.x, -tThick - legH + bgScale * 8, center.z - td * 1.55);

      curtain.scale.setScalar(bgScale);
      curtain.position.set(center.x - tw * 0.38, -tThick - legH + bgScale * 5.6, center.z - td * 1.35);
    },
    setPalette(nextPalette) {
      palette = nextPalette;
      tableTopMat.color.set(palette.tableTopColor);
      frameMat.color.set(palette.frameColor);
      slingMat.color.set(palette.slingColor);
      floorMat.color.set(palette.floorColor);
      vaseMat.color.set(palette.vaseColor);
      leavesMat.color.set(palette.leavesColor);
      mugMat.color.set(palette.cupColor);
      stirrerMat.color.set(palette.stirrerColor);
      curtainMat.color.set(palette.curtainColor);
      wallMat.color.set(palette.wallColor);
    },
    dispose() {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------

/**
 * 3D Christmas Scene (Pacdora style):
 * - Dual-tone split mat (Christmas Crimson Red in front, Deep Forest Green in back)
 * - 3 Tall Pine Trees standing in the background
 * - Miniature Santa Claus figurine on the left
 * - Metallic reflective gold, red, and emerald green baubles
 * - Christmas pine wreath with red ribbon bow in front-right
 * - Perspective floor grid
 */
export function createChristmasSceneSet(): SceneSet {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const root = new THREE.Group();
  root.name = "christmas-scene-set";

  // --- 1. Dual-Tone Split Mat ---
  const matGroup = new THREE.Group();
  matGroup.name = "christmas-split-mat";

  const redMatGeo = new THREE.BoxGeometry(1, 1, 1);
  geometries.push(redMatGeo);
  const redMat = new THREE.MeshStandardMaterial({
    color: "#B91C1C",
    roughness: 0.65,
    metalness: 0.05,
  });
  materials.push(redMat);
  const redSlab = new THREE.Mesh(redMatGeo, redMat);
  redSlab.receiveShadow = true;
  redSlab.castShadow = true;

  const greenMatGeo = new THREE.BoxGeometry(1, 1, 1);
  geometries.push(greenMatGeo);
  const greenMat = new THREE.MeshStandardMaterial({
    color: "#1E3B2F",
    roughness: 0.65,
    metalness: 0.05,
  });
  materials.push(greenMat);
  const greenSlab = new THREE.Mesh(greenMatGeo, greenMat);
  greenSlab.receiveShadow = true;
  greenSlab.castShadow = true;

  const gridHelper = new THREE.GridHelper(1, 24, 0xCBD5E1, 0xE2E8F0);
  (gridHelper.material as THREE.Material).transparent = true;
  (gridHelper.material as THREE.Material).opacity = 0.6;

  matGroup.add(redSlab, greenSlab, gridHelper);

  // --- 2. Props Group: 3 Pine Trees, Santa, Metallic Baubles, Wreath ---
  const propsGroup = new THREE.Group();
  propsGroup.name = "christmas-props";

  // Pine tree materials
  const pineNeedleMat = new THREE.MeshStandardMaterial({
    color: "#1C3825",
    roughness: 0.85,
    metalness: 0.05,
  });
  const trunkMat = new THREE.MeshStandardMaterial({
    color: "#3E2718",
    roughness: 0.9,
  });
  materials.push(pineNeedleMat, trunkMat);

  const makePineTree = (heightScale: number) => {
    const tree = new THREE.Group();
    const tTrunkGeo = new THREE.CylinderGeometry(0.08 * heightScale, 0.11 * heightScale, 0.4 * heightScale, 12);
    geometries.push(tTrunkGeo);
    const trunk = new THREE.Mesh(tTrunkGeo, trunkMat);
    trunk.position.y = 0.2 * heightScale;
    trunk.castShadow = true;
    tree.add(trunk);

    const tiers = 4;
    for (let t = 0; t < tiers; t++) {
      const tierFraction = (t + 1) / tiers;
      const coneR = (0.75 - tierFraction * 0.42) * heightScale;
      const coneH = (0.95 - tierFraction * 0.15) * heightScale;
      const cGeo = new THREE.ConeGeometry(coneR, coneH, 16);
      geometries.push(cGeo);
      const cone = new THREE.Mesh(cGeo, pineNeedleMat);
      cone.position.y = (0.35 + t * 0.48) * heightScale;
      cone.castShadow = true;
      cone.receiveShadow = true;
      tree.add(cone);
    }
    return tree;
  };

  const tree1 = makePineTree(1.35); // Tallest Left-Back
  const tree2 = makePineTree(1.05); // Medium Center-Back
  const tree3 = makePineTree(1.22); // Right-Back
  propsGroup.add(tree1, tree2, tree3);

  // Metallic Baubles
  const makeBauble = (color: string, radiusScale: number, metalness = 0.9, roughness = 0.15) => {
    const baubleGroup = new THREE.Group();
    const sphereGeo = new THREE.SphereGeometry(radiusScale, 32, 24);
    geometries.push(sphereGeo);
    const bMat = new THREE.MeshStandardMaterial({ color, metalness, roughness });
    materials.push(bMat);
    const sphere = new THREE.Mesh(sphereGeo, bMat);
    sphere.position.y = radiusScale;
    sphere.castShadow = true;
    sphere.receiveShadow = true;

    const capGeo = new THREE.CylinderGeometry(radiusScale * 0.22, radiusScale * 0.22, radiusScale * 0.24, 12);
    geometries.push(capGeo);
    const capMat = new THREE.MeshStandardMaterial({ color: "#D4AF37", metalness: 0.95, roughness: 0.2 });
    materials.push(capMat);
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.y = radiusScale * 2;
    cap.castShadow = true;

    baubleGroup.add(sphere, cap);
    return baubleGroup;
  };

  const goldBaubleLarge = makeBauble("#E5B83B", 1.0, 0.92, 0.14);
  const goldBaubleMed = makeBauble("#D4AF37", 0.75, 0.92, 0.15);
  const goldBaubleSmall = makeBauble("#F59E0B", 0.52, 0.9, 0.18);
  const redBauble = makeBauble("#DC2626", 0.45, 0.88, 0.18);
  const greenBauble = makeBauble("#059669", 0.68, 0.9, 0.16);
  propsGroup.add(goldBaubleLarge, goldBaubleMed, goldBaubleSmall, redBauble, greenBauble);

  // Miniature Santa Claus Figurine
  const santaGroup = new THREE.Group();
  santaGroup.name = "santa-figurine";

  const bootGeo = new THREE.BoxGeometry(0.16, 0.12, 0.25);
  geometries.push(bootGeo);
  const blackMat = new THREE.MeshStandardMaterial({ color: "#18181B", roughness: 0.4 });
  materials.push(blackMat);
  const leftBoot = new THREE.Mesh(bootGeo, blackMat);
  leftBoot.position.set(-0.11, 0.06, 0.02);
  const rightBoot = new THREE.Mesh(bootGeo, blackMat);
  rightBoot.position.set(0.11, 0.06, 0.02);
  leftBoot.castShadow = rightBoot.castShadow = true;

  const coatGeo = new THREE.CylinderGeometry(0.24, 0.32, 0.48, 16);
  geometries.push(coatGeo);
  const santaRedMat = new THREE.MeshStandardMaterial({ color: "#B91C1C", roughness: 0.6 });
  materials.push(santaRedMat);
  const coat = new THREE.Mesh(coatGeo, santaRedMat);
  coat.position.y = 0.36;
  coat.castShadow = true;

  const furGeo = new THREE.TorusGeometry(0.3, 0.05, 8, 24);
  geometries.push(furGeo);
  const whiteMat = new THREE.MeshStandardMaterial({ color: "#F8FAFC", roughness: 0.9 });
  materials.push(whiteMat);
  const furBottom = new THREE.Mesh(furGeo, whiteMat);
  furBottom.rotation.x = Math.PI / 2;
  furBottom.position.y = 0.14;

  const beltGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.08, 16);
  geometries.push(beltGeo);
  const belt = new THREE.Mesh(beltGeo, blackMat);
  belt.position.y = 0.32;
  const buckleGeo = new THREE.BoxGeometry(0.1, 0.1, 0.03);
  geometries.push(buckleGeo);
  const goldMat = new THREE.MeshStandardMaterial({ color: "#FACC15", metalness: 0.9, roughness: 0.2 });
  materials.push(goldMat);
  const buckle = new THREE.Mesh(buckleGeo, goldMat);
  buckle.position.set(0, 0.32, 0.26);

  const headGeo = new THREE.SphereGeometry(0.18, 16, 16);
  geometries.push(headGeo);
  const skinMat = new THREE.MeshStandardMaterial({ color: "#FED7AA", roughness: 0.5 });
  materials.push(skinMat);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.position.y = 0.7;

  const beardGeo = new THREE.ConeGeometry(0.2, 0.3, 16);
  geometries.push(beardGeo);
  const beard = new THREE.Mesh(beardGeo, whiteMat);
  beard.rotation.x = -Math.PI / 8;
  beard.position.set(0, 0.62, 0.14);

  const hatGeo = new THREE.ConeGeometry(0.2, 0.42, 16);
  geometries.push(hatGeo);
  const hat = new THREE.Mesh(hatGeo, santaRedMat);
  hat.position.set(0, 0.98, -0.04);
  hat.rotation.x = -0.3;
  const pompomGeo = new THREE.SphereGeometry(0.06, 12, 12);
  geometries.push(pompomGeo);
  const pompom = new THREE.Mesh(pompomGeo, whiteMat);
  pompom.position.set(0, 1.18, -0.16);

  santaGroup.add(leftBoot, rightBoot, coat, furBottom, belt, buckle, head, beard, hat, pompom);
  propsGroup.add(santaGroup);

  // Christmas Wreath in front-right
  const wreathGroup = new THREE.Group();
  wreathGroup.name = "christmas-wreath";
  const wreathTorusGeo = new THREE.TorusGeometry(0.36, 0.1, 12, 28);
  geometries.push(wreathTorusGeo);
  const wreathRing = new THREE.Mesh(wreathTorusGeo, pineNeedleMat);
  wreathRing.rotation.x = Math.PI / 2;
  wreathRing.position.y = 0.08;
  wreathRing.castShadow = true;

  const bowGeo = new THREE.SphereGeometry(0.08, 12, 12);
  bowGeo.scale(1.8, 0.9, 0.8);
  geometries.push(bowGeo);
  const bow = new THREE.Mesh(bowGeo, santaRedMat);
  bow.position.set(0, 0.14, 0.36);
  bow.castShadow = true;

  wreathGroup.add(wreathRing, bow);
  propsGroup.add(wreathGroup);

  root.add(matGroup, propsGroup);

  return {
    group: root,
    setProps(on) {
      propsGroup.visible = on;
    },
    layout(center, _clear, radius) {
      const matW = radius * 6.6;
      const greenMatD = radius * 5.4;
      const redMatD = radius * 3.8;
      const matThick = radius * 0.05;

      // Push green slab and trees further back so the box sits forward on the red slab, avoiding the trees
      const greenCenterZ = center.z - greenMatD / 2 - radius * 0.35;
      const redCenterZ = center.z + redMatD / 2 - radius * 0.35;

      // 1. Red & Green Split Mat (top surface touches y = -0.2 mm so box rests cleanly on top)
      redSlab.scale.set(matW, matThick, redMatD);
      redSlab.position.set(center.x, -matThick / 2 - 0.2, redCenterZ);

      greenSlab.scale.set(matW, matThick, greenMatD);
      greenSlab.position.set(center.x, -matThick / 2 - 0.2, greenCenterZ);

      // Floor grid around mat
      gridHelper.scale.set(matW * 2.5, 1, (greenMatD + redMatD) * 1.6);
      gridHelper.position.set(center.x, -matThick + 0.005, center.z);

      // 2. Pine Trees in background (pushed safely back on green slab)
      tree1.scale.setScalar(radius * 1.45);
      tree1.position.set(center.x - matW * 0.28, 0, center.z - radius * 2.8);

      tree2.scale.setScalar(radius * 1.15);
      tree2.position.set(center.x + matW * 0.04, 0, center.z - radius * 3.3);

      tree3.scale.setScalar(radius * 1.35);
      tree3.position.set(center.x + matW * 0.34, 0, center.z - radius * 2.7);

      // 3. Santa Figurine (on green slab, safely to the left)
      santaGroup.scale.setScalar(radius * 0.58);
      santaGroup.position.set(center.x - matW * 0.28, 0, center.z - radius * 1.15);
      santaGroup.rotation.y = 0.4;

      // 4. Metallic Baubles
      const bScale = radius * 0.28;
      goldBaubleLarge.scale.setScalar(bScale * 1.15);
      goldBaubleLarge.position.set(center.x - matW * 0.34, 0, center.z + radius * 0.85);

      goldBaubleMed.scale.setScalar(bScale * 0.85);
      goldBaubleMed.position.set(center.x - matW * 0.25, 0, center.z + radius * 1.05);

      goldBaubleSmall.scale.setScalar(bScale * 0.65);
      goldBaubleSmall.position.set(center.x - radius * 0.45, 0, center.z - radius * 0.65);

      redBauble.scale.setScalar(bScale * 0.55);
      redBauble.position.set(center.x - radius * 0.1, 0, center.z - radius * 0.75);

      greenBauble.scale.setScalar(bScale * 0.85);
      greenBauble.position.set(center.x + radius * 0.55, 0, center.z - radius * 0.6);

      // 5. Christmas Wreath (in front-right on red mat)
      wreathGroup.scale.setScalar(radius * 0.7);
      wreathGroup.position.set(center.x + matW * 0.26, 0, center.z + radius * 0.7);
      wreathGroup.rotation.y = -0.25;
    },
    dispose() {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------

/**
 * 3D Tropical Warm Peach Podium Scene (Pacdora style):
 * - Warm apricot/peach tall backdrop wall & thick plinth floor platform
 * - Center display podium attached flush against back wall
 * - Stack of white circular discs/coasters on right behind podium
 * - 2 Tropical Palm/Areca fronds:
 *     Left frond: upright behind podium casting soft feathery shadow
 *     Right frond: floating in from top-right casting crisp diagonal striped leaf shadows across the wall
 * - Staged packaging boxes: flat base box + floating angled box for iconic Pacdora composition
 * - Decor props: fresh yellow lemon wheel slice + 2 slender silver cocktail stirrer spoons
 * - Perspective floor grid
 */
export function createTropicalPodiumSceneSet(): SceneSet {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const root = new THREE.Group();
  root.name = "tropical-podium-scene-set";

  // --- 1. Architecture: Peach Backdrop Board, Floor Platform, Center Podium, Disc Stack ---
  const archGroup = new THREE.Group();
  archGroup.name = "tropical-architecture";

  // Uniform warm apricot peach (#EEA575) matching the Pacdora reference photo exactly
  const peachMat = new THREE.MeshStandardMaterial({
    color: "#EEA575",
    roughness: 0.82,
    metalness: 0.02,
  });
  materials.push(peachMat);

  // Center Raised Display Podium (box rests on top at y = 0)
  const podiumGeo = new THREE.BoxGeometry(1, 1, 1);
  geometries.push(podiumGeo);
  const podium = new THREE.Mesh(podiumGeo, peachMat);
  podium.receiveShadow = true;
  podium.castShadow = true;

  // Floor Platform (thick peach slab extending forward)
  const platformGeo = new THREE.BoxGeometry(1, 1, 1);
  geometries.push(platformGeo);
  const platform = new THREE.Mesh(platformGeo, peachMat);
  platform.receiveShadow = true;
  platform.castShadow = true;

  // Tall Vertical Backdrop Wall Board
  const wallGeo = new THREE.BoxGeometry(1, 1, 1);
  geometries.push(wallGeo);
  const wall = new THREE.Mesh(wallGeo, peachMat);
  wall.receiveShadow = true;

  // Stack of 12 white circular paper discs / coasters on right behind podium
  const discStackGroup = new THREE.Group();
  const discGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.024, 24);
  geometries.push(discGeo);
  const whitePaperMat = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.7 });
  materials.push(whitePaperMat);
  for (let i = 0; i < 12; i++) {
    const disc = new THREE.Mesh(discGeo, whitePaperMat);
    disc.position.y = i * 0.025;
    disc.castShadow = true;
    disc.receiveShadow = true;
    discStackGroup.add(disc);
  }

  // Floor grid helper
  const gridHelper = new THREE.GridHelper(1, 24, 0xd4d4d8, 0xe4e4e7);
  (gridHelper.material as THREE.Material).transparent = true;
  (gridHelper.material as THREE.Material).opacity = 0.55;

  archGroup.add(podium, platform, wall, discStackGroup, gridHelper);

  // --- 2. Botanical Props: 2 Palm Fronds with pointed needle-blade pinnae ---
  const botanicalGroup = new THREE.Group();
  botanicalGroup.name = "tropical-botanicals";

  const palmGreenMat = new THREE.MeshStandardMaterial({
    color: "#274F34",
    roughness: 0.58,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });
  const stemMat = new THREE.MeshStandardMaterial({
    color: "#1E3D27",
    roughness: 0.75,
  });
  materials.push(palmGreenMat, stemMat);

  const makePalmFrond = (length: number, curveDir: number) => {
    const frond = new THREE.Group();

    // Central slender stem
    const spineGeo = new THREE.CylinderGeometry(0.012 * length, 0.026 * length, length, 8);
    geometries.push(spineGeo);
    const spine = new THREE.Mesh(spineGeo, stemMat);
    spine.position.y = length / 2;
    spine.rotation.z = curveDir * 0.16;
    frond.add(spine);

    // Slender lanceolate palm leaflets that cast crisp striped shadows across the wall
    const numPairs = 30;
    for (let i = 0; i < numPairs; i++) {
      const frac = (i + 1) / (numPairs + 2);
      const yPos = (0.08 + frac * 0.88) * length;
      const leafLen = (Math.sin(frac * Math.PI) * 0.46 + 0.14) * length;
      const leafW = 0.016 * length;

      const bladeGeo = new THREE.ConeGeometry(leafW, leafLen, 4);
      bladeGeo.scale(1, 1, 0.08);
      geometries.push(bladeGeo);

      const leftLeaf = new THREE.Mesh(bladeGeo, palmGreenMat);
      leftLeaf.position.set(-leafLen * 0.42, yPos, 0);
      leftLeaf.rotation.z = Math.PI / 2.6 + curveDir * 0.12;
      leftLeaf.rotation.x = 0.08;
      leftLeaf.castShadow = true;

      const rightLeaf = new THREE.Mesh(bladeGeo, palmGreenMat);
      rightLeaf.position.set(leafLen * 0.42, yPos, 0);
      rightLeaf.rotation.z = -Math.PI / 2.6 + curveDir * 0.12;
      rightLeaf.rotation.x = -0.08;
      rightLeaf.castShadow = true;

      frond.add(leftLeaf, rightLeaf);
    }
    return frond;
  };

  const frondLeft = makePalmFrond(2.9, -1);
  const frondRight = makePalmFrond(3.7, 1);
  botanicalGroup.add(frondLeft, frondRight);

  // --- 3. Tabletop Props: Lemon Slice & Slender Silver Stirrer Spoons ---
  const tabletopGroup = new THREE.Group();
  tabletopGroup.name = "tropical-tabletop-props";

  // Fresh Lemon Wheel / Slice
  const lemonGroup = new THREE.Group();
  const lemonRindGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.042, 24);
  geometries.push(lemonRindGeo);
  const rindMat = new THREE.MeshStandardMaterial({ color: "#EAB308", roughness: 0.42 });
  materials.push(rindMat);
  const lemonRind = new THREE.Mesh(lemonRindGeo, rindMat);
  lemonRind.rotation.x = Math.PI / 2;
  lemonRind.castShadow = true;

  const lemonPulpGeo = new THREE.CircleGeometry(0.205, 24);
  geometries.push(lemonPulpGeo);
  const pulpMat = new THREE.MeshStandardMaterial({ color: "#FACC15", roughness: 0.28 });
  materials.push(pulpMat);
  const lemonFront = new THREE.Mesh(lemonPulpGeo, pulpMat);
  lemonFront.position.z = 0.022;
  const lemonBack = new THREE.Mesh(lemonPulpGeo, pulpMat);
  lemonBack.position.z = -0.022;
  lemonBack.rotation.y = Math.PI;

  lemonGroup.add(lemonRind, lemonFront, lemonBack);
  lemonGroup.rotation.y = 0.35;
  lemonGroup.rotation.z = 0.16;

  // Long Silver Cocktail Stirrer Spoons (Mirror Chrome)
  const silverMat = new THREE.MeshStandardMaterial({
    color: "#F1F5F9",
    metalness: 0.98,
    roughness: 0.12,
  });
  materials.push(silverMat);

  const makeSpoon = (length: number) => {
    const spoon = new THREE.Group();
    const handleGeo = new THREE.CylinderGeometry(0.012, 0.012, length, 8);
    geometries.push(handleGeo);
    const handle = new THREE.Mesh(handleGeo, silverMat);
    handle.position.y = length / 2;
    handle.castShadow = true;

    const bowlGeo = new THREE.SphereGeometry(0.042, 12, 12);
    bowlGeo.scale(0.8, 1.4, 0.45);
    geometries.push(bowlGeo);
    const bowl = new THREE.Mesh(bowlGeo, silverMat);
    bowl.position.y = 0.035;
    bowl.castShadow = true;

    spoon.add(handle, bowl);
    return spoon;
  };

  const spoon1 = makeSpoon(1.6);
  spoon1.rotation.z = -0.52;
  spoon1.rotation.x = 0.22;

  const spoon2 = makeSpoon(1.75);
  spoon2.rotation.z = 0.3;
  spoon2.rotation.x = -0.28;

  tabletopGroup.add(lemonGroup, spoon1, spoon2);

  root.add(archGroup, botanicalGroup, tabletopGroup);

  return {
    group: root,
    setProps(on) {
      botanicalGroup.visible = on;
      tabletopGroup.visible = on;
    },
    layout(center, _clear, radius) {
      const w = radius * 4.6;
      const platformD = radius * 4.2;
      const podiumW = radius * 2.8;
      const podiumD = radius * 1.5;
      const podiumH = radius * 0.85;
      const platformThick = radius * 0.38;
      const wallH = radius * 5.8;
      const wallThick = radius * 0.1;

      // 1. Center Raised Podium (top surface at y = -0.2 mm, box rests cleanly on top)
      podium.scale.set(podiumW, podiumH, podiumD);
      podium.position.set(center.x, -podiumH / 2 - 0.2, center.z);

      // 2. Wall is flush with the back edge of the podium
      const wallZ = center.z - podiumD / 2 - wallThick / 2;
      wall.scale.set(w, wallH, wallThick);
      wall.position.set(center.x, -podiumH + wallH / 2, wallZ);

      // 3. Floor Platform (thick plinth starting at back wall and extending forward)
      platform.scale.set(w, platformThick, platformD);
      platform.position.set(center.x, -podiumH - platformThick / 2, wallZ + platformD / 2);

      // 4. Stack of white discs on right behind podium
      discStackGroup.scale.setScalar(radius * 0.85);
      discStackGroup.position.set(center.x + podiumW / 2 + radius * 0.18, -podiumH, wallZ + radius * 0.2);

      // 5. Floor grid helper
      gridHelper.scale.set(w * 2.5, 1, platformD * 2.5);
      gridHelper.position.set(center.x, -podiumH - platformThick + 0.005, center.z);

      // 6. Botanicals:
      // Left palm frond (upright behind left side of podium)
      frondLeft.scale.setScalar(radius * 0.84);
      frondLeft.position.set(center.x - w * 0.26, -podiumH + radius * 0.3, wallZ + radius * 0.15);
      frondLeft.rotation.z = 0.22;

      // Right palm frond (hanging in from top-right, close to wall to cast sharp diagonal striped shadows)
      frondRight.scale.setScalar(radius * 0.98);
      frondRight.position.set(center.x + w * 0.24, radius * 1.65, wallZ + radius * 0.1);
      frondRight.rotation.z = -1.14;
      frondRight.rotation.x = 0.28;

      // 7. Lemon slice on left of box
      lemonGroup.scale.setScalar(radius * 0.52);
      lemonGroup.position.set(center.x - radius * 0.76, 0.12 * radius, center.z + radius * 0.18);

      // 8. Silver spoons
      spoon1.scale.setScalar(radius * 0.52);
      spoon1.position.set(center.x - radius * 0.52, 0, center.z + radius * 0.22);

      spoon2.scale.setScalar(radius * 0.56);
      spoon2.position.set(center.x - radius * 0.22, 0, center.z - radius * 0.26);
    },
    dispose() {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------

/**
 * 3D Tết Lunar New Year Studio Scene ("festive_glow"):
 * - Indochine dark mahogany wood slat wall (#3B0A0A) with vertical fins & gold accent trim (#D4AF37)
 * - Traditional Indochine rosewood console table (#23120B) at y = 0 with carved apron and sturdy legs
 * - Authentic 3D Bánh Chưng xanh: wrapped in dong leaves (#27542B), crossed bamboo lạt ties (#E2C37E), center red seal (#DC2626)
 * - Porcelain blue-and-white vase with branching golden Mai blossoms (#FACC15) with red-orange stamens
 * - Fan-spread red lì xì envelopes with gold foil pattern
 * - White porcelain saucer with 3 ripe orange mandarins with leaf stems
 */
export function createTetSceneSet(): SceneSet {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const root = new THREE.Group();
  root.name = "tet-scene-set";

  // --- 1. Architecture: Indochine Wall with Wood Slats & Console Table ---
  const archGroup = new THREE.Group();
  archGroup.name = "tet-architecture";

  const wallMat = new THREE.MeshStandardMaterial({
    color: "#3B0A0A", // Deep Indochine burgundy/mahogany
    roughness: 0.65,
    metalness: 0.08,
  });
  materials.push(wallMat);

  const slatMat = new THREE.MeshStandardMaterial({
    color: "#4A0E0E",
    roughness: 0.55,
    metalness: 0.12,
  });
  materials.push(slatMat);

  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: "#D4AF37", // Traditional burnished gold
    roughness: 0.25,
    metalness: 0.88,
  });
  materials.push(goldTrimMat);

  const tableWoodMat = new THREE.MeshStandardMaterial({
    color: "#23120B", // Dark Indochine rosewood
    roughness: 0.42,
    metalness: 0.04,
  });
  materials.push(tableWoodMat);

  // Main backdrop wall
  const wallGeo = new THREE.BoxGeometry(1, 1, 1);
  geometries.push(wallGeo);
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.receiveShadow = true;

  // Vertical wood slats group
  const slatsGroup = new THREE.Group();
  const slatGeo = new THREE.BoxGeometry(1, 1, 1);
  geometries.push(slatGeo);
  const numSlats = 16;
  const slatMeshes: THREE.Mesh[] = [];
  for (let i = 0; i < numSlats; i++) {
    const s = new THREE.Mesh(slatGeo, i % 4 === 0 ? goldTrimMat : slatMat);
    s.castShadow = true;
    s.receiveShadow = true;
    slatMeshes.push(s);
    slatsGroup.add(s);
  }

  // Hanging gold Tet medallion on wall
  const medallionGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.04, 32);
  geometries.push(medallionGeo);
  const medallion = new THREE.Mesh(medallionGeo, goldTrimMat);
  medallion.rotation.x = Math.PI / 2;
  medallion.castShadow = true;

  // Tabletop (top surface at y = 0)
  const tabletopGeo = new THREE.BoxGeometry(1, 1, 1);
  geometries.push(tabletopGeo);
  const tabletop = new THREE.Mesh(tabletopGeo, tableWoodMat);
  tabletop.receiveShadow = true;
  tabletop.castShadow = true;

  // Table legs
  const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 1, 12);
  geometries.push(legGeo);
  const legFL = new THREE.Mesh(legGeo, tableWoodMat);
  const legFR = new THREE.Mesh(legGeo, tableWoodMat);
  const legBL = new THREE.Mesh(legGeo, tableWoodMat);
  const legBR = new THREE.Mesh(legGeo, tableWoodMat);
  legFL.castShadow = legFR.castShadow = legBL.castShadow = legBR.castShadow = true;

  // Traditional Indochine terracotta / dark mahogany floor plane & gold-accented grid
  const floorGeo = new THREE.PlaneGeometry(1, 1);
  geometries.push(floorGeo);
  const floorMat = new THREE.MeshStandardMaterial({
    color: "#280A0A", // Deep traditional Indochine terracotta tile
    roughness: 0.65,
    metalness: 0.08,
  });
  materials.push(floorMat);
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.renderOrder = -3;

  const gridHelper = new THREE.GridHelper(1, 24, 0xD4AF37, 0x5C1D1D);
  (gridHelper.material as THREE.Material).transparent = true;
  (gridHelper.material as THREE.Material).opacity = 0.32;

  archGroup.add(wall, slatsGroup, medallion, tabletop, legFL, legFR, legBL, legBR, floor, gridHelper);

  // --- 2. Traditional Tet Props ---
  const propsGroup = new THREE.Group();
  propsGroup.name = "tet-props";

  // A. Authentic Square 3D Bánh Chưng xanh
  const banhChungGroup = new THREE.Group();
  banhChungGroup.name = "banh-chung";

  const leafMat = new THREE.MeshStandardMaterial({
    color: "#27542B", // Deep waxy dong leaves
    roughness: 0.48,
    metalness: 0.04,
  });
  const latTreMat = new THREE.MeshStandardMaterial({
    color: "#E2C37E", // Bamboo strip ties
    roughness: 0.65,
  });
  const redSealMat = new THREE.MeshStandardMaterial({
    color: "#DC2626", // Red diamond seal
    roughness: 0.4,
  });
  materials.push(leafMat, latTreMat, redSealMat);

  // Main square cake
  const cakeGeo = new THREE.BoxGeometry(0.85, 0.32, 0.85);
  geometries.push(cakeGeo);
  const cakeMesh = new THREE.Mesh(cakeGeo, leafMat);
  cakeMesh.position.y = 0.16;
  cakeMesh.castShadow = true;
  cakeMesh.receiveShadow = true;

  // Bamboo ties: 2 along X, 2 along Z
  const latX1Geo = new THREE.BoxGeometry(0.86, 0.325, 0.045);
  const latX2Geo = new THREE.BoxGeometry(0.86, 0.325, 0.045);
  const latZ1Geo = new THREE.BoxGeometry(0.045, 0.325, 0.86);
  const latZ2Geo = new THREE.BoxGeometry(0.045, 0.325, 0.86);
  geometries.push(latX1Geo, latX2Geo, latZ1Geo, latZ2Geo);

  const tieX1 = new THREE.Mesh(latX1Geo, latTreMat);
  tieX1.position.set(0, 0.16, -0.2);
  const tieX2 = new THREE.Mesh(latX2Geo, latTreMat);
  tieX2.position.set(0, 0.16, 0.2);
  const tieZ1 = new THREE.Mesh(latZ1Geo, latTreMat);
  tieZ1.position.set(-0.2, 0.16, 0);
  const tieZ2 = new THREE.Mesh(latZ2Geo, latTreMat);
  tieZ2.position.set(0.2, 0.16, 0);

  // Red diamond seal in center
  const sealGeo = new THREE.BoxGeometry(0.24, 0.015, 0.24);
  geometries.push(sealGeo);
  const seal = new THREE.Mesh(sealGeo, redSealMat);
  seal.position.set(0, 0.325, 0);
  seal.rotation.y = Math.PI / 4; // diamond

  const sealCharGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.02, 16);
  geometries.push(sealCharGeo);
  const sealChar = new THREE.Mesh(sealCharGeo, goldTrimMat);
  sealChar.position.set(0, 0.33, 0);

  banhChungGroup.add(cakeMesh, tieX1, tieX2, tieZ1, tieZ2, seal, sealChar);

  // B. Bình hoa mai vàng (Mai blossom branch in porcelain vase)
  const maiVaseGroup = new THREE.Group();
  maiVaseGroup.name = "mai-vase";

  const porcelainMat = new THREE.MeshStandardMaterial({
    color: "#F8FAFC",
    roughness: 0.18,
    metalness: 0.08,
  });
  const twigMat = new THREE.MeshStandardMaterial({
    color: "#3B2112",
    roughness: 0.85,
  });
  const flowerMat = new THREE.MeshStandardMaterial({
    color: "#FACC15", // Brilliant yellow Mai flower
    roughness: 0.35,
  });
  const stamenMat = new THREE.MeshStandardMaterial({
    color: "#EA580C",
    roughness: 0.45,
  });
  materials.push(porcelainMat, twigMat, flowerMat, stamenMat);

  // Vase body
  const vaseBodyGeo = new THREE.CylinderGeometry(0.16, 0.24, 0.65, 24);
  const vaseNeckGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.22, 24);
  geometries.push(vaseBodyGeo, vaseNeckGeo);
  const vaseBody = new THREE.Mesh(vaseBodyGeo, porcelainMat);
  vaseBody.position.y = 0.325;
  vaseBody.castShadow = true;
  const vaseNeck = new THREE.Mesh(vaseNeckGeo, porcelainMat);
  vaseNeck.position.y = 0.72;
  vaseNeck.castShadow = true;
  maiVaseGroup.add(vaseBody, vaseNeck);

  // Branches & Mai Blossoms
  const branchMainGeo = new THREE.CylinderGeometry(0.02, 0.035, 1.1, 8);
  geometries.push(branchMainGeo);
  const branchMain = new THREE.Mesh(branchMainGeo, twigMat);
  branchMain.position.set(0.05, 1.15, 0);
  branchMain.rotation.z = -0.18;
  maiVaseGroup.add(branchMain);

  const branchSideGeo = new THREE.CylinderGeometry(0.015, 0.024, 0.75, 8);
  geometries.push(branchSideGeo);
  const branchSide = new THREE.Mesh(branchSideGeo, twigMat);
  branchSide.position.set(-0.12, 1.25, 0.05);
  branchSide.rotation.z = 0.42;
  maiVaseGroup.add(branchSide);

  // Mai Blossoms (5 petals + orange stamen)
  const petalGeo = new THREE.SphereGeometry(0.045, 8, 8);
  petalGeo.scale(1.2, 0.25, 0.7);
  geometries.push(petalGeo);
  const stamenGeo = new THREE.SphereGeometry(0.03, 8, 8);
  geometries.push(stamenGeo);

  const makeMaiBlossom = () => {
    const f = new THREE.Group();
    for (let p = 0; p < 5; p++) {
      const petal = new THREE.Mesh(petalGeo, flowerMat);
      petal.rotation.y = (p * Math.PI * 2) / 5;
      petal.position.x = Math.sin((p * Math.PI * 2) / 5) * 0.04;
      petal.position.z = Math.cos((p * Math.PI * 2) / 5) * 0.04;
      f.add(petal);
    }
    const stamen = new THREE.Mesh(stamenGeo, stamenMat);
    stamen.position.y = 0.015;
    f.add(stamen);
    return f;
  };

  const maiPositions = [
    [0.15, 1.6, 0.08],
    [-0.05, 1.5, -0.05],
    [-0.28, 1.45, 0.1],
    [-0.38, 1.3, 0.02],
    [0.12, 1.35, 0.12],
    [0.24, 1.15, -0.06],
    [-0.15, 1.1, 0.15],
  ];
  maiPositions.forEach(([x, y, z]) => {
    const b = makeMaiBlossom();
    b.position.set(x, y, z);
    b.rotation.x = 0.3;
    b.rotation.z = 0.2;
    maiVaseGroup.add(b);
  });

  // C. Bao lì xì đỏ (Fan of 3 Red Envelopes)
  const lixiGroup = new THREE.Group();
  lixiGroup.name = "lixi-fan";
  const envelopeGeo = new THREE.BoxGeometry(0.38, 0.012, 0.65);
  geometries.push(envelopeGeo);

  for (let i = 0; i < 3; i++) {
    const env = new THREE.Mesh(envelopeGeo, redSealMat);
    env.position.set((i - 1) * 0.14, i * 0.014 + 0.006, 0);
    env.rotation.y = (i - 1) * 0.25;
    env.castShadow = true;
    lixiGroup.add(env);
  }

  // D. Đĩa quýt vàng sum vầy (3 ripe mandarins on saucer)
  const mandarinGroup = new THREE.Group();
  mandarinGroup.name = "mandarins-dish";
  const saucerGeo = new THREE.CylinderGeometry(0.48, 0.38, 0.04, 24);
  geometries.push(saucerGeo);
  const saucer = new THREE.Mesh(saucerGeo, porcelainMat);
  saucer.position.y = 0.02;
  saucer.castShadow = true;
  saucer.receiveShadow = true;

  const mandarinMat = new THREE.MeshStandardMaterial({
    color: "#EA580C",
    roughness: 0.38,
  });
  const leafGreenMat = new THREE.MeshStandardMaterial({
    color: "#15803D",
    roughness: 0.6,
  });
  materials.push(mandarinMat, leafGreenMat);

  const orangeGeo = new THREE.SphereGeometry(0.18, 16, 16);
  orangeGeo.scale(1.15, 0.95, 1.15);
  geometries.push(orangeGeo);

  const leafStemGeo = new THREE.ConeGeometry(0.04, 0.12, 4);
  leafStemGeo.scale(1, 0.2, 1);
  geometries.push(leafStemGeo);

  const orangeCoords = [
    [-0.14, 0.18, -0.06],
    [0.16, 0.18, -0.04],
    [0.02, 0.18, 0.18],
  ];
  orangeCoords.forEach(([ox, oy, oz]) => {
    const fruit = new THREE.Mesh(orangeGeo, mandarinMat);
    fruit.position.set(ox, oy, oz);
    fruit.castShadow = true;
    const lf = new THREE.Mesh(leafStemGeo, leafGreenMat);
    lf.position.set(ox, oy + 0.18, oz);
    lf.rotation.z = 0.4;
    mandarinGroup.add(fruit, lf);
  });
  mandarinGroup.add(saucer);

  propsGroup.add(banhChungGroup, maiVaseGroup, lixiGroup, mandarinGroup);

  root.add(archGroup, propsGroup);

  return {
    group: root,
    setProps(on) {
      propsGroup.visible = on;
    },
    layout(center, _clear, radius) {
      const tableW = radius * 4.6;
      const tableD = radius * 2.8;
      const tableH = radius * 0.95;
      const topThick = radius * 0.12;
      const wallH = radius * 5.8;
      const wallW = radius * 5.2;
      const wallThick = radius * 0.12;

      // 1. Tabletop at y = -0.2 mm so box rests cleanly on top
      tabletop.scale.set(tableW, topThick, tableD);
      tabletop.position.set(center.x, -topThick / 2 - 0.2, center.z);

      // Table legs
      const legX = tableW * 0.44;
      const legZ = tableD * 0.42;
      const legH = tableH - topThick;
      const legY = -topThick - legH / 2;
      [legFL, legFR, legBL, legBR].forEach((l) => l.scale.set(radius * 0.6, legH, radius * 0.6));
      legFL.position.set(center.x - legX, legY, center.z + legZ);
      legFR.position.set(center.x + legX, legY, center.z + legZ);
      legBL.position.set(center.x - legX, legY, center.z - legZ);
      legBR.position.set(center.x + legX, legY, center.z - legZ);

      // Floor plane & grid at the bottom of the table legs:
      floor.scale.set(tableW * 3.5, tableD * 3.5, 1);
      floor.position.set(center.x, -tableH, center.z);
      gridHelper.scale.set(tableW * 3.5, 1, tableD * 3.5);
      gridHelper.position.set(center.x, -tableH + 0.01, center.z);

      // 2. Wall & Slats behind table
      const wallZ = center.z - tableD / 2 - radius * 0.35;
      wall.scale.set(wallW, wallH, wallThick);
      wall.position.set(center.x, -tableH + wallH / 2, wallZ);

      slatMeshes.forEach((s, i) => {
        const xOffset = center.x - wallW * 0.44 + (i / (numSlats - 1)) * (wallW * 0.88);
        s.scale.set(radius * 0.12, wallH * 0.88, radius * 0.08);
        s.position.set(xOffset, -tableH + wallH / 2, wallZ + wallThick / 2 + radius * 0.04);
      });

      // Medallion on wall
      medallion.scale.setScalar(radius * 1.25);
      medallion.position.set(center.x, radius * 2.1, wallZ + wallThick / 2 + radius * 0.06);

      // 3. Props Layout:
      // Bánh Chưng xanh on the left-front of table
      banhChungGroup.scale.setScalar(radius * 0.88);
      banhChungGroup.position.set(center.x - radius * 1.35, 0, center.z + radius * 0.28);
      banhChungGroup.rotation.y = 0.25;

      // Mai blossom vase on left-back
      maiVaseGroup.scale.setScalar(radius * 0.95);
      maiVaseGroup.position.set(center.x - radius * 1.5, 0, center.z - radius * 0.65);

      // Lì xì envelopes on front-right
      lixiGroup.scale.setScalar(radius * 0.78);
      lixiGroup.position.set(center.x + radius * 1.15, 0, center.z + radius * 0.55);
      lixiGroup.rotation.y = -0.35;

      // Mandarins on right-back
      mandarinGroup.scale.setScalar(radius * 0.85);
      mandarinGroup.position.set(center.x + radius * 1.35, 0, center.z - radius * 0.4);
    },
    dispose() {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------

/**
 * 3D Birthday Celebration Party Studio Scene ("birthday"):
 * - Dual-layer pastel archway wall (soft cream #FEF3C7 & blush pink #FCE7F3) with floating confetti accents
 * - Fluted cylindrical podium (#FFFBEB) with vertical ridges (top at y = 0)
 * - Mini 2-tier Birthday Cake with pink dripping frosting, strawberry & lit candle with flame
 * - Pastel helium balloon cluster with curled silver ribbons
 * - Festive party cone hat with pom-pom & polka dots
 * - Small pastel accent gift box with satin ribbon
 */
export function createBirthdaySceneSet(): SceneSet {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const root = new THREE.Group();
  root.name = "birthday-scene-set";

  // --- 1. Architecture: Pastel Dual Arch Wall & Fluted Cylindrical Podium ---
  const archGroup = new THREE.Group();
  archGroup.name = "birthday-architecture";

  const outerArchMat = new THREE.MeshStandardMaterial({
    color: "#FEF3C7", // Soft cream butter
    roughness: 0.75,
    metalness: 0.02,
  });
  const innerArchMat = new THREE.MeshStandardMaterial({
    color: "#FCE7F3", // Pastel blush pink
    roughness: 0.72,
    metalness: 0.02,
  });
  const podiumMat = new THREE.MeshStandardMaterial({
    color: "#FFFBEB", // Warm ivory
    roughness: 0.65,
    metalness: 0.04,
  });
  materials.push(outerArchMat, innerArchMat, podiumMat);

  // Outer Arch Wall
  const outerWallGeo = new THREE.BoxGeometry(1, 1, 1);
  geometries.push(outerWallGeo);
  const outerWall = new THREE.Mesh(outerWallGeo, outerArchMat);
  outerWall.receiveShadow = true;

  // Inner Arch Accent
  const innerWallGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 32, 1, false, 0, Math.PI);
  geometries.push(innerWallGeo);
  const innerWall = new THREE.Mesh(innerWallGeo, innerArchMat);
  innerWall.receiveShadow = true;

  // Fluted Cylindrical Podium
  const podiumGroup = new THREE.Group();
  const coreGeo = new THREE.CylinderGeometry(1, 1, 1, 32);
  geometries.push(coreGeo);
  const podiumCore = new THREE.Mesh(coreGeo, podiumMat);
  podiumCore.receiveShadow = true;
  podiumCore.castShadow = true;
  podiumGroup.add(podiumCore);

  // 24 vertical fluting half-columns around podium perimeter
  const fluteGeo = new THREE.CylinderGeometry(0.045, 0.045, 1, 12);
  geometries.push(fluteGeo);
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2;
    const flute = new THREE.Mesh(fluteGeo, podiumMat);
    flute.position.set(Math.cos(angle) * 0.98, 0, Math.sin(angle) * 0.98);
    flute.castShadow = true;
    flute.receiveShadow = true;
    podiumGroup.add(flute);
  }

  // Floating confetti dots on wall
  const confettiGroup = new THREE.Group();
  const confettiColors = ["#F472B6", "#60A5FA", "#34D399", "#FBBF24", "#A78BFA"];
  const dotGeo = new THREE.CircleGeometry(0.06, 16);
  geometries.push(dotGeo);
  for (let c = 0; c < 18; c++) {
    const cMat = new THREE.MeshBasicMaterial({ color: confettiColors[c % confettiColors.length] });
    materials.push(cMat);
    const dot = new THREE.Mesh(dotGeo, cMat);
    dot.position.set((Math.sin(c * 1.7) * 0.4 + 0.5) * 2 - 1, (Math.cos(c * 2.3) * 0.4 + 0.5) * 2.2, 0.01);
    confettiGroup.add(dot);
  }

  // Pastel celebration terrazzo floor plane & golden grid
  const floorGeo = new THREE.PlaneGeometry(1, 1);
  geometries.push(floorGeo);
  const floorMat = new THREE.MeshStandardMaterial({
    color: "#FEF3C7", // Warm butter cream floor
    roughness: 0.75,
    metalness: 0.02,
  });
  materials.push(floorMat);
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.renderOrder = -3;

  const gridHelper = new THREE.GridHelper(1, 24, 0xF59E0B, 0xFDE68A);
  (gridHelper.material as THREE.Material).transparent = true;
  (gridHelper.material as THREE.Material).opacity = 0.35;

  archGroup.add(outerWall, innerWall, podiumGroup, confettiGroup, floor, gridHelper);

  // --- 2. Birthday Celebration Props ---
  const propsGroup = new THREE.Group();
  propsGroup.name = "birthday-props";

  // A. Mini 2-tier Birthday Cake with lit candle
  const cakeGroup = new THREE.Group();
  cakeGroup.name = "birthday-cake";

  const spongeMat = new THREE.MeshStandardMaterial({ color: "#FFFDF5", roughness: 0.55 });
  const frostingMat = new THREE.MeshStandardMaterial({ color: "#FB7185", roughness: 0.35 });
  const strawberryMat = new THREE.MeshStandardMaterial({ color: "#E11D48", roughness: 0.3 });
  const candleMat = new THREE.MeshStandardMaterial({ color: "#38BDF8", roughness: 0.4 });
  const flameMat = new THREE.MeshStandardMaterial({
    color: "#F59E0B",
    emissive: "#F59E0B",
    emissiveIntensity: 0.8,
  });
  materials.push(spongeMat, frostingMat, strawberryMat, candleMat, flameMat);

  // Tier 1 (bottom)
  const tier1Geo = new THREE.CylinderGeometry(0.42, 0.42, 0.26, 24);
  geometries.push(tier1Geo);
  const tier1 = new THREE.Mesh(tier1Geo, spongeMat);
  tier1.position.y = 0.13;
  tier1.castShadow = true;

  // Tier 2 (top)
  const tier2Geo = new THREE.CylinderGeometry(0.28, 0.28, 0.22, 24);
  geometries.push(tier2Geo);
  const tier2 = new THREE.Mesh(tier2Geo, frostingMat);
  tier2.position.y = 0.37;
  tier2.castShadow = true;

  // Strawberry topper
  const berryGeo = new THREE.ConeGeometry(0.065, 0.12, 12);
  geometries.push(berryGeo);
  const berry = new THREE.Mesh(berryGeo, strawberryMat);
  berry.position.set(-0.08, 0.54, 0.04);
  berry.rotation.z = -0.2;

  // Candle & lit flame
  const candleGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.24, 12);
  geometries.push(candleGeo);
  const candle = new THREE.Mesh(candleGeo, candleMat);
  candle.position.set(0.06, 0.6, 0);

  const flameGeo = new THREE.SphereGeometry(0.028, 12, 12);
  flameGeo.scale(0.8, 1.8, 0.8);
  geometries.push(flameGeo);
  const flame = new THREE.Mesh(flameGeo, flameMat);
  flame.position.set(0.06, 0.75, 0);

  cakeGroup.add(tier1, tier2, berry, candle, flame);

  // B. Floating Pastel Balloon Cluster
  const balloonGroup = new THREE.Group();
  balloonGroup.name = "pastel-balloons";

  const balloonColors = ["#F472B6", "#93C5FD", "#FBBF24", "#C084FC"];
  const ribbonMat = new THREE.MeshStandardMaterial({ color: "#CBD5E1", metalness: 0.8, roughness: 0.2 });
  materials.push(ribbonMat);

  const balloonGeo = new THREE.SphereGeometry(0.32, 24, 20);
  balloonGeo.scale(1, 1.25, 1);
  geometries.push(balloonGeo);

  const balloonOffsets = [
    [-0.22, 1.85, 0, 0],
    [0.18, 2.15, -0.1, 1],
    [-0.05, 2.35, 0.12, 2],
    [0.26, 1.9, 0.15, 3],
  ];

  balloonOffsets.forEach(([bx, by, bz, colorIdx]) => {
    const bMat = new THREE.MeshStandardMaterial({
      color: balloonColors[colorIdx],
      roughness: 0.22,
      metalness: 0.12,
    });
    materials.push(bMat);
    const balloon = new THREE.Mesh(balloonGeo, bMat);
    balloon.position.set(bx, by, bz);
    balloon.castShadow = true;

    // String cylinder trailing down
    const stringGeo = new THREE.CylinderGeometry(0.004, 0.004, by, 6);
    geometries.push(stringGeo);
    const str = new THREE.Mesh(stringGeo, ribbonMat);
    str.position.set(bx * 0.4, by / 2, bz * 0.4);
    str.rotation.z = (bx / by) * -0.6;

    balloonGroup.add(balloon, str);
  });

  // C. Party Cone Hat with Pom-pom
  const partyHatGroup = new THREE.Group();
  partyHatGroup.name = "party-hat";

  const hatMat = new THREE.MeshStandardMaterial({ color: "#EC4899", roughness: 0.5 });
  const pomMat = new THREE.MeshStandardMaterial({ color: "#FDE047", roughness: 0.8 });
  materials.push(hatMat, pomMat);

  const coneGeo = new THREE.ConeGeometry(0.22, 0.48, 20);
  geometries.push(coneGeo);
  const cone = new THREE.Mesh(coneGeo, hatMat);
  cone.position.y = 0.24;
  cone.castShadow = true;

  const pomGeo = new THREE.SphereGeometry(0.055, 12, 12);
  geometries.push(pomGeo);
  const pom = new THREE.Mesh(pomGeo, pomMat);
  pom.position.y = 0.51;

  partyHatGroup.add(cone, pom);
  partyHatGroup.rotation.z = 0.22;
  partyHatGroup.rotation.x = -0.15;

  // D. Small Wrapped Gift Box with Ribbon
  const giftGroup = new THREE.Group();
  giftGroup.name = "mini-gift";
  const giftMat = new THREE.MeshStandardMaterial({ color: "#67E8F9", roughness: 0.4 });
  const bowMat = new THREE.MeshStandardMaterial({ color: "#F43F5E", roughness: 0.35 });
  materials.push(giftMat, bowMat);

  const giftBoxGeo = new THREE.BoxGeometry(0.42, 0.32, 0.42);
  geometries.push(giftBoxGeo);
  const giftBox = new THREE.Mesh(giftBoxGeo, giftMat);
  giftBox.position.y = 0.16;
  giftBox.castShadow = true;

  const bowMeshGeo = new THREE.SphereGeometry(0.08, 12, 12);
  bowMeshGeo.scale(1.4, 0.6, 0.8);
  geometries.push(bowMeshGeo);
  const bowMesh = new THREE.Mesh(bowMeshGeo, bowMat);
  bowMesh.position.y = 0.35;

  giftGroup.add(giftBox, bowMesh);

  propsGroup.add(cakeGroup, balloonGroup, partyHatGroup, giftGroup);

  root.add(archGroup, propsGroup);

  return {
    group: root,
    setProps(on) {
      propsGroup.visible = on;
    },
    layout(center, _clear, radius) {
      const podiumR = radius * 1.85;
      const podiumH = radius * 0.95;
      const wallW = radius * 5.2;
      const wallH = radius * 5.8;
      const wallThick = radius * 0.12;

      // 1. Center Fluted Podium (top at y = -0.2 so box rests cleanly on top)
      podiumGroup.scale.set(podiumR, podiumH, podiumR);
      podiumGroup.position.set(center.x, -podiumH / 2 - 0.2, center.z);

      // Floor plane & grid at the base of the podium:
      floor.scale.set(wallW * 2.5, podiumR * 3.5, 1);
      floor.position.set(center.x, -podiumH, center.z);
      gridHelper.scale.set(wallW * 2.5, 1, podiumR * 3.5);
      gridHelper.position.set(center.x, -podiumH + 0.01, center.z);

      // 2. Wall behind podium
      const wallZ = center.z - podiumR * 0.9 - radius * 0.3;
      outerWall.scale.set(wallW, wallH, wallThick);
      outerWall.position.set(center.x, -podiumH + wallH / 2, wallZ);

      innerWall.scale.set(wallW * 0.72, radius * 0.15, wallH * 0.65);
      innerWall.position.set(center.x, -podiumH + wallH * 0.38, wallZ + wallThick / 2);
      innerWall.rotation.x = Math.PI / 2;

      confettiGroup.scale.setScalar(radius * 1.8);
      confettiGroup.position.set(center.x, radius * 0.6, wallZ + wallThick / 2 + 0.02);

      // 3. Props:
      // Cake on left-front
      cakeGroup.scale.setScalar(radius * 0.82);
      cakeGroup.position.set(center.x - radius * 1.15, 0, center.z + radius * 0.35);

      // Balloons floating on right-back
      balloonGroup.scale.setScalar(radius * 0.92);
      balloonGroup.position.set(center.x + radius * 1.35, 0, center.z - radius * 0.5);

      // Party hat on front-right
      partyHatGroup.scale.setScalar(radius * 0.75);
      partyHatGroup.position.set(center.x + radius * 1.1, 0, center.z + radius * 0.55);

      // Small gift box on left-back
      giftGroup.scale.setScalar(radius * 0.7);
      giftGroup.position.set(center.x - radius * 1.25, 0, center.z - radius * 0.45);
      giftGroup.rotation.y = 0.35;
    },
    dispose() {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------

/**
 * 3D Valentine Romantic Studio Scene ("valentine"):
 * - Classical Roman archway backdrop in rich romantic wine (#831843)
 * - Carrara marble pedestal with polished brushed gold rim (#D4AF37, top at y = 0)
 * - Crystal vase with blooming deep velvet red roses (#991B1B) & rose leaves
 * - Open heart-shaped chocolate bonbon box with gold foil wrapping
 * - Delicate red rose petals scattered across marble surface
 * - Glowing aroma candle glass with warm candlelight flame
 */
export function createValentineSceneSet(): SceneSet {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const root = new THREE.Group();
  root.name = "valentine-scene-set";

  // --- 1. Architecture: Wine Red Archway & Gold-Trimmed Marble Pedestal ---
  const archGroup = new THREE.Group();
  archGroup.name = "valentine-architecture";

  const archWallMat = new THREE.MeshStandardMaterial({
    color: "#831843", // Deep romantic wine / raspberry
    roughness: 0.65,
    metalness: 0.06,
  });
  const marbleMat = new THREE.MeshStandardMaterial({
    color: "#F8FAFC", // Carrara white marble
    roughness: 0.22,
    metalness: 0.05,
  });
  const goldBrassMat = new THREE.MeshStandardMaterial({
    color: "#D4AF37", // Polished gold brass rim
    roughness: 0.18,
    metalness: 0.92,
  });
  materials.push(archWallMat, marbleMat, goldBrassMat);

  // Arch Backdrop Wall
  const wallGeo = new THREE.BoxGeometry(1, 1, 1);
  geometries.push(wallGeo);
  const wall = new THREE.Mesh(wallGeo, archWallMat);
  wall.receiveShadow = true;

  // Marble Round Pedestal (top surface at y = 0)
  const pedestalGroup = new THREE.Group();
  const cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 36);
  geometries.push(cylinderGeo);
  const marbleCylinder = new THREE.Mesh(cylinderGeo, marbleMat);
  marbleCylinder.receiveShadow = true;
  marbleCylinder.castShadow = true;

  // Gold brass rim around top edge
  const rimTorusGeo = new THREE.TorusGeometry(1, 0.024, 12, 36);
  geometries.push(rimTorusGeo);
  const goldRim = new THREE.Mesh(rimTorusGeo, goldBrassMat);
  goldRim.rotation.x = Math.PI / 2;
  goldRim.position.y = 0.5;
  goldRim.castShadow = true;

  pedestalGroup.add(marbleCylinder, goldRim);

  // Luxury blush marble floor plane & soft rose grid
  const floorGeo = new THREE.PlaneGeometry(1, 1);
  geometries.push(floorGeo);
  const floorMat = new THREE.MeshStandardMaterial({
    color: "#3D0820", // Deep romantic wine contrast floor
    roughness: 0.55,
    metalness: 0.08,
  });
  materials.push(floorMat);
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.renderOrder = -3;

  const gridHelper = new THREE.GridHelper(1, 24, 0xFB7185, 0x831843);
  (gridHelper.material as THREE.Material).transparent = true;
  (gridHelper.material as THREE.Material).opacity = 0.28;

  archGroup.add(wall, pedestalGroup, floor, gridHelper);

  // --- 2. Romantic Props ---
  const propsGroup = new THREE.Group();
  propsGroup.name = "valentine-props";

  // A. Crystal Glass Vase with Blooming Red Velvet Roses
  const roseVaseGroup = new THREE.Group();
  roseVaseGroup.name = "rose-vase";

  const glassMat = new THREE.MeshStandardMaterial({
    color: "#FFFFFF",
    roughness: 0.08,
    metalness: 0.1,
    transparent: true,
    opacity: 0.55,
  });
  const roseRedMat = new THREE.MeshStandardMaterial({ color: "#991B1B", roughness: 0.45 });
  const leafMat = new THREE.MeshStandardMaterial({ color: "#166534", roughness: 0.65 });
  const stemMat = new THREE.MeshStandardMaterial({ color: "#14532D", roughness: 0.75 });
  materials.push(glassMat, roseRedMat, leafMat, stemMat);

  const vaseGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.62, 24, 1, true);
  geometries.push(vaseGeo);
  const vase = new THREE.Mesh(vaseGeo, glassMat);
  vase.position.y = 0.31;
  vase.castShadow = true;
  roseVaseGroup.add(vase);

  // Rose blooms (layered petal cones/spheres)
  const petalLayerGeo = new THREE.ConeGeometry(0.12, 0.16, 8);
  geometries.push(petalLayerGeo);
  const roseBudGeo = new THREE.SphereGeometry(0.08, 12, 12);
  roseBudGeo.scale(1, 1.3, 1);
  geometries.push(roseBudGeo);

  const makeRose = () => {
    const rose = new THREE.Group();
    const bud = new THREE.Mesh(roseBudGeo, roseRedMat);
    bud.position.y = 0.08;
    const skirt = new THREE.Mesh(petalLayerGeo, roseRedMat);
    skirt.rotation.x = Math.PI;
    rose.add(bud, skirt);
    return rose;
  };

  const rose1 = makeRose();
  rose1.position.set(0, 0.74, 0);
  const rose2 = makeRose();
  rose2.position.set(-0.1, 0.68, 0.06);
  rose2.rotation.z = 0.28;
  const rose3 = makeRose();
  rose3.position.set(0.1, 0.66, -0.05);
  rose3.rotation.z = -0.28;

  // Rose stems inside vase
  const stemGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.6, 8);
  geometries.push(stemGeo);
  const stem1 = new THREE.Mesh(stemGeo, stemMat);
  stem1.position.y = 0.32;
  roseVaseGroup.add(vase, stem1, rose1, rose2, rose3);

  // B. Heart-Shaped Chocolate Bonbon Box
  const heartBoxGroup = new THREE.Group();
  heartBoxGroup.name = "chocolate-heart-box";

  const velvetHeartMat = new THREE.MeshStandardMaterial({ color: "#881337", roughness: 0.6 });
  const chocoDarkMat = new THREE.MeshStandardMaterial({ color: "#2B170B", roughness: 0.35 });
  const goldFoilMat = new THREE.MeshStandardMaterial({ color: "#FACC15", metalness: 0.85, roughness: 0.2 });
  materials.push(velvetHeartMat, chocoDarkMat, goldFoilMat);

  // Procedural heart: two cylinders + rotated cube
  const heartLeftGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.12, 20);
  const heartRightGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.12, 20);
  const heartBoxBottomGeo = new THREE.BoxGeometry(0.36, 0.12, 0.36);
  geometries.push(heartLeftGeo, heartRightGeo, heartBoxBottomGeo);

  const hLeft = new THREE.Mesh(heartLeftGeo, velvetHeartMat);
  hLeft.position.set(-0.12, 0.06, 0);
  const hRight = new THREE.Mesh(heartRightGeo, velvetHeartMat);
  hRight.position.set(0.12, 0.06, 0);
  const hSquare = new THREE.Mesh(heartBoxBottomGeo, velvetHeartMat);
  hSquare.position.set(0, 0.06, 0.12);
  hSquare.rotation.y = Math.PI / 4;
  hLeft.castShadow = hRight.castShadow = hSquare.castShadow = true;

  // 3 Chocolate Bonbons inside
  const bonbonGeo = new THREE.SphereGeometry(0.06, 12, 12);
  bonbonGeo.scale(1, 0.7, 1);
  geometries.push(bonbonGeo);
  const b1 = new THREE.Mesh(bonbonGeo, chocoDarkMat);
  b1.position.set(-0.1, 0.14, 0);
  const b2 = new THREE.Mesh(bonbonGeo, goldFoilMat);
  b2.position.set(0.1, 0.14, 0);
  const b3 = new THREE.Mesh(bonbonGeo, chocoDarkMat);
  b3.position.set(0, 0.14, 0.1);

  heartBoxGroup.add(hLeft, hRight, hSquare, b1, b2, b3);

  // C. Scattered Rose Petals on Marble
  const petalsGroup = new THREE.Group();
  petalsGroup.name = "scattered-petals";
  const petalDiscGeo = new THREE.CircleGeometry(0.065, 12);
  petalDiscGeo.scale(1.2, 0.7, 1);
  geometries.push(petalDiscGeo);

  for (let p = 0; p < 8; p++) {
    const petal = new THREE.Mesh(petalDiscGeo, roseRedMat);
    const ang = p * 0.8;
    petal.position.set(Math.cos(ang) * 0.35 + 0.1, 0.005, Math.sin(ang) * 0.35);
    petal.rotation.x = -Math.PI / 2 + 0.1;
    petal.rotation.z = p * 0.9;
    petalsGroup.add(petal);
  }

  // D. Glowing Aroma Candle Glass
  const candleGroup = new THREE.Group();
  candleGroup.name = "aroma-candle";

  const candleGlassGeo = new THREE.CylinderGeometry(0.16, 0.15, 0.32, 20);
  geometries.push(candleGlassGeo);
  const candleGlassMat = new THREE.MeshStandardMaterial({
    color: "#FDE68A",
    transparent: true,
    opacity: 0.65,
    roughness: 0.25,
  });
  materials.push(candleGlassMat);
  const candleGlass = new THREE.Mesh(candleGlassGeo, candleGlassMat);
  candleGlass.position.y = 0.16;
  candleGlass.castShadow = true;

  const candleFlameGeo = new THREE.SphereGeometry(0.035, 12, 12);
  candleFlameGeo.scale(0.8, 2, 0.8);
  geometries.push(candleFlameGeo);
  const candleFlameMat = new THREE.MeshStandardMaterial({
    color: "#F59E0B",
    emissive: "#F59E0B",
    emissiveIntensity: 0.9,
  });
  materials.push(candleFlameMat);
  const candleFlame = new THREE.Mesh(candleFlameGeo, candleFlameMat);
  candleFlame.position.y = 0.28;

  candleGroup.add(candleGlass, candleFlame);

  propsGroup.add(roseVaseGroup, heartBoxGroup, petalsGroup, candleGroup);

  root.add(archGroup, propsGroup);

  return {
    group: root,
    setProps(on) {
      propsGroup.visible = on;
    },
    layout(center, _clear, radius) {
      const pedR = radius * 1.85;
      const pedH = radius * 0.95;
      const wallW = radius * 5.2;
      const wallH = radius * 5.8;
      const wallThick = radius * 0.12;

      // 1. Center Pedestal (top surface at y = -0.2 so box rests cleanly on top)
      pedestalGroup.scale.set(pedR, pedH, pedR);
      pedestalGroup.position.set(center.x, -pedH / 2 - 0.2, center.z);

      // Floor plane & grid at the base of the pedestal:
      floor.scale.set(wallW * 2.5, pedR * 3.5, 1);
      floor.position.set(center.x, -pedH, center.z);
      gridHelper.scale.set(wallW * 2.5, 1, pedR * 3.5);
      gridHelper.position.set(center.x, -pedH + 0.01, center.z);

      // 2. Wall behind pedestal
      const wallZ = center.z - pedR * 0.9 - radius * 0.3;
      wall.scale.set(wallW, wallH, wallThick);
      wall.position.set(center.x, -pedH + wallH / 2, wallZ);

      // 3. Props:
      // Rose vase on left-back of pedestal
      roseVaseGroup.scale.setScalar(radius * 0.95);
      roseVaseGroup.position.set(center.x - radius * 1.25, 0, center.z - radius * 0.55);

      // Heart chocolate box on front-left
      heartBoxGroup.scale.setScalar(radius * 0.85);
      heartBoxGroup.position.set(center.x - radius * 1.05, 0, center.z + radius * 0.45);
      heartBoxGroup.rotation.y = 0.35;

      // Scattered rose petals on front-mid
      petalsGroup.scale.setScalar(radius * 0.9);
      petalsGroup.position.set(center.x + radius * 0.2, 0, center.z + radius * 0.65);

      // Aroma candle on right-mid
      candleGroup.scale.setScalar(radius * 0.78);
      candleGroup.position.set(center.x + radius * 1.25, 0, center.z + radius * 0.1);
    },
    dispose() {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------

/**
 * 3D Artisan Craft Studio Scene ("kraft_wood"):
 * - Warm architectural limewash / plaster wall (#E5DFD5)
 * - Live-edge solid oak wood slab table (#A2703F) at y = 0 with matte black steel hairpin legs
 * - Spool of natural jute twine (#C5A880) with trailing cord
 * - 2 textured natural pinecones (#5B3A29)
 * - Bundle of 3 rolled cinnamon sticks bound with hemp twine
 * - Earthenware ceramic vase with fluffy white cotton flower stems
 * - Vintage brass craft scissors
 */
export function createKraftWoodSceneSet(): SceneSet {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const root = new THREE.Group();
  root.name = "kraft-wood-scene-set";

  // --- 1. Architecture: Plaster Wall & Live-Edge Oak Slab Table ---
  const archGroup = new THREE.Group();
  archGroup.name = "kraft-architecture";

  const plasterWallMat = new THREE.MeshStandardMaterial({
    color: "#E5DFD5", // Warm neutral architectural limewash
    roughness: 0.88,
    metalness: 0.02,
  });
  const oakTableMat = new THREE.MeshStandardMaterial({
    color: "#9A6B3D", // Warm rustic solid oak
    roughness: 0.55,
    metalness: 0.04,
  });
  const blackSteelMat = new THREE.MeshStandardMaterial({
    color: "#1E293B",
    roughness: 0.45,
    metalness: 0.85,
  });
  materials.push(plasterWallMat, oakTableMat, blackSteelMat);

  // Backdrop wall
  const wallGeo = new THREE.BoxGeometry(1, 1, 1);
  geometries.push(wallGeo);
  const wall = new THREE.Mesh(wallGeo, plasterWallMat);
  wall.receiveShadow = true;

  // Solid live-edge tabletop (top at y = 0)
  const tabletopGeo = new THREE.BoxGeometry(1, 1, 1);
  geometries.push(tabletopGeo);
  const tabletop = new THREE.Mesh(tabletopGeo, oakTableMat);
  tabletop.receiveShadow = true;
  tabletop.castShadow = true;

  // Steel legs
  const legGeo = new THREE.CylinderGeometry(0.035, 0.035, 1, 12);
  geometries.push(legGeo);
  const legFL = new THREE.Mesh(legGeo, blackSteelMat);
  const legFR = new THREE.Mesh(legGeo, blackSteelMat);
  const legBL = new THREE.Mesh(legGeo, blackSteelMat);
  const legBR = new THREE.Mesh(legGeo, blackSteelMat);
  legFL.castShadow = legFR.castShadow = legBL.castShadow = legBR.castShadow = true;

  // Natural studio floor plane & subtle architectural grid receiving shadows
  const floorGeo = new THREE.PlaneGeometry(1, 1);
  geometries.push(floorGeo);
  const floorMat = new THREE.MeshStandardMaterial({
    color: "#C2AF9A", // Warm natural microcement / sandstone workshop floor
    roughness: 0.88,
    metalness: 0.03,
  });
  materials.push(floorMat);
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.renderOrder = -3;

  const gridHelper = new THREE.GridHelper(1, 24, 0x8C745E, 0xA8937C);
  (gridHelper.material as THREE.Material).transparent = true;
  (gridHelper.material as THREE.Material).opacity = 0.35;

  archGroup.add(wall, tabletop, legFL, legFR, legBL, legBR, floor, gridHelper);

  // --- 2. Artisan Craft Props ---
  const propsGroup = new THREE.Group();
  propsGroup.name = "kraft-props";

  // A. Spool of Natural Jute Twine
  const twineGroup = new THREE.Group();
  twineGroup.name = "twine-spool";

  const woodSpoolMat = new THREE.MeshStandardMaterial({ color: "#784A28", roughness: 0.65 });
  const juteCordMat = new THREE.MeshStandardMaterial({ color: "#C5A880", roughness: 0.85 });
  materials.push(woodSpoolMat, juteCordMat);

  const coreGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.38, 20);
  const flangeGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.04, 20);
  geometries.push(coreGeo, flangeGeo);

  const twineCore = new THREE.Mesh(coreGeo, juteCordMat);
  twineCore.position.y = 0.21;
  twineCore.castShadow = true;
  const flangeBottom = new THREE.Mesh(flangeGeo, woodSpoolMat);
  flangeBottom.position.y = 0.02;
  const flangeTop = new THREE.Mesh(flangeGeo, woodSpoolMat);
  flangeTop.position.y = 0.4;

  // Trailing twine curve
  const trailingGeo = new THREE.TorusGeometry(0.28, 0.014, 8, 20, Math.PI * 0.8);
  geometries.push(trailingGeo);
  const trailing = new THREE.Mesh(trailingGeo, juteCordMat);
  trailing.rotation.x = Math.PI / 2;
  trailing.position.set(0.15, 0.014, 0.15);

  twineGroup.add(twineCore, flangeBottom, flangeTop, trailing);

  // B. 2 Textured Natural Pinecones
  const pineconeGroup = new THREE.Group();
  pineconeGroup.name = "pinecones";
  const pineconeMat = new THREE.MeshStandardMaterial({ color: "#5B3A29", roughness: 0.85 });
  materials.push(pineconeMat);

  const makePinecone = (scale: number) => {
    const pc = new THREE.Group();
    const tiers = 5;
    for (let t = 0; t < tiers; t++) {
      const r = (Math.sin((t / tiers) * Math.PI) * 0.18 + 0.08) * scale;
      const tierGeo = new THREE.CylinderGeometry(r * 0.8, r, 0.08 * scale, 10);
      geometries.push(tierGeo);
      const tierMesh = new THREE.Mesh(tierGeo, pineconeMat);
      tierMesh.position.y = t * 0.07 * scale;
      tierMesh.castShadow = true;
      pc.add(tierMesh);
    }
    return pc;
  };

  const pc1 = makePinecone(1.1);
  pc1.rotation.z = 0.45;
  const pc2 = makePinecone(0.85);
  pc2.position.set(0.25, 0, -0.1);
  pc2.rotation.z = -0.35;
  pineconeGroup.add(pc1, pc2);

  // C. Bundle of 3 Cinnamon Bark Sticks
  const cinnamonGroup = new THREE.Group();
  cinnamonGroup.name = "cinnamon-bundle";
  const cinnamonMat = new THREE.MeshStandardMaterial({ color: "#78350F", roughness: 0.78 });
  materials.push(cinnamonMat);

  const stickGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.65, 12);
  geometries.push(stickGeo);

  const s1 = new THREE.Mesh(stickGeo, cinnamonMat);
  s1.rotation.z = Math.PI / 2;
  s1.position.set(0, 0.045, -0.04);
  const s2 = new THREE.Mesh(stickGeo, cinnamonMat);
  s2.rotation.z = Math.PI / 2;
  s2.position.set(0, 0.045, 0.04);
  const s3 = new THREE.Mesh(stickGeo, cinnamonMat);
  s3.rotation.z = Math.PI / 2;
  s3.position.set(0, 0.11, 0);
  s1.castShadow = s2.castShadow = s3.castShadow = true;

  // Hemp tie around cinnamon
  const tieTorusGeo = new THREE.TorusGeometry(0.09, 0.012, 8, 16);
  geometries.push(tieTorusGeo);
  const cinnamonTie = new THREE.Mesh(tieTorusGeo, juteCordMat);
  cinnamonTie.rotation.y = Math.PI / 2;
  cinnamonTie.position.y = 0.06;

  cinnamonGroup.add(s1, s2, s3, cinnamonTie);

  // D. Ceramic Earthenware Vase with Fluffy White Cotton Stems
  const cottonVaseGroup = new THREE.Group();
  cottonVaseGroup.name = "cotton-flower-vase";

  const vaseMat = new THREE.MeshStandardMaterial({ color: "#D4A373", roughness: 0.72 });
  const twigStemMat = new THREE.MeshStandardMaterial({ color: "#4A2810", roughness: 0.85 });
  const cottonWhiteMat = new THREE.MeshStandardMaterial({ color: "#F8FAFC", roughness: 0.95 });
  const sepalBrownMat = new THREE.MeshStandardMaterial({ color: "#543310", roughness: 0.8 });
  materials.push(vaseMat, twigStemMat, cottonWhiteMat, sepalBrownMat);

  const potGeo = new THREE.CylinderGeometry(0.18, 0.24, 0.58, 20);
  geometries.push(potGeo);
  const pot = new THREE.Mesh(potGeo, vaseMat);
  pot.position.y = 0.29;
  pot.castShadow = true;
  cottonVaseGroup.add(pot);

  // Twig stems
  const mainStemGeo = new THREE.CylinderGeometry(0.016, 0.024, 1.1, 8);
  geometries.push(mainStemGeo);
  const mainStem = new THREE.Mesh(mainStemGeo, twigStemMat);
  mainStem.position.set(0.04, 1.05, 0);
  mainStem.rotation.z = -0.14;
  cottonVaseGroup.add(mainStem);

  // Cotton flower bolls (fluffy white puff + dark brown sepals)
  const bollGeo = new THREE.SphereGeometry(0.08, 12, 12);
  bollGeo.scale(1.2, 1, 1.2);
  geometries.push(bollGeo);
  const sepalGeo = new THREE.ConeGeometry(0.09, 0.06, 5);
  geometries.push(sepalGeo);

  const makeCottonBoll = () => {
    const c = new THREE.Group();
    const puff = new THREE.Mesh(bollGeo, cottonWhiteMat);
    const sepal = new THREE.Mesh(sepalGeo, sepalBrownMat);
    sepal.position.y = -0.05;
    c.add(puff, sepal);
    return c;
  };

  const b1Pos = makeCottonBoll();
  b1Pos.position.set(0.12, 1.5, 0.06);
  const b2Pos = makeCottonBoll();
  b2Pos.position.set(-0.06, 1.35, -0.05);
  const b3Pos = makeCottonBoll();
  b3Pos.position.set(0.16, 1.2, 0.08);
  cottonVaseGroup.add(b1Pos, b2Pos, b3Pos);

  // E. Vintage Brass Scissors
  const scissorsGroup = new THREE.Group();
  scissorsGroup.name = "vintage-scissors";
  const brassMat = new THREE.MeshStandardMaterial({ color: "#B45309", metalness: 0.88, roughness: 0.25 });
  materials.push(brassMat);

  const bladeGeo = new THREE.BoxGeometry(0.025, 0.008, 0.38);
  geometries.push(bladeGeo);
  const blade1 = new THREE.Mesh(bladeGeo, brassMat);
  blade1.rotation.y = 0.12;
  blade1.castShadow = true;
  const blade2 = new THREE.Mesh(bladeGeo, brassMat);
  blade2.rotation.y = -0.12;
  blade2.castShadow = true;

  const ringGeo = new THREE.TorusGeometry(0.065, 0.014, 8, 16);
  geometries.push(ringGeo);
  const ring1 = new THREE.Mesh(ringGeo, brassMat);
  ring1.position.set(-0.05, 0, -0.22);
  const ring2 = new THREE.Mesh(ringGeo, brassMat);
  ring2.position.set(0.05, 0, -0.22);

  scissorsGroup.add(blade1, blade2, ring1, ring2);

  propsGroup.add(twineGroup, pineconeGroup, cinnamonGroup, cottonVaseGroup, scissorsGroup);

  root.add(archGroup, propsGroup);

  return {
    group: root,
    setProps(on) {
      propsGroup.visible = on;
    },
    layout(center, _clear, radius) {
      const tableW = radius * 4.6;
      const tableD = radius * 2.8;
      const tableH = radius * 0.95;
      const topThick = radius * 0.12;
      const wallH = radius * 5.8;
      const wallW = radius * 5.2;
      const wallThick = radius * 0.12;

      // 1. Tabletop at y = -0.2 mm so box rests cleanly on top
      tabletop.scale.set(tableW, topThick, tableD);
      tabletop.position.set(center.x, -topThick / 2 - 0.2, center.z);

      // Table legs
      const legX = tableW * 0.44;
      const legZ = tableD * 0.42;
      const legH = tableH - topThick;
      const legY = -topThick - legH / 2;
      [legFL, legFR, legBL, legBR].forEach((l) => l.scale.set(radius * 0.6, legH, radius * 0.6));
      legFL.position.set(center.x - legX, legY, center.z + legZ);
      legFR.position.set(center.x + legX, legY, center.z + legZ);
      legBL.position.set(center.x - legX, legY, center.z - legZ);
      legBR.position.set(center.x + legX, legY, center.z - legZ);

      // Floor plane & grid at the bottom of the table legs:
      floor.scale.set(tableW * 3.5, tableD * 3.5, 1);
      floor.position.set(center.x, -tableH, center.z);
      gridHelper.scale.set(tableW * 3.5, 1, tableD * 3.5);
      gridHelper.position.set(center.x, -tableH + 0.01, center.z);

      // 2. Wall behind table
      const wallZ = center.z - tableD / 2 - radius * 0.35;
      wall.scale.set(wallW, wallH, wallThick);
      wall.position.set(center.x, -tableH + wallH / 2, wallZ);

      // 3. Props:
      // Twine spool on front-right
      twineGroup.scale.setScalar(radius * 0.78);
      twineGroup.position.set(center.x + radius * 1.25, 0, center.z + radius * 0.45);

      // Vintage scissors beside twine
      scissorsGroup.scale.setScalar(radius * 0.75);
      scissorsGroup.position.set(center.x + radius * 1.35, 0.01, center.z - radius * 0.05);
      scissorsGroup.rotation.y = 0.55;

      // Pinecones on mid-right
      pineconeGroup.scale.setScalar(radius * 0.82);
      pineconeGroup.position.set(center.x + radius * 1.15, 0, center.z - radius * 0.55);

      // Cinnamon bundle on front-left
      cinnamonGroup.scale.setScalar(radius * 0.85);
      cinnamonGroup.position.set(center.x - radius * 1.15, 0, center.z + radius * 0.5);
      cinnamonGroup.rotation.y = -0.32;

      // Cotton vase on left-back
      cottonVaseGroup.scale.setScalar(radius * 0.95);
      cottonVaseGroup.position.set(center.x - radius * 1.45, 0, center.z - radius * 0.55);
    },
    dispose() {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}

export function createSceneSet(id: SceneId, studioPaletteId?: StudioPaletteId): SceneSet {
  if (id === "modern_studio") {
    return createModernStudioSceneSet(studioPaletteId);
  }
  if (id === "tropical_podium") {
    return createTropicalPodiumSceneSet();
  }
  if (id === "christmas") {
    return createChristmasSceneSet();
  }
  if (id === "festive_glow") {
    return createTetSceneSet();
  }
  if (id === "birthday") {
    return createBirthdaySceneSet();
  }
  if (id === "valentine") {
    return createValentineSceneSet();
  }
  if (id === "kraft_wood") {
    return createKraftWoodSceneSet();
  }

  const { surface } = BACKDROPS[id];
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const look = SURFACE_LOOK[surface.kind];
  const map = new THREE.CanvasTexture(surfaceCanvas(surface.kind, surface.base, surface.accent));
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(look.repeat, look.repeat);
  map.anisotropy = 4;
  const alphaMap = fadeTexture();
  textures.push(map, alphaMap);

  const tableGeometry = new THREE.CircleGeometry(1, 64);
  geometries.push(tableGeometry);
  const tableMaterial = new THREE.MeshStandardMaterial({
    map,
    alphaMap,
    transparent: true,
    depthWrite: false,
    roughness: look.roughness,
    metalness: look.metalness,
  });
  materials.push(tableMaterial);
  const table = new THREE.Mesh(tableGeometry, tableMaterial);
  table.rotation.x = -Math.PI / 2;
  table.receiveShadow = true;
  table.renderOrder = -2;

  const rand = seeded(id.length * 7919 + id.charCodeAt(0));
  const placed = buildProps(id, makeKit(geometries, materials), rand);
  const props = new THREE.Group();
  // Each prop sits in a holder that `layout` moves and scales: the prop keeps its own lift, tilt and proportions.
  const holders = placed.map((item) => {
    const holder = new THREE.Group();
    holder.add(item.object);
    holder.rotation.y = rand() * Math.PI * 2;
    props.add(holder);
    return holder;
  });

  const root = new THREE.Group();
  root.name = "scene-set";
  root.add(table, props);

  return {
    group: root,
    setProps(on) {
      props.visible = on;
    },
    layout(center, clear, radius) {
      table.position.set(center.x, 0, center.z);
      table.scale.setScalar(radius * 4.2);
      // One prop unit: about a third of the box's radius, so a lipstick box and a shoe box both get a set that fits.
      const unit = radius * 0.32;
      placed.forEach((item, i) => {
        const a = THREE.MathUtils.degToRad(item.angle);
        const distance = clear + unit * (item.scatter ? item.gap : item.gap + 0.6);
        holders[i].position.set(center.x + Math.sin(a) * distance, 0, center.z + Math.cos(a) * distance);
        holders[i].scale.setScalar(unit);
      });
    },
    dispose() {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
