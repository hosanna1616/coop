import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { getUsersForAdmin } from "@/app/actions/users";
import { getBranchesFromDb } from "@/app/actions/branches";
import { BranchListNav } from "@/components/admin/BranchListNav";
import { AdminUsersClient } from "./AdminUsersClient";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  const session = await getServerAuthSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "BRANCH_MANAGER")) {
    redirect("/");
  }

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
            User Management
          </h1>
        </header>
        <BranchListNav branches={branches} basePath="/admin/users" />
      </div>
    );
  }

  let users: { id: string; name: string; role: string; teamName: string | null; branchName: string | null }[] = [];
  let totalUsers = 0;
  const limit = 20;
  try {
    const result = await getUsersForAdmin(branchIdFromUrl ?? undefined, { limit, offset: 0 });
    users = result.users;
    totalUsers = result.total;
  } catch {
    users = [];
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-center border-b border-border bg-background">
        <h1 className="font-mono text-lg font-semibold text-foreground">
          User Management
        </h1>
      </header>
      <AdminUsersClient
        initialUsers={users}
        totalUsers={totalUsers}
        usersLimit={limit}
        callerRole={session.role}
        branchIdFromUrl={branchIdFromUrl}
      />
    </div>
  );
}
