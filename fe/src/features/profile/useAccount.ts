"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateMyBrandKit, updateMyProfile } from "@/api/users";
import { queryKeys } from "@/hooks/data";
import type { SafeUser, UpdateBrandKitRequest, UpdateProfileRequest } from "@/types/api";

/**
 * The saved user replaces the session entry that `useAuth()` reads (`queryKeys.me`), so the header and every screen
 * show the new name, avatar and brand kit at once, without asking the API again.
 */
function useStoreSessionUser() {
  const queryClient = useQueryClient();
  return (user: SafeUser) => queryClient.setQueryData(queryKeys.me, user);
}

/** `PATCH /users/me`: only the fields sent change; `avatarUrl: null` removes the avatar (the Google photo too). */
export function useUpdateProfile() {
  const store = useStoreSessionUser();
  return useMutation({
    mutationFn: (data: UpdateProfileRequest) => updateMyProfile(data),
    onSuccess: store,
  });
}

/** `PATCH /users/me/brand-kit`: replaces the whole kit (omitted optional fields are cleared). */
export function useUpdateBrandKit() {
  const store = useStoreSessionUser();
  return useMutation({
    mutationFn: (data: UpdateBrandKitRequest) => updateMyBrandKit(data),
    onSuccess: store,
  });
}
