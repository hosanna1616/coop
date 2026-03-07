import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { CreateMissionClient } from "./CreateMissionClient";

export const dynamic = "force-dynamic";

export default async function CreateMissionPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string; territoryCellId?: string }>;
}) {
  const session = await getServerAuthSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "BRANCH_MANAGER")) {
    redirect("/");
  }

  const params = await searchParams;
  const branchIdFromUrl = session.role === "ADMIN" ? (params.branchId ?? null) : session.branchId ?? null;
  const territoryCellIdFromUrl = params.territoryCellId ?? null;

  let territoryCellCode: string | null = null;
  if (territoryCellIdFromUrl) {
    const { prisma } = await import("@/lib/prisma");
    const cell = await prisma.territoryCell.findUnique({
      where: { id: territoryCellIdFromUrl },
      select: { code: true, branchId: true },
    });
    if (cell && (session.role === "ADMIN" || cell.branchId === session.branchId)) {
      territoryCellCode = cell.code;
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-center border-b border-border bg-background">
        <h1 className="font-mono text-lg font-semibold text-foreground">
          Create Mission
        </h1>
      </header>
      <div className="flex flex-1 flex-col p-6">
        <CreateMissionClient
          callerRole={session.role}
          defaultBranchId={branchIdFromUrl}
          defaultTerritoryCellId={territoryCellIdFromUrl}
          territoryCellCode={territoryCellCode}
        />
      </div>
    </div>
  );
}
