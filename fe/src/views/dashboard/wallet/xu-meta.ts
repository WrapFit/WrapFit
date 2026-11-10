import { Coins, Crown, FileDown, Gift, Palette, QrCode, Settings2, Sparkles, Wand2, type LucideIcon } from 'lucide-react';
import type { Tone } from '@/assets/styles/tokens';
import type { XuHistoryEntry, XuHistoryType } from '@/types/api';

/** Labels and icons of the xu ledger, shared by the lots list and the history table. */

export interface LedgerMeta {
  label: string;
  sub: string;
  icon: LucideIcon;
  tone: Tone;
}

type Source = NonNullable<XuHistoryEntry['source']>;
type Reason = NonNullable<XuHistoryEntry['reason']>;

export const SOURCE_META: Record<Source, LedgerMeta> = {
  PLAN_ALLOWANCE: { label: 'Định mức gói', sub: 'Cấp theo gói thành viên', icon: Crown, tone: 'info' },
  PURCHASE: { label: 'Nạp xu', sub: 'Mua gói xu Wrap', icon: QrCode, tone: 'success' },
  ADMIN: { label: 'Quà tặng WrapFit', sub: 'Thưởng từ hệ thống', icon: Gift, tone: 'warning' },
};

export const REASON_META: Record<Reason, LedgerMeta> = {
  AI_IMAGE: { label: 'Ảnh mặt hộp AI', sub: 'Chi tiêu', icon: Sparkles, tone: 'neutral' },
  AI_PATTERN: { label: 'Hoa văn AI', sub: 'Chi tiêu', icon: Palette, tone: 'neutral' },
  AI_TOOL: { label: 'Xử lý ảnh AI', sub: 'Chi tiêu', icon: Wand2, tone: 'neutral' },
  EXPORT_UNLOCK: { label: 'Xuất file in CAD', sub: 'Chi tiêu', icon: FileDown, tone: 'neutral' },
  ADMIN_ADJUSTMENT: { label: 'Điều chỉnh số dư', sub: 'Quản trị viên điều chỉnh', icon: Settings2, tone: 'warning' },
};

const FALLBACK: LedgerMeta = { label: 'Giao dịch xu', sub: '', icon: Coins, tone: 'neutral' };

/** Icon, title and tone of one history line. */
export function entryMeta(entry: XuHistoryEntry): LedgerMeta {
  if (entry.type === 'GRANT') return (entry.source && SOURCE_META[entry.source]) || FALLBACK;
  return (entry.reason && REASON_META[entry.reason]) || FALLBACK;
}

/** Tabs above the history table; the value is the `type` sent to the API. */
export const HISTORY_TABS: { value: 'all' | XuHistoryType; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'grant', label: 'Nạp' },
  { value: 'spend', label: 'Chi tiêu' },
  { value: 'adjust', label: 'Điều chỉnh' },
];

export const xu = (count: number) => `${count.toLocaleString('vi-VN')} xu`;
export const day = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');
export const dayTime = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
