/** Project folders (`be/src/collections`). Move a project with `updateProject(id, { collectionId })`. */

import { request } from "@/services/api";
import type { Collection, CreateCollectionRequest, UpdateCollectionRequest } from "@/types/api";

/** Most recently updated first. */
export function listCollections(): Promise<Collection[]> {
  return request("/collections");
}

export function getCollection(id: string): Promise<Collection> {
  return request(`/collections/${id}`);
}

/** At most 100 collections (409). */
export function createCollection(data: CreateCollectionRequest): Promise<Collection> {
  return request("/collections", { method: "POST", json: data });
}

export function updateCollection(id: string, data: UpdateCollectionRequest): Promise<Collection> {
  return request(`/collections/${id}`, { method: "PATCH", json: data });
}

/** The projects inside are kept, outside any collection. */
export function deleteCollection(id: string): Promise<void> {
  return request(`/collections/${id}`, { method: "DELETE" });
}
