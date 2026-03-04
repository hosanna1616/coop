import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { getDeploymentAssetsForAdmin } from "@/app/actions/deployment-assets";
import { AdminAssetsClient } from "./AdminAssetsClient";

export const dynamic = "force-dynamic";

export default async function AdminAssetsPage() {
  const session = await getServerAuthSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/");
  }

  let assets: Awaited<ReturnType<typeof getDeploymentAssetsForAdmin>> = [];
  try {
    assets = await getDeploymentAssetsForAdmin();
  } catch {
    assets = [];
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-center border-b border-border bg-background">
        <h1 className="font-mono text-lg font-semibold text-cyan-400">
          DEPLOYMENT ASSETS MANAGEMENT
        </h1>
      </header>
      <AdminAssetsClient initialAssets={assets} />
    </div>
  );
}
