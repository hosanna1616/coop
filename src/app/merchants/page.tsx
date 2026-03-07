import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { getCurrentUser } from "@/app/actions/users";
import { StaffMerchantsClient } from "./StaffMerchantsClient";

export const dynamic = "force-dynamic";

export default async function MerchantsPage() {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");

  const canAccess =
    session.role === "PLAYER" || session.role === "BRANCH_MANAGER" || session.role === "ADMIN";
  if (!canAccess) redirect("/");

  if (session.role === "ADMIN") redirect("/admin/merchants");

  const user = await getCurrentUser(session.id);
  const branchId = session.branchId ?? user?.branchId ?? user?.team?.branchId ?? null;
  if ((session.role === "PLAYER" || session.role === "BRANCH_MANAGER") && !branchId) {
    return (
      <div className="flex min-h-0 flex-1 flex-col p-4">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-center border-b border-border bg-background">
          <h1 className="font-mono text-lg font-semibold text-foreground">Merchants</h1>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="font-mono text-sm text-muted-foreground">
            You are not assigned to a branch. Ask your manager to assign you so you can see and induct merchants.
          </p>
        </div>
      </div>
    );
  }

  if (!branchId) redirect("/");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-center border-b border-border bg-background">
        <h1 className="font-mono text-lg font-semibold text-foreground">Merchants</h1>
      </header>
      <StaffMerchantsClient branchId={branchId} userRole={session.role} currentUserId={session.id} />
    </div>
  );
}
