"use client";

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { createCollection, deleteCollection, listCollections, updateCollection } from "@/api/collections";
import { useToast } from "@/components/common/Toast";
import { queryKeys } from "@/hooks/data";
import type { Collection, CreateCollectionRequest, UpdateCollectionRequest } from "@/types/api";
import { showActionError } from "./errors";
import { MAX_COLLECTIONS } from "./format";

/** My folders, most recently changed first, with their project count (trash excluded). */
export function useCollections() {
  return useQuery({ queryKey: queryKeys.collections.all, queryFn: listCollections });
}

/** Project cards show their folder's title and colour: both lists change with a folder. */
function refreshFolders(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.collections.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
  ]);
}

export function useCreateCollection() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (data: CreateCollectionRequest) => createCollection(data),
    onSuccess: (collection) =>
      toast.show({ tone: "success", title: "Đã tạo thư mục", description: `“${collection.title}” đã sẵn sàng.` }),
    onError: (error) =>
      showActionError(
        toast,
        error,
        "Không tạo được thư mục",
        `Bạn đã có ${MAX_COLLECTIONS} thư mục, mức tối đa. Hãy xoá bớt thư mục không dùng.`,
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.collections.all }),
  });
}

export interface CollectionUpdate {
  collection: Collection;
  data: UpdateCollectionRequest;
}

export function useUpdateCollection() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ collection, data }: CollectionUpdate) => updateCollection(collection.id, data),
    onSuccess: (saved) =>
      toast.show({ tone: "success", title: "Đã cập nhật thư mục", description: `“${saved.title}”` }),
    onError: (error) => toast.error(error, "Không cập nhật được thư mục"),
    onSettled: () => refreshFolders(queryClient),
  });
}

/** The projects inside are kept, outside any folder. */
export function useDeleteCollection() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (collection: Collection) => deleteCollection(collection.id),
    onSuccess: (_, collection) =>
      toast.show({
        tone: "success",
        title: "Đã xoá thư mục",
        description:
          collection.projectCount > 0
            ? `${collection.projectCount} dự án của “${collection.title}” được giữ lại, không thuộc thư mục nào.`
            : `“${collection.title}” đã được xoá.`,
      }),
    onError: (error) => toast.error(error, "Không xoá được thư mục"),
    onSettled: () => refreshFolders(queryClient),
  });
}
