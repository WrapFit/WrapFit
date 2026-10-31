/**
 * Dashboard feature: recent projects, the project grid with its lifecycle (archive, trash, restore, permanent
 * deletion), folders (`/collections`), storage / AI usage, plus helpers shared by the profile and settings screens
 * (uploads, dialogs, formatting).
 */
export { CollectionDialog } from "./components/CollectionDialog";
export { DesignStats, formatDuration } from "./components/DesignStats";
export { ConfirmDialog, DIALOG_CANCEL, DIALOG_DANGER, DIALOG_PANEL } from "./components/ConfirmDialog";
export { FolderBar, NO_FOLDER } from "./components/FolderBar";
export type { FolderFilter } from "./components/FolderBar";
export { ModalDialog } from "./components/ModalDialog";
export { MoveToFolderDialog } from "./components/MoveToFolderDialog";
export { ProjectCard } from "./components/ProjectCard";
export type { ProjectCardActions } from "./components/ProjectCard";
export { ProjectThumb } from "./components/ProjectThumb";
export { RecentProjectCard, RecentProjectSkeleton } from "./components/RecentProjectCard";
export { AiUsageTile, StorageUsageTile } from "./components/UsageTiles";
export { showActionError } from "./errors";
export {
  COLLECTION_COLORS,
  HEX_COLOR,
  MAX_COLLECTIONS,
  SORT_OPTIONS,
  STATUS_TABS,
  TRASH_RETENTION_DAYS,
  daysUntilPurge,
  dimensionsLabel,
  fitCheckLabel,
  fitCheckTone,
  formatBytes,
  formatCount,
  formatDate,
  formatRelative,
  materialLabel,
  purgeLabel,
  readableInk,
} from "./format";
export type { SortOption } from "./format";
export {
  UPLOAD_RULES,
  showUploadError,
  uploadAccept,
  uploadErrorMessage,
  uploadProblem,
  useFileUpload,
} from "./upload";
export { useCollections, useCreateCollection, useDeleteCollection, useUpdateCollection } from "./useCollections";
export { useDebouncedValue } from "./useDebouncedValue";
export {
  PROJECTS_PAGE_SIZE,
  RECENT_PROJECTS_QUERY,
  useBusyProjectIds,
  useChangeProjectStatus,
  useDeleteProjectPermanently,
  useDuplicateProject,
  useMoveProject,
  useProjectCount,
  useProjectList,
} from "./useProjects";
export { usagePercent, useAiUsage, useStorageUsage } from "./useUsage";
export { useAnalyticsSummary } from "./useAnalytics";
export {
  DEMO_COLLECTIONS,
  DEMO_EXPORTS,
  DEMO_HEALTH,
  DEMO_ORDERS,
  DEMO_PRINT_SHOPS,
  DEMO_PROJECTS,
  DEMO_STORAGE_USAGE,
  DEMO_USER,
  DEMO_USERS,
  getDemoProjectDetail,
} from "./demoData";
