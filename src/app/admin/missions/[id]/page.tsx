import { redirect, notFound } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { getMissionById } from "@/app/actions/mission";
import { MissionDetailClient } from "./MissionDetailClient";

export const dynamic = "force-dynamic";

export default async function MissionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ branchId?: string }>;
}) {
  const session = await getServerAuthSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "BRANCH_MANAGER")) {
    redirect("/");
  }

  const { id } = await params;
  const { branchId: branchIdFromUrl } = await searchParams;
  const branchIdFilter = session.role === "ADMIN" ? branchIdFromUrl ?? null : undefined;
  const mission = await getMissionById(id, branchIdFilter);
  if (!mission) notFound();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-center border-b border-border bg-background">
        <h1 className="font-mono text-lg font-semibold text-foreground">
          Mission: {mission.name}
        </h1>
      </header>
      <MissionDetailClient mission={mission} />
    </div>
  );
}
