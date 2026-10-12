"use client";

import {
  keepPreviousData,
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useMemo } from "react";
import { deleteUser, listUsers, updateUser } from "@/api/admin";
import { useToast } from "@/components/common/Toast";
import { queryKeys } from "@/hooks/data";
import type { AdminUpdateUserRequest, Paginated, SafeUser } from "@/types/api";
import { displayName, ROLE_LABELS } from "./accountFormat";

export const ACCOUNTS_PAGE_SIZE = 20;

/** Prefix of every page of `queryKeys.admin.users(query)`, whatever the query. */
const USER_LISTS = ["admin", "users"] as const;
const UPDATE_KEY = ["admin", "update-user"] as const;
const DELETE_KEY = ["admin", "delete-user"] as const;

type UserPage = Paginated<SafeUser>;

export interface AccountUpdate {
  /** The row as shown before the change: put back when the API refuses. */
  user: SafeUser;
  data: AdminUpdateUserRequest;
}

/** One page of `GET /users` (newest first). The previous page stays on screen while the next one loads. */
export function useAccountsPage(page: number) {
  const query = { page, limit: ACCOUNTS_PAGE_SIZE };
  return useQuery({
    queryKey: queryKeys.admin.users(query),
    queryFn: () => listUsers(query),
    placeholderData: keepPreviousData,
  });
}

function replaceInLists(queryClient: QueryClient, user: SafeUser) {
  queryClient.setQueriesData<UserPage>({ queryKey: USER_LISTS }, (page) =>
    page?.items ? { ...page, items: page.items.map((item) => (item.id === user.id ? user : item)) } : page,
  );
}

function removeFromLists(queryClient: QueryClient, id: string) {
  queryClient.setQueriesData<UserPage>({ queryKey: USER_LISTS }, (page) => {
    if (!page?.items?.some((item) => item.id === id)) return page;
    const total = Math.max(0, page.meta.total - 1);
    return {
      items: page.items.filter((item) => item.id !== id),
      meta: { ...page.meta, total, totalPages: Math.ceil(total / page.meta.limit) },
    };
  });
}

function withChanges(user: SafeUser, data: AdminUpdateUserRequest): SafeUser {
  return {
    ...user,
    ...(data.role !== undefined && { role: data.role }),
    ...(data.isActive !== undefined && { isActive: data.isActive }),
  };
}

function updateToast(user: SafeUser, data: AdminUpdateUserRequest) {
  const name = displayName(user);
  if (data.role) return { title: "Đã đổi vai trò", description: `${name} giờ là ${ROLE_LABELS[data.role]}.` };
  if (data.isActive === false) {
    return { title: "Đã khoá tài khoản", description: `${name} đã bị đăng xuất khỏi mọi thiết bị.` };
  }
  return { title: "Đã mở khoá tài khoản", description: `${name} có thể đăng nhập lại.` };
}

function updateErrorTitle(data: AdminUpdateUserRequest) {
  if (data.role) return "Không đổi được vai trò";
  return data.isActive === false ? "Không khoá được tài khoản" : "Không mở khoá được tài khoản";
}

/**
 * `PATCH /users/:id` for a role or the locked state. The row changes at once and goes back if the API refuses; locking
 * revokes every session of the user on the server.
 */
export function useUpdateAccount() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationKey: UPDATE_KEY,
    mutationFn: ({ user, data }: AccountUpdate) => updateUser(user.id, data),
    onMutate: async ({ user, data }) => {
      await queryClient.cancelQueries({ queryKey: USER_LISTS });
      replaceInLists(queryClient, withChanges(user, data));
    },
    onSuccess: (saved, { data }) => {
      replaceInLists(queryClient, saved);
      queryClient.setQueryData(queryKeys.admin.user(saved.id), saved);
      toast.show({ tone: "success", ...updateToast(saved, data) });
    },
    onError: (error, { user, data }) => {
      replaceInLists(queryClient, user);
      toast.error(error, updateErrorTitle(data));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: USER_LISTS }),
  });
}

/** `DELETE /users/:id`: the account, its projects and its files are gone for good. */
export function useDeleteAccount() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationKey: DELETE_KEY,
    mutationFn: (user: SafeUser) => deleteUser(user.id),
    onSuccess: (_, user) => {
      removeFromLists(queryClient, user.id);
      queryClient.removeQueries({ queryKey: queryKeys.admin.user(user.id) });
      toast.show({
        tone: "success",
        title: "Đã xoá tài khoản",
        description: `${user.email} cùng dự án và tệp của người này đã bị xoá vĩnh viễn.`,
      });
    },
    onError: (error) => toast.error(error, "Không xoá được tài khoản"),
    onSettled: () => queryClient.invalidateQueries({ queryKey: USER_LISTS }),
  });
}

/** Ids of the accounts with a change or a deletion still running, from every component of the page. */
export function useBusyAccountIds(): ReadonlySet<string> {
  const updating = useMutationState({
    filters: { mutationKey: UPDATE_KEY, status: "pending" },
    select: (mutation) => (mutation.state.variables as AccountUpdate | undefined)?.user.id,
  });
  const deleting = useMutationState({
    filters: { mutationKey: DELETE_KEY, status: "pending" },
    select: (mutation) => (mutation.state.variables as SafeUser | undefined)?.id,
  });
  return useMemo(
    () => new Set([...updating, ...deleting].filter((id): id is string => Boolean(id))),
    [updating, deleting],
  );
}
