import { AdminFrame } from "@/components/workspace/AdminShell";
import { RequireAuth } from "@/features/auth";

/** The admin header and sidebar stay mounted across admin pages: only the content area changes on navigation. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth role="ADMIN">
      <AdminFrame>{children}</AdminFrame>
    </RequireAuth>
  );
}
