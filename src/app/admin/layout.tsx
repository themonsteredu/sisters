import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  try {
    await requireAdmin();
  } catch {
    redirect("/login?reason=admin");
  }
  return children;
}
