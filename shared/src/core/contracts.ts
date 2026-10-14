/**
 * Master Domain & OOP Class Contracts (Pacdora-grade Architecture)
 * Based on Clean Architecture + Domain-Driven Design (DDD)
 *
 * Status (2026-10-12): design sketch, not part of the package API (`src/index.ts` does not export it) and imported by no
 * code. The types in use are `src/types/*`; box geometry and folding are `src/parametric/*` (generateDielinePieces,
 * panelTransforms), checks are `src/fitcheck/*`. Do not build on the box or fold interfaces below.
 */

import { BoxDimensions, BoxStructureType, DielineGeometry, PanelFace, DielineSegment } from "../types/dieline";
import { MaterialSpecification, CanvasElement, ProjectStatus, ProjectVisibility, BoxTemplateItem } from "../types/project";
import { FitCheckReport, FitCheckViolation, SeverityLevel } from "../types/fitcheck";

// ============================================================================
// 1. DOMAIN EVENTS & AUDIT TRAIL
// ============================================================================
export interface IDomainEvent {
  readonly eventId: string;
  readonly occurredOn: Date;
  readonly aggregateId: string;
  readonly eventName: string;
}

export interface DimensionsChangedEvent extends IDomainEvent {
  readonly oldDimensions: BoxDimensions;
  readonly newDimensions: BoxDimensions;
}

export interface ProjectStateChangedEvent extends IDomainEvent {
  readonly fromState: string;
  readonly toState: string;
}

export interface ProjectForkedEvent extends IDomainEvent {
  readonly originalProjectId: string;
  readonly newProjectId: string;
  readonly forkedByUserId: string;
}

export interface UserRegisteredEvent extends IDomainEvent {
  readonly email: string;
  readonly role: UserRole;
}

export interface ProjectArchivedEvent extends IDomainEvent {
  readonly projectId: string;
  readonly userId: string;
}

export interface ProjectTrashedEvent extends IDomainEvent {
  readonly projectId: string;
  readonly purgeAfterDate: Date;
}

export interface OrderPlacedEvent extends IDomainEvent {
  readonly orderId: string;
  readonly totalAmountVnd: number;
}

export interface PaymentSucceededEvent extends IDomainEvent {
  readonly transactionId: string;
  readonly orderId?: string;
  readonly subscriptionTier?: SubscriptionTierType;
}

export interface AccountDeletionScheduledEvent extends IDomainEvent {
  readonly userId: string;
  readonly gracePeriodExpiresAt: Date;
}

// ============================================================================
// 2. STATE PATTERN FOR PROJECT LIFECYCLE
// ============================================================================
export interface IProjectState {
  readonly stateName: string;
  canEdit(): boolean;
  canPublish(): boolean;
  canExport(): boolean;
  canArchive(): boolean;
  transitionTo(nextStateName: string): boolean;
}

// ============================================================================
// 3. PARAMETRIC CAD & KINEMATICS
// ============================================================================
export interface JointKinematicSpec {
  jointId: string;
  parentPanelId: string;
  childPanelId: string;
  hingeAxis: "top" | "bottom" | "left" | "right";
  localPivotAxis: [number, number, number];
  minFoldAngleRad: number;
  maxFoldAngleRad: number;
  foldOrderStep: number;
}

export interface IBoxStructureGenerator {
  readonly structureType: BoxStructureType;
  calculateDieline(dimensions: BoxDimensions): DielineGeometry;
  calculateJointKinematics(dimensions: BoxDimensions): JointKinematicSpec[];
}

// ============================================================================
// 4. 2D CANVAS COMMAND PATTERN & UNDO/REDO
// ============================================================================
export interface ICommand {
  readonly description: string;
  execute(): void;
  undo(): void;
}

export interface TransformMemento {
  x: number;
  y: number;
  rotation: number;
  width: number;
  height: number;
}

// ============================================================================
// 5. FITCHECK™ SPECIFICATION & AUTO-FIX
// ============================================================================
export interface IFixAction {
  readonly actionId: string;
  readonly title: string;
  readonly impactDescription: string;
  apply(): void;
}

