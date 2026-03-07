import { getServerAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMyNotifications } from "@/app/actions/notifications";
import { NotificationsClient } from "./NotificationsClient";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");

  let notifications: Awaited<ReturnType<typeof getMyNotifications>> = [];
  try {
    notifications = await getMyNotifications({ limit: 50, offset: 0 });
  } catch {
    notifications = [];
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-center border-b border-border bg-background">
        <h1 className="font-mono text-lg font-semibold text-foreground">
          Notifications
        </h1>
      </header>
      <NotificationsClient initialNotifications={notifications} />
    </div>
  );
}
