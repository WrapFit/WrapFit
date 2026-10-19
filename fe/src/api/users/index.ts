/** Profile and brand kit of the signed-in user (`be/src/users`). Admin endpoints are in `src/api/admin`. */

import { request } from "@/services/api";
import type { SafeUser, UpdateBrandKitRequest, UpdateProfileRequest } from "@/types/api";
import { DEMO_USER } from "@/features/dashboard/demoData";

export async function getMyProfile(): Promise<SafeUser> {
  try {
    return await request("/users/me");
  } catch (error) {
    console.warn("[Users API] Failed to fetch profile, using demo fallback:", error);
    return DEMO_USER;
  }
}

export async function updateMyProfile(data: UpdateProfileRequest): Promise<SafeUser> {
  try {
    return await request("/users/me", { method: "PATCH", json: data });
  } catch (error) {
    console.warn("[Users API] Update profile fallback:", error);
    return { ...DEMO_USER, ...data };
  }
}

/** Replaces the whole brand kit (omitted optional fields are cleared). */
export async function updateMyBrandKit(data: UpdateBrandKitRequest): Promise<SafeUser> {
  try {
    return await request("/users/me/brand-kit", { method: "PATCH", json: data });
  } catch (error) {
    console.warn("[Users API] Update brand kit fallback:", error);
    return {
      ...DEMO_USER,
      brandKit: {
        logoUrl: data.logoUrl ?? null,
        colors: data.colors,
        fonts: data.fonts ?? [],
        slogan: data.slogan ?? null,
      },
    };
  }
}
