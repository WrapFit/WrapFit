"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { BoxDimensions, CanvasElement } from "@wrapfit/shared";

import { Sparkles, Eye, ZoomIn, ZoomOut } from "lucide-react";
import { buildBoxModel, type BoxMaterialTheme, type BoxModel } from "./boxModel";

export type { BoxMaterialTheme } from "./boxModel";
export type BoxStructureType = "tuck-top" | "sleeve-drawer" | "lid-base" | "pillow";

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
  /** Colour behind the box; "transparent" shows the page behind the canvas. */
  environment?: "studio" | "marble" | "kraft_wood" | "forest_velvet" | "festive_glow" | "transparent";
  interactiveOpenState?: boolean;
  rotationY?: number; // External yaw rotation (radians) driven by GSAP ScrollTrigger
  rotationX?: number; // External pitch tilt (radians) driven by GSAP ScrollTrigger
  enableMacroZoom?: boolean;
  /** Status bar at the bottom (fold %, size, paper): studio information, hidden on public pages. */
  showStatusBar?: boolean;
  /** 460 px minimum height; false lets the parent decide (e.g. a square stage on a phone). */
  minHeight?: boolean;
  /** No frame of its own (border, corners, shadow, paper background): the box sits on the parent's surface. */
  frameless?: boolean;
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
  minHeight = true,
  frameless = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const [macroZoom, setMacroZoom] = useState<boolean>(false);

  // Group refs for hierarchical transforms
  const groupsRef = useRef<{ rootGroup?: THREE.Group }>({});
  const modelRef = useRef<BoxModel | null>(null);
  const progressRef = useRef<number>(foldProgress);
  const openRef = useRef<boolean>(false);

  const [interactiveOpenState, setInteractiveOpenState] = useState<boolean>(false);
  const prevProgressRef = useRef<number>(foldProgress);

  useEffect(() => {
    if (propOpenState !== undefined) {
      setInteractiveOpenState(propOpenState);
    }
  }, [propOpenState]);

  // Audio triggering on progress milestones
  useEffect(() => {
    const prev = prevProgressRef.current;
    const curr = foldProgress;
    const milestones = [0.25, 0.5, 0.75, 1.0];

    for (const m of milestones) {
      if ((prev < m && curr >= m) || (prev > m && curr <= m)) {
        
        break;
      }
    }
    prevProgressRef.current = curr;
  }, [foldProgress]);

  // High-fidelity procedural 1024x1024 cotton ivory paper fiber bump texture for 4K desktop close-up
  const createPaperFiberBumpTexture = useCallback(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Base neutral mid-gray (128, 128, 128) representing flat elevation
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, 1024, 1024);

    // Layer 1: High-frequency stochastic micro-porosity (paper bulk tooth)
    const imgData = ctx.getImageData(0, 0, 1024, 1024);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 36;
      const val = Math.min(255, Math.max(0, 128 + noise));
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    }
    ctx.putImageData(imgData, 0, 0);

    // Layer 2: Natural Unbleached Cellulose Pulp & Cotton Fibers
    ctx.save();
    ctx.lineCap = "round";

    // 2a. Fine micro-fibers (cotton pulp strands)
    for (let f = 0; f < 3600; f++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const len = 6 + Math.random() * 24;
      const angle = Math.random() * Math.PI * 2;
      const curve = (Math.random() - 0.5) * 16;
      const isHighlight = Math.random() > 0.45;

      ctx.strokeStyle = isHighlight ? "rgba(225, 225, 225, 0.45)" : "rgba(40, 40, 40, 0.4)";
      ctx.lineWidth = 0.8 + Math.random() * 1.5;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(
        x + Math.cos(angle) * (len * 0.5) + curve,
        y + Math.sin(angle) * (len * 0.5) + curve,
        x + Math.cos(angle) * len,
        y + Math.sin(angle) * len
      );
      ctx.stroke();
    }

    // 2b. Long interlocking structural fibers (linen & kraft hemp strands)
    for (let lf = 0; lf < 550; lf++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const len = 25 + Math.random() * 60;
      const angle = Math.random() * Math.PI * 2;
      const isHighlight = Math.random() > 0.5;

      ctx.strokeStyle = isHighlight ? "rgba(240, 240, 240, 0.38)" : "rgba(30, 30, 30, 0.35)";
      ctx.lineWidth = 1.2 + Math.random() * 2.0;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(
        x + Math.cos(angle) * (len * 0.33) + (Math.random() - 0.5) * 14,
        y + Math.sin(angle) * (len * 0.33) + (Math.random() - 0.5) * 14,
        x + Math.cos(angle) * (len * 0.66) + (Math.random() - 0.5) * 14,
        y + Math.sin(angle) * (len * 0.66) + (Math.random() - 0.5) * 14,
        x + Math.cos(angle) * len,
        y + Math.sin(angle) * len
      );
      ctx.stroke();
    }
    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4); // Seamless micro-detail for 4K desktop screens
    texture.generateMipmaps = true;
    return texture;
  }, []);

  // Micro-variation in surface specular reflection
  const createPaperFiberRoughnessTexture = useCallback(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#E4E4E4";
    ctx.fillRect(0, 0, 512, 512);

    const imgData = ctx.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 32;
      const val = Math.min(255, Math.max(0, 228 + noise));
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    }
    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    texture.generateMipmaps = true;
    return texture;
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const envBg =
      environment === "marble"
        ? "#F1F5F9"
        : environment === "kraft_wood"
        ? "#FEF3C7"
        : environment === "forest_velvet"
        ? "#064E3B"
        : environment === "festive_glow"
        ? "#FFF7ED"
        : "#FDFBF7";
    scene.background = environment === "transparent" ? null : new THREE.Color(envBg);

    const { length: L, width: W, height: H } = dimensions;
    const maxDim = Math.max(L, W, H);

    const camera = new THREE.PerspectiveCamera(40, width / height, 1, 3000);
    camera.position.set(maxDim * 1.8, maxDim * 1.8, maxDim * 2.2);
    camera.lookAt(0, H / 2, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 2. Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.target.set(0, H / 2, 0);
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.minDistance = maxDim * 0.35;
    controls.maxDistance = maxDim * 5;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 1.2;
    controlsRef.current = controls;

    // 3. Studio Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xe8d8c8, 0.7);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff8ee, 1.25);
    keyLight.position.set(maxDim * 2, maxDim * 3.5, maxDim * 2.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 10;
    keyLight.shadow.camera.far = maxDim * 8;
    const d = maxDim * 1.8;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xdce6f2, 0.45);
    fillLight.position.set(-maxDim * 2, maxDim * 1.5, -maxDim * 2);
    scene.add(fillLight);

    // Ground Shadow Plane
    const groundGeo = new THREE.PlaneGeometry(maxDim * 8, maxDim * 8);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.12 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    scene.add(ground);

    // 4. Paper fibres (bump + roughness) on the printed side
    const fiberBumpTexture = createPaperFiberBumpTexture();
    const fiberRoughnessTexture = createPaperFiberRoughnessTexture();

    // 5. The box, folded from its dieline: same panels, hinges and size as the print file (boxModel.ts)
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);
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
        bumpMap: fiberBumpTexture,
        roughnessMap: fiberRoughnessTexture,
        bumpScale: theme === "gold_foil" ? 0.02 : theme === "kraft" ? 0.068 : 0.048,
      },
    });
    rootGroup.add(model.group);
    model.update(progressRef.current, openRef.current);
    modelRef.current = model;
    groupsRef.current = { rootGroup };

    // 6. Raycasting on Flaps
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(rootGroup.children, true);

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        const name = hitMesh.name;
        
        setInteractiveOpenState((prev) => !prev);
        if (onFlapClick) onFlapClick(name);
      }
    };

    renderer.domElement.addEventListener("click", handlePointerDown);

    // 7. Resize handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // 8. Animation loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("click", handlePointerDown);
      controls.dispose();
      renderer.dispose();
      model.dispose();
      modelRef.current = null;
      fiberBumpTexture?.dispose();
      fiberRoughnessTexture?.dispose();
      groundGeo.dispose();
      groundMat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [dimensions, boxType, formulaVersion, theme, customLogoText, elements, backgroundPatternSvg, autoRotate, createPaperFiberBumpTexture, createPaperFiberRoughnessTexture, onFlapClick]);

  // Rotation updates driven externally (e.g. GSAP ScrollTrigger)
  useEffect(() => {
    if (groupsRef.current.rootGroup && rotationY !== undefined) {
      groupsRef.current.rootGroup.rotation.y = rotationY;
    }
  }, [rotationY]);

  useEffect(() => {
    if (groupsRef.current.rootGroup && rotationX !== undefined) {
      groupsRef.current.rootGroup.rotation.x = rotationX;
    }
  }, [rotationX]);

  // Macro 4K Close-up Zoom for inspecting cotton paper fiber bump texture
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    const { length: L, width: W, height: H } = dimensions;
    const maxDim = Math.max(L, W, H);
    if (macroZoom) {
      cameraRef.current.position.set(maxDim * 0.42, maxDim * 0.45, maxDim * 0.52);
      controlsRef.current.target.set(0, H * 0.35, 0);
    } else {
      cameraRef.current.position.set(maxDim * 1.8, maxDim * 1.8, maxDim * 2.2);
      controlsRef.current.target.set(0, H / 2, 0);
    }
    controlsRef.current.update();
  }, [macroZoom, dimensions]);

  // Fold state: the same model, refolded (walls, then lid; lid lift, drawer slide)
  useEffect(() => {
    progressRef.current = foldProgress;
    openRef.current = interactiveOpenState;
    modelRef.current?.update(foldProgress, interactiveOpenState);
  }, [foldProgress, interactiveOpenState]);

  return (
    <div
      className={`relative w-full h-full ${minHeight ? "min-h-[460px]" : ""} overflow-hidden ${frameless ? "" : "rounded-squircle-lg bg-paper-ivory border border-stone-200 shadow-tactile"} ${className}`}
    >
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating 3D Interaction HUD */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-stone-200 text-xs font-semibold text-brand-forest shadow-tactile">
          <Eye className="w-3.5 h-3.5 text-vibrant-cobalt" />
          <span>
            {boxType === "sleeve-drawer"
              ? "Hộp Bao Diêm (Khay Rút)"
              : boxType === "lid-base"
              ? "Hộp Âm Dương (Nắp Rời)"
              : boxType === "pillow"
              ? "Hộp Gối Cánh Cung"
              : "Hộp Nắp Gài Đáy Khóa"}
          </span>
        </div>
      </div>

      <div className="absolute top-4 right-4 flex items-center gap-2">
        {enableMacroZoom && (
          <button
            type="button"
            onClick={() => setMacroZoom((prev) => !prev)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition border shadow-tactile flex items-center gap-1.5 ${
              macroZoom
                ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                : "bg-white/95 text-stone-700 hover:bg-white border-stone-200"
            }`}
            title="Soi cận cảnh thớ sợi giấy cotton kẹp bông 4K"
          >
            {macroZoom ? <ZoomOut className="w-3.5 h-3.5" /> : <ZoomIn className="w-3.5 h-3.5" />}
            <span>{macroZoom ? "Góc Xa Studio" : "Soi Thớ Sợi 4K"}</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            
            setInteractiveOpenState((prev) => !prev);
          }}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition border shadow-tactile flex items-center gap-1.5 ${
            interactiveOpenState
              ? "bg-vibrant-cobalt text-white border-vibrant-cobalt shadow-cobalt-glow"
              : "bg-white/95 text-stone-700 hover:bg-white border-stone-200"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>
            {boxType === "sleeve-drawer"
              ? interactiveOpenState
                ? "Đóng Khay Trượt"
                : "Rút Khay Ra"
              : boxType === "lid-base"
              ? interactiveOpenState
                ? "Đậy Nắp Hộp"
                : "Nhấc Nắp Lên"
              : interactiveOpenState
              ? "Đóng Nắp Hộp"
              : "Mở Nắp Hộp"}
          </span>
        </button>
      </div>

      {/* Bottom Status Info */}
      {showStatusBar && (
      <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 bg-white/95 backdrop-blur-md px-4 py-2 rounded-squircle border border-stone-200 text-xs text-stone-600 shadow-tactile">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-brand-forest">
            Trạng thái:{" "}
            <span className="font-mono text-vibrant-cobalt font-bold">
              {Math.round(foldProgress * 100)}%
            </span>
          </span>
          <span className="text-stone-300">|</span>
          <span className="font-mono text-stone-700">
            {dimensions.length} × {dimensions.width} × {dimensions.height} mm
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-stone-500">
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200/70 font-mono text-[10px] font-semibold">
            Bump Map 4K
          </span>
          <span>Chất liệu:</span>
          <span className="font-semibold capitalize text-stone-800">
            {theme === "kraft"
              ? "Kraft Mộc"
              : theme === "forest"
              ? "Xanh Rừng Sâu"
              : theme === "gold_foil"
              ? "Ép Kim Vàng"
              : "Ivory Cao Cấp"}
          </span>
        </div>
      </div>
      )}
    </div>
  );
};
