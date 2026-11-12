import { WorkspaceFrame } from "@/components/workspace/WorkspaceShell";

/** The workspace header and menu stay mounted across the workspace pages (dashboard, team, notifications): only the
 * content area changes on navigation. A route group, so the URLs are unchanged. */
export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceFrame>{children}</WorkspaceFrame>;
}
