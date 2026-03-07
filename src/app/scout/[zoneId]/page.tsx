import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ScoutReportForm } from "@/components/forms/scout-report-form";
import { getServerAuthSession } from "@/lib/auth";

function formatZoneCode(zoneId: string): string {
  if (/^[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+-\d+$/i.test(zoneId)) {
    return zoneId.toUpperCase();
  }
  return `ETH-ADD-${zoneId.toUpperCase()}`;
}

export default async function ScoutPage({
  params,
}: {
  params: Promise<{ zoneId: string }>;
}) {
  const session = await getServerAuthSession();
  if (session?.role === "ADMIN") redirect("/");

  const { zoneId: zoneIdParam } = await params;
  const zoneCode = formatZoneCode(zoneIdParam);

  const zone = await prisma.zone.findUnique({
    where: { code: zoneCode },
    select: { id: true, code: true, coordinates: true },
  }).catch(() => null);

  const coordinates =
    zone && Array.isArray(zone.coordinates)
      ? (zone.coordinates as Array<{ lat: number; lng: number }>)
      : [];
  const centerLat =
    coordinates.length > 0
      ? coordinates.reduce((s, p) => s + p.lat, 0) / coordinates.length
      : undefined;
  const centerLng =
    coordinates.length > 0
      ? coordinates.reduce((s, p) => s + p.lng, 0) / coordinates.length
      : undefined;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
        <Link
          href="/"
          className="flex size-10 -ml-2 items-center justify-center text-muted-foreground hover:text-foreground"
          aria-label="Back to map"
        >
          <ChevronLeft className="size-6" />
        </Link>
        <h1 className="flex-1 font-mono text-lg font-semibold text-foreground">
          OP-01: RECON REPORT
        </h1>
      </header>
      <ScoutReportForm
        zoneId={zone?.id ?? null}
        zoneCode={zoneCode}
        coordinates={coordinates}
        centerLat={centerLat}
        centerLng={centerLng}
        showHeader={false}
      />
    </div>
  );
}
