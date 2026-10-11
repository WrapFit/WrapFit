"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadFileToStorage } from "@/api/storage";
import type { ToastApi } from "@/components/common/Toast";
import { queryKeys } from "@/hooks/data";
import { errorMessage, isApiError } from "@/services/api";
import type { UploadPurpose } from "@/types/api";
import { formatBytes } from "./format";

const MB = 1024 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
const IMAGE_FORMATS = "PNG, JPEG hoặc WebP";

/** Same rules as `be/src/storage/storage.rules.ts`: checked here first so a wrong file never reaches the API. */
export const UPLOAD_RULES: Record<UploadPurpose, { types: readonly string[]; maxBytes: number; formats: string }> = {
  LOGO: {
    types: [...IMAGE_TYPES, "image/svg+xml", "application/pdf"],
    maxBytes: 15 * MB,
    formats: "PNG, JPEG, WebP, SVG hoặc PDF",
  },
  IMAGE: { types: IMAGE_TYPES, maxBytes: 15 * MB, formats: IMAGE_FORMATS },
  THUMBNAIL: { types: IMAGE_TYPES, maxBytes: 2 * MB, formats: IMAGE_FORMATS },
  AVATAR: { types: IMAGE_TYPES, maxBytes: 2 * MB, formats: IMAGE_FORMATS },
};

/** `accept` attribute of the file input. */
export const uploadAccept = (purpose: UploadPurpose) => UPLOAD_RULES[purpose].types.join(",");

/** A file refused before any request (format, size). */
export class UploadRejectedError extends Error {}

/** Why `file` cannot be uploaded for `purpose`; null when it can. */
export function uploadProblem(file: File, purpose: UploadPurpose): string | null {
  const rule = UPLOAD_RULES[purpose];
  if (!rule.types.includes(file.type)) return `Chỉ nhận tệp ${rule.formats}.`;
  if (file.size === 0) return "Tệp này không có nội dung.";
  if (file.size > rule.maxBytes) {
    return `Tệp nặng ${formatBytes(file.size)}, vượt giới hạn ${formatBytes(rule.maxBytes)}.`;
  }
  return null;
}

/**
 * Vietnamese message of a failed upload (docs/06, section 4). `POST /storage/presigned-upload` answers 400 (format),
 * 413 (size), 403 (storage quota of the plan) or 503 (storage not configured); the bucket's own PUT throws a plain Error.
 */
export function uploadErrorMessage(error: unknown, purpose: UploadPurpose): string {
  if (error instanceof UploadRejectedError) return error.message;
  if (isApiError(error)) {
    const rule = UPLOAD_RULES[purpose];
    if (error.status === 413) return `Tệp vượt giới hạn ${formatBytes(rule.maxBytes)} cho loại tệp này.`;
    if (error.status === 403) {
      return "Đã hết dung lượng lưu trữ của gói. Xoá vĩnh viễn dự án trong thùng rác hoặc nâng cấp gói để tải thêm.";
    }
    if (error.status === 400 && !error.code) return `Định dạng không được hỗ trợ. Chỉ nhận tệp ${rule.formats}.`;
    return errorMessage(error);
  }
  return "Không tải được tệp lên kho lưu trữ. Kiểm tra mạng rồi thử lại.";
}

export function showUploadError(toast: ToastApi, error: unknown, purpose: UploadPurpose, title: string): void {
  toast.show({
    tone: "error",
    title,
    description: uploadErrorMessage(error, purpose),
    requestId: isApiError(error) ? error.requestId : undefined,
  });
}

/** Uploads a file of mine (not attached to a project) and returns its `fileUrl`; the storage usage is refreshed. */
export function useFileUpload(purpose: UploadPurpose) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const problem = uploadProblem(file, purpose);
      if (problem) throw new UploadRejectedError(problem);
      return (await uploadFileToStorage(file, purpose)).fileUrl;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.storageUsage }),
  });
}
