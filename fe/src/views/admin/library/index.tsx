"use client";

/**
 * `/admin/library`: imports assets into the shared library (`POST /library/assets`) and manages them
 * (`GET /library/assets/manage`, `PATCH /library/assets/:id`). The API refuses unsafe SVGs, rasters too small to print
 * 50 mm at 300 DPI and CC-BY files without their credit line; the reason is shown under the form.
 */

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus } from "lucide-react";
import { ApiError, createLibraryAsset, listLibraryLicenses, manageLibraryAssets, updateLibraryAsset, uploadFileToStorage } from "@/api";
import { Button, Field, Input, Select } from "@/components/ui";
import { AdminShell, Badge, DataTable, Panel, PanelTitle, Toggle, WorkspaceEmpty, WorkspaceError } from "@/components/workspace";
import { useToast } from "@/components/common/Toast";
import { RequireAuth } from "@/features/auth";
import { queryKeys } from "@/hooks/data";
import type { LibraryAsset, LibraryAssetCategory, LibraryLicense, Occasion } from "@/types/api";

const CATEGORIES: { value: LibraryAssetCategory; label: string }[] = [
  { value: "STICKER", label: "Tem, sticker" },
  { value: "LABEL", label: "Nhãn, khung nhãn" },
  { value: "ILLUSTRATION", label: "Hình minh họa" },
  { value: "BACKGROUND", label: "Nền, hoa văn" },
  { value: "ICON", label: "Biểu tượng" },
];
const OCCASIONS: { value: Occasion; label: string }[] = [
  { value: "TET", label: "Tết" },
  { value: "CHRISTMAS", label: "Giáng Sinh" },
  { value: "WEDDING", label: "Cưới hỏi" },
  { value: "VALENTINE", label: "Valentine" },
  { value: "BIRTHDAY", label: "Sinh nhật" },
  { value: "MINIMAL", label: "Quanh năm" },
];
/** Shown while the API's list loads (same ids as be/src/library/library-file.rules.ts). */
const FALLBACK_LICENSES: LibraryLicense[] = [
  { id: "CC0-1.0", name: "CC0 / Public Domain Dedication", attribution: false },
  { id: "OWN-WORK", name: "WrapFit tự thiết kế", attribution: false },
];

export default function AdminLibraryPage() {
  return (
    <RequireAuth role="ADMIN">
      <AdminLibraryScreen />
    </RequireAuth>
  );
}

