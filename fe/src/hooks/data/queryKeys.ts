/**
 * Cache keys of the API data (React Query). Every read uses a key from here, so a mutation invalidates the right
 * entries: e.g. `queryKeys.projects.all` covers every project list and detail.
 */

import type { HubQuery, PageQuery, ProjectListQuery } from "@/types/api";

export const queryKeys = {
  me: ["me"] as const,

  projects: {
    all: ["projects"] as const,
    lists: () => ["projects", "list"] as const,
    list: (query: ProjectListQuery = {}) => ["projects", "list", query] as const,
    detail: (id: string) => ["projects", "detail", id] as const,
    snapshots: (id: string) => ["projects", "detail", id, "snapshots"] as const,
    exports: (id: string) => ["projects", "detail", id, "exports"] as const,
    unboxing: (id: string) => ["projects", "detail", id, "unboxing"] as const,
  },
  exportJob: (jobId: string) => ["exports", jobId] as const,

  collections: {
    all: ["collections"] as const,
    detail: (id: string) => ["collections", id] as const,
  },

  templates: {
    structures: ["templates", "structures"] as const,
    hub: (query: HubQuery = {}) => ["templates", "hub", query] as const,
    detail: (id: string) => ["templates", "detail", id] as const,
  },

  public: {
    project: (slug: string) => ["public", "project", slug] as const,
    unboxing: (slug: string) => ["public", "unboxing", slug] as const,
  },

  storageUsage: ["storage", "usage"] as const,
  aiUsage: ["ai", "usage"] as const,

  library: {
    all: ["library"] as const,
    assets: (query: object) => ["library", "assets", query] as const,
    manage: (query: object) => ["library", "manage", query] as const,
    licenses: ["library", "licenses"] as const,
  },
  printShops: {
    all: ["printShops"] as const,
    detail: (id: string) => ["printShops", id] as const,
  },
  orders: {
    all: ["orders"] as const,
    myOrders: ["orders", "my"] as const,
    staff: (query: object = {}) => ["orders", "staff", query] as const,
    detail: (id: string) => ["orders", id] as const,
  },

  admin: {
    users: (query: PageQuery = {}) => ["admin", "users", query] as const,
    user: (id: string) => ["admin", "user", id] as const,
    health: ["admin", "health"] as const,
  },
};
