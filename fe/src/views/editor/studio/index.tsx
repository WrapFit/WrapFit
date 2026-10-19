"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import React, { Suspense, useEffect, useState } from "react";
import { ApiError, getProject, listBoxStructures } from "@/api";
import { ErrorState, PRIMARY_BUTTON } from "@/components/common/StatusViews";
import { ROUTES } from "@/constants";
import { RequireAuth } from "@/features/auth";
import { queryKeys } from "@/hooks/data";
import { BOX_STRUCTURES } from "@/features/studio/utils/boxStructures";
import type { BoxStructure, ProjectDetail } from "@/types/api";
import dynamic from "next/dynamic";
import { loadStudioWorkspace } from "./lazy";
import { StudioSkeleton } from "./StudioSkeleton";
import type { RestoreNotice } from "./StudioWorkspace";

// Code splitting: the 2D/3D editor loads in its own chunk, behind the studio skeleton.
const StudioWorkspace = dynamic<React.ComponentProps<typeof import("./StudioWorkspace").StudioWorkspace>>(loadStudioWorkspace, { ssr: false, loading: () => <StudioSkeleton /> });

/** Route id of the offline demo: no sign-in, nothing saved (docs/12 D5). */
const DEMO_ID = "demo";

const FALLBACK_STRUCTURES: BoxStructure[] = BOX_STRUCTURES.map((s) => ({
  id: s.id,
  name: s.vietnameseName,
  category: "Standard",
  description: s.description,
  preview3dUrl: null,
  dimensionLimits: {
    length: { min: 20, max: 400 },
    width: { min: 20, max: 300 },
    height: { min: 15, max: 300 },
    paperThickness: { min: 0.2, max: 0.8 },
  },
}));

/** `/editor/[id]`: the studio of one project, or the offline demo at `/editor/demo`. */
export default function EditorPage() {
  return (
    <Suspense fallback={<StudioSkeleton />}>
      <EditorRouteHandler />
    </Suspense>
  );
}

function EditorRouteHandler() {
  // Next.js passes route params to pages as a Promise; a client component reads them with useParams().
  const { id } = useParams<{ id: string }>();
  if (id === DEMO_ID) return <StudioWorkspace project={null} structures={FALLBACK_STRUCTURES} />;
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
  // `nonce` remounts it with a fresh copy (after a version conflict or a snapshot restore).
  const [session, setSession] = useState<{ project: ProjectDetail; nonce: number; notice?: RestoreNotice | null } | null>(
    null
  );
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
        <main className="min-h-screen bg-landing-canvas flex items-center px-4 py-16">
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
                  className="text-sm font-semibold text-landing-ink underline-offset-4 hover:underline"
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
      <main className="min-h-screen bg-landing-canvas flex items-center px-4 py-16">
        <ErrorState
          error={project.error}
          title="Không mở được dự án"
          onRetry={() => void project.refetch()}
          retrying={project.isFetching}
        />
      </main>
    );
  }
  if (!session) return <StudioSkeleton label="Đang mở dự án…" />;

  return (
    <StudioWorkspace
      key={session.nonce}
      project={session.project}
      structures={structures.data}
      onReload={() => void reload()}
      reloading={reloading}
      onReplaced={(replaced: ProjectDetail, notice: RestoreNotice | null) =>
        setSession((current) => ({ project: replaced, nonce: (current?.nonce ?? 0) + 1, notice }))
      }
      notice={session.notice}
    />
  );
}
