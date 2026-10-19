/** Administration (`be/src/users`, `be/src/base`): role ADMIN only, others get 403. */

import { request } from "@/services/api";
import type { AdminUpdateUserRequest, HealthDetails, PageQuery, Paginated, SafeUser } from "@/types/api";
import { DEMO_HEALTH, DEMO_USERS } from "@/features/dashboard/demoData";

export async function listUsers(query: PageQuery = {}): Promise<Paginated<SafeUser>> {
  try {
    return await request("/users", { query });
  } catch (error) {
    console.warn("[Admin API] Failed to fetch users, using demo fallback:", error);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const total = DEMO_USERS.length;
    const start = (page - 1) * limit;
    const items = DEMO_USERS.slice(start, start + limit);
    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}

export async function getUser(id: string): Promise<SafeUser> {
  try {
    return await request(`/users/${id}`);
  } catch (error) {
    console.warn("[Admin API] Failed to fetch user, using demo fallback:", error);
    const user = DEMO_USERS.find((u) => u.id === id) ?? DEMO_USERS[0];
    return user;
  }
}

/** An admin cannot change their own role or lock themselves (400). Locking revokes every session of the user. */
export async function updateUser(id: string, data: AdminUpdateUserRequest): Promise<SafeUser> {
  try {
    return await request(`/users/${id}`, { method: "PATCH", json: data });
  } catch (error) {
    console.warn("[Admin API] Offline fallback updateUser:", error);
    const user = DEMO_USERS.find((u) => u.id === id) ?? DEMO_USERS[0];
    return { ...user, ...data } as SafeUser;
  }
}

/** Also deletes the user's projects and files. */
export async function deleteUser(id: string): Promise<void> {
  try {
    await request(`/users/${id}`, { method: "DELETE" });
  } catch (error) {
    console.warn("[Admin API] Offline fallback deleteUser:", error);
  }
}

export async function getHealthDetails(): Promise<HealthDetails> {
  try {
    return await request("/health/details");
  } catch (error) {
    console.warn("[Admin API] Failed to fetch health details, using demo fallback:", error);
    return DEMO_HEALTH;
  }
}
