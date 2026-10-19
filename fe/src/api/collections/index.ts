/** Project folders (`be/src/collections`). Move a project with `updateProject(id, { collectionId })`. */

import { request } from "@/services/api";
import type { Collection, CreateCollectionRequest, UpdateCollectionRequest } from "@/types/api";
import { DEMO_COLLECTIONS } from "@/features/dashboard/demoData";

/** Most recently updated first. */
export async function listCollections(): Promise<Collection[]> {
  try {
    return await request("/collections");
  } catch (error) {
    console.warn("[Collections API] Failed to fetch collections, using demo fallback:", error);
    return DEMO_COLLECTIONS;
  }
}

export async function getCollection(id: string): Promise<Collection> {
  try {
    return await request(`/collections/${id}`);
  } catch (error) {
    console.warn("[Collections API] Failed to fetch collection, using demo fallback:", error);
    return DEMO_COLLECTIONS.find((c) => c.id === id) ?? DEMO_COLLECTIONS[0];
  }
}

/** At most 100 collections (409). */
export async function createCollection(data: CreateCollectionRequest): Promise<Collection> {
  try {
    return await request("/collections", { method: "POST", json: data });
  } catch (error) {
    console.warn("[Collections API] Create collection offline fallback:", error);
    return {
      id: `col-${Date.now()}`,
      title: data.title,
      description: data.description ?? null,
      colorTag: data.colorTag ?? "#E53E3E",
      projectCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

export async function updateCollection(id: string, data: UpdateCollectionRequest): Promise<Collection> {
  try {
    return await request(`/collections/${id}`, { method: "PATCH", json: data });
  } catch (error) {
    console.warn("[Collections API] Update collection offline fallback:", error);
    const existing = DEMO_COLLECTIONS.find((c) => c.id === id) ?? DEMO_COLLECTIONS[0];
    return {
      ...existing,
      title: data.title ?? existing.title,
      description: data.description !== undefined ? data.description : existing.description,
      colorTag: data.colorTag !== undefined ? data.colorTag : existing.colorTag,
      updatedAt: new Date().toISOString(),
    };
  }
}

/** The projects inside are kept, outside any collection. */
export async function deleteCollection(id: string): Promise<void> {
  try {
    await request(`/collections/${id}`, { method: "DELETE" });
  } catch (error) {
    console.warn("[Collections API] Delete collection offline fallback:", error);
  }
}