export interface RuleEvaluationResult {
  isPassed: boolean;
  violations: FitCheckViolation[];
  availableFixActions: IFixAction[];
}

export interface IPreflightRule {
  readonly ruleId: string;
  readonly ruleName: string;
  readonly severity: SeverityLevel;
  validate(dieline: DielineGeometry, elements: CanvasElement[], material: MaterialSpecification): RuleEvaluationResult;
}

// ============================================================================
// 6. INDUSTRIAL PREPRESS EXPORTER & CLOUD QUEUE
// ============================================================================
export type ExportFormat = "PDF_CMYK" | "SVG_LASER" | "DXF_CNC" | "GLTF_3D" | "MOCKUP_4K";

export interface ExportOptions {
  includeCutLayer: boolean;
  includeCreaseLayer: boolean;
  includeArtworkLayer: boolean;
  includeSpotLayers?: boolean;
  dpi?: number;
}

export interface ExportDocument {
  format: ExportFormat;
  filename: string;
  fileBuffer: ArrayBuffer | Buffer;
  mimeType: string;
  metadata?: Record<string, string>;
}

export interface IPrepressExporter {
  readonly supportedFormat: ExportFormat;
  export(dieline: DielineGeometry, elements: CanvasElement[], options: ExportOptions): Promise<ExportDocument>;
}

export interface IStorageService {
  uploadFile(key: string, buffer: Buffer | Uint8Array, mimeType: string): Promise<string>;
  getDownloadUrl(key: string): Promise<string>;
}

// ============================================================================
// 7. AUTHENTICATION, IDENTITY & RBAC (IAM)
// ============================================================================
export type UserRole = "MAKER" | "PRO_ARTISAN" | "PRINT_SHOP" | "ADMIN";
export type SubscriptionTierType = "FREE" | "PAY_PER_EXPORT" | "STARTER" | "PRO_BUSINESS";

export interface BrandKitValueObject {
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  fontFamily?: string;
  slogan?: string;
}

export interface IUserAggregate {
  readonly id: string;
  readonly email: string;
  readonly role: UserRole;
  readonly subscriptionTier: SubscriptionTierType;
  fullName?: string;
  avatarUrl?: string;
  shopName?: string;
  brandKit?: BrandKitValueObject;
  referralCode?: string;
  isTwoFactorEnabled: boolean;
  isSuspended: boolean;
  isPendingDeletion: boolean;
  deletionScheduledAt?: Date;
  changePassword(newHash: string): void;
  updateBrandKit(kit: BrandKitValueObject): void;
  upgradeTier(tier: SubscriptionTierType): void;
  assignRole(role: UserRole): void;
}

export interface AuthCredentials {
  email: string;
  password?: string;
  oauthProvider?: "google";
  oauthCode?: string;
  twoFactorCode?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
}

export interface AuthResult {
  user: IUserAggregate;
  tokens?: AuthTokens;
  requiresTwoFactor?: boolean;
  twoFactorSessionToken?: string;
}

export interface IAuthProvider {
  readonly providerName: string;
  authenticate(credentials: AuthCredentials): Promise<IUserAggregate>;
}

export interface ITokenManager {
  generateTokens(user: IUserAggregate): AuthTokens;
  verifyAccessToken(token: string): { userId: string; role: UserRole } | null;
  refreshAccessToken(refreshToken: string): Promise<AuthTokens | null>;
  revokeRefreshToken(userId: string): Promise<void>;
}

export interface IAuthorizationGuard {
  canAccess(user: IUserAggregate, resource: string, action: string): boolean;
}

// ============================================================================
// 8. WISHLIST, BOOKMARKS & CUSTOM COLLECTIONS
// ============================================================================
export type BookmarkTargetType = "TEMPLATE" | "PROJECT";

export interface IBookmarkable {
  readonly targetId: string;
  readonly targetType: BookmarkTargetType;
  readonly title: string;
  readonly thumbnailUrl?: string;
  readonly createdAt: Date;
}

export interface IUserCollectionAggregate {
  readonly id: string;
  readonly userId: string;
  title: string;
  description?: string;
  colorTag?: string;
  projectIds: string[];
  addProject(projectId: string): void;
  removeProject(projectId: string): void;
  reorderProjects(newOrder: string[]): void;
}

