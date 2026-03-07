import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getLeadsForZone } from "@/app/actions/leads-list";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InductZonePage({
  params,
}: {
  params: Promise<{ zoneId: string }>;
}) {
  const session = await getServerAuthSession();
  if (session?.role === "ADMIN") redirect("/");

  const { zoneId } = await params;

  const zone = await prisma.zone.findUnique({
    where: { id: zoneId },
    select: { id: true, code: true },
  });
  if (!zone) notFound();

  const leads = await getLeadsForZone(zoneId);

  return (
    <div className="flex min-h-screen flex-col bg-background p-4">
      <header className="mb-4 flex items-center gap-2">
        <Link
          href="/"
          className="flex size-10 items-center justify-center text-muted-foreground hover:text-foreground"
          aria-label="Back to map"
        >
          <ChevronRight className="size-6 rotate-180" />
        </Link>
        <h1 className="text-xl font-semibold text-foreground">
          Induct merchant – {zone.code}
        </h1>
      </header>

      <p className="text-muted-foreground text-sm mb-4">
        Select a lead to start induction.
      </p>

      {leads.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            No unconverted leads in this zone. Scout the zone first to add leads.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {leads.map((lead) => (
            <li key={lead.id}>
              <Link href={`/induct/${lead.id}`}>
                <Card className="transition-colors hover:bg-muted/50">
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-medium text-foreground">{lead.businessName}</p>
                      <p className="text-muted-foreground text-sm">{lead.category}</p>
                    </div>
                    <ChevronRight className="size-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
