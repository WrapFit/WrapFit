'use client';

/** `/admin/media`: files uploaded to the storage (S3 / R2). No admin listing API yet: example figures (SampleScreen). */

import React from 'react';
import { Badge } from '@/components/workspace';
import { SampleScreen } from '@/views/admin/shared/SampleScreen';

interface MediaFile {
  name: string;
  purpose: 'LOGO' | 'IMAGE' | 'THUMBNAIL' | 'AVATAR' | 'EXPORT';
  owner: string;
  size: string;
  uploaded: string;
}

const FILES: MediaFile[] = [
  { name: 'logo-tiem-nen-moc.svg', purpose: 'LOGO', owner: 'Tiệm nến Mộc', size: '48 KB', uploaded: '13/10/2026' },
  { name: 'hoa-van-tet-2027.png', purpose: 'IMAGE', owner: 'Ngọc Anh', size: '2,4 MB', uploaded: '13/10/2026' },
  { name: 'hop-tra-shan-tuyet.pdf', purpose: 'EXPORT', owner: 'Bạc Hà Jewelry', size: '6,1 MB', uploaded: '12/10/2026' },
  { name: 'thumb-hop-socola.webp', purpose: 'THUMBNAIL', owner: 'Minh Khoa', size: '86 KB', uploaded: '12/10/2026' },
  { name: 'avatar-thu-ha.jpg', purpose: 'AVATAR', owner: 'Thu Hà', size: '310 KB', uploaded: '11/10/2026' },
];

const PURPOSE: Record<MediaFile['purpose'], string> = { LOGO: 'Logo', IMAGE: 'Ảnh trên hộp', THUMBNAIL: 'Ảnh thu nhỏ', AVATAR: 'Ảnh đại diện', EXPORT: 'File in' };

export default function AdminMediaPage() {
  return (
    <SampleScreen<MediaFile>
      title="Thư viện media"
      description="Ảnh, logo, ảnh thu nhỏ và file in người dùng đã lưu trên WrapFit."
      note="API chưa có danh sách tệp cho quản trị viên; dung lượng của từng người dùng xem qua GET /storage/usage. Danh sách dưới đây là ví dụ."
      stats={[
        { label: 'Tổng tệp', value: '18.240' },
        { label: 'Dung lượng', value: '412 GB' },
        { label: 'Tải lên hôm nay', value: '326' },
        { label: 'File in đã xuất', value: '2.105' },
      ]}
      tableTitle="Tệp mới nhất"
      rows={FILES}
      rowKey={(file) => file.name}
      columns={[
        { key: 'name', label: 'Tệp', render: (file) => <span className="font-mono text-xs">{file.name}</span> },
        { key: 'purpose', label: 'Loại', render: (file) => <Badge>{PURPOSE[file.purpose]}</Badge> },
        { key: 'owner', label: 'Chủ sở hữu', render: (file) => file.owner },
        { key: 'size', label: 'Dung lượng', align: 'right', render: (file) => file.size },
        { key: 'uploaded', label: 'Ngày tải', align: 'right', render: (file) => file.uploaded },
      ]}
    />
  );
}
