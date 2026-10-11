"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { BoxDimensions, CanvasElement } from "@wrapfit/shared";

import { Sparkles, Eye, RotateCw, ZoomIn, ZoomOut } from "lucide-react";

export type BoxMaterialTheme = "kraft" | "ivory" | "forest" | "gold_foil";
export type BoxStructureType = "tuck-top" | "sleeve-drawer" | "lid-base" | "pillow";

interface InteractiveFoldingBox3DProps {
  dimensions: BoxDimensions;
  foldProgress: number; // 0.0 -> 1.0
  boxType?: BoxStructureType;
  theme?: BoxMaterialTheme;
  customLogoText?: string;
  elements?: CanvasElement[];
  backgroundPatternSvg?: string | null;
  onFlapClick?: (flapName: string) => void;
  className?: string;
  autoRotate?: boolean;
  environment?: "studio" | "marble" | "kraft_wood" | "forest_velvet" | "festive_glow";
  interactiveOpenState?: boolean;
  rotationY?: number; // External yaw rotation (radians) driven by GSAP ScrollTrigger
  rotationX?: number; // External pitch tilt (radians) driven by GSAP ScrollTrigger
  enableMacroZoom?: boolean;
  /** Status bar at the bottom (fold %, size, paper): studio information, hidden on public pages. */
  showStatusBar?: boolean;
  /** 460 px minimum height; false lets the parent decide (e.g. a square stage on a phone). */
  minHeight?: boolean;
}

