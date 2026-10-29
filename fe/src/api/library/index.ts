/** Shared library of imported assets (`be/src/library`): public list, admin import. No backend: an empty library. */

import { request } from "@/services/api";
import type { CreateLibraryAsset, LibraryAsset, LibraryLicense, LibraryQuery, Paginated, UpdateLibraryAsset } from "@/types/api";

const EMPTY: Paginated<LibraryAsset> = { items: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };

/** Active assets (stickers, illustrations, backgrounds…) every user may place on a box. */
export function listLibraryAssets(query: LibraryQuery = {}): Promise<Paginated<LibraryAsset>> {
  return request<Paginated<LibraryAsset>>("/library/assets", { query: { ...query } }).catch(() => EMPTY);
}

/** Licences accepted when importing an asset. */
export function listLibraryLicenses(): Promise<LibraryLicense[]> {
  return request<LibraryLicense[]>("/library/licenses");
}

/** Admin: every asset, hidden ones included. */
export function manageLibraryAssets(query: LibraryQuery = {}): Promise<Paginated<LibraryAsset>> {
  return request<Paginated<LibraryAsset>>("/library/assets/manage", { query: { ...query } });
}

/** Admin: imports an upload (purpose LOGO or IMAGE). 400 ATTRIBUTION_REQUIRED / LIBRARY_FILE_REFUSED. */
export function createLibraryAsset(input: CreateLibraryAsset): Promise<LibraryAsset> {
  return request<LibraryAsset>("/library/assets", { method: "POST", json: input });
}

/** Admin: edits an asset or hides it. */
export function updateLibraryAsset(id: string, input: UpdateLibraryAsset): Promise<LibraryAsset> {
  return request<LibraryAsset>(`/library/assets/${id}`, { method: "PATCH", json: input });
}
