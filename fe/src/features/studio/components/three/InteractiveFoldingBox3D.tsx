"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { BoxDimensions, BoxStructureType, CanvasElement } from "@wrapfit/shared";
import { Box, Gift, Pause, Play, Tag, ZoomIn, ZoomOut } from "lucide-react";
import { buildBoxModel, foldablePieces, type BoxMaterialTheme, type BoxModel } from "./boxModel";
import { stageBarButton } from "../studioUi";
import { BACKDROPS, type Backdrop, type BoxEnvironment } from "./backdrops";
import { AXIS_COLORS, AXIS_LETTER, DIMENSION_AXES, type DimensionAxis, type DimensionGuides } from "./guides";

export type { BoxMaterialTheme } from "./boxModel";
export type { BoxStructureType };
export type { BoxEnvironment } from "./backdrops";

export type { DimensionAxis, DimensionGuides } from "./guides";

interface InteractiveFoldingBox3DProps {
  dimensions: BoxDimensions;
  foldProgress: number; // 0.0 -> 1.0
  boxType?: BoxStructureType;
  theme?: BoxMaterialTheme;
  /** Decoration on the main face when no design is given (marketing pages). */
  customLogoText?: string;
  /** Elements of the design, drawn on their panels; omitted: a showcase box with the WrapFit decoration. */
  elements?: CanvasElement[];
  /** Dieline formulas of the project (default: the current ones). */
  formulaVersion?: number;
  backgroundPatternSvg?: string | null;
  onFlapClick?: (flapName: string) => void;
  className?: string;
  autoRotate?: boolean;
  /** Backdrop behind the box; "transparent" shows the page behind the canvas. */
  environment?: BoxEnvironment;
  interactiveOpenState?: boolean;
  rotationY?: number; // External yaw rotation (radians) driven by GSAP ScrollTrigger
  rotationX?: number; // External pitch tilt (radians) driven by GSAP ScrollTrigger
  enableMacroZoom?: boolean;
  /** Status pill at the bottom (fold %, size, paper): studio information, hidden on public pages. */
  showStatusBar?: boolean;
  /** Structure badge and open-lid button over the stage; off when the page has its own controls. */
  showHud?: boolean;
  /** Camera dock (3/4, front, side, top, turntable); default: on unless the box turns by itself. */
  viewControls?: boolean;
  /** Camera preset driven by the page (a slider of views); the camera glides there whenever it changes. */
  cameraView?: "angle" | "front" | "side" | "top";
  /** 460 px minimum height; false lets the parent decide (e.g. a square stage on a phone). */
  minHeight?: boolean;
  /** No frame of its own (border, corners): the stage fills the parent's card. */
  frameless?: boolean;
  /**
   * Size being dragged, shown at once by stretching the current model; the model is rebuilt from `dimensions` when
   * the page commits the size. Keeps sliders at 60 fps (a rebuild redraws every panel texture).
   */
  liveDimensions?: BoxDimensions;
  /** Dimension lines with labels on the model. */
  guides?: DimensionGuides | null;
  /**
   * Where the controls go. `overlay` (default, marketing pages): floating pills over the model. `bar` (studio): one
   * flat toolbar under the model, nothing floats over it; the page puts its own info in `barStart` / `barEnd`.
   */
  chrome?: "overlay" | "bar";
  barStart?: React.ReactNode;
  barEnd?: React.ReactNode;
  /**
   * Filled with a function that renders a frame and returns the WebGL canvas (transparent background). Read it at
   * once, in the same task: the drawing buffer is not kept (mockup images).
   */
  captureRef?: React.MutableRefObject<(() => HTMLCanvasElement) | null>;
  /**
   * Names of the faces (Nắp, Đáy, Mặt trước…) on the model, with a toggle in the dock: on by default once the box is
   * folded to FACE_LABELS_FROM or more (studio).
   */
  faceLabels?: boolean;
}

/** Fold progress from which the face labels show by themselves. */
const FACE_LABELS_FROM = 0.8;

/** "Nắp trên (Top Lid)" → "Nắp trên": the Vietnamese part of a panel name. */
const shortFaceName = (name: string) => name.replace(/\s*\([^)]*\)/g, "").trim();

// ---------------------------------------------------------------------------------------------------------------
// Labels of the stage (its scenes are in ./backdrops)

const STRUCTURE_LABEL: Record<BoxStructureType, string> = {
  "tuck-top": "Hộp nắp gài đáy khoá",
  "sleeve-drawer": "Hộp bao diêm (khay rút)",
  "lid-base": "Hộp âm dương (nắp rời)",
  pillow: "Hộp gối cánh cung",
  "sticker-label": "Tem nhãn / Đai giấy",
};

const OPEN_LABEL: Record<BoxStructureType, [string, string]> = {
  "tuck-top": ["Mở nắp", "Đóng nắp"],
  "sleeve-drawer": ["Rút khay ra", "Đóng khay"],
  "lid-base": ["Nhấc nắp lên", "Đậy nắp"],
  pillow: ["Mở nắp", "Đóng nắp"],
  "sticker-label": ["Xem trước", "Thu gọn"],
};

