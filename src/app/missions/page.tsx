import { getServerAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMissions, getMyTasks, getMyScoutedAndRegistered, getPendingTaskApprovals } from "@/app/actions/mission";
import { getBranchesFromDb } from "@/app/actions/branches";
import { BranchListNav } from "@/components/admin/BranchListNav";
import { MissionsClient } from "./MissionsClient";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const branchIdFromUrl = session.role === "ADMIN" ? (params.branchId ?? null) : null;

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
            Missions
          </h1>
        </header>
        <BranchListNav branches={branches} basePath="/missions" />
      </div>
    );
  }

  const missionsLimit = 20;
  const isBranchStaff = session.role === "BRANCH_MANAGER" || session.role === "PLAYER";
  const [missionsData, myTasks, pendingApprovals, myScoutedAndRegistered] = await Promise.all([
    getMissions(
      branchIdFromUrl != null
        ? { branchId: branchIdFromUrl, limit: missionsLimit, offset: 0 }
        : { branchId: null, limit: missionsLimit, offset: 0 }
    ),
    getMyTasks(),
    session.role === "BRANCH_MANAGER" || session.role === "ADMIN"
      ? getPendingTaskApprovals({ branchId: branchIdFromUrl ?? session.branchId ?? null })
      : Promise.resolve([]),
    isBranchStaff ? getMyScoutedAndRegistered() : Promise.resolve({ scoutedLeads: [], inductedMerchants: [] }),
  ]);

  let branchName: string | null = null;
  if (branchIdFromUrl) {
    const branch = await prisma.branch.findUnique({
      where: { id: branchIdFromUrl },
      select: { name: true },
    });
    branchName = branch?.name ?? null;
  }

  return (
    <MissionsClient
      missions={missionsData.missions}
      totalMissions={missionsData.total}
      missionsLimit={missionsLimit}
      myTasks={myTasks}
      pendingApprovals={pendingApprovals}
      myScoutedLeads={myScoutedAndRegistered.scoutedLeads}
      myInductedMerchants={myScoutedAndRegistered.inductedMerchants}
      role={session.role}
      branchId={branchIdFromUrl}
      branchName={branchName}
    />
  );
}
