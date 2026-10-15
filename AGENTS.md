# WrapFit Platform — AI Agent Development Guidelines

> **Project**: WrapFit Platform (Packaging Personalization & Intelligence Platform)  
> **Course**: EXE101 — Experiential Entrepreneurship (FPT University)  
> **Slogan**: *"Make Every Present, Present."*  
> **Core Value**: Packaging-specific workflow — designing the box around the gift, ensuring 100% production feasibility.

---

## 1. Domain Knowledge & Packaging Physics

When generating code or designing interfaces for WrapFit, you MUST adhere to physical packaging constraints:

1. **Parametric Box Geometry $(L, W, H, t)$**:
   - Every box panel is derived mathematically from physical gift dimensions: Length ($L$), Width ($W$), Depth/Height ($H$), and Paper Thickness ($t$ in mm, based on 250–350 GSM paper).
   - Never use static mockups. All dielines must maintain exact coordinate relationships between panels, tuck flaps, and glue flaps.

2. **Dieline Layering Standards**:
   - 🔴 **Cut Line (`#E53E3E`, Solid)**: Outer perimeter knife cuts.
   - 🔵 **Crease / Score Line (`#3182CE`, Dashed `stroke-dasharray="4,4"`)**: Fold lines where paper bends.
   - 🟢 **Bleed Line (`#38A169`, Dotted)**: Background artwork must extend $\ge 2\text{mm}$ beyond cut lines.
   - 🟡 **Safe Margin Area**: Critical text, logos, and barcodes must sit $\ge 3\text{mm}$ inside crease and cut lines.

3. **Supported MVP Box Structures**:
   - **Tuck Top Box (Hộp nắp gài đáy khóa)**: Standard retail/gift box.
   - **Sleeve / Drawer Box (Hộp bao diêm)**: Outer sleeve with sliding tray.
   - **Lid & Base Box (Hộp âm dương)**: Rigid two-piece gift box.
   - **Pillow Box (Hộp gối)**: Curved folding pouch for jewelry and small accessories.

---

## 2. UI/UX Craftsmanship & Brand System (Luxury Minimalist & Vibrant Accents)

WrapFit targets handmade boutique owners, artisan crafters, and thoughtful luxury gift givers. Avoid generic, lazy "AI templates":

- **Design Tone**: **Luxury Minimalist & Vibrant Accents** — Clean editorial elegance inspired by Aesop, Luma, and Hers, elevated by warm tactile paper materials and energetic accent highlights for critical components.
- **Typography Hierarchy**:
  - *Editorial Headings & Hero*: Elegant display serif (**Cormorant Garamond** or **Playfair Display**) for sophistication.
  - *UI Controls & Labels*: High-legibility grotesque sans-serif (**Plus Jakarta Sans** or **DM Sans**).
  - *CAD Dimension Specs*: Monospace font (**JetBrains Mono**) for exact $L, W, H, t$ mm readouts.
- **Palette**:
  - *Paper Surfaces*: Cotton Ivory (`#FDFBF7`), Pure Alabaster (`#F7F5F0`), Fine Kraft Linen (`#E8D8C8`).
  - *Brand & Luxury Tones*: Deep Luxury Forest (`#1A362B`), Champagne Gold Foil (`#D4AF37`), Dark Espresso Ink (`#1C1917`).
  - *Vibrant Accent Highlights (Reserved for CTAs, FitCheck alerts & Copilot)*: Electric Cobalt Blue (`#2563EB` / `#1E56A0`), Radiant Coral (`#FF6B6B`), Sunshine Citron (`#FFD93D`).
- **Component Polish & Tactile Finish**:
  - Apple Squircle rounded corners (`rounded-2xl`, `rounded-3xl`).
  - Crisp micro-borders (`border border-stone-200/80` or `border-white/60`), Frosted Glass (`backdrop-blur-md bg-white/80`).
  - Soft ambient occlusion box shadows without harsh black drop-shadows.

---

## 3. Brand Mascot as AI Packaging Copilot ("Gói" / BeBoxy)

"Gói" is the **Intelligent AI Packaging Copilot**, not just a static cartoon decoration:
- **Interface**: Floating Dynamic Island (iOS pill widget) at viewport corner, expanding into contextual speech bubbles and suggestion chips.
- **9 Dynamic Emotional States**:
  1. `waving`: Welcome on Navbar & Hero.
  2. `thumbs_up`: Onboarding & Getting Started.
  3. `measuring`: Active during mm dimension inputs & FitCheck distance audits.
  4. `folding`: Active when manipulating 2D Dieline canvas layers.
  5. `presenting`: Active inside Template Hub browsing curated boxes.
  6. `delivery`: Active during BullMQ background export job polling.
  7. `celebration`: Fired upon export completion, liking, or forking.
  8. `unboxing_pop`: Triggered in 3D QR virtual unboxing experience.
  9. `chilling`: Active upon auto-save idle or empty states.
- **Proactive Watchdog**: Automatically offers 1-Click auto-fixes when elements breach the $3\text{mm}$ safe margin or overlap glue flaps.

---

## 4. 3-Stage User Journey & Physical 3D Packaging Model

1. **Stage 1 — Intro CAD Blueprint $\rightarrow$ 3D Origami**:
   - Blueprint SVG stroke line drawing (Heron AI style) via Anime.js `strokeDashoffset`.
   - Procedural 3D folding origami transformation into a finished box that users can rotate and tap to open.
   - Guarded by `sessionStorage` with a clean "Skip" button.