const PAPER_LABEL: Record<BoxMaterialTheme, string> = {
  ivory: "Ivory",
  kraft: "Kraft",
  duplex: "Duplex",
  rigid: "Carton bồi",
  forest: "Xanh rừng",
  gold_foil: "Ép kim vàng",
};

/** Camera directions of the dock (from the target, y up). `distance` is relative to the framing distance. */
type ViewName = "angle" | "front" | "side" | "top" | "macro";
const VIEWS: Record<ViewName, { dir: THREE.Vector3; distance: number }> = {
  angle: { dir: new THREE.Vector3(1.1, 0.8, 1.45).normalize(), distance: 1 },
  front: { dir: new THREE.Vector3(0, 0.2, 1).normalize(), distance: 1 },
  side: { dir: new THREE.Vector3(1, 0.2, 0).normalize(), distance: 1 },
  top: { dir: new THREE.Vector3(0.001, 1, 0.14).normalize(), distance: 1 },
  macro: { dir: new THREE.Vector3(0.75, 0.55, 0.95).normalize(), distance: 0.42 },
};
const DOCK: { view: Exclude<ViewName, "macro">; label: string }[] = [
  { view: "angle", label: "3/4" },
  { view: "front", label: "Trước" },
  { view: "side", label: "Bên" },
  { view: "top", label: "Trên" },
];

// ---------------------------------------------------------------------------------------------------------------
// Shared paper textures: generated once per page, reused by every viewer and every rebuild of the box.

let fiberTextures: { bump: THREE.CanvasTexture; roughness: THREE.CanvasTexture } | null = null;

function paperFibers() {
  if (fiberTextures) return fiberTextures;
  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = bumpCanvas.height = 1024;
  const ctx = bumpCanvas.getContext("2d")!;
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, 1024, 1024);
  const image = ctx.getImageData(0, 0, 1024, 1024);
  for (let i = 0; i < image.data.length; i += 4) {
    const value = 128 + (Math.random() - 0.5) * 34;
    image.data[i] = image.data[i + 1] = image.data[i + 2] = value;
  }
  ctx.putImageData(image, 0, 0);
  ctx.lineCap = "round";
  // Short cotton fibres, then a few long ones.
  for (const [count, minLength, spread, width] of [
    [3600, 6, 24, 0.8],
    [550, 25, 60, 1.2],
  ] as const) {
    for (let f = 0; f < count; f++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const length = minLength + Math.random() * spread;
      const angle = Math.random() * Math.PI * 2;
      const bend = (Math.random() - 0.5) * 16;
      ctx.strokeStyle = Math.random() > 0.5 ? "rgba(230,230,230,0.42)" : "rgba(36,36,36,0.38)";
      ctx.lineWidth = width + Math.random() * 1.6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(
        x + Math.cos(angle) * length * 0.5 + bend,
        y + Math.sin(angle) * length * 0.5 + bend,
        x + Math.cos(angle) * length,
        y + Math.sin(angle) * length
      );
      ctx.stroke();
    }
  }

  const roughCanvas = document.createElement("canvas");
  roughCanvas.width = roughCanvas.height = 512;
  const rctx = roughCanvas.getContext("2d")!;
  const rough = rctx.createImageData(512, 512);
  for (let i = 0; i < rough.data.length; i += 4) {
    const value = 228 + (Math.random() - 0.5) * 30;
    rough.data[i] = rough.data[i + 1] = rough.data[i + 2] = value;
    rough.data[i + 3] = 255;
  }
  rctx.putImageData(rough, 0, 0);

  const wrap = (canvas: HTMLCanvasElement) => {
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    return texture;
  };
  fiberTextures = { bump: wrap(bumpCanvas), roughness: wrap(roughCanvas) };
  return fiberTextures;
}

/** Soft round shadow under the box (ambient occlusion of the floor), drawn once. */
function contactShadowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, "rgba(0,0,0,0.85)");
  gradient.addColorStop(0.45, "rgba(0,0,0,0.42)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
}

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutBack = (t: number) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
/** Frame-rate independent approach of `value` to `target` (rate per second). */
const approach = (value: number, target: number, rate: number, dt: number) => {
  const next = value + (target - value) * (1 - Math.exp(-rate * dt));
  return Math.abs(target - next) < 1e-4 ? target : next;
};

interface StageApi {
  setModel(model: BoxModel, pop: boolean, dimensions: BoxDimensions): void;
  setPreview(dimensions: BoxDimensions | null): void;
  setGuides(on: boolean, active: DimensionAxis | null): void;
  setFaceLabels(on: boolean): void;
  setTargets(progress: number, open: number): void;
  setBackdrop(backdrop: Backdrop | null): void;
  setAutoRotate(on: boolean): void;
  setRotation(x?: number, y?: number): void;
  goTo(view: ViewName): void;
  invalidate(): void;
}

