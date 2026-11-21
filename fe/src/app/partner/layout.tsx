import { RequireAuth } from "@/features/auth";

/** The partner portal is for print shop accounts (docs/19 G.1). */
export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth role="PRINT_SHOP">{children}</RequireAuth>;
}