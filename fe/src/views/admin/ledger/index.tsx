'use client';

/** `/admin/ledger`: payment transactions. No billing API yet: example rows (SampleScreen). */

import React from 'react';
import { Badge } from '@/components/workspace';
import { formatUsd } from '@/features/pricing';
import { SampleScreen } from '@/views/admin/shared/SampleScreen';

interface Transaction {
  id: string;
  date: string;
  customer: string;
  item: string;
  method: string;
  amount: number;
  state: 'paid' | 'pending' | 'refunded';
}

const ROWS: Transaction[] = [
  { id: 'WF-24081', date: '13/10/2026 09:42', customer: 'Tiệm nến Mộc', item: 'Pro · 30 ngày', method: 'VietQR', amount: 99_000, state: 'paid' },
  { id: 'WF-24080', date: '13/10/2026 08:15', customer: 'Bạc Hà Jewelry', item: '15 lượt xuất', method: 'Chuyển khoản', amount: 199_000, state: 'pending' },
  { id: 'WF-24079', date: '12/10/2026 21:03', customer: 'Minh Khoa Studio', item: '5 lượt xuất', method: 'Ví MoMo', amount: 79_000, state: 'paid' },
  { id: 'WF-24078', date: '12/10/2026 16:27', customer: 'Trà Shan Hà Giang', item: 'Pro · 30 ngày', method: 'VietQR', amount: 99_000, state: 'refunded' },
  { id: 'WF-24077', date: '11/10/2026 10:50', customer: 'Bánh quy Bơ Nhà Làm', item: '1 lượt xuất', method: 'VietQR', amount: 19_000, state: 'paid' },
];

const STATE = {
  paid: { tone: 'green', label: 'Đã thanh toán' },
  pending: { tone: 'amber', label: 'Chờ đối soát' },
  refunded: { tone: 'grey', label: 'Đã hoàn tiền' },
} as const;

export default function AdminLedgerPage() {
  return (
    <SampleScreen<Transaction>
      title="Sổ giao dịch"
      description="Các khoản thanh toán gói dịch vụ và trạng thái đối soát."
      note="Chưa có cổng thanh toán nên chưa có giao dịch thật. Các dòng dưới đây là ví dụ, theo giá gói hiện hành."
      stats={[
        { label: 'Giao dịch tháng này', value: '312' },
        { label: 'Chờ đối soát', value: '4' },
        { label: 'Hoàn tiền', value: '2' },
        { label: 'Tỉ lệ thành công', value: '98,1%' },
      ]}
      tableTitle="Giao dịch gần đây"
      rows={ROWS}
      rowKey={(row) => row.id}
      columns={[
        { key: 'id', label: 'Mã', render: (row) => <span className="font-mono text-xs">{row.id}</span> },
        { key: 'date', label: 'Thời gian', render: (row) => <span className="whitespace-nowrap">{row.date}</span> },
        { key: 'customer', label: 'Khách hàng', render: (row) => row.customer },
        { key: 'item', label: 'Gói', render: (row) => row.item },
        { key: 'method', label: 'Phương thức', render: (row) => row.method },
        { key: 'amount', label: 'Số tiền', align: 'right', render: (row) => <span className="font-medium">{formatUsd(row.amount)}</span> },
        { key: 'state', label: 'Trạng thái', align: 'right', render: (row) => <Badge tone={STATE[row.state].tone}>{STATE[row.state].label}</Badge> },
      ]}
    />
  );
}
