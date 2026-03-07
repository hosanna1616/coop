import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { getRanksForAdmin } from "@/app/actions/ranks";
import { AdminRanksClient } from "./AdminRanksClient";

export const dynamic = "force-dynamic";

export default async function AdminRanksPage() {
  const session = await getServerAuthSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/");
  }

  let ranks: Awaited<ReturnType<typeof getRanksForAdmin>> = [];
  try {
    ranks = await getRanksForAdmin();
  } catch {
    ranks = [];
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-center border-b border-border bg-background">
        <h1 className="font-mono text-lg font-semibold text-foreground">
          Officer Ranks
        </h1>
      </header>
      <AdminRanksClient initialRanks={ranks} />
    </div>
  );
}
