/** Profile and brand kit of the signed-in user (`be/src/users`). Admin endpoints are in `src/api/admin`. */

import { request } from "@/services/api";
import type { SafeUser, UpdateBrandKitRequest, UpdateProfileRequest } from "@/types/api";

export function getMyProfile(): Promise<SafeUser> {
  return request("/users/me");
}

export function updateMyProfile(data: UpdateProfileRequest): Promise<SafeUser> {
  return request("/users/me", { method: "PATCH", json: data });
}

/** Replaces the whole brand kit (omitted optional fields are cleared). */
export function updateMyBrandKit(data: UpdateBrandKitRequest): Promise<SafeUser> {
  return request("/users/me/brand-kit", { method: "PATCH", json: data });
}
