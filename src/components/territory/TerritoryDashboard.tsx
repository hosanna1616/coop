"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, MapPin, Users, Wallet, AlertTriangle } from "lucide-react";
import { MapScreen } from "@/components/map/MapScreen";
import { Card, CardContent } from "@/components/ui/card";
import { CommandLeaderboard, type LeaderboardEntry } from "./CommandLeaderboard";
import { OfficerProfile } from "./OfficerProfile";
import { saveBranchTerritory, updateTerritoryCell } from "@/app/actions/branch-territory";
import type { TerritoryCellWithCoords, AdminBranchTerritory } from "@/app/actions/branch-territory";
import type { MapZoneStatus } from "@/lib/zoneStatusColors";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function formatDate(): string {
  const d = new Date();
  const day = d.getDate();
  const mon = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const year = d.getFullYear();
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${day} ${mon} ${year} • ${time} EAT`;
}

export function TerritoryDashboard({
  userName,
  rankLabel,
  zonesCaptured,
  zonesAtRisk,
  activeMerchants,
  activeMissions,
  totalZones,
  useGoogleMaps,
  districtName = "Bole District",
  leaderboardEntries = [],
  leaderboardPosition = null,
  leaderboardCurrentUserEntry = null,
  xpToNextRank = null,
  nextRankLabel = null,
  profileStats,
  currentUserId,
  currentUserXp = 0,
  currentUserRank = "CADET",
  showOfficerProfile = true,
  branchId = null,
  branchTerritory = null,
  territoryCells = [],
  isBranchManager = false,
  adminTerritories,
  rankTier,
}: {
  userName: string;
  rankLabel: string;
  zonesCaptured: number;
  zonesAtRisk: number;
  activeMerchants: number;
  activeMissions: number;
  totalZones: number;
  useGoogleMaps: boolean;
  districtName?: string;
  leaderboardEntries?: LeaderboardEntry[];
  leaderboardPosition?: number | null;
  leaderboardCurrentUserEntry?: LeaderboardEntry | null;
  xpToNextRank?: number | null;
  nextRankLabel?: string | null;
  profileStats?: {
    zonesCaptured: number;
    merchantsInducted: number;
    progressFraction: number;
    missionsComplete: number;
  };
  currentUserId?: string;
  currentUserXp?: number;
  currentUserRank?: string;
  showOfficerProfile?: boolean;
  branchId?: string | null;
  branchTerritory?: { lat: number; lng: number }[] | null;
  territoryCells?: TerritoryCellWithCoords[];
  isBranchManager?: boolean;
  adminTerritories?: AdminBranchTerritory[];
  /** Optional tier label from ranks config (e.g. R1, R2, R3). */
  rankTier?: string;
}) {
  const router = useRouter();
  const [territoryEditModeActive, setTerritoryEditModeActive] = useState(false);
  const greeting = getGreeting();
  const dateStr = formatDate();

  const handleSaveTerritory = async (points: { lat: number; lng: number }[]) => {
    if (!branchId) return;
    await saveBranchTerritory(branchId, points);
    router.refresh();
  };

  const handleUpdateCell = async (
    cellId: string,
    data: { status?: MapZoneStatus; label?: string | null }
  ) => {
    await updateTerritoryCell(cellId, data);
    router.refresh();
  };

  return (
    <div className="flex min-h-screen flex-col bg-background bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:1.25rem_1.25rem]">
      {/* Top nav */}
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-mono text-xs text-foreground">
            <span className="size-2 rounded-full bg-green-500" aria-hidden />
            SYSTEM ACTIVE
          </span>
          <span className="text-muted-foreground">|</span>
          <span className="font-mono text-xs text-muted-foreground">ADDIS ABABA THEATER</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/notifications"
            className="relative flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell className="size-5" />
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              3
            </span>
          </Link>
          <div className="hidden text-right sm:block">
            <p className="font-mono text-sm font-medium text-foreground">{userName}</p>
            <p className="font-mono text-xs text-muted-foreground">{rankLabel}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Link
              href="/profile"
              className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/20 text-primary hover:bg-primary/30"
              aria-label="Profile"
            >
              <span className="font-mono text-sm font-bold">
                {userName.slice(0, 1).toUpperCase()}
              </span>
            </Link>
            <Link
              href="/profile#display-name"
              className="hidden font-mono text-[10px] font-medium uppercase tracking-wide text-primary underline-offset-2 hover:underline sm:inline"
            >
              Set name
            </Link>
          </div>
        </div>
      </header>

      {/* Daily muster + greeting + summary */}
      <section className="shrink-0 border-b border-border bg-background/95 px-4 py-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded bg-primary/20 px-2 py-0.5 font-mono text-xs font-medium text-primary">
            DAILY MUSTER
          </span>
          <span className="font-mono text-xs text-muted-foreground">{dateStr}</span>
        </div>
        <h1 className="font-mono text-xl font-bold text-foreground">
          {greeting}, <span className="text-primary">{userName}</span>
        </h1>
        {/* <p className="mt-1 font-mono text-sm text-muted-foreground">
          You have{" "}
          <span className="font-semibold text-green-500">{activeMissions}</span> active missions and{" "}
          <span className="font-semibold text-secondary">{zonesAtRisk}</span> zones at risk. Secure your territory. Advance the Nation.
        </p> */}
      </section>

      {/* Stat cards */}
      <section className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="relative p-4">
            <MapPin className="absolute right-2 top-2 size-5 text-primary" />
            <p className="font-mono text-2xl font-bold text-foreground">{zonesCaptured}</p>
            <p className="font-mono text-xs text-muted-foreground">Zones Captured</p>
            <p className="mt-1 font-mono text-xs text-green-500">+0 this week</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="relative p-4">
            <Users className="absolute right-2 top-2 size-5 text-primary" />
            <p className="font-mono text-2xl font-bold text-foreground">
              {activeMerchants.toLocaleString()}
            </p>
            <p className="font-mono text-xs text-muted-foreground">Active Merchants</p>
            <p className="mt-1 font-mono text-xs text-green-500">+0 inducted</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="relative p-4">
            <Wallet className="absolute right-2 top-2 size-5 text-primary" />
            <p className="font-mono text-2xl font-bold text-foreground">—</p>
            <p className="font-mono text-xs text-muted-foreground">Float Mobilized</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">ETB this month</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="relative p-4">
            <AlertTriangle className="absolute right-2 top-2 size-5 text-secondary" />
            <p className="font-mono text-2xl font-bold text-foreground">{zonesAtRisk}</p>
            <p className="font-mono text-xs text-muted-foreground">Zones At Risk</p>
            <p className="mt-1 font-mono text-xs text-secondary">— from last week</p>
          </CardContent>
        </Card>
      </section>

      {/* Territory Map */}
      <section className="flex flex-1 flex-col min-h-0">
        <div className="flex shrink-0 items-center justify-center border-b border-border bg-background py-2">
          <h2 className="font-mono text-sm font-semibold text-foreground">TERRITORY MAP</h2>
        </div>
        <div
          className="flex-1 min-h-0 w-full"
          style={{ minHeight: territoryEditModeActive ? "85vh" : "50vh" }}
        >
          <MapScreen
            useGoogleMaps={useGoogleMaps}
            zoneCount={totalZones}
            merchantCount={activeMerchants}
            branchId={branchId}
            branchTerritory={branchTerritory}
            territoryCells={territoryCells}
            isBranchManager={isBranchManager}
            adminTerritories={adminTerritories}
            onSaveTerritory={!adminTerritories?.length && isBranchManager && branchId ? handleSaveTerritory : undefined}
            onUpdateCell={!adminTerritories?.length && isBranchManager ? handleUpdateCell : undefined}
            onTerritoryEditModeChange={setTerritoryEditModeActive}
          />
        </div>
      </section>

      {/* Command Leaderboard + Officer Profile (Officer Profile hidden for admin) */}
      <section className="shrink-0 border-t border-border bg-background p-4">
        <div className={showOfficerProfile ? "grid gap-4 lg:grid-cols-2" : ""}>
          <CommandLeaderboard
            districtName={districtName.toUpperCase().replace(/\s+/g, " ")}
            entries={leaderboardEntries}
            currentUserId={currentUserId ?? ""}
            currentUserPosition={leaderboardPosition}
            currentUserEntry={leaderboardCurrentUserEntry}
            xpToNextRank={xpToNextRank ?? null}
            nextRankLabel={nextRankLabel ?? null}
          />
          {showOfficerProfile && profileStats && (
            <OfficerProfile
              name={userName}
              rank={currentUserRank}
              rankLabel={rankLabel}
              rankTier={rankTier}
              districtName={districtName}
              xp={currentUserXp}
              xpNextRank={xpToNextRank ?? null}
              nextRankLabel={nextRankLabel ?? null}
              progressFraction={profileStats.progressFraction}
              zonesCaptured={profileStats.zonesCaptured}
              merchantsInducted={profileStats.merchantsInducted}
              floatSecured="—"
              missionsComplete={profileStats.missionsComplete}
            />
          )}
        </div>
      </section>
    </div>
  );
}