export interface IWishlistService {
  toggleTemplateWishlist(userId: string, templateId: string): Promise<boolean>;
  getWishlistedTemplates(userId: string): Promise<string[]>;
  toggleProjectLike(userId: string, projectId: string): Promise<boolean>;
  getUserLikedProjects(userId: string): Promise<string[]>;
}

// ============================================================================
// 9. PROJECT STORAGE, ARCHIVAL LIFECYCLE & STORAGE QUOTA
// ============================================================================
export interface AssetFileMetadata {
  fileId: string;
  userId: string;
  projectId?: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  storageKey: string;
  createdAt: Date;
}

export interface StorageQuotaUsage {
  usedBytes: number;
  maxBytes: number;
  percentageUsed: number;
  isExceeded: boolean;
}

export interface IStorageQuotaManager {
  getUserQuotaUsage(userId: string): Promise<StorageQuotaUsage>;
  canUploadFile(userId: string, fileSizeBytes: number): Promise<boolean>;
  trackAssetUpload(metadata: AssetFileMetadata): Promise<void>;
  releaseAsset(fileId: string): Promise<void>;
}

export interface IProjectArchivalService {
  archiveProject(projectId: string, userId: string): Promise<void>;
  unarchiveProject(projectId: string, userId: string): Promise<void>;
  moveToTrash(projectId: string, userId: string): Promise<Date>; // Returns auto-purge date (+30 days)
  restoreFromTrash(projectId: string, userId: string): Promise<void>;
  purgeExpiredTrashProjects(): Promise<number>; // Runs via cron job
}

