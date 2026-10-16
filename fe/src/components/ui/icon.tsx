import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  ArrowRight,
  Badge as BadgeIcon,
  Box,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  CircleX,
  Copy,
  DraftingCompass,
  FilePen,
  Folder,
  FolderInput,
  FolderMinus,
  FolderOpen,
  FolderPlus,
  FolderHeart,
  Info,
  Loader2,
  Lock,
  LockOpen,
  LogIn,
  LogOut,
  Mail,
  MailCheck,
  MonitorSmartphone,
  MoreHorizontal,
  Palette,
  Pencil,
  ReceiptText,
  RotateCcw,
  Ruler,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Trash,
  Trash2,
  UserCog,
  X,
  type LucideIcon,
} from "lucide-react";
import React from "react";

/**
 * The app's icons are lucide-react (2 px stroke, round caps, 24 px grid). `<Icon name>` takes the Material Symbols
 * names older screens were written with and draws the matching lucide icon, so every screen shares one icon style.
 * Name new icons after what they show (lucide's own names) and import them directly.
 */
export const ICONS: Record<string, LucideIcon> = {
  arrow_back: ArrowLeft,
  arrow_forward: ArrowRight,
  archive: Archive,
  architecture: DraftingCompass,
  badge: BadgeIcon,
  cancel: CircleX,
  check: Check,
  check_circle: CheckCircle2,
  close: X,
  content_copy: Copy,
  create_new_folder: FolderPlus,
  delete: Trash2,
  delete_forever: Trash,
  devices: MonitorSmartphone,
  drive_file_move: FolderInput,
  edit: Pencil,
  edit_note: FilePen,
  error: CircleAlert,
  expand_less: ChevronUp,
  expand_more: ChevronDown,
  folder: Folder,
  folder_delete: FolderMinus,
  folder_open: FolderOpen,
  folder_special: FolderHeart,
  info: Info,
  inventory_2: Archive,
  lock: Lock,
  lock_open: LockOpen,
  login: LogIn,
  logout: LogOut,
  mail: Mail,
  manage_accounts: UserCog,
  mark_email_read: MailCheck,
  more_horiz: MoreHorizontal,
  palette: Palette,
  progress_activity: Loader2,
  receipt_long: ReceiptText,
  restore: RotateCcw,
  shield_person: Shield,
  straighten: Ruler,
  sync_lock: ShieldCheck,
  tune: SlidersHorizontal,
  unarchive: ArchiveRestore,
  verified: ShieldCheck,
  view_in_ar: Box,
};

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, "ref"> {
  size?: string | number;
  strokeWidth?: string | number;
  /** Material Symbols name ("arrow_forward") or a lucide-style name present in ICONS. */
  name: string;
}

export function Icon({ name, strokeWidth = 2, ...rest }: IconProps) {
  const Component = ICONS[name] ?? CircleAlert;
  return <Component aria-hidden strokeWidth={strokeWidth} {...rest} />;
}
