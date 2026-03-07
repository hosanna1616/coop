"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  getMyNotifications,
  markNotificationSeen,
  markAllNotificationsSeen,
  type NotificationRow,
} from "@/app/actions/notifications";
import { PortalLoadingInline } from "@/components/ui/portal-loading";
import { Bell, Check, CheckCheck } from "lucide-react";

type NotificationsClientProps = {
  initialNotifications: NotificationRow[];
};

function formatDate(d: Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 60_000) return "Just now";
  if (diffMs < 3600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
  if (diffMs < 86400_000) return `${Math.floor(diffMs / 3600_000)}h ago`;
  return date.toLocaleDateString();
}

export function NotificationsClient({
  initialNotifications,
}: NotificationsClientProps) {
  const [notifications, setNotifications] = useState<NotificationRow[]>(initialNotifications);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getMyNotifications({ limit: 50, offset: 0 });
      setNotifications(list);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleMarkSeen = useCallback(
    async (id: string) => {
      const res = await markNotificationSeen(id);
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, seenAt: new Date() } : n))
        );
      }
    },
    []
  );

  const handleMarkAllSeen = useCallback(async () => {
    await markAllNotificationsSeen();
    setNotifications((prev) =>
      prev.map((n) => (n.seenAt ? n : { ...n, seenAt: new Date() }))
    );
  }, []);

  const unseenCount = notifications.filter((n) => !n.seenAt).length;

  return (
    <div className="flex flex-col gap-4 p-4">
      {unseenCount > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className="font-mono"
            onClick={handleMarkAllSeen}
          >
            <CheckCheck className="mr-1 size-4" />
            Mark all as seen
          </Button>
        </div>
      )}

      {loading ? (
        <div className="min-h-[200px]">
          <PortalLoadingInline className="min-h-[200px]" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <Bell className="size-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`rounded-lg border p-4 ${
                n.seenAt ? "border-border bg-card" : "border-primary/50 bg-primary/5"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{n.title}</p>
                  <p className="text-sm text-muted-foreground">{n.message}</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {formatDate(n.createdAt)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {n.missionId && (
                      <Link
                        href={`/admin/missions/${n.missionId}`}
                        className="text-xs font-mono text-primary underline"
                      >
                        View mission
                      </Link>
                    )}
                    {n.missionTaskId && (
                      <Link
                        href={`/missions/task/${n.missionTaskId}`}
                        className="text-xs font-mono text-primary underline"
                      >
                        View task
                      </Link>
                    )}
                  </div>
                </div>
                {!n.seenAt && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={() => handleMarkSeen(n.id)}
                    aria-label="Mark as seen"
                  >
                    <Check className="size-4" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