// ============================================================================
// 10. ADMIN PLATFORM GOVERNANCE & AUDIT LOGGING
// ============================================================================
export interface AuditLogEntry {
  logId: string;
  actorUserId: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export interface SystemMetricSummary {
  totalUsers: number;
  activeProjectsCount: number;
  totalExportJobs: number;
  storageConsumedBytes: number;
  preflightPassRate: number;
  curatedTemplatesCount: number;
}

export interface ITemplateCuratorService {
  getPendingTemplates(): Promise<Array<{ id: string; name: string; authorId: string; submittedAt: Date }>>;
  approveTemplate(templateId: string, curatorAdminId: string): Promise<void>;
  rejectTemplate(templateId: string, curatorAdminId: string, reason: string): Promise<void>;
  toggleCuratedStatus(templateId: string, isCurated: boolean): Promise<void>;
}

export interface IUserGovernanceService {
  suspendUser(userId: string, reason: string, adminId: string): Promise<void>;
  reactivateUser(userId: string, adminId: string): Promise<void>;
  updateUserSubscription(userId: string, tier: SubscriptionTierType, adminId: string): Promise<void>;
  updateUserRole(userId: string, role: UserRole, adminId: string): Promise<void>;
}

export interface IAuditLogService {
  logActivity(entry: Omit<AuditLogEntry, "logId" | "timestamp">): Promise<void>;
  queryAuditLogs(filters: { entityType?: string; actorUserId?: string; fromDate?: Date }): Promise<AuditLogEntry[]>;
}

export interface IAdminDashboardFacade {
  getSystemMetrics(): Promise<SystemMetricSummary>;
  getUserGovernance(): IUserGovernanceService;
  getTemplateCurator(): ITemplateCuratorService;
  getAuditLogger(): IAuditLogService;
}

// ============================================================================
// 11. ACCOUNT SECURITY, PASSWORD RESET & EMAIL VERIFICATION
// ============================================================================
export interface ResetPasswordRequest {
  email: string;
  clientIp?: string;
}

export interface ConfirmResetPasswordRequest {
  token: string;
  newPasswordPlain: string;
}

export interface IPasswordResetService {
  requestPasswordReset(req: ResetPasswordRequest): Promise<void>;
  verifyResetToken(token: string): Promise<boolean>;
  confirmPasswordReset(req: ConfirmResetPasswordRequest): Promise<void>;
}

export interface IEmailVerificationService {
  sendVerificationEmail(userId: string, email: string): Promise<void>;
  verifyEmailToken(token: string): Promise<boolean>;
}

// ============================================================================
// 12. SUBSCRIPTION BILLING & PAYMENT GATEWAY (Stripe, VNPay, MoMo)
// ============================================================================
export type PaymentGatewayProvider = "STRIPE" | "VNPAY" | "MOMO";

export interface PaymentInitiateRequest {
  userId: string;
  amountVnd: number;
  purpose: "SUBSCRIPTION" | "PRINT_ORDER";
  referenceId: string;
  returnUrl: string;
  cancelUrl: string;
}

export interface PaymentInitiateResult {
  transactionId: string;
  redirectPaymentUrl: string;
  gatewayProvider: PaymentGatewayProvider;
}

export interface PaymentWebhookPayload {
  provider: PaymentGatewayProvider;
  transactionId: string;
  status: "SUCCESS" | "FAILED" | "CANCELLED";
  signature: string;
  rawPayload: Record<string, unknown>;
}

export interface IPaymentGateway {
  readonly providerName: PaymentGatewayProvider;
  createCheckoutSession(req: PaymentInitiateRequest): Promise<PaymentInitiateResult>;
  verifyWebhook(payload: PaymentWebhookPayload): Promise<boolean>;
}

export interface ISubscriptionBillingManager {
  changeSubscriptionPlan(userId: string, targetTier: SubscriptionTierType, gateway: PaymentGatewayProvider): Promise<PaymentInitiateResult>;
  handlePaymentWebhook(payload: PaymentWebhookPayload): Promise<void>;
  cancelSubscriptionAtPeriodEnd(userId: string): Promise<void>;
  getInvoices(userId: string): Promise<Array<{ id: string; amount: number; tier: string; paidAt: Date; invoicePdfUrl: string }>>;
}

// ============================================================================
// 13. SHOPPING CART, CHECKOUT & PRINT ORDER FULFILLMENT
// ============================================================================
export type OrderStatus = "PENDING_PAYMENT" | "PAID" | "IN_PRODUCTION" | "SHIPPED" | "DELIVERED" | "CANCELLED";

export interface CartItem {
  id: string;
  projectId: string;
  projectTitle: string;
  quantity: number;
  unitPriceVnd: number;
  totalPriceVnd: number;
  thumbnailUrl?: string;
}

export interface IShoppingCart {
  items: CartItem[];
  subtotalVnd: number;
  discountVnd: number;
  appliedCouponCode?: string;
  estimatedTotalVnd: number;
  addItem(item: Omit<CartItem, "id" | "totalPriceVnd">): void;
  updateQuantity(itemId: string, quantity: number): void;
  removeItem(itemId: string): void;
  applyCoupon(code: string, discountAmount: number): void;
  clear(): void;
}

export interface ShippingAddress {
  recipientName: string;
  phoneNumber: string;
  addressLine: string;
  ward: string;
  district: string;
  provinceCity: string;
  postalCode?: string;
}

export interface OrderItem {
  projectId: string;
  quantity: number;
  unitPriceVnd: number;
  totalVnd: number;
  exportedPdfUrl: string;
}

export interface IOrderAggregate {
  readonly orderId: string;
  readonly userId: string;
  status: OrderStatus;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  shippingFeeVnd: number;
  discountAmountVnd: number;
  totalAmountVnd: number;
  trackingNumber?: string;
  shippingCourier?: string;
  placedAt: Date;
  markAsPaid(): void;
  markInProduction(): void;
  dispatchShipment(courier: string, trackingNumber: string): void;
  markDelivered(): void;
  cancelOrder(reason: string): void;
}

export interface IOrderFulfillmentService {
  createOrderFromCart(userId: string, cart: IShoppingCart, shipping: ShippingAddress, couponCode?: string): Promise<IOrderAggregate>;
  getOrderById(orderId: string): Promise<IOrderAggregate | null>;
  listUserOrders(userId: string): Promise<IOrderAggregate[]>;
  updateOrderStatus(orderId: string, status: OrderStatus, adminId?: string): Promise<void>;
}

// ============================================================================
// 14. MULTI-CHANNEL NOTIFICATION SYSTEM
// ============================================================================
export type NotificationType = "PROJECT_READY" | "ORDER_STATUS" | "COMMUNITY_LIKE" | "STORAGE_WARNING" | "SYSTEM_ANNOUNCEMENT";
export type NotificationChannel = "IN_APP" | "EMAIL" | "WEB_PUSH";

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  actionUrl?: string;
  channels: NotificationChannel[];
}

