import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { OperationalSummaryClient } from "./OperationalSummaryClient";

export const dynamic = "force-dynamic";

export default async function OperationalSummaryPage({
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-center border-b border-border bg-background">
        <h1 className="font-mono text-lg font-semibold text-foreground">
          OPERATIONAL SUMMARY
        </h1>
      </header>
      <OperationalSummaryClient
        isAdmin={session.role === "ADMIN"}
        defaultBranchId={branchIdFromUrl ?? session.branchId ?? null}
        showBackToBranches={session.role === "ADMIN" && !!branchIdFromUrl}
      />
    </div>
  );
}
