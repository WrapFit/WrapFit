"use client";

import * as THREE from "three";
import { cupCarrierSizesOf, type BoxDimensions, type Mat4, transformPoint } from "@wrapfit/shared";

/**
 * Procedural 3D 350ml (12oz) Takeaway Coffee Paper Cup & Carrier Cup Group.
 * Modeled after artisan takeaway coffee cups with matching snap-on travel lids (e.g. Notalk Coffee).
 *
 * Dimensions of a standard 350ml (12oz) paper cup:
 * - Height: 112 mm
 * - Top rim outer diameter: 88 mm (radius = 44 mm)
 * - Bottom diameter: 58 mm (radius = 29 mm)
 * - Snap-on travel lid: diameter 90.4 mm, height ~13 mm above rim with raised drinking spout
 */

export const STANDARD_350ML_HEIGHT = 112;
export const STANDARD_350ML_RADIUS_TOP = 44; // Ø 88 mm
export const STANDARD_350ML_RADIUS_BOTTOM = 29; // Ø 58 mm
/** Standard seating depth (mm) where standard 350ml takeaway cup catches on a carrier hole. */
export const STANDARD_350ML_Y_SEAT = 84;

const CUP_HEIGHT = STANDARD_350ML_HEIGHT;
const CUP_RADIUS_TOP = STANDARD_350ML_RADIUS_TOP;
const CUP_RADIUS_BOTTOM = STANDARD_350ML_RADIUS_BOTTOM;

let cachedCupTexture: THREE.CanvasTexture | null = null;

/** Generates or reuses the high-res artisan green pixel-terrazzo paper texture for the cup body. */
export function getSharedCupTexture(): THREE.CanvasTexture {
  if (cachedCupTexture) return cachedCupTexture;

  if (typeof document === "undefined") {
    // SSR fallback: 1x1 green texture
    const canvas = { width: 1, height: 1 } as unknown as HTMLCanvasElement;
    cachedCupTexture = new THREE.CanvasTexture(canvas);
    return cachedCupTexture;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    cachedCupTexture = new THREE.CanvasTexture(canvas);
    return cachedCupTexture;
  }

  // Base background: artisan matcha / forest green
  const baseGrad = ctx.createLinearGradient(0, 0, 0, 512);
  baseGrad.addColorStop(0, "#487353");
  baseGrad.addColorStop(0.5, "#426B4C");
  baseGrad.addColorStop(1, "#3B6144");
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, 1024, 512);

  // Pixel terrazzo / mosaic scatter pattern (matching photo aesthetic)
  const pixelColors = [
    "#34553B",
    "#2E4B34",
    "#558461",
    "#62936E",
    "#73A780",
    "#3D6446",
    "#4D7958",
  ];

  let seed = 42;
  const rng = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  for (let i = 0; i < 280; i++) {
    const x = Math.floor(rng() * 64) * 16;
    const y = Math.floor(rng() * 32) * 16;
    // Concentrate more on lower half and sides
    if (y > 180 || rng() > 0.4) {
      ctx.fillStyle = pixelColors[Math.floor(rng() * pixelColors.length)];
      ctx.globalAlpha = 0.45 + rng() * 0.4;
      const size = rng() > 0.7 ? 32 : 16;
      ctx.fillRect(x, y, size, size);
    }
  }
  ctx.globalAlpha = 1.0;

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  cachedCupTexture = texture;
  return texture;
}

/**
 * Creates a single 350ml takeaway paper cup with matching travel lid.
 * @param ySeat Distance from bottom of cup to the seat plane (where it rests in the hole).
 */
