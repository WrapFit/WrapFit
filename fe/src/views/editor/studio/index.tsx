"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { ApiError, getProject, listBoxStructures } from "@/api";
import { ErrorState, PageLoader, PRIMARY_BUTTON } from "@/components/common/StatusViews";
import { ROUTES } from "@/constants";
import { RequireAuth } from "@/features/auth";
import { queryKeys } from "@/hooks/data";
import type { ProjectDetail } from "@/types/api";
import { StudioWorkspace } from "./StudioWorkspace";

/** Route id of the offline demo: no sign-in, nothing saved (docs/12 D5). */
const DEMO_ID = "demo";

/** `/editor/[id]`: the studio of one project, or the offline demo at `/editor/demo`. */
export default function EditorPage() {
  // Next.js passes route params to pages as a Promise; a client component reads them with useParams().
  const { id } = useParams<{ id: string }>();
  if (id === DEMO_ID) return <StudioWorkspace project={null} />;
  return (
    <RequireAuth>
      <ProjectEditor key={id} projectId={id} />
    </RequireAuth>
  );
}

/** 404 for another user's project too; 400 for an id that is not a UUID. */
const isMissing = (error: unknown) => error instanceof ApiError && (error.status === 404 || error.status === 400);

function ProjectEditor({ projectId }: { projectId: string }) {
  const project = useQuery({
    queryKey: queryKeys.projects.detail(projectId),
    queryFn: () => getProject(projectId),
    // Always the version on the server when the editor opens: a cached copy may be older than another tab's save.
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
  const structures = useQuery({
    queryKey: queryKeys.templates.structures,
    queryFn: listBoxStructures,
    staleTime: 5 * 60_000,
  });

  // The editor works on its own copy: later refetches of the query never replace what the user is editing.
  // `nonce` remounts it with a fresh copy (after a version conflict).
  const [session, setSession] = useState<{ project: ProjectDetail; nonce: number } | null>(null);
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    if (!session && project.data && project.isFetchedAfterMount && !project.isFetching) {
      setSession({ project: project.data, nonce: 0 });
    }
  }, [session, project.data, project.isFetchedAfterMount, project.isFetching]);

  const reload = async () => {
    setReloading(true);
    try {
      const fresh = await project.refetch();
      if (fresh.data) setSession((current) => ({ project: fresh.data, nonce: (current?.nonce ?? 0) + 1 }));
    } finally {
      setReloading(false);
    }
  };

  if (!session && project.error) {
    if (isMissing(project.error)) {
      return (
        <main className="min-h-screen bg-paper-grain flex items-center px-4 py-16">
          <ErrorState
            title="Không tìm thấy dự án"
            description="Dự án không tồn tại, đã bị xoá vĩnh viễn hoặc thuộc tài khoản khác."
            action={
              <>
                <Link href={ROUTES.projects} className={PRIMARY_BUTTON}>
                  Về danh sách dự án
                </Link>
                <Link
                  href={ROUTES.editorNew}
                  className="text-sm font-semibold text-brand-forest underline-offset-4 hover:underline"
                >
                  Tạo dự án mới
                </Link>
              </>
            }
          />
        </main>
      );
    }
    return (
      <main className="min-h-screen bg-paper-grain flex items-center px-4 py-16">
        <ErrorState
          error={project.error}
          title="Không mở được dự án"
          onRetry={() => void project.refetch()}
          retrying={project.isFetching}
        />
      </main>
    );
  }
  if (!session) return <PageLoader label="Đang mở dự án…" />;

  return (
    <StudioWorkspace
      key={session.nonce}
      project={session.project}
      structures={structures.data}
      onReload={() => void reload()}
      reloading={reloading}
    />
  );
}
