"use client";

import React, { useId, useRef, useState } from "react";
import type { Collection, UpdateCollectionRequest } from "@/types/api";
import { COLLECTION_COLORS, HEX_COLOR, readableInk } from "../format";
import { useCreateCollection, useUpdateCollection } from "../useCollections";
import { DIALOG_CANCEL, DIALOG_PANEL } from "./ConfirmDialog";
import { ModalDialog } from "./ModalDialog";
import { Icon } from "@/components/ui";

const TITLE_MAX = 100;
const DESCRIPTION_MAX = 500;

const FIELD =
  "min-h-[44px] w-full rounded-lg border border-library-line bg-white px-3.5 py-2.5 text-sm text-library-ink placeholder:text-library-muted focus:border-fpt-orange focus:outline-none focus:ring-[3px] focus:ring-fpt-orange/20";
const SUBMIT =
  "flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-fpt-orange px-5 py-2.5 text-sm font-medium text-white transition-colors enabled:hover:bg-action-hover disabled:cursor-wait disabled:opacity-60 focus-visible:ring-[3px] focus-visible:ring-fpt-orange/30";

interface CollectionDialogProps {
  /** Edits this folder; creates a new one when omitted. */
  collection?: Collection;
  onClose(): void;
  onSaved?(collection: Collection): void;
}

/** Create, rename, recolour or describe a project folder (`POST` / `PATCH /collections`). */
export function CollectionDialog({ collection, onClose, onSaved }: CollectionDialogProps) {
  const titleId = useId();
  const nameId = useId();
  const nameErrorId = useId();
  const descriptionId = useId();
  const customColorId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const create = useCreateCollection();
  const update = useUpdateCollection();
  const saving = create.isPending || update.isPending;

  const [title, setTitle] = useState(collection?.title ?? "");
  const [color, setColor] = useState((collection?.colorTag ?? COLLECTION_COLORS[0].value).toUpperCase());
  const [description, setDescription] = useState(collection?.description ?? "");
  const [submitted, setSubmitted] = useState(false);

  const trimmed = title.trim();
  const titleError = !trimmed
    ? "Hãy đặt tên cho thư mục."
    : trimmed.length > TITLE_MAX
      ? `Tên tối đa ${TITLE_MAX} ký tự.`
      : null;
  const preset = COLLECTION_COLORS.some((option) => option.value.toUpperCase() === color);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (titleError || description.length > DESCRIPTION_MAX || !HEX_COLOR.test(color) || saving) {
      if (titleError) nameRef.current?.focus();
      return;
    }
    const done = (saved: Collection) => {
      onSaved?.(saved);
      onClose();
    };
    const text = description.trim();
    if (!collection) {
      create.mutate({ title: trimmed, colorTag: color, ...(text && { description: text }) }, { onSuccess: done });
      return;
    }
    const data: UpdateCollectionRequest = {};
    if (trimmed !== collection.title) data.title = trimmed;
    if (color !== (collection.colorTag ?? "").toUpperCase()) data.colorTag = color;
    if (text !== (collection.description ?? "")) data.description = text || null;
    if (Object.keys(data).length === 0) return onClose();
    update.mutate({ collection, data }, { onSuccess: done });
  };

  return (
    <ModalDialog
      onClose={saving ? () => undefined : onClose}
      labelledBy={titleId}
      initialFocus={nameRef}
      panelClassName={DIALOG_PANEL}
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center shadow-sm"
            style={{ backgroundColor: HEX_COLOR.test(color) ? color : "#D4A373", color: readableInk(color) }}
          >
            <Icon name={collection ? "folder_open" : "create_new_folder"} className="size-5" />
          </span>
          <h2
            id={titleId}
            className="pt-1.5 text-xl font-medium leading-snug text-library-ink"
          >
            {collection ? "Sửa thư mục" : "Thư mục mới"}
          </h2>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={nameId} className="text-sm font-semibold text-library-ink">
            Tên thư mục
          </label>
          <input
            ref={nameRef}
            id={nameId}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={TITLE_MAX + 20}
            placeholder="Ví dụ: Bộ hộp quà Tết 2027"
            aria-invalid={submitted && Boolean(titleError)}
            aria-describedby={submitted && titleError ? nameErrorId : undefined}
            className={FIELD}
          />
          {submitted && titleError && (
            <p id={nameErrorId} className="text-xs text-danger-fg">
              {titleError}
            </p>
          )}
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-semibold text-library-ink">Màu nhãn</legend>
          <div className="flex flex-wrap items-center gap-1.5">
            {COLLECTION_COLORS.map((option) => {
              const selected = option.value.toUpperCase() === color;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`${option.name} ${option.value}`}
                  title={option.name}
                  onClick={() => setColor(option.value.toUpperCase())}
                  className="w-11 h-11 rounded-full flex items-center justify-center focus-visible:ring-2 focus-visible:ring-fpt-orange"
                >
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center ring-offset-2 transition-shadow ${
                      selected ? "ring-2 ring-library-ink" : "ring-1 ring-black/10"
                    }`}
                    style={{ backgroundColor: option.value }}
                  >
                    {selected && (
                      <Icon name="check" className="size-4" style={{ color: readableInk(option.value) }} />
                    )}
                  </span>
                </button>
              );
            })}
            <label
              htmlFor={customColorId}
              title="Màu khác"
              className={`relative w-11 h-11 rounded-full flex items-center justify-center cursor-pointer focus-within:ring-2 focus-within:ring-fpt-orange`}
            >
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center ring-offset-2 ${
                  preset
                    ? "ring-1 ring-black/10 bg-[conic-gradient(#FF6B6B,#FFD93D,#38A169,#2563EB,#FF6B6B)]"
                    : "ring-2 ring-library-ink"
                }`}
                style={preset ? undefined : { backgroundColor: color }}
              />
              <span className="sr-only">Màu khác</span>
              <input
                id={customColorId}
                type="color"
                value={HEX_COLOR.test(color) ? color.toLowerCase() : "#d4a373"}
                onChange={(event) => setColor(event.target.value.toUpperCase())}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </label>
          </div>
          <p className="font-mono text-cad-spec-micro uppercase tracking-wider text-library-muted">{color}</p>
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={descriptionId} className="text-sm font-semibold text-library-ink">
            Ghi chú <span className="font-normal text-library-muted">(không bắt buộc)</span>
          </label>
          <textarea
            id={descriptionId}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            placeholder="Chiến dịch, hạn giao, khách hàng…"
            className={`${FIELD} resize-none`}
          />
          <p
            className={`text-right font-mono text-cad-spec-micro ${
              description.length > DESCRIPTION_MAX ? "text-danger-fg" : "text-library-muted"
            }`}
          >
            {description.length}/{DESCRIPTION_MAX}
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className={DIALOG_CANCEL}>
            Huỷ
          </button>
          <button type="submit" disabled={saving} className={SUBMIT}>
            {saving && (
              <Icon name="progress_activity" className="size-[18px] animate-spin motion-reduce:animate-none" />
            )}
            {saving ? "Đang lưu…" : collection ? "Lưu thay đổi" : "Tạo thư mục"}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}
