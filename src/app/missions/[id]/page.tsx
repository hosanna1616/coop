import { getServerAuthSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getMissionById } from "@/app/actions/mission";
import { MissionViewClient } from "./MissionViewClient";

export const dynamic = "force-dynamic";

export default async function MissionViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ branchId?: string }>;
}) {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const { branchId: branchIdFromUrl } = await searchParams;
  const branchIdFilter =
    session.role === "ADMIN" ? branchIdFromUrl ?? null : undefined;
  if (session.role === "ADMIN" && !branchIdFromUrl) {
    redirect("/missions");
  }

  const mission = await getMissionById(id, branchIdFilter);
  if (!mission) notFound();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MissionViewClient
        mission={JSON.parse(JSON.stringify(mission))}
        role={session.role}
        branchId={branchIdFromUrl ?? null}
      />
    </div>
  );
}