function AdminLibraryScreen() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<LibraryAssetCategory>("STICKER");
  const [license, setLicense] = useState("CC0-1.0");
  const [sourceUrl, setSourceUrl] = useState("");
  const [attribution, setAttribution] = useState("");
  const [tags, setTags] = useState("");
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const licenses = useQuery({ queryKey: queryKeys.library.licenses, queryFn: listLibraryLicenses, staleTime: 3600_000 });
  const assets = useQuery({ queryKey: queryKeys.library.manage({}), queryFn: () => manageLibraryAssets({ limit: 100 }) });
  const licenseList = licenses.data ?? FALLBACK_LICENSES;
  const needsCredit = licenseList.find((l) => l.id === license)?.attribution ?? false;

  const create = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Chọn một file SVG, PNG, JPEG hoặc WebP.");
      const purpose = file.type === "image/svg+xml" ? "LOGO" : "IMAGE";
      const { fileUrl } = await uploadFileToStorage(file, purpose);
      return createLibraryAsset({
        fileUrl,
        title,
        category,
        license,
        sourceUrl: sourceUrl || undefined,
        attribution: attribution || undefined,
        tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        occasions,
      });
    },
    onSuccess: (asset) => {
      toast.show({ tone: "success", title: "Đã thêm vào thư viện", description: asset.title });
      setFile(null);
      setTitle("");
      setTags("");
      setError(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.library.all });
    },
    onError: (err) => setError(err instanceof ApiError || err instanceof Error ? err.message : "Chưa thêm được tài nguyên."),
  });

  const toggle = useMutation({
    mutationFn: (asset: LibraryAsset) => updateLibraryAsset(asset.id, { isActive: !asset.isActive }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.library.all }),
    onError: (err) => toast.error(err, "Chưa đổi được trạng thái"),
  });

  return (
    <AdminShell
      title="Thư viện tài nguyên"
      description="Nhập sticker, nhãn, hình minh họa và nền từ nguồn có giấy phép in thương mại. Mọi người dùng thấy chúng trong studio."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <Panel aria-labelledby="library-import">
          <PanelTitle id="library-import">Nhập tài nguyên</PanelTitle>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              setError(null);
              create.mutate();
            }}
          >
            <Field label="File" hint="SVG (vector, an toàn), hoặc PNG / JPEG / WebP có cạnh dài ≥ 591 px (50 mm ở 300 DPI).">
              {(control) => (
                <Input
                  {...control}
                  type="file"
                  accept="image/svg+xml,image/png,image/jpeg,image/webp"
                  required
                  onChange={(event) => {
                    const picked = event.target.files?.[0] ?? null;
                    setFile(picked);
                    if (picked && !title) setTitle(picked.name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " "));
                  }}
                />
              )}
            </Field>
            <Field label="Tên hiển thị" required>
              {(control) => <Input {...control} value={title} onChange={(e) => setTitle(e.target.value)} minLength={2} maxLength={120} required />}
            </Field>
            <Field label="Loại">
              {(control) => (
                <Select {...control} value={category} onChange={(e) => setCategory(e.target.value as LibraryAssetCategory)}>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Giấy phép" hint="Chỉ nhận giấy phép cho phép in lên sản phẩm bán ra.">
              {(control) => (
                <Select {...control} value={license} onChange={(e) => setLicense(e.target.value)}>
                  {licenseList.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Nguồn (URL)">
              {(control) => <Input {...control} type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…" />}
            </Field>
            <Field label="Ghi nguồn tác giả" required={needsCredit} hint={needsCredit ? "Giấy phép này bắt buộc ghi nguồn." : undefined}>
              {(control) => <Input {...control} value={attribution} onChange={(e) => setAttribution(e.target.value)} required={needsCredit} maxLength={300} />}
            </Field>
            <Field label="Từ khóa" hint="Cách nhau bằng dấu phẩy: tết, hoa sen, vàng kim">
              {(control) => <Input {...control} value={tags} onChange={(e) => setTags(e.target.value)} />}
            </Field>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-label text-fg">Dịp</legend>
              <div className="flex flex-wrap gap-1.5">
                {OCCASIONS.map((o) => {
                  const on = occasions.includes(o.value);
                  return (
                    <Button
                      key={o.value}
                      type="button"
                      size="sm"
                      variant={on ? "dark" : "secondary"}
                      aria-pressed={on}
                      onClick={() => setOccasions(on ? occasions.filter((v) => v !== o.value) : [...occasions, o.value])}
                    >
                      {o.label}
                    </Button>
                  );
                })}
              </div>
            </fieldset>
            {error && (
              <p role="alert" className="rounded-control bg-danger-bg px-3 py-2 text-body-sm text-danger-fg">
                {error}
              </p>
            )}
            <Button type="submit" variant="brand" leadingIcon={<ImagePlus className="size-4" aria-hidden />} disabled={create.isPending}>
              {create.isPending ? "Đang kiểm tra file…" : "Thêm vào thư viện"}
            </Button>
          </form>
        </Panel>

        <Panel aria-labelledby="library-list">
          <PanelTitle id="library-list" action={<span className="text-body-sm text-fg-muted">{assets.data ? `${assets.data.meta.total} tài nguyên` : ""}</span>}>
            Trong thư viện
          </PanelTitle>
          {assets.error ? (
            <WorkspaceError title="Chưa tải được thư viện" onRetry={() => void assets.refetch()} />
          ) : assets.data && assets.data.items.length === 0 ? (
            <WorkspaceEmpty title="Thư viện còn trống" description="Nhập tài nguyên đầu tiên ở khung bên trái." />
          ) : (
            <DataTable<LibraryAsset>
              label="Tài nguyên của thư viện"
              rows={assets.data?.items ?? []}
              rowKey={(asset) => asset.id}
              columns={[
                {
                  key: "preview",
                  label: "Xem trước",
                  render: (asset) =>
                    asset.url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- files of the library, any size
                      <img src={asset.url} alt="" className="size-12 rounded-control bg-canvas object-contain" loading="lazy" />
                    ) : null,
                },
                { key: "title", label: "Tên", render: (asset) => <span className="font-semibold">{asset.title}</span> },
                { key: "category", label: "Loại", render: (asset) => <Badge>{CATEGORIES.find((c) => c.value === asset.category)?.label ?? asset.category}</Badge> },
                { key: "license", label: "Giấy phép", render: (asset) => <span className="text-body-sm">{asset.license}</span> },
                {
                  key: "print",
                  label: "Cỡ in tối đa",
                  align: "right",
                  render: (asset) => <span className="tabular-nums">{asset.isVector ? "vector" : `${asset.maxPrintMm} mm`}</span>,
                },
                {
                  key: "active",
                  label: "Hiện",
                  align: "right",
                  render: (asset) => (
                    <Toggle checked={asset.isActive} onChange={() => toggle.mutate(asset)} label={`Hiện “${asset.title}” trong studio`} disabled={toggle.isPending} />
                  ),
                },
              ]}
            />
          )}
        </Panel>
      </div>
    </AdminShell>
  );
}