export interface InAppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: Date;
}

export interface INotificationDispatcher {
  dispatch(payload: NotificationPayload): Promise<void>;
  getUserInAppNotifications(userId: string, unreadOnly?: boolean): Promise<InAppNotification[]>;
  markAsRead(notificationId: string, userId: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
}

// ============================================================================
// 15. CUSTOMER SUPPORT & TICKETING SYSTEM
// ============================================================================
export type TicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING_CUSTOMER" | "RESOLVED" | "CLOSED";
export type TicketPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export interface TicketMessage {
  messageId: string;
  senderId: string;
  senderRole: UserRole;
  content: string;
  attachmentUrls?: string[];
  sentAt: Date;
}

export interface ISupportTicketAggregate {
  readonly ticketId: string;
  readonly userId: string;
  title: string;
  category: "PRINT_QUALITY" | "PAYMENT" | "DIELINE_BUG" | "FEATURE_REQUEST" | "OTHER";
  priority: TicketPriority;
  status: TicketStatus;
  messages: TicketMessage[];
  addMessage(senderId: string, senderRole: UserRole, content: string, attachments?: string[]): void;
  updateStatus(status: TicketStatus): void;
}

export interface ISupportTicketService {
  createTicket(userId: string, title: string, category: string, priority: TicketPriority, initialMessage: string, attachments?: string[]): Promise<ISupportTicketAggregate>;
  getTicket(ticketId: string, userId: string): Promise<ISupportTicketAggregate | null>;
  replyToTicket(ticketId: string, senderId: string, senderRole: UserRole, content: string, attachments?: string[]): Promise<void>;
  listUserTickets(userId: string): Promise<ISupportTicketAggregate[]>;
  adminListTickets(filters: { status?: TicketStatus; priority?: TicketPriority }): Promise<ISupportTicketAggregate[]>;
}

// ============================================================================
// 16. SEARCH, FILTER, SORT & PAGINATION (Global Engine)
// ============================================================================
export type SortDirection = "ASC" | "DESC";

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface TemplateSearchFilter {
  query?: string;
  structureTypes?: BoxStructureType[];
  categories?: string[];
  paperMaterials?: string[];
  isCuratedOnly?: boolean;
  sortBy?: "POPULARITY" | "LATEST" | "USAGE_COUNT";
  sortDirection?: SortDirection;
}

export interface ISearchFilterEngine {
  searchTemplates(filter: TemplateSearchFilter, pagination: PaginationParams): Promise<PaginatedResult<BoxTemplateItem>>;
  searchCommunityProjects(query: string, tag?: string, pagination?: PaginationParams): Promise<PaginatedResult<ShowcaseCardDTO>>;
}

export interface ShowcaseCardDTO {
  id: string;
  title: string;
  slug: string;
  thumbnailUrl: string;
  authorName: string;
  likesCount: number;
  viewsCount: number;
}

// ============================================================================
// 17. COUPONS, DISCOUNTS & REFERRAL AFFILIATE
// ============================================================================
export type CouponDiscountType = "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING";

export interface CouponEntity {
  code: string;
  discountType: CouponDiscountType;
  value: number;
  minOrderValueVnd?: number;
  maxDiscountVnd?: number;
  validFrom: Date;
  validUntil: Date;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
}

export interface ICouponService {
  validateCoupon(code: string, cartTotalVnd: number, userId: string): Promise<{ isValid: boolean; discountAmountVnd: number; message: string }>;
  applyCoupon(code: string, orderId: string, userId: string): Promise<void>;
  createCoupon(coupon: Omit<CouponEntity, "usedCount">): Promise<CouponEntity>;
}

export interface IReferralAffiliateService {
  generateReferralLink(userId: string): Promise<string>;
  recordReferralSignup(referralCode: string, newUserId: string): Promise<void>;
  rewardReferralCommission(orderId: string): Promise<void>;
}

// ============================================================================
// 18. ADVANCED SECURITY: 2FA TOTP & ACTIVE DEVICE SESSIONS
// ============================================================================
export interface ITwoFactorAuthService {
  generateSecret(userId: string): Promise<{ secret: string; qrCodeDataUrl: string }>;
  enableTwoFactor(userId: string, code: string): Promise<boolean>;
  verifyTwoFactorCode(userId: string, code: string): Promise<boolean>;
  disableTwoFactor(userId: string, code: string): Promise<boolean>;
}

export interface UserDeviceSession {
  sessionId: string;
  userId: string;
  deviceInfo: string;
  ipAddress: string;
  cityCountry?: string;
  lastActiveAt: Date;
  isCurrentSession: boolean;
}

export interface IUserSessionManager {
  listActiveSessions(userId: string, currentSessionId: string): Promise<UserDeviceSession[]>;
  revokeSession(userId: string, sessionIdToRevoke: string): Promise<void>;
  revokeAllOtherSessions(userId: string, currentSessionId: string): Promise<void>;
}

// ============================================================================
// 19. PRODUCT REVIEWS, RATINGS & BLOG CMS SEO
// ============================================================================
export interface ProductReviewAggregate {
  reviewId: string;
  userId: string;
  authorName: string;
  orderId: string;
  ratingStars: number;
  commentText: string;
  photoUrls?: string[];
  helpfulVotes: number;
  isVerifiedPurchase: boolean;
  createdAt: Date;
}

export interface IProductReviewService {
  submitReview(userId: string, orderId: string, rating: number, comment: string, photos?: string[]): Promise<ProductReviewAggregate>;
  listOrderReviews(orderId: string): Promise<ProductReviewAggregate[]>;
  voteHelpful(reviewId: string, userId: string): Promise<void>;
}

export interface BlogPostEntity {
  slug: string;
  title: string;
  contentMarkdown: string;
  authorName: string;
  coverImageUrl?: string;
  tags: string[];
  metaTitle?: string;
  metaDescription?: string;
  publishedAt: Date;
}

export interface IBlogCmsService {
  getPostBySlug(slug: string): Promise<BlogPostEntity | null>;
  listRecentPosts(limit: number): Promise<BlogPostEntity[]>;
}

// ============================================================================
// 20. RATE LIMITING, CAPTCHA & ACCOUNT DELETION GDPR
// ============================================================================
export interface IRateLimiterService {
  checkLimit(key: string, maxRequests: number, windowSeconds: number): Promise<{ isAllowed: boolean; remaining: number }>;
}

export interface ICaptchaVerifier {
  verifyToken(token: string, clientIp?: string): Promise<boolean>;
}

export interface IAccountDeletionService {
  scheduleAccountDeletion(userId: string): Promise<Date>;
  cancelAccountDeletion(userId: string): Promise<void>;
  purgeScheduledAccounts(): Promise<number>;
}

// ============================================================================
// 21. ADDRESS BOOK & MULTI-SHIPPING MANAGEMENT
// ============================================================================
export interface UserAddressEntity {
  addressId: string;
  userId: string;
  recipientName: string;
  phoneNumber: string;
  addressLine: string;
  ward: string;
  district: string;
  provinceCity: string;
  postalCode?: string;
  isDefault: boolean;
  createdAt: Date;
}

export interface IAddressBookService {
  listAddresses(userId: string): Promise<UserAddressEntity[]>;
  addAddress(userId: string, address: Omit<UserAddressEntity, "addressId" | "userId" | "createdAt">): Promise<UserAddressEntity>;
  updateAddress(addressId: string, userId: string, updates: Partial<UserAddressEntity>): Promise<void>;
  deleteAddress(addressId: string, userId: string): Promise<void>;
  setDefaultAddress(addressId: string, userId: string): Promise<void>;
}

// ============================================================================
// 22. ORDER CANCELLATION, REFUNDS & RE-ORDER
// ============================================================================
export type RefundStatus = "PENDING" | "APPROVED" | "REJECTED" | "REFUNDED";

export interface RefundRequestEntity {
  refundId: string;
  orderId: string;
  userId: string;
  reason: string;
  proofImages: string[];
  refundAmountVnd: number;
  status: RefundStatus;
  adminNote?: string;
  requestedAt: Date;
  processedAt?: Date;
}

export interface IOrderCancellationService {
  cancelPendingOrder(orderId: string, userId: string, reason: string): Promise<void>;
}

export interface IOrderRefundService {
  submitRefundRequest(orderId: string, userId: string, reason: string, proofImages: string[]): Promise<RefundRequestEntity>;
  processRefund(refundId: string, approved: boolean, adminId: string, note?: string): Promise<void>;
}

export interface IReorderService {
  cloneOrderToCart(orderId: string, userId: string, cart: IShoppingCart): Promise<void>;
}

// ============================================================================
// 23. NEWSLETTER, CONTACT US & GUEST ENGAGEMENT
// ============================================================================
export interface NewsletterSubscriberEntity {
  email: string;
  subscribedAt: Date;
  isActive: boolean;
  source: string;
}

export interface INewsletterService {
  subscribe(email: string, source?: string): Promise<void>;
  unsubscribe(email: string): Promise<void>;
  listSubscribers(): Promise<NewsletterSubscriberEntity[]>;
}

export interface ContactInquiryEntity {
  inquiryId: string;
  senderName: string;
  senderEmail: string;
  phoneNumber?: string;
  subject: string;
  message: string;
  isReplied: boolean;
  replyNote?: string;
  receivedAt: Date;
}

export interface IContactInquiryService {
  submitInquiry(inquiry: Omit<ContactInquiryEntity, "inquiryId" | "isReplied" | "receivedAt">): Promise<void>;
  listInquiries(filter?: { unrepliedOnly?: boolean }): Promise<ContactInquiryEntity[]>;
  markAsReplied(inquiryId: string, note: string): Promise<void>;
}

// ============================================================================
// 24. PROJECT COLLABORATION & TEAM PERMISSIONS
// ============================================================================
export type ProjectMemberRole = "VIEWER" | "EDITOR" | "ADMIN";

export interface ProjectMemberEntity {
  membershipId: string;
  projectId: string;
  userId: string;
  userEmail: string;
  role: ProjectMemberRole;
  invitedAt: Date;
  acceptedAt?: Date;
}

export interface IProjectCollaborationService {
  inviteMember(projectId: string, inviterUserId: string, targetEmail: string, role: ProjectMemberRole): Promise<void>;
  acceptInvitation(projectId: string, userId: string): Promise<void>;
  removeMember(projectId: string, targetUserId: string, ownerUserId: string): Promise<void>;
  listProjectMembers(projectId: string): Promise<ProjectMemberEntity[]>;
}

// ============================================================================
// 25. CMS BANNERS, STATIC PAGES & WEB CONFIG
// ============================================================================
export interface HeroBannerEntity {
  bannerId: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  ctaText?: string;
  ctaLink: string;
  displayOrder: number;
  isActive: boolean;
}

export interface WebConfigurationEntity {
  siteName: string;
  hotline: string;
  supportEmail: string;
  officeAddress: string;
  socialLinks: Record<string, string>;
  isMaintenanceMode: boolean;
  defaultCurrency: string;
  supportedLocales: string[];
}

export interface IBannerManagerService {
  listActiveBanners(): Promise<HeroBannerEntity[]>;
  createBanner(banner: Omit<HeroBannerEntity, "bannerId">): Promise<HeroBannerEntity>;
  updateBanner(bannerId: string, updates: Partial<HeroBannerEntity>): Promise<void>;
  deleteBanner(bannerId: string): Promise<void>;
}

export interface IWebConfigService {
  getConfig(): Promise<WebConfigurationEntity>;
  updateConfig(updates: Partial<WebConfigurationEntity>, adminId: string): Promise<void>;
}
