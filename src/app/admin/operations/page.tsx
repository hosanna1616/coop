import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { OperationsClient } from "./OperationsClient";

export const dynamic = "force-dynamic";

export default async function OperationsPage() {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");
  if (session.role === "PLAYER") redirect("/work");
  if (session.role !== "BRANCH_MANAGER" && session.role !== "ADMIN") redirect("/");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-4">
        <h1 className="font-mono text-lg font-semibold text-foreground">Field operations</h1>
        <a href="/admin/squad" className="font-mono text-xs text-primary hover:underline">
          Squad view
        </a>
      </header>
      <OperationsClient branchId={session.branchId} />
    </div>
  );
}