2. **Stage 2 — Home Storytelling Scroll-Video (Animejs.com style)**:
   - Central Interactive 3D Stage with **Dual-Mode interaction**: Fold progress slider (0% flat $\leftrightarrow$ 100% closed) + Direct clicking on flaps with tactile paper audio.
   - Sequential presentation of services, 4 box structures, AI pattern generator, and interactive FitCheck™ rules.
3. **Stage 3 — Canva Workspace & Pacdora Studio**:
   - Project dashboard with pill search and Bento grid.
   - Studio Split-Screen dual view: 2D Dieline on left + 3D WebGL Box on right.
   - 100% Responsive for Mobile App (iOS bottom navigation bar, swipeable bottom sheets, touch pinch-to-zoom).

---

## 5. Tech Stack & Architecture

- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, Lucide Icons.
- **2D Canvas**: Fabric.js / SVG manipulation + `@chenglou/pretext` for zero-reflow multiline text layout.
- **3D Engine**: Three.js / React Three Fiber for procedural folding animation, texture mapping, and OrbitControls.
- **Motion & Physics Engine**:
  - **Anime.js (`animejs`)**: 100% of UI micro-interactions, squishy bouncy buttons, mascot state morphing, mm number tickers, and bottom sheet springs.
  - **GSAP**: ScrollTrigger scrubbing and procedural 3D panel folding timelines.
- **Audio Engine**: Web Audio API procedural synthesis (`tactileAudio.ts`) for zero-asset paper creasing, unboxing pop, and click sounds.
- **Backend / DB**: NestJS 11, Prisma 6, PostgreSQL, Redis BullMQ, S3/Cloudflare R2 storage. Two processes from one codebase: the API (`be/src/app.ts`) and the BullMQ worker (`be/src/worker.ts`).
- **Backend layout**: follows [CatsMiaow/nestjs-project-structure](https://github.com/CatsMiaow/nestjs-project-structure) — one folder per feature module at `be/src/<module>/` with an `index.ts` barrel, shared infrastructure in `be/src/common/` (global `CommonModule`, typed `ConfigService`) and `be/src/shared/` (Prisma, queue), settings in `be/src/config/`. Rules: `be/README.md` and `docs/07`, sections 1.3–1.5.
- **Vector Export**: CMYK 300 DPI layered vector PDF (`CutContour`, `Crease`, `Artwork`, `Dimensions`), SVG, and DXF.

---

## 6. MANDATORY 2-TIER AGENT EXECUTION PROTOCOL (AUTOMATIC PER TURN)

Whenever working on any task relating to WrapFit Frontend, UI/UX, 3D Canvas, CAD Math, or Backend APIs, you MUST ALWAYS follow this two-tier inspection protocol without requiring the user to prompt or remind you:

1. **Tier 1 — Constitutional Index Review (`.agents/skills/`)**:
   - Read the relevant `SKILL.md` in `.agents/skills/` before generating or modifying code:
     - `ai-packaging-copilot`: Copilot state machine, speech bubbles, dimension heuristics.
     - `r3f-stage-orchestration`: WebGL context singleton, DPR clamping $\le 2$, 2D-to-3D texture sync.
     - `tactile-haptic-audio`: Web Audio API sound synthesis and haptics.
     - `fluid-mobile-gestures`: Mobile bottom sheet physics, thumb ergonomics, pinch-to-zoom.
     - `fitcheck-validator`: Safe margin $\ge 3\text{mm}$, Bleed $\ge 2\text{mm}$, DPI $\ge 200$, glue clearance.
     - `packaging-threejs-fold`: Pivot hinge tree hierarchy, flap rotations.
     - `wrapfit-design-system`: Palette tokens, squircle rules, anti-AI-slop.
     - `scroll-storytelling`: ScrollTrigger storytelling structure.
     - `insforge-backend-flow`: Backend NestJS API contracts and storage flows.
     - `checklist-design`: Automated UI/UX audits & critiques across 120+ checklists for websites, web apps, and design systems.

2. **Tier 2 — Deep Source Code Inspection (Library Source & Project Source)**:
   - Do NOT stop at summary text in `SKILL.md`. When implementing specific functionality, proactively open, inspect, and extract logic from the actual source files:
     - `node_modules/@chenglou/pretext/src/`: Read implementation for canvas text measurement without DOM reflow (installed with `npm install`).
     - `.agents/impeccable/` *(optional local clone of [pbakaus/impeccable](https://github.com/pbakaus/impeccable))*: Read `skill/SKILL.src.md` and references for craft floor and UX audits.
     - `.agents/InsForge/` *(optional local clone of [InsForge/InsForge](https://github.com/InsForge/InsForge))*: Read `packages/ui/` for Radix primitives, `cva`, and `cn()` patterns.
     - Everything in `.agents/` except `skills/` is ignored by git. Clone a reference repository there when you need it; if it is missing, skip it.
     - `fe/src/components/common/GoiMascot/`: Read for the mascot states and how each one is rendered.
     - `shared/src/core/contracts.ts`: Read for master domain events, project structures, and OOP models.
     - `be/src/<module>/`: Read DTOs and controller routes for exact API request/response contracts.
     - `be/README.md` (section "Cấu trúc thư mục") and `be/src/config/envs/default.ts`: Read before adding a backend module, an import between modules, or an environment variable.