export const InteractiveFoldingBox3D: React.FC<InteractiveFoldingBox3DProps> = ({
  dimensions,
  foldProgress,
  boxType = "tuck-top",
  theme = "ivory",
  customLogoText = "WrapFit Signature",
  elements = [],
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
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const [macroZoom, setMacroZoom] = useState<boolean>(false);

  // Group refs for hierarchical transforms
  const groupsRef = useRef<{
    rootGroup?: THREE.Group;
    frontHinge?: THREE.Group;
    backHinge?: THREE.Group;
    leftHinge?: THREE.Group;
    rightHinge?: THREE.Group;
    lidHinge?: THREE.Group;
    tuckHinge?: THREE.Group;
    leftDustHinge?: THREE.Group;
    rightDustHinge?: THREE.Group;
    drawerGroup?: THREE.Group;
    lidGroup?: THREE.Group;
    pillowGroup?: THREE.Group;
  }>({});

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

  // Generate dynamic canvas texture with paper texture, AI patterns & user elements
  const createMaterialTexture = useCallback(
    (
      themeType: BoxMaterialTheme,
      text: string,
      userElements: CanvasElement[],
      patternSvg: string | null = null
    ) => {
      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      // 1. Base surface color & paper grain
      if (themeType === "kraft") {
        ctx.fillStyle = "#D9B897";
        ctx.fillRect(0, 0, 1024, 1024);
        ctx.fillStyle = "rgba(110, 70, 30, 0.08)";
        for (let i = 0; i < 6000; i++) {
          ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 2 + Math.random() * 5, 1);
        }
      } else if (themeType === "forest") {
        ctx.fillStyle = "#162E24";
        ctx.fillRect(0, 0, 1024, 1024);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
        ctx.lineWidth = 1;
        for (let i = 0; i < 1024; i += 8) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, 1024);
          ctx.stroke();
        }
      } else if (themeType === "gold_foil") {
        const grad = ctx.createLinearGradient(0, 0, 1024, 1024);
        grad.addColorStop(0, "#F7E29C");
        grad.addColorStop(0.5, "#D4AF37");
        grad.addColorStop(1, "#AA771C");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1024, 1024);
      } else {
        // Cotton Ivory
        ctx.fillStyle = "#FAF6EE";
        ctx.fillRect(0, 0, 1024, 1024);
        ctx.fillStyle = "rgba(180, 160, 140, 0.05)";
        for (let i = 0; i < 4000; i++) {
          ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 2);
        }
      }

      // 2. Procedural Seamless AI Pattern Wrapping
      if (patternSvg) {
        ctx.save();
        const pLow = patternSvg.toLowerCase();
        if (pLow.includes("tet") || pLow.includes("mai") || pLow.includes("xuan")) {
          // Tet 2026 Golden Plum Blossoms (Hoa Mai)
          for (let py = 40; py <= 1024; py += 128) {
            for (let px = 40; px <= 1024; px += 128) {
              ctx.fillStyle = "rgba(212, 175, 55, 0.35)";
              for (let p = 0; p < 5; p++) {
                const angle = (p * 2 * Math.PI) / 5;
                const petX = px + Math.cos(angle) * 16;
                const petY = py + Math.sin(angle) * 16;
                ctx.beginPath();
                ctx.arc(petX, petY, 10, 0, Math.PI * 2);
                ctx.fill();
              }
              ctx.fillStyle = "#E53E3E";
              ctx.beginPath();
              ctx.arc(px, py, 5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        } else if (pLow.includes("xmas") || pLow.includes("noel") || pLow.includes("tuyet")) {
          // Christmas Pine & Golden Snowflake Stars
          ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
          ctx.lineWidth = 2;
          for (let py = 50; py <= 1024; py += 110) {
            for (let px = 50; px <= 1024; px += 110) {
              ctx.beginPath();
              ctx.moveTo(px - 12, py); ctx.lineTo(px + 12, py);
              ctx.moveTo(px, py - 12); ctx.lineTo(px, py + 12);
              ctx.moveTo(px - 8, py - 8); ctx.lineTo(px + 8, py + 8);
              ctx.moveTo(px - 8, py + 8); ctx.lineTo(px + 8, py - 8);
              ctx.stroke();
            }
          }
        } else if (pLow.includes("botanical") || pLow.includes("la") || pLow.includes("leaf")) {
          // Minimalist Botanical Eucalyptus Leaves
          ctx.fillStyle = "rgba(82, 121, 111, 0.28)";
          for (let py = 60; py <= 1024; py += 120) {
            for (let px = 60; px <= 1024; px += 120) {
              ctx.beginPath();
              ctx.ellipse(px, py, 16, 7, Math.PI / 4, 0, Math.PI * 2);
              ctx.fill();
              ctx.beginPath();
              ctx.ellipse(px + 14, py - 8, 14, 6, -Math.PI / 6, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        } else {
          // Luxury Gold Deco Interlocking Grid
          ctx.strokeStyle = "rgba(212, 175, 55, 0.25)";
          ctx.lineWidth = 1.5;
          for (let py = 0; py <= 1024; py += 64) {
            ctx.beginPath();
            ctx.moveTo(0, py); ctx.lineTo(1024, py);
            ctx.stroke();
          }
          for (let px = 0; px <= 1024; px += 64) {
            ctx.beginPath();
            ctx.moveTo(px, 0); ctx.lineTo(px, 1024);
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      // 3. Draw user elements onto texture
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Centered decorative foil frame
      const strokeColor =
        themeType === "forest"
          ? "#D4AF37"
          : themeType === "gold_foil"
          ? "#4A2F08"
          : "#1A362B";
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(320, 360, 384, 304);
      ctx.strokeRect(326, 366, 372, 292);

      // Gold Foil Logo text
      ctx.fillStyle =
        themeType === "forest"
          ? "#E8C86A"
          : themeType === "gold_foil"
          ? "#382205"
          : "#1A362B";
      ctx.font = "italic 600 36px 'Playfair Display', serif";
      ctx.fillText("WrapFit", 512, 475);

      ctx.font = "500 16px 'Plus Jakarta Sans', sans-serif";
      ctx.letterSpacing = "4px";
      ctx.fillText(text.toUpperCase(), 512, 525);

      // Render custom text/logo items from 2D canvas
      if (userElements.length > 0) {
        ctx.font = "500 20px 'Playfair Display', serif";
        ctx.fillStyle = themeType === "forest" ? "#F5E7B2" : "#2B1E16";
        userElements.forEach((el, idx) => {
          if (el.content && el.content !== text) {
            ctx.fillText(el.content, 512, 570 + idx * 25);
          }
        });
      }

      // Technical spec watermark
      ctx.font = "12px 'JetBrains Mono', monospace";
      ctx.fillStyle =
        themeType === "forest"
          ? "rgba(232, 200, 106, 0.6)"
          : "rgba(31, 36, 33, 0.4)";
      ctx.fillText(
        `${dimensions.length} x ${dimensions.width} x ${dimensions.height} mm — 300 GSM`,
        512,
        630
      );
      ctx.restore();

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.generateMipmaps = true;
      return texture;
    },
    [dimensions]
  );

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
    scene.background = new THREE.Color(envBg);

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

    // 4. Materials & Fiber Shaders (img2threejs tactile bump mapping)
    const artworkTexture = createMaterialTexture(theme, customLogoText, elements, backgroundPatternSvg);
    const fiberBumpTexture = createPaperFiberBumpTexture();
    const fiberRoughnessTexture = createPaperFiberRoughnessTexture();

    const paperColor =
      theme === "kraft"
        ? 0xd9b897
        : theme === "forest"
        ? 0x1a362b
        : theme === "gold_foil"
        ? 0xd4af37
        : 0xfaf6ee;

    const paperMaterial = new THREE.MeshStandardMaterial({
      color: paperColor,
      roughness: theme === "gold_foil" ? 0.32 : 0.88,
      metalness: theme === "gold_foil" ? 0.72 : 0.04,
      bumpMap: fiberBumpTexture,
      bumpScale: theme === "gold_foil" ? 0.02 : (theme === "kraft" ? 0.075 : 0.052),
      roughnessMap: theme === "gold_foil" ? null : fiberRoughnessTexture,
      side: THREE.DoubleSide,
    });

    const printedMaterial = new THREE.MeshStandardMaterial({
      map: artworkTexture,
      roughness: theme === "gold_foil" ? 0.32 : 0.86,
      metalness: theme === "gold_foil" ? 0.72 : 0.04,
      bumpMap: fiberBumpTexture,
      bumpScale: theme === "gold_foil" ? 0.02 : (theme === "kraft" ? 0.068 : 0.048),
      roughnessMap: theme === "gold_foil" ? null : fiberRoughnessTexture,
      side: THREE.DoubleSide,
    });

    // 5. Structure Generators
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    const helperMesh = (w: number, h: number, mat: THREE.Material, yOff: number, name: string) => {
      const geo = new THREE.PlaneGeometry(w, h);
      const m = new THREE.Mesh(geo, mat);
      m.position.y = yOff;
      m.castShadow = true;
      m.receiveShadow = true;
      m.name = name;
      return m;
    };

    if (boxType === "sleeve-drawer") {
      // ===== 2. SLEEVE & DRAWER BOX =====
      // Outer Sleeve Shell
      const sleeveGeo = new THREE.BoxGeometry(L + 2, H + 2, W + 2);
      const sleeveMesh = new THREE.Mesh(sleeveGeo, printedMaterial);
      sleeveMesh.castShadow = true;
      sleeveMesh.receiveShadow = true;
      sleeveMesh.name = "outer_sleeve";
      rootGroup.add(sleeveMesh);

      // Inner Sliding Drawer Tray
      const drawerGroup = new THREE.Group();
      const drawerBaseGeo = new THREE.BoxGeometry(L, H * 0.95, W * 0.95);
      const drawerMesh = new THREE.Mesh(drawerBaseGeo, paperMaterial);
      drawerMesh.castShadow = true;
      drawerMesh.name = "inner_drawer";
      drawerGroup.add(drawerMesh);

      // Drawer Pull Ribbon
      const ribbonGeo = new THREE.BoxGeometry(4, 12, 16);
      const ribbonMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.3 });
      const ribbonMesh = new THREE.Mesh(ribbonGeo, ribbonMat);
      ribbonMesh.position.set(L / 2 + 3, 0, 0);
      drawerGroup.add(ribbonMesh);

      rootGroup.add(drawerGroup);
      groupsRef.current = { rootGroup, drawerGroup };
    } else if (boxType === "lid-base") {
      // ===== 3. LID & BASE BOX =====
      // Bottom Base
      const baseGeo = new THREE.BoxGeometry(L, H, W);
      const baseMesh = new THREE.Mesh(baseGeo, paperMaterial);
      baseMesh.castShadow = true;
      baseMesh.receiveShadow = true;
      baseMesh.name = "base_box";
      rootGroup.add(baseMesh);

      // Top Lid
      const lidGroup = new THREE.Group();
      const lidGeo = new THREE.BoxGeometry(L + 2, Math.max(16, H * 0.5), W + 2);
      const lidMesh = new THREE.Mesh(lidGeo, printedMaterial);
      lidMesh.castShadow = true;
      lidMesh.name = "top_lid";
      lidGroup.add(lidMesh);

      rootGroup.add(lidGroup);
      groupsRef.current = { rootGroup, lidGroup };
    } else if (boxType === "pillow") {
      // ===== 4. PILLOW BOX =====
      const pillowGroup = new THREE.Group();
      const pillowGeo = new THREE.CylinderGeometry(W * 0.5, W * 0.5, L, 32, 1, true);
      const pillowMesh = new THREE.Mesh(pillowGeo, printedMaterial);
      pillowMesh.rotation.z = Math.PI / 2;
      pillowMesh.scale.set(1, 0.45, 1); // Convex elliptical shape
      pillowMesh.castShadow = true;
      pillowMesh.name = "pillow_body";
      pillowGroup.add(pillowMesh);

      rootGroup.add(pillowGroup);
      groupsRef.current = { rootGroup, pillowGroup };
    } else {
      // ===== 1. TUCK TOP BOX (Hierarchical Folding Hinges — 100% Physical Precision) =====
      // Base Panel: anchored flat in XZ plane (Local X = Length L, Local Y = Width W, Local Z = UP)
      const baseGeo = new THREE.PlaneGeometry(L, W);
      const baseMesh = new THREE.Mesh(baseGeo, paperMaterial);
      baseMesh.rotation.x = -Math.PI / 2; // Flat on ground facing UP (+Y)
      baseMesh.position.y = 0;
      baseMesh.castShadow = true;
      baseMesh.receiveShadow = true;
      baseMesh.name = "base_panel";
      rootGroup.add(baseMesh);

      // Interior Gift Presentation Object (Revealed upon opening)
      const giftGroup = new THREE.Group();
      const bottleRadius = Math.min(L, W) * 0.2;
      const bottleH = H * 0.65;
      const bottleGeo = new THREE.CylinderGeometry(bottleRadius, bottleRadius, bottleH, 24);
      const bottleMat = new THREE.MeshStandardMaterial({
        color: 0x1A362B,
        roughness: 0.15,
        metalness: 0.2,
      });
      const bottleMesh = new THREE.Mesh(bottleGeo, bottleMat);
      bottleMesh.rotation.x = Math.PI / 2;
      bottleMesh.position.set(0, 0, bottleH / 2 + 1);
      bottleMesh.castShadow = true;
      bottleMesh.name = "gift_interior";
      giftGroup.add(bottleMesh);

      // Gold cap
      const capGeo = new THREE.CylinderGeometry(bottleRadius * 0.45, bottleRadius * 0.45, bottleH * 0.28, 24);
      const capMat = new THREE.MeshStandardMaterial({
        color: 0xD4AF37,
        roughness: 0.2,
        metalness: 0.85,
      });
      const capMesh = new THREE.Mesh(capGeo, capMat);
      capMesh.rotation.x = Math.PI / 2;
      capMesh.position.set(0, 0, bottleH + bottleH * 0.14 + 1);
      giftGroup.add(capMesh);
      baseMesh.add(giftGroup);

      // FRONT WALL: hinged at front crease (local Y = -W/2)
      const frontHinge = new THREE.Group();
      frontHinge.position.set(0, -W / 2, 0);
      const frontMesh = new THREE.Mesh(new THREE.PlaneGeometry(L, H), printedMaterial);
      frontMesh.position.set(0, -H / 2, 0); // Extends toward -Y when flat
      frontMesh.castShadow = true;
      frontMesh.receiveShadow = true;
      frontMesh.name = "front_panel";
      frontHinge.add(frontMesh);
      baseMesh.add(frontHinge);

      // BACK WALL: hinged at back crease (local Y = +W/2)
      const backHinge = new THREE.Group();
      backHinge.position.set(0, W / 2, 0);
      const backMesh = new THREE.Mesh(new THREE.PlaneGeometry(L, H), printedMaterial);
      backMesh.position.set(0, H / 2, 0); // Extends toward +Y when flat
      backMesh.castShadow = true;
      backMesh.receiveShadow = true;
      backMesh.name = "back_panel";
      backHinge.add(backMesh);
      baseMesh.add(backHinge);

      // TOP LID: hinged at top crease of back wall (local Y = H inside backHinge)
      const lidHinge = new THREE.Group();
      lidHinge.position.set(0, H, 0);
      const lidMesh = new THREE.Mesh(new THREE.PlaneGeometry(L, W), printedMaterial);
      lidMesh.position.set(0, W / 2, 0); // Extends toward +Y when flat
      lidMesh.castShadow = true;
      lidMesh.receiveShadow = true;
      lidMesh.name = "top_lid";
      lidHinge.add(lidMesh);
      backHinge.add(lidHinge);

      // TUCK FLAP: hinged at front crease of top lid (local Y = W inside lidHinge)
      const tuckHinge = new THREE.Group();
      const tuckH = Math.min(22, Math.max(12, H * 0.35));
      tuckHinge.position.set(0, W, 0);
      const tuckMesh = new THREE.Mesh(new THREE.PlaneGeometry(L * 0.96, tuckH), paperMaterial);
      tuckMesh.position.set(0, tuckH / 2, 0);
      tuckMesh.castShadow = true;
      tuckMesh.name = "tuck_flap";
      tuckHinge.add(tuckMesh);
      lidHinge.add(tuckHinge);

      // LEFT WALL: hinged at left crease (local X = -L/2)
      const leftHinge = new THREE.Group();
      leftHinge.position.set(-L / 2, 0, 0);
      const leftMesh = new THREE.Mesh(new THREE.PlaneGeometry(H, W), printedMaterial);
      leftMesh.position.set(-H / 2, 0, 0); // Extends toward -X when flat
      leftMesh.castShadow = true;
      leftMesh.receiveShadow = true;
      leftMesh.name = "left_panel";
      leftHinge.add(leftMesh);
      baseMesh.add(leftHinge);

      // RIGHT WALL: hinged at right crease (local X = +L/2)
      const rightHinge = new THREE.Group();
      rightHinge.position.set(L / 2, 0, 0);
      const rightMesh = new THREE.Mesh(new THREE.PlaneGeometry(H, W), printedMaterial);
      rightMesh.position.set(H / 2, 0, 0); // Extends toward +X when flat
      rightMesh.castShadow = true;
      rightMesh.receiveShadow = true;
      rightMesh.name = "right_panel";
      rightHinge.add(rightMesh);
      baseMesh.add(rightHinge);

      // LEFT DUST FLAP: hinged on top edge of Left wall
      const dustW = Math.min(W * 0.7, 32);
      const leftDustHinge = new THREE.Group();
      leftDustHinge.position.set(-H, 0, 0);
      const ldMesh = new THREE.Mesh(new THREE.PlaneGeometry(dustW, W * 0.85), paperMaterial);
      ldMesh.position.set(-dustW / 2, 0, 0);
      ldMesh.name = "left_dust_flap";
      leftDustHinge.add(ldMesh);
      leftHinge.add(leftDustHinge);

      // RIGHT DUST FLAP: hinged on top edge of Right wall
      const rightDustHinge = new THREE.Group();
      rightDustHinge.position.set(H, 0, 0);
      const rdMesh = new THREE.Mesh(new THREE.PlaneGeometry(dustW, W * 0.85), paperMaterial);
      rdMesh.position.set(dustW / 2, 0, 0);
      rdMesh.name = "right_dust_flap";
      rightDustHinge.add(rdMesh);
      rightHinge.add(rightDustHinge);

      groupsRef.current = {
        rootGroup,
        frontHinge,
        backHinge,
        leftHinge,
        rightHinge,
        lidHinge,
        tuckHinge,
        leftDustHinge,
        rightDustHinge,
      };
    }

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
      artworkTexture?.dispose();
      fiberBumpTexture?.dispose();
      fiberRoughnessTexture?.dispose();
      paperMaterial.dispose();
      printedMaterial.dispose();
      groundGeo.dispose();
      groundMat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [dimensions, boxType, theme, customLogoText, elements, backgroundPatternSvg, autoRotate, createMaterialTexture, createPaperFiberBumpTexture, createPaperFiberRoughnessTexture, onFlapClick]);

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

  // Transform updates based on foldProgress and interactiveOpenState
  useEffect(() => {
    const p = foldProgress;
    const g = groupsRef.current;
    const { length: L, height: H } = dimensions;

    if (boxType === "sleeve-drawer") {
      // Drawer slides in and out
      if (g.drawerGroup) {
        const slideRatio = interactiveOpenState ? 0.75 : 1.0 - p;
        g.drawerGroup.position.x = slideRatio * L * 0.7;
      }
    } else if (boxType === "lid-base") {
      // Lid lifts up
      if (g.lidGroup) {
        const liftRatio = interactiveOpenState ? 0.8 : (1.0 - p) * 1.4;
        g.lidGroup.position.y = H * 0.5 + liftRatio * H;
      }
    } else if (boxType === "pillow") {
      // Pillow curvature breathing
      if (g.pillowGroup) {
        const pinch = 0.2 + p * 0.25;
        g.pillowGroup.scale.set(1, pinch, 1);
      }
    } else {
      // Tuck Top Hinges (Flawless Symmetry & Closed Fit)
      if (!g.frontHinge) return;

      // 1. Four main vertical walls (Front, Back, Left, Right)
      const wallP = Math.min(1.0, p / 0.7); // Walls reach 90° by p = 0.7
      const wallAngle = wallP * (Math.PI / 2);

      g.frontHinge.rotation.x = -wallAngle;
      g.backHinge!.rotation.x = +wallAngle;
      g.leftHinge!.rotation.y = +wallAngle;
      g.rightHinge!.rotation.y = -wallAngle;

      // 2. Dust Flaps (fold inwards across top opening)
      const dustP = Math.max(0, Math.min(1.0, (p - 0.45) / 0.35));
      const dustAngle = dustP * (Math.PI / 2);
      if (g.leftDustHinge) g.leftDustHinge.rotation.y = -dustAngle;
      if (g.rightDustHinge) g.rightDustHinge.rotation.y = +dustAngle;

      // 3. Top Lid (folds forward over the top of the box)
      const lidP = Math.max(0, Math.min(1.0, (p - 0.6) / 0.3));
      let lidAngle = lidP * (Math.PI / 2);
      if (interactiveOpenState) {
        // Open wide backwards to reveal interior
        lidAngle = -Math.PI * 0.65;
      }
      if (g.lidHinge) g.lidHinge.rotation.x = lidAngle;

      // 4. Tuck Flap (folds down inside the front wall)
      const tuckP = Math.max(0, (p - 0.82) / 0.18);
      if (g.tuckHinge) g.tuckHinge.rotation.x = interactiveOpenState ? 0 : tuckP * (Math.PI / 2);
    }
  }, [foldProgress, interactiveOpenState, boxType, dimensions]);

  return (
    <div
      className={`relative w-full h-full ${minHeight ? "min-h-[460px]" : ""} rounded-squircle-lg overflow-hidden bg-paper-ivory border border-stone-200 shadow-tactile ${className}`}
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
