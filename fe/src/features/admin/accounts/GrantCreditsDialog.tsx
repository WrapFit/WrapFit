'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Coins, FileDown, PlusCircle } from 'lucide-react';
import { grantUserCredits, type GrantCreditsRequest } from '@/api/admin';
import { useToast } from '@/components/common/Toast';
import { Button, Dialog, Input, Select } from '@/components/ui';
import { queryKeys } from '@/hooks/data';
import type { SafeUser } from '@/types/api';
import { displayName } from './accountFormat';

export interface GrantCreditsDialogProps {
  user: SafeUser;
  onClose(): void;
}

export function GrantCreditsDialog({ user, onClose }: GrantCreditsDialogProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<'XU' | 'EXPORT'>('XU');
  const [quantity, setQuantity] = useState<number>(100);
  const [expiresInDays, setExpiresInDays] = useState<number>(365);
  const [note, setNote] = useState<string>('Hỗ trợ người dùng');

  const mutation = useMutation({
    mutationFn: (data: GrantCreditsRequest) => grantUserCredits(user.id, data),
    onSuccess: () => {
      toast.show({
        tone: 'success',
        title: 'Cấp tài nguyên thành công',
        description: `Đã cấp ${quantity.toLocaleString('vi-VN')} ${kind === 'XU' ? 'xu Wrap' : 'lượt xuất'} cho ${displayName(user)}.`,
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.user(user.id) });
      onClose();
    },
    onError: (error) => {
      toast.error(error, 'Chưa cấp được tài nguyên');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) return;
    mutation.mutate({
      kind,
      quantity,
      expiresInDays: expiresInDays > 0 ? expiresInDays : undefined,
      note: note.trim() || undefined,
    });
  };

  return (
    <Dialog
      title="Cấp xu / Lượt xuất thủ công"
      description={`Cấp tài nguyên cho ${displayName(user)} (${user.email})`}
      icon={<PlusCircle className="size-5 text-fpt-orange-ink" aria-hidden />}
      onClose={onClose}
      size="md"
      busy={mutation.isPending}
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={mutation.isPending}>
            Hủy
          </Button>
          <Button
            variant="brand"
            size="sm"
            loading={mutation.isPending}
            loadingLabel="Đang cấp…"
            onClick={handleSubmit}
          >
            Xác nhận cấp
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        <div className="space-y-1.5">
          <label className="block text-caption font-semibold text-library-ink">Loại tài nguyên</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setKind('XU');
                if (quantity < 100) setQuantity(100);
              }}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all ${
                kind === 'XU'
                  ? 'border-fpt-orange bg-orange-50/40 text-fpt-orange-ink shadow-xs'
                  : 'border-library-line bg-white text-library-muted hover:border-library-ink/30'
              }`}
            >
              <Coins className="size-4" aria-hidden />
              <span>Xu Wrap (AI)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setKind('EXPORT');
                if (quantity > 100) setQuantity(5);
              }}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all ${
                kind === 'EXPORT'
                  ? 'border-fpt-orange bg-orange-50/40 text-fpt-orange-ink shadow-xs'
                  : 'border-library-line bg-white text-library-muted hover:border-library-ink/30'
              }`}
            >
              <FileDown className="size-4" aria-hidden />
              <span>Lượt xuất file in</span>
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-caption font-semibold text-library-ink">
            {kind === 'XU' ? 'Số lượng xu (1–100.000 xu)' : 'Số lượt xuất (1–100 lượt)'}
          </label>
          <Input
            type="number"
            min={1}
            max={kind === 'XU' ? 100000 : 100}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value) || 1)}
            required
            className="font-mono text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-caption font-semibold text-library-ink">Thời hạn hiệu lực</label>
          <Select
            value={String(expiresInDays)}
            onChange={(e) => setExpiresInDays(Number(e.target.value))}
          >
            <option value="30">30 ngày</option>
            <option value="90">90 ngày (3 tháng)</option>
            <option value="365">365 ngày (12 tháng - chuẩn)</option>
            <option value="0">Không giới hạn thời gian</option>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-caption font-semibold text-library-ink">Lý do / Ghi chú quản trị</label>
          <Input
            type="text"
            value={note}
            maxLength={150}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Vd. Hỗ trợ sự cố thanh toán, cấp thử nghiệm đối tác"
            className="text-sm"
          />
        </div>
      </form>
    </Dialog>
  );
}