export function createCup350ml(
  ySeat: number,
  cupTexture: THREE.CanvasTexture,
  disposables: { dispose(): void }[]
): THREE.Group {
  const cupGroup = new THREE.Group();
  cupGroup.name = "cup_350ml";

  // 1. Cup Body (tapered cylinder)
  const bodyGeo = new THREE.CylinderGeometry(
    CUP_RADIUS_TOP,
    CUP_RADIUS_BOTTOM,
    CUP_HEIGHT,
    48,
    1,
    false
  );
  const bodyMat = new THREE.MeshStandardMaterial({
    map: cupTexture,
    roughness: 0.72,
    metalness: 0.0,
    bumpScale: 0.05,
  });
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.position.y = CUP_HEIGHT / 2 - ySeat;
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  cupGroup.add(bodyMesh);

  // 2. Rolled Top Lip / Rim
  const rimGeo = new THREE.TorusGeometry(CUP_RADIUS_TOP - 0.4, 1.2, 12, 48);
  const rimMat = new THREE.MeshStandardMaterial({
    color: "#466F50",
    roughness: 0.65,
    metalness: 0.0,
  });
  const rimMesh = new THREE.Mesh(rimGeo, rimMat);
  rimMesh.rotation.x = Math.PI / 2;
  rimMesh.position.y = CUP_HEIGHT - ySeat;
  rimMesh.castShadow = true;
  cupGroup.add(rimMesh);

  // 3. Recessed Base Ring & Inset Disc
  const baseRimGeo = new THREE.CylinderGeometry(
    CUP_RADIUS_BOTTOM + 0.3,
    CUP_RADIUS_BOTTOM,
    5,
    48,
    1,
    true
  );
  const baseRimMat = new THREE.MeshStandardMaterial({
    color: "#37593E",
    roughness: 0.8,
  });
  const baseRimMesh = new THREE.Mesh(baseRimGeo, baseRimMat);
  baseRimMesh.position.y = -ySeat + 2.5;
  cupGroup.add(baseRimMesh);

  const baseFloorGeo = new THREE.CircleGeometry(CUP_RADIUS_BOTTOM - 0.5, 48);
  const baseFloorMat = new THREE.MeshStandardMaterial({
    color: "#E2D9CC", // Inside paper bottom
    roughness: 0.9,
    side: THREE.DoubleSide,
  });
  const baseFloorMesh = new THREE.Mesh(baseFloorGeo, baseFloorMat);
  baseFloorMesh.rotation.x = -Math.PI / 2;
  baseFloorMesh.position.y = -ySeat + 6;
  cupGroup.add(baseFloorMesh);

  // 4. Takeaway Snap-on Travel Lid (match user's photo)
  const lidGroup = new THREE.Group();
  lidGroup.name = "cup_lid";
  const lidMat = new THREE.MeshStandardMaterial({
    color: "#3D6647",
    roughness: 0.42,
    metalness: 0.04,
  });

  // 4a. Outer snap collar
  const lidCollarGeo = new THREE.CylinderGeometry(
    CUP_RADIUS_TOP + 1.2,
    CUP_RADIUS_TOP + 1.6,
    5,
    48,
    1,
    true
  );
  const lidCollar = new THREE.Mesh(lidCollarGeo, lidMat);
  lidCollar.position.y = CUP_HEIGHT - ySeat + 2.5;
  lidCollar.castShadow = true;
  lidGroup.add(lidCollar);

  // 4b. Lid rim flange
  const lidFlangeGeo = new THREE.RingGeometry(CUP_RADIUS_TOP - 3, CUP_RADIUS_TOP + 1.2, 48);
  const lidFlange = new THREE.Mesh(lidFlangeGeo, lidMat);
  lidFlange.rotation.x = -Math.PI / 2;
  lidFlange.position.y = CUP_HEIGHT - ySeat + 5;
  lidGroup.add(lidFlange);

  // 4c. Recessed moat channel
  const lidMoatGeo = new THREE.CylinderGeometry(
    CUP_RADIUS_TOP - 4,
    CUP_RADIUS_TOP - 3,
    3,
    48,
    1,
    true
  );
  const lidMoat = new THREE.Mesh(lidMoatGeo, lidMat);
  lidMoat.position.y = CUP_HEIGHT - ySeat + 3.5;
  lidGroup.add(lidMoat);

  // 4d. Raised Deck & Drinking Platform
  const lidDeckGeo = new THREE.CylinderGeometry(
    CUP_RADIUS_TOP - 5,
    CUP_RADIUS_TOP - 4,
    5,
    48
  );
  const lidDeck = new THREE.Mesh(lidDeckGeo, lidMat);
  lidDeck.position.y = CUP_HEIGHT - ySeat + 6.5;
  lidDeck.castShadow = true;
  lidGroup.add(lidDeck);

  // 4e. Raised Sip Spout (facing forward/slightly angled)
  const spoutGeo = new THREE.CylinderGeometry(8, 10, 4, 24);
  const spoutMesh = new THREE.Mesh(spoutGeo, lidMat);
  spoutMesh.position.set(0, CUP_HEIGHT - ySeat + 9.5, CUP_RADIUS_TOP - 12);
  spoutMesh.rotation.x = 0.12;
  spoutMesh.castShadow = true;
  lidGroup.add(spoutMesh);

  // Sip hole (dark oval)
  const sipHoleGeo = new THREE.CircleGeometry(3.5, 16);
  const sipHoleMat = new THREE.MeshBasicMaterial({ color: "#1F3323" });
  const sipHoleMesh = new THREE.Mesh(sipHoleGeo, sipHoleMat);
  sipHoleMesh.rotation.x = -Math.PI / 2;
  sipHoleMesh.position.set(0, CUP_HEIGHT - ySeat + 11.6, CUP_RADIUS_TOP - 12);
  lidGroup.add(sipHoleMesh);

  cupGroup.add(lidGroup);

  disposables.push(
    bodyGeo,
    bodyMat,
    rimGeo,
    rimMat,
    baseRimGeo,
    baseRimMat,
    baseFloorGeo,
    baseFloorMat,
    lidMat,
    lidCollarGeo,
    lidFlangeGeo,
    lidMoatGeo,
    lidDeckGeo,
    spoutGeo,
    sipHoleGeo,
    sipHoleMat
  );

  return cupGroup;
}

