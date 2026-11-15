/* ds-artwork: the tabletop and props of the 3D photo sets draw real materials (docs/15_DESIGN_SYSTEM.md §2). */
import * as THREE from "three";
import { BACKDROPS, type SceneId, type SurfaceKind } from "./backdrops";

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

export function createSceneSet(id: SceneId): SceneSet {
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
