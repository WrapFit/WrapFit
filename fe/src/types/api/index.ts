/**
 * Request and response shapes of the WrapFit API (`be/src/<module>`), as used by `src/api`.
 * Box geometry, canvas and FitCheck types come from `@wrapfit/shared`, like on the backend.
 * Dates are ISO 8601 strings (UTC); ids are UUIDs.
 */

import type {
  BoxDimensions,
  BoxStructureType,
  BrandKit,
  CanvasState,
  FitCheckReport,
  MaterialSpecification,
  MaterialType,
  ProjectStatus,
  ProjectVisibility,
} from "@wrapfit/shared";

export type { ProjectStatus, ProjectVisibility };

// ---------------------------------------------------------------- common

export interface Paginated<T> {
  items: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface PageQuery {
  page?: number;
  /** 1–100, default 20. */
  limit?: number;
}

/** Stable `code` of an error body: branch on it, never on `message`. */
export type ApiErrorCode =
  | "EMAIL_NOT_VERIFIED"
  | "AUTH_TOKEN_INVALID"
  | "AUTH_TOKEN_EXPIRED"
  | "AUTH_TOKEN_CONSUMED"
  | "FILE_URL_NOT_ALLOWED"
  | "FILE_NOT_OWNED"
  | "PROJECT_VERSION_CONFLICT"
  | "ORIGIN_NOT_ALLOWED";

/** Body of every failed request (`be/src/common/filters/all-exceptions.filter.ts`). */
export interface ApiErrorBody {
  statusCode: number;
  error: string;
  /** A list for validation errors (one entry per invalid field). */
  message: string | string[];
  path: string;
  /** Same as the `X-Request-Id` header: show it so users can quote it when reporting a bug. */
  requestId: string;
  timestamp: string;
  code?: ApiErrorCode;
  /** 409 PROJECT_VERSION_CONFLICT: version of the project on the server. */
  currentVersion?: number;
  /** 422 on export: the FitCheck report with the blocking violations. */
  fitCheck?: FitCheckReport;
}

export interface HealthStatus {
  status: "ok" | "degraded";
  database: "up" | "down";
  redis: "up" | "down";
  worker: "up" | "down";
}

/** `GET /health/details` (admin). */
export interface HealthDetails extends HealthStatus {
  exportQueue?: Record<string, number>;
  uptime?: number;
  timestamp?: string;
}

// ---------------------------------------------------------------- users & auth

export type Role = "MAKER" | "PRO_ARTISAN" | "PRINT_SHOP" | "ADMIN";
export type SubscriptionTier = "FREE" | "PAY_PER_EXPORT" | "STARTER" | "PRO_BUSINESS";

/** The signed-in user (`GET /auth/me`, `GET /users/me`). */
export interface SafeUser {
  id: string;
  email: string;
  emailVerifiedAt: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  shopName: string | null;
  role: Role;
  subscriptionTier: SubscriptionTier;
  brandKit: BrandKit | null;
  referralCode: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterRequest {
  email: string;
  /** 8–72 characters, at least one letter and one digit. */
  password: string;
  /** ≤ 100 characters. */
  fullName?: string;
}

/** Always this answer, also when the address already has an account. */
export interface RegisterResponse {
  email: string;
  emailVerificationRequired: true;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/** The session itself travels in HttpOnly cookies, never in the body. */
export interface AuthSession {
  user: SafeUser;
  /** Lifetime of the access cookie in seconds. */
  expiresIn: number;
}

export interface UpdateProfileRequest {
  fullName?: string;
  shopName?: string;
  /** `fileUrl` of an AVATAR / IMAGE upload; `null` removes the avatar. */
  avatarUrl?: string | null;
}

/** The whole brand kit is replaced: omitted optional fields are cleared. */
export interface UpdateBrandKitRequest {
  /** `fileUrl` of a LOGO / IMAGE upload. */
  logoUrl?: string | null;
  /** 3–5 colors `#RRGGBB`: primary, accent, background, then extras. */
  colors: string[];
  /** ≤ 3 font families, headings first. */
  fonts?: string[];
  slogan?: string | null;
}

export interface AdminUpdateUserRequest {
  role?: Role;
  /** `false` locks the account and revokes its sessions. */
  isActive?: boolean;
}

// ---------------------------------------------------------------- projects

export type Occasion = "TET" | "CHRISTMAS" | "WEDDING" | "VALENTINE" | "BIRTHDAY" | "MINIMAL";
export type Industry = "COSMETICS" | "CANDLES" | "BAKERY" | "JEWELRY" | "TEA_AGRI";

/** A dashboard card: no canvas. */
export interface ProjectSummary {
  id: string;
  title: string;
  slug: string;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  template: { id: BoxStructureType; name: string };
  collection: { id: string; title: string; colorTag: string | null } | null;
  dimensions: BoxDimensions;
  materialSpec: MaterialSpecification;
  /** Primary accent color hex `#RRGGBB` for 3D box shading preview. */
  color?: string;
  /** 0–100 from the last server-side FitCheck; null until checked. */
  fitcheckScore: number | null;
  thumbnailUrl: string | null;
  tags: string[];
  occasion: Occasion | null;
  industry: Industry | null;
  viewsCount: number;
  likesCount: number;
  /** In the trash since; purged 30 days later. */
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Everything the editor needs. */
export interface ProjectDetail extends ProjectSummary {
  /** Send it back with every save: a stale one answers 409 PROJECT_VERSION_CONFLICT. */
  version: number;
  /** Dieline formulas of the project: build pieces with `generateDielinePieces(template.id, dimensions, formulaVersion)`. */
  formulaVersion: number;
  /** Current formulas of the box structure: when higher, the studio offers `upgradeProjectFormula`. */
  latestFormulaVersion: number;
  allowFork: boolean;
  forkedFromId: string | null;
  canvasState: CanvasState;
  fitcheckState: FitCheckReport | null;
}

export interface ProjectListQuery extends PageQuery {
  /** Default ACTIVE; DELETED = trash. */
  status?: ProjectStatus;
  templateId?: BoxStructureType;
  /** A collection id, or "none" for projects outside any collection. */
  collectionId?: string;
  /** Title (contains) or one exact tag. */
  q?: string;
  sortBy?: "updatedAt" | "createdAt" | "title";
  order?: "asc" | "desc";
}

export interface CreateProjectRequest {
  templateId: BoxStructureType;
  title: string;
  dimensions: BoxDimensions;
  materialSpec?: MaterialSpecification;
  canvasState?: CanvasState;
  /** Curated design of the template hub: fills materialSpec and canvasState when omitted. */
  designTemplateId?: string;
  collectionId?: string;
  tags?: string[];
  occasion?: Occasion | null;
  industry?: Industry | null;
}

/** Only the fields sent change. `null` clears collectionId, thumbnailUrl, occasion and industry. */
export interface UpdateProjectRequest {
  version?: number;
  title?: string;
  dimensions?: BoxDimensions;
  materialSpec?: MaterialSpecification;
  canvasState?: CanvasState;
  collectionId?: string | null;
  /** `fileUrl` of a THUMBNAIL / IMAGE upload. */
  thumbnailUrl?: string | null;
  tags?: string[];
  occasion?: Occasion | null;
  industry?: Industry | null;
}

export interface ChangeVisibilityRequest {
  visibility?: ProjectVisibility;
  allowFork?: boolean;
}

export interface SnapshotSummary {
  id: string;
  name: string;
  previewUrl: string | null;
  dimensions: BoxDimensions;
  /** Formulas of the project when it was taken (restoring puts them back); null for older snapshots. */
  formulaVersion: number | null;
  createdAt: string;
}

export interface CreateSnapshotRequest {
  name: string;
  /** `fileUrl` of a THUMBNAIL / IMAGE upload. */
  previewUrl?: string;
}

export interface RestoreSnapshotResponse {
  project: ProjectDetail;
  /** State just before the restore: restore it to undo. */
  backup: SnapshotSummary;
}

export interface FormulaUpgradeResponse {
  project: ProjectDetail;
  /** State on the old formulas (restore it to undo); null when the project was already on the current ones. */
  backup: SnapshotSummary | null;
}

export interface Collection {
  id: string;
  title: string;
  description: string | null;
  colorTag: string | null;
  /** Projects outside the trash. */
  projectCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCollectionRequest {
  /** ≤ 100 characters. */
  title: string;
  /** ≤ 500 characters. */
  description?: string;
  /** `#RRGGBB`, default `#D4A373`. */
  colorTag?: string;
}

export interface UpdateCollectionRequest {
  title?: string;
  /** `null` clears it. */
  description?: string | null;
  colorTag?: string;
}

// ---------------------------------------------------------------- templates

export interface DimensionRange {
  min: number;
  max: number;
}

export interface DimensionLimits {
  length: DimensionRange;
  width: DimensionRange;
  height: DimensionRange;
  paperThickness?: DimensionRange;
}

export interface BoxStructure {
  id: BoxStructureType;
  name: string;
  category: string;
  description: string | null;
  preview3dUrl: string | null;
  dimensionLimits: DimensionLimits;
}

export type HubSection = "curated" | "community";

export interface HubQuery extends PageQuery {
  section?: HubSection;
  structure?: BoxStructureType;
  occasion?: Occasion;
  industry?: Industry;
  material?: MaterialType;
  q?: string;
}

interface HubCardBase {
  title: string;
  structure: { id: BoxStructureType; name: string };
  occasion: Occasion | null;
  industry: Industry | null;
  dimensions: BoxDimensions;
  materialSpec: MaterialSpecification;
  thumbnailUrl: string | null;
  tags: string[];
  /** Curated: times "use this template" was clicked. Community: number of remixes. */
  usesCount: number;
  /** Primary brand / finish color of the box in hex `#RRGGBB`. */
  color?: string;
}

/** WrapFit design, opened by `id`. */
export interface CuratedCard extends HubCardBase {
  id: string;
  description: string | null;
}

/** PUBLIC project of the community, opened by `slug` (public page). */
export interface CommunityCard extends HubCardBase {
  slug: string;
  likesCount: number;
  viewsCount: number;
  fitcheckScore: number | null;
  author: PublicAuthor;
}

export interface TemplateDetail extends CuratedCard {
  canvasState: CanvasState;
  dimensionLimits: DimensionLimits;
}

// ---------------------------------------------------------------- public showcase

export interface PublicAuthor {
  fullName: string | null;
  shopName: string | null;
  avatarUrl: string | null;
}

/** `GET /public/projects/:slug`: what anyone with the link sees. */
export interface PublicProject {
  slug: string;
  title: string;
  visibility: Exclude<ProjectVisibility, "PRIVATE">;
  allowFork: boolean;
  template: { id: BoxStructureType; name: string };
  dimensions: BoxDimensions;
  materialSpec: MaterialSpecification;
  canvasState: CanvasState;
  thumbnailUrl: string | null;
  tags: string[];
  occasion: Occasion | null;
  industry: Industry | null;
  viewsCount: number;
  likesCount: number;
  createdAt: string;
  updatedAt: string;
  author: PublicAuthor;
  /** Credited source of a remix; null when the source is not PUBLIC. */
  forkedFrom: { slug: string; title: string; author: PublicAuthor } | null;
  viewer: { isOwner: boolean; liked: boolean };
}

export interface LikeState {
  liked: boolean;
  likesCount: number;
}

// ---------------------------------------------------------------- storage

export type UploadPurpose = "LOGO" | "IMAGE" | "THUMBNAIL" | "AVATAR";

export interface PresignUploadRequest {
  purpose: UploadPurpose;
  contentType: string;
  /** Bytes; the PUT must send exactly this size. */
  size: number;
  /** Attach the file to one of my projects (deleted with it). */
  projectId?: string;
}

export interface PresignedUpload {
  fileId: string;
  key: string;
  uploadUrl: string;
  method: "PUT";
  /** Signed into the URL: the PUT must send exactly these headers. */
  headers: Record<string, string>;
  /** URL to use in canvasState, thumbnailUrl, avatarUrl, logoUrl. */
  fileUrl: string;
  expiresIn: number;
}

export interface StorageUsage {
  tier: SubscriptionTier;
  usedBytes: number;
  quotaBytes: number;
  fileCount: number;
}

// ---------------------------------------------------------------- exports

export type ExportFileType = "PDF_CMYK" | "PDF_A4_PRINT" | "SVG" | "DXF";
export type ExportStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface ExportStarted {
  jobId: string;
  status: ExportStatus;
  fitCheck: FitCheckReport;
}

export interface ExportJob {
  id: string;
  projectId: string;
  fileType: ExportFileType;
  status: ExportStatus;
  /** Set when FAILED. */
  error: string | null;
  createdAt: string;
  completedAt: string | null;
  /** COMPLETED only. */
  fileName: string | null;
  /** COMPLETED only; expires after `downloadExpiresIn` seconds: fetch the job again for a new one. */
  downloadUrl: string | null;
  downloadExpiresIn: number | null;
}

// ---------------------------------------------------------------- unboxing

export type ParticleEffect = "confetti" | "fireworks" | "hearts" | "petals" | "snow" | "none";

export interface SaveUnboxingRequest {
  /** ≤ 100 characters. */
  recipientName: string;
  /** ≤ 2000 characters. */
  giftNote: string;
  audioTrackUrl?: string | null;
  /** Default confetti. */
  particleEffect?: ParticleEffect;
}

/** Unboxing experience of my project. The slug never changes (the QR code may be printed). */
export interface UnboxingConfig {
  slug: string;
  recipientName: string;
  giftNote: string;
  audioTrackUrl: string | null;
  particleEffect: ParticleEffect;
  viewsCount: number;
  createdAt: string;
  /** PNG; null while object storage is not configured (use the `/unboxing/qr` endpoint). */
  qrCodeUrl: string | null;
  qrCodeSvgUrl: string | null;
  /** Page the QR code opens: `<frontend>/unbox/<slug>`. */
  unboxUrl: string;
}

/** `GET /public/unboxing/:slug`: the page the recipient opens. */
export interface PublicUnboxing {
  recipientName: string;
  giftNote: string;
  audioTrackUrl: string | null;
  particleEffect: ParticleEffect;
  viewsCount: number;
  sender: PublicAuthor;
  box: {
    title: string;
    template: { id: BoxStructureType; name: string };
    dimensions: BoxDimensions;
    materialSpec: MaterialSpecification;
    canvasState: CanvasState;
    thumbnailUrl: string | null;
  };
}

// ---------------------------------------------------------------- AI

export interface GeneratePatternRequest {
  /** ≤ 200 characters. */
  theme: string;
  /** ≤ 5 brand colors `#RRGGBB`. */
  preferredColors?: string[];
}

export interface AiPatternResult {
  /** "procedural" when AI is not configured or failed: there is always a result. */
  source: "ai" | "procedural";
  themeName: string;
  description: string;
  palette: string[];
  /** Seamless repeat tile, safe to insert (no script, no external resource). */
  tile: { size: number; svg: string };
  /** AI generations in the last 24 hours; null when AI is off. */
  usage: { used: number; limit: number } | null;
}

export interface AiUsage {
  tier: SubscriptionTier;
  used: number;
  limit: number;
  aiEnabled: boolean;
}

// ---------------------------------------------------------------- print-shops & orders

export interface PrintShop {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  sheet?: string;
  sheetSize?: string;
  services: string[];
  leadTime?: string;
  leadTimeDays?: number;
  minQuantity?: number;
  state?: 'active' | 'review' | 'paused';
  status?: 'active' | 'review' | 'paused';
}

export interface SampleOrder {
  id: string;
  userId: string;
  projectId: string;
  projectTitle: string;
  printShopId?: string;
  printShopName?: string;
  partnerShop?: {
    id: string;
    name: string;
    city: string;
    contactPhone?: string;
  };
  quantity: number;
  recipientName: string;
  phone?: string;
  recipientPhone?: string;
  shippingAddress: string;
  notes?: string | null;
  totalVnd?: number;
  sampleFeeVnd?: number;
  status: 'pending' | 'confirmed' | 'in_production' | 'shipped' | 'delivered' | 'SUBMITTED' | 'IN_PRODUCTION' | 'SHIPPED' | 'DELIVERED';
  orderCode?: string;
  createdAt: string;
}

export interface CreateSampleOrderRequest {
  projectId: string;
  printShopId?: string;
  recipientName: string;
  phone?: string;
  recipientPhone?: string;
  shippingAddress: string;
  notes?: string;
  quantity?: number;
  paperStock?: string;
}
