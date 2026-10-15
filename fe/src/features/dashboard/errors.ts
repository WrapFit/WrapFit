/** Error toasts of the dashboard actions, for the cases the shared `errorMessage` words too generally. */

import type { ToastApi } from "@/components/common/Toast";
import { isApiError } from "@/services/api";

/**
 * Toast of a failed action. A 409 without `code` carries an English server message (e.g. "Restore the project from
 * the trash before…"): `conflict` replaces it with what it means on this screen.
 */
export function showActionError(toast: ToastApi, error: unknown, title: string, conflict?: string): void {
  if (conflict && isApiError(error) && error.status === 409 && !error.code) {
    toast.show({ tone: "error", title, description: conflict });
    return;
  }
  toast.error(error, title);
}
