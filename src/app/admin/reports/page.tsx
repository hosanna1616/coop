import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { getBranchesFromDb } from "@/app/actions/branches";
import { BranchListNav } from "@/components/admin/BranchListNav";
import { ReportsClient } from "./ReportsClient";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  const session = await getServerAuthSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "BRANCH_MANAGER")) {
    redirect("/");
  }

  const params = await searchParams;
  const branchIdFromUrl = params.branchId ?? null;

  if (session.role === "ADMIN" && !branchIdFromUrl) {
    let branches: { id: string; name: string; branchCode: string | null }[] = [];
    try {
      branches = await getBranchesFromDb();
    } catch {
      branches = [];
    }
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-center border-b border-border bg-background">
          <h1 className="font-mono text-lg font-semibold text-foreground">
            Reports
          </h1>
        </header>
        <BranchListNav branches={branches} basePath="/admin/reports" title="Select a branch to view activity" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-center border-b border-border bg-background">
        <h1 className="font-mono text-lg font-semibold text-foreground">
          {session.role === "ADMIN" ? "Reports" : "Reports"}
        </h1>
      </header>
      <ReportsClient
        isAdmin={session.role === "ADMIN"}
        defaultBranchId={branchIdFromUrl ?? session.branchId}
        showBackToBranches={session.role === "ADMIN" && !!branchIdFromUrl}
      />
    </div>
  );
}
