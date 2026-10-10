/** Administration (`be/src/users`, `be/src/base`): role ADMIN only, others get 403. */

import { request } from "@/services/api";
import type { AdminUpdateUserRequest, HealthDetails, PageQuery, Paginated, SafeUser } from "@/types/api";

export function listUsers(query: PageQuery = {}): Promise<Paginated<SafeUser>> {
  return request("/users", { query });
}

export function getUser(id: string): Promise<SafeUser> {
  return request(`/users/${id}`);
}

/** An admin cannot change their own role or lock themselves (400). Locking revokes every session of the user. */
export function updateUser(id: string, data: AdminUpdateUserRequest): Promise<SafeUser> {
  return request(`/users/${id}`, { method: "PATCH", json: data });
}

/** Also deletes the user's projects and files. */
export function deleteUser(id: string): Promise<void> {
  return request(`/users/${id}`, { method: "DELETE" });
}

export function getHealthDetails(): Promise<HealthDetails> {
  return request("/health/details");
}
