"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  ensureHourlyProgressFocusNotification,
  getMyUnseenNotificationCount,
  getMyNotifications,
  markAllNotificationsSeen,
} from "@/app/actions/notifications";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/contexts/UserRoleContext";
import { Bell } from "lucide-react";
import type { NotificationRow } from "@/app/actions/notifications";

const POLL_INTERVAL_MS = 12_000;
const HOURLY_CHECK_MS = 60 * 60 * 1000;

export function NotificationHost() {
  const { userId, role } = useUserRole();
  const [unseenCount, setUnseenCount] = useState(0);
  const [popupOpen, setPopupOpen] = useState(false);
  const [unseenItems, setUnseenItems] = useState<NotificationRow[]>([]);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevCountRef = useRef(0);
  const prevTopIdRef = useRef<string | null>(null);
  const hourlyTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    if (!userId) return;
    try {
      const count = await getMyUnseenNotificationCount();
      const prev = prevCountRef.current;
      prevCountRef.current = count;
      setUnseenCount(count);
      if (count > 0) {
        const list = await getMyNotifications({
          onlyUnseen: true,
          limit: 5,
          offset: 0,
        });
        setUnseenItems(list);
        const currentTopId = list[0]?.id ?? null;
        const shouldOpen = prev === 0 || (currentTopId && currentTopId !== prevTopIdRef.current);
        prevTopIdRef.current = currentTopId;
        if (shouldOpen) setPopupOpen(true);
      }
    } catch {
      // ignore
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    poll();
    pollTimerRef.current = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        poll();
      }
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [userId, poll]);

  useEffect(() => {
    if (!userId || role !== "PLAYER") return;

    const runHourly = async () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      try {
        await ensureHourlyProgressFocusNotification();
        await poll();
      } catch {
        // ignore
      }
    };

    runHourly();
    hourlyTimerRef.current = setInterval(runHourly, HOURLY_CHECK_MS);
    return () => {
      if (hourlyTimerRef.current) {
        clearInterval(hourlyTimerRef.current);
        hourlyTimerRef.current = null;
      }
    };
  }, [userId, role, poll]);

  useEffect(() => {
    if (unseenCount === 0 || muted) {
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        } catch {}
      }
    } else if (unseenCount > 0 && !muted && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  }, [unseenCount, muted]);

  const handleViewNotifications = useCallback(() => {
    setPopupOpen(false);
    window.location.href = "/notifications";
  }, []);

  const handleDismissAndMarkSeen = useCallback(async () => {
    await markAllNotificationsSeen();
    prevCountRef.current = 0;
    setUnseenCount(0);
    setUnseenItems([]);
    setPopupOpen(false);
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch {}
    }
  }, []);

  return (
    <>
      <audio
        ref={audioRef}
        src="/sounds/mixkit-bell-notification-933.wav"
        loop
        playsInline
        preload="auto"
        className="hidden"
        aria-hidden
      />
      <Dialog open={popupOpen} onOpenChange={(open) => setPopupOpen(open)}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-mono">
              <Bell className="size-5" />
              New notifications
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {unseenCount > 0 && (
              <p className="text-sm text-muted-foreground">
                You have {unseenCount} unread notification
                {unseenCount !== 1 ? "s" : ""}.
              </p>
            )}
            {unseenItems.length > 0 && (
              <ul className="max-h-48 space-y-2 overflow-y-auto rounded border border-border p-2">
                {unseenItems.map((n) => (
                  <li key={n.id} className="rounded bg-muted/50 p-2 text-sm">
                    <p className="font-medium text-foreground">{n.title}</p>
                    <p className="text-muted-foreground">{n.message}</p>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button asChild className="font-mono">
                <Link href="/notifications" onClick={handleViewNotifications}>
                  View all
                </Link>
              </Button>
              <Button
                variant="outline"
                className="font-mono"
                onClick={handleDismissAndMarkSeen}
              >
                Mark all as seen
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMuted((m) => !m)}
                className="font-mono text-muted-foreground"
              >
                {muted ? "Unmute sound" : "Mute sound"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
