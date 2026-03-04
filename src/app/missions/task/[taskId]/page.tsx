import { getServerAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTaskByIdForAssignee } from "@/app/actions/mission";
import { TaskDetailClient } from "./TaskDetailClient";

export const dynamic = "force-dynamic";

export default async function TaskDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ taskId: string }>;
  searchParams: Promise<{ branchId?: string }>;
}) {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");

  const { taskId } = await params;
  const { branchId: branchIdFromUrl } = await searchParams;
  const branchIdFilter = session.role === "ADMIN" ? branchIdFromUrl ?? null : undefined;
  const task = await getTaskByIdForAssignee(taskId, branchIdFilter);
  if (!task) redirect("/missions");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TaskDetailClient
        task={JSON.parse(JSON.stringify(task))}
        role={session.role}
      />
    </div>
  );
}
