import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { getScoutCategoriesForAdmin } from "@/app/actions/scout-categories";
import { AdminCategoriesClient } from "./AdminCategoriesClient";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const session = await getServerAuthSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/");
  }

  let categories: Awaited<ReturnType<typeof getScoutCategoriesForAdmin>> = [];
  try {
    categories = await getScoutCategoriesForAdmin();
  } catch {
    categories = [];
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-center border-b border-border bg-background">
        <h1 className="font-mono text-lg font-semibold text-foreground">
          Scout Categories
        </h1>
      </header>
      <AdminCategoriesClient initialCategories={categories} />
    </div>
  );
}