export const InteractiveFoldingBox3D: React.FC<InteractiveFoldingBox3DProps> = ({
  dimensions,
  foldProgress,
  boxType = "tuck-top",
  theme = "ivory",
  customLogoText = "WrapFit Signature",
  elements,
  formulaVersion,
  backgroundPatternSvg = null,
  onFlapClick,
  className = "",
  autoRotate = false,
  environment = "studio",
  interactiveOpenState: propOpenState,
  rotationY,
  rotationX,
  enableMacroZoom = true,
  showStatusBar = true,
  showHud = true,
  viewControls,
  cameraView,
  minHeight = true,
  frameless = false,
  liveDimensions,
  guides = null,
  chrome = "overlay",
  barStart,
  barEnd,
  captureRef,
  faceLabels = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  /** Labels of the dimension guides, placed by the render loop. */
  const labelRefs = useRef<Partial<Record<DimensionAxis, HTMLDivElement | null>>>({});
  /** Face labels by panel id, placed by the render loop. */
  const faceLabelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [faceLabelMode, setFaceLabelMode] = useState<"auto" | "on" | "off">("auto");
  const stageRef = useRef<StageApi | null>(null);
  const [open, setOpen] = useState(false);
  /** Preset the camera sits on; null once the user turned the box by hand. */
  const [view, setView] = useState<ViewName | null>("angle");
  const [spinning, setSpinning] = useState(autoRotate);
  const onFlapClickRef = useRef(onFlapClick);
  onFlapClickRef.current = onFlapClick;
  const structureRef = useRef(boxType);
  structureRef.current = boxType;
  const showDock = viewControls ?? !autoRotate;
  const backdrop = environment === "transparent" ? null : BACKDROPS[environment];

  useEffect(() => {
    if (propOpenState !== undefined) setOpen(propOpenState);
  }, [propOpenState]);
  useEffect(() => setSpinning(autoRotate), [autoRotate]);

  // 1. The stage: renderer, camera, lights and loop, set up once; the box is swapped in by the effect below.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    // PCF with a blur radius: a soft penumbra instead of the hard edge of PCFSoft.
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "none";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const envMap = pmrem.fromScene(room, 0.04).texture;
    scene.environment = envMap;
    scene.environmentIntensity = 0.55;
    room.dispose();

    const camera = new THREE.PerspectiveCamera(32, 1, 1, 8000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.8;
    controls.enablePan = false;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.autoRotateSpeed = 1.1;

    // Lights: soft key with the shadow, cool fill, coloured rim from behind (set by the backdrop).
    const hemi = new THREE.HemisphereLight(0xffffff, 0xd9d2c5, 0.35);
    const key = new THREE.DirectionalLight(0xffffff, 1.35);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.radius = 9;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    const rim = new THREE.DirectionalLight(0xffffff, 0.45);
    scene.add(hemi, key, key.target, rim);

    const groundGeometry = new THREE.PlaneGeometry(1, 1);
    const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.18 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    const blobTexture = contactShadowTexture();
    const blobMaterial = new THREE.MeshBasicMaterial({ map: blobTexture, transparent: true, depthWrite: false, opacity: 0.3 });
    const blob = new THREE.Mesh(groundGeometry, blobMaterial);
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.05;
    blob.renderOrder = -1;
    scene.add(ground, blob);

    const root = new THREE.Group();
    scene.add(root);

    // Dimension guides: a shaft, two extension lines and a label anchor per measure, drawn over the box.
    const unitCylinder = new THREE.CylinderGeometry(1, 1, 1, 10);
    const up = new THREE.Vector3(0, 1, 0);
    const guideGroup = new THREE.Group();
    guideGroup.visible = false;
    scene.add(guideGroup);
    const guideParts = DIMENSION_AXES.map((axis) => {
      const material = new THREE.MeshBasicMaterial({ color: AXIS_COLORS[axis], transparent: true, depthTest: false, depthWrite: false });
      const meshes = [0, 1, 2].map(() => {
        const mesh = new THREE.Mesh(unitCylinder, material);
        mesh.renderOrder = 20;
        guideGroup.add(mesh);
        return mesh;
      });
      return { axis, material, meshes, anchor: new THREE.Vector3() };
    });
    const segment = (mesh: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3, radius: number) => {
      const along = b.clone().sub(a);
      const length = along.length();
      mesh.position.copy(a).addScaledVector(along, 0.5);
      mesh.scale.set(radius, Math.max(length, 0.001), radius);
      mesh.quaternion.setFromUnitVectors(up, length > 0 ? along.divideScalar(length) : up);
    };
    let guidesOn = false;
    let activeAxis: DimensionAxis | null = null;
    /** Which world axis carries the length: x for most structures, z when the model lies the other way. */
    let lengthOnX = true;
    let builtDims: BoxDimensions | null = null;
    let previewDims: BoxDimensions | null = null;

    const placeGuides = (box: THREE.Box3) => {
      const size = box.getSize(new THREE.Vector3());
      const reach = Math.max(size.x, size.y, size.z);
      const pad = reach * 0.16;
      const radius = reach * 0.0045;
      const y = box.min.y + radius;
      // Seen from the 3/4 view (+x, +z): length on the front bottom edge, width on the right one, height on the left corner.
      const xGuide = { from: new THREE.Vector3(box.min.x, y, box.max.z + pad), to: new THREE.Vector3(box.max.x, y, box.max.z + pad), ext: new THREE.Vector3(0, 0, -pad) };
      const zGuide = { from: new THREE.Vector3(box.max.x + pad, y, box.min.z), to: new THREE.Vector3(box.max.x + pad, y, box.max.z), ext: new THREE.Vector3(-pad, 0, 0) };
      const yGuide = { from: new THREE.Vector3(box.min.x - pad, box.min.y, box.max.z), to: new THREE.Vector3(box.min.x - pad, box.max.y, box.max.z), ext: new THREE.Vector3(pad, 0, 0) };
      const byAxis: Record<DimensionAxis, typeof xGuide> = { length: lengthOnX ? xGuide : zGuide, width: lengthOnX ? zGuide : xGuide, height: yGuide };
      for (const part of guideParts) {
        const guide = byAxis[part.axis];
        const strong = activeAxis === null || activeAxis === part.axis;
        const r = radius * (activeAxis === part.axis ? 1.8 : 1);
        segment(part.meshes[0], guide.from, guide.to, r);
        segment(part.meshes[1], guide.from, guide.from.clone().add(guide.ext), r * 0.6);
        segment(part.meshes[2], guide.to, guide.to.clone().add(guide.ext), r * 0.6);
        part.material.opacity = strong ? 1 : 0.3;
        part.anchor.copy(guide.from).add(guide.to).multiplyScalar(0.5).addScaledVector(guide.ext, -0.35);
      }
    };

    /** Stretches the built model to the size being dragged (no rebuild). */
    const applyPreview = () => {
      if (!model) return;
      if (!builtDims || !previewDims) {
        model.group.scale.set(1, 1, 1);
      } else {
        const ratio = (field: DimensionAxis) => (builtDims![field] > 0 ? previewDims![field] / builtDims![field] : 1);
        model.group.scale.set(lengthOnX ? ratio("length") : ratio("width"), ratio("height"), lengthOnX ? ratio("width") : ratio("length"));
      }
      boundsDirty = true;
      dirty = true;
    };

    let faceLabelsOn = false;
    const faceRay = new THREE.Raycaster();
    const faceBox = new THREE.Box3();
    const faceCenter = new THREE.Vector3();
    /** Each face label sits on the middle of its panel and hides when another panel is in front of it. */
    const placeFaceLabels = (width: number, height: number) => {
      const labels = Object.entries(faceLabelRefs.current);
      if (labels.length === 0) return;
      for (const [id, label] of labels) {
        if (!label) continue;
        const mesh = faceLabelsOn && model ? (model.group.getObjectByName(id) as THREE.Mesh | undefined) : undefined;
        if (!mesh?.geometry) {
          label.style.opacity = "0";
          continue;
        }
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
        faceBox.copy(mesh.geometry.boundingBox!).applyMatrix4(mesh.matrixWorld);
        faceBox.getCenter(faceCenter);
        const distance = faceCenter.distanceTo(camera.position);
        faceRay.set(camera.position, faceCenter.clone().sub(camera.position).normalize());
        const [hit] = faceRay.intersectObject(model!.group, true);
        const seen = !hit || hit.object.name === id || hit.distance >= distance - 0.5;
        const point = faceCenter.clone().project(camera);
        label.style.opacity = seen && point.z < 1 ? "1" : "0";
        label.style.transform = `translate(${((point.x + 1) / 2) * width}px, ${((1 - point.y) / 2) * height}px) translate(-50%, -50%)`;
      }
    };

    const placeLabels = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      placeFaceLabels(width, height);
      for (const part of guideParts) {
        const label = labelRefs.current[part.axis];
        if (!label) continue;
        if (!guidesOn) {
          label.style.opacity = "0";
          continue;
        }
        const point = part.anchor.clone().project(camera);
        const shown = point.z < 1;
        label.style.opacity = shown ? (activeAxis === null || activeAxis === part.axis ? "1" : "0.55") : "0";
        label.style.transform = `translate(${((point.x + 1) / 2) * width}px, ${((1 - point.y) / 2) * height}px) translate(-50%, -50%)`;
      }
    };

    // --- state of the loop
    let model: BoxModel | null = null;
    let progress = 1;
    let openness = 0;
    let target = { progress: 1, open: 0 };
    let dirty = true;
    let boundsDirty = true;
    let scale = 1;
    let popStart = -1;
    const fit = { radius: 100, center: new THREE.Vector3(), shownRadius: 0 };
    const look = new THREE.Vector3();
    let tween: { from: THREE.Vector3; to: THREE.Vector3; fromDistance: number; toDistance: number; t: number; duration: number } | null = null;
    let visible = true;
    let hoverPoint: THREE.Vector2 | null = null;
    let dragging = false;

    const framingDistance = (radius: number) => {
      const vHalf = THREE.MathUtils.degToRad(camera.fov / 2);
      const hHalf = Math.atan(Math.tan(vHalf) * camera.aspect);
      return (radius / Math.sin(Math.min(vHalf, hHalf))) * 1.04;
    };

    const measure = () => {
      if (!model) return;
      root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model.group);
      if (box.isEmpty()) return;
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      // The guides sit outside the box: frame them too.
      fit.radius = (sphere.radius / Math.max(scale, 0.5)) * (guidesOn ? 1.22 : 1);
      if (guidesOn) placeGuides(box);
      fit.center.copy(sphere.center);
      // Floor shadows follow the footprint of the box.
      const footprint = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
      blob.scale.set((box.max.x - box.min.x) * 1.7 + footprint * 0.2, (box.max.z - box.min.z) * 1.7 + footprint * 0.2, 1);
      blob.position.x = (box.min.x + box.max.x) / 2;
      blob.position.z = (box.min.z + box.max.z) / 2;
      ground.scale.set(fit.radius * 12, fit.radius * 12, 1);
      const d = fit.radius * 1.6;
      Object.assign(key.shadow.camera, { left: -d, right: d, top: d, bottom: -d, near: 1, far: fit.radius * 12 });
      key.shadow.camera.updateProjectionMatrix();
      // From the upper right: the side and the front of the box take different shades.
      key.position.set(fit.radius * 3.2, fit.radius * 4, fit.radius * 1.3);
      rim.position.set(-fit.radius * 3, fit.radius * 2, -fit.radius * 3);
      boundsDirty = false;
    };

    const placeCamera = (dir: THREE.Vector3, distanceFactor: number) => {
      const distance = framingDistance(fit.radius) * distanceFactor;
      look.copy(fit.center);
      controls.target.copy(look);
      camera.position.copy(look).addScaledVector(dir, distance);
      fit.shownRadius = fit.radius;
    };

    const startTween = (dir: THREE.Vector3, distanceFactor: number, duration: number) => {
      const offset = camera.position.clone().sub(controls.target);
      tween = {
        from: offset.clone().normalize(),
        to: dir.clone(),
        fromDistance: offset.length(),
        toDistance: framingDistance(fit.radius) * distanceFactor,
        t: 0,
        duration: reducedMotion ? 0.001 : duration,
      };
      dirty = true;
    };

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      dirty = true;
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      dirty = true;
    });
    visibility.observe(container);

    // --- pointer: drag rotates, a click (no drag) opens, hovering lights the panel
    const raycaster = new THREE.Raycaster();
    let downAt: { x: number; y: number } | null = null;
    const toNdc = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      return new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    };
    const pick = (ndc: THREE.Vector2) => {
      if (!model) return null;
      raycaster.setFromCamera(ndc, camera);
      return raycaster.intersectObjects(model.group.children, true).find((hit) => hit.object.name)?.object.name ?? null;
    };
    const onPointerDown = (event: PointerEvent) => {
      downAt = { x: event.clientX, y: event.clientY };
    };
    const onPointerUp = (event: PointerEvent) => {
      if (!downAt) return;
      const moved = Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y);
      downAt = null;
      if (moved > 5) return;
      const name = pick(toNdc(event));
      if (!name) return;
      if (structureRef.current !== "pillow") setOpen((value) => !value);
      onFlapClickRef.current?.(name);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      hoverPoint = toNdc(event);
      dirty = true;
    };
    const onPointerLeave = () => {
      hoverPoint = null;
      model?.highlight(null);
      renderer.domElement.style.cursor = "";
      dirty = true;
    };
    const el = renderer.domElement;
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerleave", onPointerLeave);
    controls.addEventListener("start", () => {
      tween = null;
      dragging = true;
      setView((current) => (current === "macro" ? current : null));
    });
    controls.addEventListener("end", () => {
      dragging = false;
    });

    // --- loop: renders only when something moved
    const clock = new THREE.Clock();
    let frame = 0;
    const loop = () => {
      frame = requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.05);
      if (!visible || !model) return;

      if (progress !== target.progress || openness !== target.open) {
        progress = reducedMotion ? target.progress : approach(progress, target.progress, 9, dt);
        openness = reducedMotion ? target.open : approach(openness, target.open, 5.5, dt);
        model.update(progress, openness);
        boundsDirty = true;
        dirty = true;
      }
      if (boundsDirty) measure();

      if (popStart >= 0) {
        const t = Math.min(1, (performance.now() - popStart) / 650);
        scale = 0.86 + 0.14 * easeOutBack(t);
        root.scale.setScalar(scale);
        if (t >= 1) popStart = -1;
        dirty = true;
      }

      // Framing: the target glides to the centre of the box, the distance follows its size (user zoom kept).
      if (!look.equals(fit.center)) {
        look.lerp(fit.center, 1 - Math.exp(-6 * dt));
        if (look.distanceTo(fit.center) < 0.01) look.copy(fit.center);
        const offset = camera.position.clone().sub(controls.target);
        controls.target.copy(look);
        camera.position.copy(look).add(offset);
        dirty = true;
      }
      if (fit.shownRadius !== fit.radius && !tween) {
        const next = approach(fit.shownRadius, fit.radius, 6, dt);
        const offset = camera.position.clone().sub(controls.target);
        camera.position.copy(controls.target).add(offset.multiplyScalar(next / fit.shownRadius));
        fit.shownRadius = next;
        dirty = true;
      }
      const base = framingDistance(fit.radius);
      controls.minDistance = base * 0.32;
      controls.maxDistance = base * 3;

      if (tween) {
        tween.t = Math.min(1, tween.t + dt / tween.duration);
        const e = easeInOutCubic(tween.t);
        const turn = new THREE.Quaternion().setFromUnitVectors(tween.from, tween.to);
        const dir = tween.from.clone().applyQuaternion(new THREE.Quaternion().slerp(turn, e));
        const distance = tween.fromDistance + (tween.toDistance - tween.fromDistance) * e;
        camera.position.copy(controls.target).addScaledVector(dir, distance);
        fit.shownRadius = fit.radius;
        if (tween.t >= 1) tween = null;
        dirty = true;
      }

      if (controls.update()) dirty = true;

      if (hoverPoint && !dragging && structureRef.current !== "pillow") {
        const name = pick(hoverPoint);
        model.highlight(name);
        el.style.cursor = name ? "pointer" : "";
        hoverPoint = null;
      }

      if (dirty) {
        renderer.render(scene, camera);
        placeLabels();
        dirty = false;
      }
    };

    const api: StageApi = {
      setModel(next, pop, dims) {
        if (model) {
          root.remove(model.group);
          model.dispose();
        }
        const first = !model;
        model = next;
        root.add(next.group);
        next.update(progress, openness);
        builtDims = dims;
        // Which way the model lies: the horizontal extent closest to the length carries it.
        const extent = new THREE.Box3().setFromObject(next.group).getSize(new THREE.Vector3());
        lengthOnX = Math.abs(extent.x - dims.length) + Math.abs(extent.z - dims.width) <= Math.abs(extent.x - dims.width) + Math.abs(extent.z - dims.length);
        applyPreview();
        measure();
        if (first) {
          // Entrance: the box turns in from the side while the camera settles on the 3/4 view.
          const start = VIEWS.angle.dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -0.75);
          start.y += 0.25;
          placeCamera(start.normalize(), 1.25);
          startTween(VIEWS.angle.dir, 1, 1.3);
        }
        if (pop && !reducedMotion) popStart = performance.now();
        dirty = true;
      },
      setTargets(p, o) {
        target = { progress: p, open: o };
        if (!model) {
          progress = p;
          openness = o;
        }
      },
      setBackdrop(look) {
        const backdrop = look ?? BACKDROPS.studio;
        key.color.set(backdrop.key);
        rim.color.set(backdrop.rim);
        rim.intensity = backdrop.rimIntensity;
        hemi.intensity = backdrop.dark ? 0.25 : 0.35;
        groundMaterial.opacity = backdrop.shadow * 0.4;
        blobMaterial.opacity = backdrop.shadow;
        dirty = true;
      },
      setAutoRotate(on) {
        controls.autoRotate = on && !reducedMotion;
        dirty = true;
      },
      setRotation(x, y) {
        if (x !== undefined) root.rotation.x = x;
        if (y !== undefined) root.rotation.y = y;
        boundsDirty = true;
        dirty = true;
      },
      goTo(name) {
        startTween(VIEWS[name].dir, VIEWS[name].distance, 0.8);
      },
      invalidate() {
        dirty = true;
      },
      setPreview(dims) {
        previewDims = dims;
        applyPreview();
      },
      setFaceLabels(on) {
        faceLabelsOn = on;
        dirty = true;
      },
      setGuides(on, active) {
        guidesOn = on;
        activeAxis = active;
        guideGroup.visible = on;
        boundsDirty = true;
        dirty = true;
      },
    };
    stageRef.current = api;
    if (captureRef)
      captureRef.current = () => {
        renderer.render(scene, camera);
        return renderer.domElement;
      };
    loop();

    return () => {
      cancelAnimationFrame(frame);
      stageRef.current = null;
      if (captureRef) captureRef.current = null;
      resizeObserver.disconnect();
      visibility.disconnect();
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerleave", onPointerLeave);
      controls.dispose();
      model?.dispose();
      unitCylinder.dispose();
      guideParts.forEach((part) => part.material.dispose());
      groundGeometry.dispose();
      groundMaterial.dispose();
      blobMaterial.dispose();
      blobTexture.dispose();
      envMap.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (container.contains(el)) container.removeChild(el);
    };
  }, []);

  // Fold targets first: the first box is built already in the state the page asks for.
  useEffect(() => {
    stageRef.current?.setTargets(foldProgress, open ? 1 : 0);
  }, [foldProgress, open]);

  // 2. The box itself, rebuilt when its shape or artwork changes; a new structure pops in.
  const lastStructure = useRef<string | null>(null);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const fibers = paperFibers();
    const model = buildBoxModel({
      structure: boxType,
      dimensions,
      formulaVersion,
      elements: elements ?? [],
      theme,
      pattern: backgroundPatternSvg,
      // Marketing pages pass no design: the box wears the WrapFit decoration instead.
      decoration: elements === undefined ? customLogoText : null,
      surface: {
        bumpMap: fibers.bump,
        roughnessMap: fibers.roughness,
        bumpScale: theme === "gold_foil" ? 0.02 : theme === "kraft" ? 0.068 : 0.048,
      },
      onChange: () => stageRef.current?.invalidate(),
    });
    stage.setModel(model, lastStructure.current !== null && lastStructure.current !== boxType, dimensions);
    lastStructure.current = boxType;
  }, [dimensions, boxType, formulaVersion, theme, customLogoText, elements, backgroundPatternSvg]);

  useEffect(() => {
    stageRef.current?.setBackdrop(backdrop);
  }, [backdrop]);
  // Live size while a slider moves; cleared (null) when it equals the built one.
  const live = liveDimensions && (liveDimensions.length !== dimensions.length || liveDimensions.width !== dimensions.width || liveDimensions.height !== dimensions.height) ? liveDimensions : null;
  useEffect(() => {
    stageRef.current?.setPreview(live);
    // The object changes every render; its three numbers are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live?.length, live?.width, live?.height]);
  useEffect(() => {
    stageRef.current?.setGuides(Boolean(guides), guides?.active ?? null);
  }, [guides === null, guides?.active]);
  // Faces of the box, named as in the dieline (Mặt trước, Nắp trên…); not shown on a flat or half-folded sheet by default.
  const faces = useMemo(
    () =>
      faceLabels
        ? foldablePieces(boxType, dimensions, formulaVersion).flatMap((piece) => piece.geometry.panels.map((panel) => ({ id: panel.id, name: shortFaceName(panel.name) })))
        : [],
    [faceLabels, boxType, dimensions, formulaVersion]
  );
  const faceLabelsShown = faceLabels && (faceLabelMode === "auto" ? foldProgress >= FACE_LABELS_FROM : faceLabelMode === "on");
  useEffect(() => {
    stageRef.current?.setFaceLabels(faceLabelsShown);
  }, [faceLabelsShown, faces]);
  useEffect(() => {
    stageRef.current?.setAutoRotate(spinning);
  }, [spinning]);
  useEffect(() => {
    stageRef.current?.setRotation(rotationX, rotationY);
  }, [rotationX, rotationY]);

  const goTo = (next: ViewName) => {
    setView(next);
    stageRef.current?.goTo(next);
  };

  // Views asked by the page; the first one waits for the entrance of the box (it ends on the 3/4 view).
  const firstView = useRef(true);
  useEffect(() => {
    if (!cameraView) return;
    if (firstView.current) {
      firstView.current = false;
      if (cameraView === "angle") return;
      const timer = setTimeout(() => goTo(cameraView), 1400);
      return () => clearTimeout(timer);
    }
    goTo(cameraView);
    // goTo only reads refs and setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraView]);

  const dark = backdrop?.dark ?? false;
  const pill = dark
    ? "bg-white/10 text-white ring-1 ring-white/15 backdrop-blur-md"
    : "bg-white/80 text-landing-ink ring-1 ring-black/5 backdrop-blur-md";
  const dockButton = (active: boolean) =>
    `inline-flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition-colors ${
      active
        ? "bg-fpt-orange text-white shadow-xs"
        : dark
          ? "text-white/80 hover:bg-white/10 hover:text-white"
          : "text-landing-muted hover:bg-landing-ink/5 hover:text-landing-ink"
    }`;

  const bar = chrome === "bar";
  const barButton = stageBarButton;
  const button = bar ? barButton : dockButton;

  const dockButtons = (
    <>
      {DOCK.map((item) => (
        <button
          key={item.view}
          type="button"
          onClick={() => goTo(item.view)}
          aria-pressed={view === item.view}
          className={button(view === item.view)}
          title={`Góc nhìn ${item.label.toLowerCase()}`}
        >
          {item.view === "angle" && <Box className="size-3.5" aria-hidden />}
          <span>{item.label}</span>
        </button>
      ))}
      <span className={`mx-0.5 h-4 w-px ${bar ? "bg-line" : dark ? "bg-white/20" : "bg-landing-line"}`} aria-hidden />
      {faceLabels && (
        <button
          type="button"
          onClick={() => setFaceLabelMode(faceLabelsShown ? "off" : "on")}
          aria-pressed={faceLabelsShown}
          className={button(faceLabelsShown)}
          title={faceLabelsShown ? "Ẩn tên các mặt hộp" : "Hiện tên các mặt hộp"}
        >
          <Tag className="size-3.5" aria-hidden />
          <span className="hidden md:inline">Nhãn mặt</span>
          <span className="sr-only md:hidden">Nhãn mặt</span>
        </button>
      )}
      <button
        type="button"
        onClick={() => setSpinning((value) => !value)}
        aria-pressed={spinning}
        className={button(spinning)}
        title={spinning ? "Dừng xoay" : "Xoay tròn"}
        aria-label={spinning ? "Dừng xoay" : "Xoay tròn"}
      >
        {spinning ? <Pause className="size-3.5" aria-hidden /> : <Play className="size-3.5" aria-hidden />}
      </button>
      {enableMacroZoom && (
        <button
          type="button"
          onClick={() => goTo(view === "macro" ? "angle" : "macro")}
          aria-pressed={view === "macro"}
          className={button(view === "macro")}
          title="Soi cận cảnh thớ giấy"
        >
          {view === "macro" ? <ZoomOut className="size-3.5" aria-hidden /> : <ZoomIn className="size-3.5" aria-hidden />}
          <span className="hidden md:inline">{view === "macro" ? "Thu nhỏ" : "Cận cảnh"}</span>
        </button>
      )}
    </>
  );

  const stage = (
    <>
      <div ref={containerRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

      {faces.length > 0 && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          {faces.map((face) => (
            <div
              key={face.id}
              ref={(node) => {
                faceLabelRefs.current[face.id] = node;
              }}
              className="absolute left-0 top-0 whitespace-nowrap rounded-full bg-fg/85 px-2 py-0.5 text-caption font-semibold text-fg-inverse shadow-soft-4 transition-opacity duration-150"
              style={{ opacity: 0 }}
            >
              {face.name}
            </div>
          ))}
        </div>
      )}

      {guides && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          {DIMENSION_AXES.map((axis) => {
            const active = guides.active === axis;
            return (
              <div
                key={axis}
                ref={(node) => {
                  labelRefs.current[axis] = node;
                }}
                className="absolute left-0 top-0 inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-caption font-semibold tabular-nums transition-[opacity,background-color,color] duration-150"
                style={{
                  opacity: 0,
                  backgroundColor: active ? AXIS_COLORS[axis] : "rgba(255,255,255,0.92)",
                  color: active ? "#FFFFFF" : AXIS_COLORS[axis],
                  boxShadow: `inset 0 0 0 1px ${AXIS_COLORS[axis]}`,
                }}
              >
                <span className="font-bold">{AXIS_LETTER[axis]}</span>
                {guides.labels[axis]}
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  if (bar) {
    return (
      <div
        className={`flex h-full w-full flex-col overflow-hidden ${minHeight ? "min-h-[460px]" : ""} ${frameless ? "" : "rounded-sheet ring-1 ring-line"} ${className}`}
      >
        <div className="relative min-h-0 flex-1" style={backdrop ? { background: backdrop.css } : undefined}>
          {stage}
        </div>
        <div className="flex min-h-12 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-line bg-surface-raised px-3 py-1.5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-fg-muted">{barStart}</div>
          <div role="toolbar" aria-label="Góc nhìn hộp 3D" className="flex flex-wrap items-center gap-0.5">
            {barEnd}
            {showHud && boxType !== "pillow" && (
              <button type="button" onClick={() => setOpen((value) => !value)} aria-pressed={open} className={barButton(open)}>
                <Gift className="size-3.5" aria-hidden />
                {OPEN_LABEL[boxType][open ? 1 : 0]}
              </button>
            )}
            {showDock && dockButtons}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative h-full w-full overflow-hidden ${minHeight ? "min-h-[460px]" : ""} ${
        frameless ? "" : "rounded-sheet ring-1 ring-landing-line"
      } ${className}`}
      style={backdrop ? { background: backdrop.css } : undefined}
    >
      {stage}

      {showHud && (
        <div className="pointer-events-none absolute left-4 top-4">
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${pill}`}>
            <span className="size-1.5 rounded-full bg-fpt-orange" aria-hidden />
            {STRUCTURE_LABEL[boxType]}
          </span>
        </div>
      )}

      {showHud && boxType !== "pillow" && (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-pressed={open}
          className={`absolute right-4 top-4 inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-colors ${
            open ? "bg-fpt-orange text-white shadow-xs" : pill
          }`}
        >
          <Gift className="size-3.5" aria-hidden />
          {OPEN_LABEL[boxType][open ? 1 : 0]}
        </button>
      )}

      {showStatusBar && (
        <div className={`pointer-events-none absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-caption ${pill}`}>
          <span className="font-mono font-semibold text-fpt-orange-ink">{Math.round(foldProgress * 100)}%</span>
          <span className="opacity-40">·</span>
          <span className="font-mono">
            {dimensions.length} × {dimensions.width} × {dimensions.height} mm
          </span>
          <span className="opacity-40">·</span>
          <span className="font-semibold">{PAPER_LABEL[theme]}</span>
        </div>
      )}

      {showDock && (
        <div role="toolbar" aria-label="Góc nhìn hộp 3D" className={`absolute bottom-4 right-4 flex items-center gap-0.5 rounded-full p-1 ${pill}`}>
          {dockButtons}
        </div>
      )}
    </div>
  );
};
