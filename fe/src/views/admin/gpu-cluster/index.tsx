'use client';

/** `/admin/gpu-cluster`: render servers of the 3D previews. No API yet: example figures (SampleScreen). */

import React from 'react';
import { Badge, Meter } from '@/components/workspace';
import { SampleScreen } from '@/views/admin/shared/SampleScreen';

interface RenderNode {
  id: string;
  region: string;
  gpu: string;
  load: number;
  jobs: number;
  state: 'online' | 'busy' | 'maintenance';
}

const NODES: RenderNode[] = [
  { id: 'render-hcm-01', region: 'TP. Hồ Chí Minh', gpu: 'NVIDIA L4 · 24 GB', load: 42, jobs: 3, state: 'online' },
  { id: 'render-hcm-02', region: 'TP. Hồ Chí Minh', gpu: 'NVIDIA L4 · 24 GB', load: 87, jobs: 7, state: 'busy' },
  { id: 'render-hn-01', region: 'Hà Nội', gpu: 'NVIDIA T4 · 16 GB', load: 18, jobs: 1, state: 'online' },
  { id: 'render-sg-01', region: 'Singapore', gpu: 'NVIDIA A10G · 24 GB', load: 0, jobs: 0, state: 'maintenance' },
];

const STATE = {
  online: { tone: 'green', label: 'Sẵn sàng' },
  busy: { tone: 'amber', label: 'Tải cao' },
  maintenance: { tone: 'grey', label: 'Bảo trì' },
} as const;

export default function AdminGpuClusterPage() {
  return (
    <SampleScreen<RenderNode>
      title="Máy chủ render"
      description="Máy dựng ảnh 3D chất lượng cao cho trang chia sẻ và mockup."
      note="Studio hiện dựng 3D ngay trên trình duyệt (WebGL), chưa có máy chủ render. Số liệu dưới đây là ví dụ cho khi có dịch vụ dựng ảnh phía máy chủ."
      stats={[
        { label: 'Máy đang chạy', value: '3 / 4' },
        { label: 'Việc đang dựng', value: '11' },
        { label: 'Thời gian dựng TB', value: '6,4 giây' },
        { label: 'Tải trung bình', value: '49%' },
      ]}
      tableTitle="Danh sách máy"
      rows={NODES}
      rowKey={(node) => node.id}
      columns={[
        { key: 'id', label: 'Máy', render: (node) => <span className="font-mono text-xs">{node.id}</span> },
        { key: 'region', label: 'Vùng', render: (node) => node.region },
        { key: 'gpu', label: 'GPU', render: (node) => node.gpu },
        {
          key: 'load',
          label: 'Tải',
          render: (node) => (
            <span className="flex w-36 items-center gap-2">
              <span className="flex-1">
                <Meter percent={node.load} label={`Tải của ${node.id}`} />
              </span>
              <span className="w-9 text-right font-mono text-xs">{node.load}%</span>
            </span>
          ),
        },
        { key: 'jobs', label: 'Việc', align: 'right', render: (node) => node.jobs },
        { key: 'state', label: 'Trạng thái', align: 'right', render: (node) => <Badge tone={STATE[node.state].tone}>{STATE[node.state].label}</Badge> },
      ]}
    />
  );
}