export interface PlacedCarrierCups {
  group: THREE.Group;
  ySeat: number;
  cupCount: number;
  setVisible(visible: boolean): void;
  update(matrixBase: Mat4, progress: number): void;
}

/**
 * Creates the full group of 350ml takeaway cups positioned in the holes of a cup carrier.
 */
export function placedCarrierCups(
  dimensions: BoxDimensions,
  disposables: { dispose(): void }[],
  initialVisible = true
): PlacedCarrierCups | null {
  const s = cupCarrierSizesOf(dimensions);
  const { L, W, H, shoulder, handle } = s;
  const d = s.cupDiameter;

  if (d <= 0 || s.rows <= 0 || s.cols <= 0) {
    return null;
  }

  // Fixed standard seat height for standard 350ml takeaway cup
  // Ensures cup dimensions and elevation remain physically invariant when adjusting carrier dimensions
  const ySeat = STANDARD_350ML_Y_SEAT;

  const group = new THREE.Group();
  group.name = "carrier_cups_container";
  let isVisible = initialVisible;
  let lastProgress = 1;
  group.visible = isVisible;

  const cupTexture = getSharedCupTexture();

  // Locate the holes in sheet space:
  // Base panel: bounds yBase to yBase + W
  const yShoulderFront = handle;
  const yWallFront = yShoulderFront + shoulder;
  const yBase = yWallFront + H;

  const cupHoles: { cx: number; cy: number; anchor: THREE.Group }[] = [];

  for (let row = 0; row < s.rows; row++) {
    for (let col = 0; col < s.cols; col++) {
      const cx = ((col + 0.5) * L) / s.cols;
      const cy = yBase + ((row + 0.5) * W) / s.rows;

      // Each cup is mounted in an anchor slot with zero rotation so counter-scaling during drag
      // cannot cause shearing when non-uniform dimensions (sx != sz) are pulled.
      const anchor = new THREE.Group();
      anchor.name = "cup_slot";

      const cup = createCup350ml(ySeat, cupTexture, disposables);
      // Slight random yaw rotation so multiple cups look natural and handcrafted
      cup.rotation.y = (col * 0.45 + row * 0.8) % (Math.PI * 2);
      anchor.add(cup);

      group.add(anchor);
      cupHoles.push({ cx, cy, anchor });
    }
  }

  const update = (matrixBase: Mat4, progress: number) => {
    lastProgress = progress;
    // When flat dieline (progress < 0.25) or when user toggled cups off, hide cups
    const foldVisible = progress > 0.25;
    group.visible = isVisible && foldVisible;
    if (!group.visible) return;

    // As carrier folds from 0.4 to 1.0, cups drop smoothly into their holes
    const dropSettle = Math.min(1, Math.max(0, (progress - 0.4) / 0.6));
    const cupElevationDrop = (1 - dropSettle) * 110;

    for (const { cx, cy, anchor } of cupHoles) {
      const p3d = transformPoint(matrixBase, [cx, cy, 0]);
      anchor.position.set(p3d[0], p3d[1] + cupElevationDrop, p3d[2]);
    }
  };

  const setVisible = (visible: boolean) => {
    isVisible = visible;
    group.visible = isVisible && lastProgress > 0.25;
  };

  return {
    group,
    ySeat,
    cupCount: cupHoles.length,
    setVisible,
    update,
  };
}
