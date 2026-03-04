import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { AdminBranchesClient } from "./AdminBranchesClient";

export const dynamic = "force-dynamic";

export default async function AdminBranchesPage() {
  const session = await getServerAuthSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-center border-b border-border bg-background">
        <h1 className="font-mono text-lg font-semibold text-foreground">
          Branches
        </h1>
      </header>
      <AdminBranchesClient />
    </div>
  );
}
