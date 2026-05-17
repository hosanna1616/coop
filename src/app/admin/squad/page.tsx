import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { SquadClient } from "./SquadClient";

export const dynamic = "force-dynamic";

export default async function SquadPage() {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");
  if (session.role === "PLAYER") redirect("/work");
  if (session.role !== "BRANCH_MANAGER" && session.role !== "ADMIN") redirect("/");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-center border-b border-border bg-background">
        <h1 className="font-mono text-lg font-semibold text-foreground">Squad dashboard</h1>
      </header>
      <SquadClient branchId={session.branchId} />
    </div>
  );
}
